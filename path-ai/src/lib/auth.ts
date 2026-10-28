import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { BASE_PATH } from '@/lib/basePath';

// User-facing auth only. Admin auth is deliberately separate (src/lib/adminAuth.ts) so
// admin sessions can never be forged via the public login surface (spec §21).
export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: `${BASE_PATH}/login`,
  },
  providers: [
    CredentialsProvider({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });
        if (!user || !user.passwordHash || user.deletedAt) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          logger.warn('Failed login attempt', { userId: user.id });
          return null;
        }

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.userId as string;
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        const existing = await prisma.user.findUnique({ where: { email: user.email } });
        if (!existing) {
          // Google sign-ups still need onboarding (education level etc.) — create a
          // minimal shell record; /onboarding completes the profile.
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? 'New user',
              educationLevel: 'UNDERGRADUATE',
              emailVerified: new Date(),
            },
          });
        }
      }
      return true;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

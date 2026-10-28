import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/** The signed-in learner's id, or null. */
export async function sessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { mentorMessageSchema } from '@/lib/validation';
import { listMentorMessages, sendMentorMessage } from '@/services/mentorService';
import { logger } from '@/lib/logger';

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const messages = await listMentorMessages(userId);
  return NextResponse.json({
    messages: messages.map((m) => ({ id: m.id, role: m.role, content: m.content, createdAt: m.createdAt })),
  });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { allowed } = rateLimit(`mentor:${userId}`);
  if (!allowed) return NextResponse.json({ error: 'Too many messages — please slow down a little.' }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = mentorMessageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Message is required.' }, { status: 400 });

  try {
    const { reply, cta } = await sendMentorMessage(userId, parsed.data.message);
    return NextResponse.json({ reply, cta });
  } catch (err) {
    logger.error('Mentor message failed', { userId, error: String(err) });
    return NextResponse.json({ error: 'Could not process your message. Please try again.' }, { status: 502 });
  }
}

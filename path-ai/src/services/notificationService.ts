import 'server-only';
import { logger } from '@/lib/logger';

// Outbound email for re-engaging stalled users (spec: recovery/reminder flow). Deliberately
// provider-agnostic and safe-by-default: with no provider configured, sends are logged and
// reported as "not sent" rather than throwing — the recovery feature is fully usable (admin
// visibility, manual outreach) even before an email provider is wired up. The moment
// RESEND_API_KEY is set, sends go live with no other code changes.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.NOTIFICATIONS_FROM_EMAIL || 'onboarding@resend.dev';

export function isEmailConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}

export interface SendEmailResult {
  sent: boolean;
  reason?: string;
}

export async function sendEmail(params: { to: string; subject: string; text: string }): Promise<SendEmailResult> {
  if (!RESEND_API_KEY) {
    logger.info('Email not sent — no provider configured (set RESEND_API_KEY)', {
      to: params.to,
      subject: params.subject,
    });
    return { sent: false, reason: 'No email provider configured. Set RESEND_API_KEY to send real emails.' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: params.to,
        subject: params.subject,
        text: params.text,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logger.error('Email send failed', { to: params.to, status: res.status, error: errText.slice(0, 300) });
      return { sent: false, reason: `Email provider returned ${res.status}.` };
    }

    return { sent: true };
  } catch (err) {
    logger.error('Email send threw', { to: params.to, error: String(err) });
    return { sent: false, reason: 'Email provider request failed.' };
  }
}

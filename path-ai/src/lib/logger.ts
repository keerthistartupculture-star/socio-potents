// Structured logging (spec §36). Never log passwords, API keys, raw voice audio, or full
// personal profiles — only IDs and event metadata.

type LogLevel = 'info' | 'warn' | 'error';

const REDACT_KEYS = new Set([
  'password',
  'passwordHash',
  'apiKey',
  'GEMINI_API_KEY',
  'MIXPANEL_TOKEN',
  'RESEND_API_KEY',
  'CRON_SECRET',
  'token',
  'authorization',
  'audio',
  'audioData',
]);

function redact(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    out[key] = REDACT_KEYS.has(key) ? '[REDACTED]' : redact(value);
  }
  return out;
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: redact(meta) } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),
};

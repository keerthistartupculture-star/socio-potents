import { describe, it, expect } from 'vitest';
import { buildModelHistory } from './mentorService';

describe('buildModelHistory', () => {
  it('never passes a crisis message or its fixed reply to the model', () => {
    const history = buildModelHistory([
      { role: 'USER', content: 'What does an architect do?' },
      { role: 'ASSISTANT', content: 'They design buildings.' },
      { role: 'USER', content: 'I want to die', flagReason: 'CRISIS' },
      { role: 'ASSISTANT', content: 'Please call 14416...' },
      { role: 'USER', content: 'ok what subjects for architecture' },
      { role: 'ASSISTANT', content: 'Maths and physics help.' },
    ]);
    expect(history.map((h) => h.text)).toEqual([
      'What does an architect do?',
      'They design buildings.',
      'ok what subjects for architecture',
      'Maths and physics help.',
    ]);
  });

  it('starts with a user turn', () => {
    expect(buildModelHistory([{ role: 'ASSISTANT', content: 'hi' }, { role: 'USER', content: 'hello' }])[0].role).toBe('user');
  });
});

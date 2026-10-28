import { describe, it, expect } from 'vitest';
import { classifyMessage, crisisReply, guardReply } from './mentorSafety';

describe('classifyMessage', () => {
  it.each([
    'I want to die',
    'sometimes I think about killing myself',
    "I don't want to live anymore",
    'I have been cutting myself',
    'my uncle hits me and I am not safe at home',
    'எனக்கு தற்கொலை செய்ய தோணுது',
    'enaku saaganum pola iruku',
  ])('flags possible crisis: %s', (msg) => {
    expect(classifyMessage(msg)).toBe('CRISIS');
  });

  it.each(['Can I talk to a real person?', 'are you a bot', 'I need a counsellor'])('detects a request for a human: %s', (msg) => {
    expect(classifyMessage(msg)).toBe('HUMAN_REQUESTED');
  });

  it.each([
    'What does a data analyst do?',
    'I am dying to know which stream suits me',
    'Which subjects should I take for architecture?',
    'This exam is killing me haha',
  ])('lets ordinary questions through: %s', (msg) => {
    expect(classifyMessage(msg)).toBe('OK');
  });
});

describe('crisisReply', () => {
  it('gives the national lines, plus Childline for minors', () => {
    expect(crisisReply(false)).toContain('14416');
    expect(crisisReply(false)).toContain('112');
    expect(crisisReply(false)).not.toContain('1098');
    expect(crisisReply(true)).toContain('1098');
  });
});

describe('guardReply', () => {
  it('removes only the sentences with percentages, guarantees or pay figures', () => {
    const { text, violations } = guardReply(
      'Design could suit you. You have a 90% chance of success. Starting pay is ₹6 lakh a year. Try a short course first.'
    );
    expect(text).toBe('Design could suit you. Try a short course first.');
    expect(violations.sort()).toEqual(['pay figure', 'percentage']);
  });

  it('removes guarantees', () => {
    const { text, violations } = guardReply('You will definitely get into IIT. Keep practising maths every day.');
    expect(text).toBe('Keep practising maths every day.');
    expect(violations).toEqual(['guarantee']);
  });

  it('keeps sentences that deny a guarantee — that caution is exactly what we want said', () => {
    const reply = "Career paths don't come with guarantees. Nothing is guaranteed, so keep options open. I can't guarantee a job.";
    expect(guardReply(reply)).toEqual({ text: reply, violations: [] });
    expect(guardReply('This course is guaranteed to get you placed.').violations).toEqual(['guarantee']);
  });

  it('falls back to a safe line when nothing usable is left', () => {
    expect(guardReply('It pays 12 LPA.').text).toMatch(/counsellor|official/);
  });

  it('leaves clean replies untouched, keeping bullet lines', () => {
    const clean = 'Two ideas:\n• Join the robotics club\n• Talk to an engineer';
    expect(guardReply(clean)).toEqual({ text: clean, violations: [] });
  });
});

import { describe, it, expect } from 'vitest';
import { fieldErrorsOf, isValidPhone, registerSchema, respondSchema } from './validation';

describe('registerSchema', () => {
  const base = {
    name: 'Asha Kumar',
    email: 'asha@example.com',
    password: 'supersecure1',
    educationLevel: 'UNDERGRADUATE' as const,
    consents: { dataProcessing: true, voiceProcessing: true, analytics: true },
  };

  it('accepts a valid non-minor registration', () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a short password', () => {
    const result = registerSchema.safeParse({ ...base, password: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = registerSchema.safeParse({ ...base, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('requires dataProcessing consent to be exactly true', () => {
    const result = registerSchema.safeParse({ ...base, consents: { ...base.consents, dataProcessing: false } });
    expect(result.success).toBe(false);
  });
});

describe('phone validation', () => {
  it('accepts common Indian mobile formats and international numbers', () => {
    for (const p of ['9876543210', '98765 43210', '+91 98765 43210', '+919876543210', '09876543210', '+44 20 7946 0958']) {
      expect(isValidPhone(p), p).toBe(true);
    }
  });

  it('rejects too-short, letter or landline-style numbers', () => {
    for (const p of ['12345', 'abcdefghij', '1234567890', '98765']) {
      expect(isValidPhone(p), p).toBe(false);
    }
  });
});

describe('registerSchema field errors', () => {
  const base = {
    name: 'Asha Kumar',
    email: 'asha@example.com',
    password: 'supersecure1',
    educationLevel: 'UNDERGRADUATE' as const,
    consents: { dataProcessing: true },
  };

  it('names the exact field that is wrong', () => {
    const r = registerSchema.safeParse({ ...base, email: 'nope', phone: '123' });
    expect(r.success).toBe(false);
    const errors = fieldErrorsOf(r.error!);
    expect(errors.email).toMatch(/valid email/);
    expect(errors.phone).toMatch(/mobile number/);
  });

  it('says what to enter when a required field is missing entirely', () => {
    const r = registerSchema.safeParse({ educationLevel: 'UNDERGRADUATE', consents: { dataProcessing: true } });
    const errors = fieldErrorsOf(r.error!);
    expect(errors.name).toMatch(/full name/);
    expect(errors.email).toMatch(/email address/);
    expect(errors.password).toMatch(/password/i);
    expect(Object.values(errors)).not.toContain('Required');
  });

  it('rejects 0000000000 as a phone number', () => {
    expect(isValidPhone('0000000000')).toBe(false);
  });

  it('stores the phone number without spaces', () => {
    const r = registerSchema.safeParse({ ...base, phone: '98765 43210' });
    expect(r.success && r.data.phone).toBe('9876543210');
  });

  it('requires guardian details and consent for Class 10', () => {
    const r = registerSchema.safeParse({ ...base, educationLevel: 'CLASS_10' });
    const errors = fieldErrorsOf(r.error!);
    expect(Object.keys(errors).sort()).toEqual(['consents.guardianMinor', 'guardianEmail', 'guardianName', 'guardianRelation']);
  });

  it('accepts a complete Class 10 registration', () => {
    const r = registerSchema.safeParse({
      ...base,
      educationLevel: 'CLASS_10',
      guardianName: 'Meena Kumar',
      guardianEmail: 'meena@example.com',
      guardianRelation: 'Mother',
      consents: { dataProcessing: true, guardianMinor: true },
    });
    expect(r.success).toBe(true);
  });

  it("rejects a guardian email that is the student's own", () => {
    const r = registerSchema.safeParse({
      ...base,
      educationLevel: 'CLASS_10',
      guardianName: 'Meena Kumar',
      guardianEmail: 'asha@example.com',
      guardianRelation: 'Mother',
      consents: { dataProcessing: true, guardianMinor: true },
    });
    expect(fieldErrorsOf(r.error!).guardianEmail).toMatch(/different/);
  });
});

describe('respondSchema', () => {
  it('accepts a valid text response', () => {
    expect(respondSchema.safeParse({ responseText: 'I would talk to my teammates.', inputMethod: 'TEXT' }).success).toBe(true);
  });

  it('rejects an empty response', () => {
    expect(respondSchema.safeParse({ responseText: '', inputMethod: 'TEXT' }).success).toBe(false);
  });

  it('rejects an invalid inputMethod', () => {
    expect(respondSchema.safeParse({ responseText: 'hi', inputMethod: 'CARRIER_PIGEON' }).success).toBe(false);
  });
});

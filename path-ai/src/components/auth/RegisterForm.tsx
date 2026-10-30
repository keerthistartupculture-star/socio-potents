'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { isValidPhone } from '@/lib/validation';

const EDUCATION_OPTIONS = [
  { value: 'CLASS_10', label: 'Class 10' },
  { value: 'CLASS_12', label: 'Class 12' },
  { value: 'DIPLOMA', label: 'Diploma' },
  { value: 'UNDERGRADUATE', label: 'Undergraduate' },
  { value: 'POSTGRADUATE', label: 'Postgraduate' },
  { value: 'WORKING_PROFESSIONAL', label: 'Working Professional' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type FieldErrors = Record<string, string>;

// Fields per step, so a server-side error on a step-1 field sends the user back to step 1.
const STEP_ONE_FIELDS = ['name', 'email', 'password', 'phone', 'age', 'gender'];

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', age: '', gender: '', location: '',
    educationLevel: 'UNDERGRADUATE', institutionName: '', currentClassYear: '', preferredLanguage: 'en',
    careerGoal: '', guardianName: '', guardianEmail: '', guardianRelation: '',
  });
  // Optional consents start unticked: the person has to opt in, not opt out.
  const [consents, setConsents] = useState({ dataProcessing: false, analytics: false, guardianMinor: false });

  const isMinor = form.educationLevel === 'CLASS_10';

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(({ [key]: _cleared, ...rest }) => rest);
  }

  function validateStepOne(): FieldErrors {
    const e: FieldErrors = {};
    if (form.name.trim().length < 2) e.name = 'Please enter your full name (at least 2 letters).';
    if (!form.email.trim()) e.email = 'Please enter your email address.';
    else if (!EMAIL_RE.test(form.email.trim())) e.email = 'Please enter a valid email address, like name@example.com.';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (form.phone.trim() && !isValidPhone(form.phone)) e.phone = 'Please enter a valid mobile number, e.g. 98765 43210 or +91 98765 43210.';
    if (form.age) {
      const age = Number(form.age);
      if (!Number.isInteger(age) || age < 10 || age > 100) e.age = 'Age must be a whole number between 10 and 100.';
    }
    return e;
  }

  function validateStepTwo(): FieldErrors {
    const e: FieldErrors = {};
    if (isMinor) {
      if (form.guardianName.trim().length < 2) e.guardianName = "Please enter the parent/guardian's full name.";
      if (!form.guardianEmail.trim()) e.guardianEmail = "Please enter the parent/guardian's email address.";
      else if (!EMAIL_RE.test(form.guardianEmail.trim())) e.guardianEmail = 'Please enter a valid parent/guardian email address.';
      else if (form.guardianEmail.trim().toLowerCase() === form.email.trim().toLowerCase())
        e.guardianEmail = "The parent/guardian's email must be different from the student's email.";
      if (!form.guardianRelation.trim()) e.guardianRelation = 'Please say how the guardian is related (e.g. Mother, Father).';
      if (!consents.guardianMinor) e['consents.guardianMinor'] = 'A parent/guardian must tick the consent box for a Class 10 student.';
    }
    if (!consents.dataProcessing) e['consents.dataProcessing'] = 'Please accept the data processing consent to continue.';
    return e;
  }

  // Moves keyboard/screen-reader focus to the first invalid field so the error is noticed.
  function focusFirstError(e: FieldErrors) {
    const first = Object.keys(e)[0];
    if (!first) return;
    setTimeout(() => document.getElementById(fieldId(first))?.focus(), 0);
  }

  function goToStepTwo() {
    const e = validateStepOne();
    setErrors(e);
    if (Object.keys(e).length) {
      focusFirstError(e);
      return;
    }
    setFormError(null);
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) {
      goToStepTwo();
      return;
    }
    if (submittingRef.current) return;
    setFormError(null);

    const stepTwoErrors = validateStepTwo();
    setErrors(stepTwoErrors);
    if (Object.keys(stepTwoErrors).length) {
      setFormError('Please fix the highlighted fields below.');
      focusFirstError(stepTwoErrors);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      // Optional fields sit in form state as '' when unused; the server treats '' as "not given".
      const payload: Record<string, unknown> = { ...form, consents };
      for (const key of Object.keys(payload)) {
        if (payload[key] === '') payload[key] = undefined;
      }
      payload.age = form.age ? Number(form.age) : undefined;
      payload.gender = form.gender || undefined;

      const res = await fetch(BASE_PATH + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const serverErrors: FieldErrors = data.fieldErrors ?? {};
        setErrors(serverErrors);
        setFormError(data.error ?? 'Something went wrong. Please try again.');
        if (Object.keys(serverErrors).some((k) => STEP_ONE_FIELDS.includes(k))) setStep(1);
        focusFirstError(serverErrors);
        return;
      }
      const signInResult = await signIn('credentials', { redirect: false, email: form.email, password: form.password });
      router.push(signInResult?.ok ? '/assessment/start' : '/login');
    } catch {
      setFormError('Network error. Please check your connection and try again — nothing was lost.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  // Shared wiring for an input's label, error text and ARIA attributes.
  function fieldProps(name: string) {
    const id = fieldId(name);
    return {
      id,
      name,
      'aria-invalid': errors[name] ? true : undefined,
      'aria-describedby': errors[name] ? `${id}-error` : undefined,
    };
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Step {step} of 2 · Fields marked * are required</p>

      {formError && (
        <p role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {step === 1 && (
          <>
            <Field label="Full name" required name="name" error={errors.name}>
              <Input {...fieldProps('name')} autoComplete="name" required value={form.name} onChange={(e) => update('name', e.target.value)} />
            </Field>
            <Field label="Email" required name="email" error={errors.email}>
              <Input {...fieldProps('email')} type="email" autoComplete="email" inputMode="email" required value={form.email} onChange={(e) => update('email', e.target.value)} />
            </Field>
            <Field label="Password" required name="password" error={errors.password} hint="At least 8 characters.">
              <Input {...fieldProps('password')} type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={(e) => update('password', e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mobile number (optional)" name="phone" error={errors.phone}>
                <Input {...fieldProps('phone')} type="tel" autoComplete="tel" inputMode="tel" placeholder="98765 43210" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
              </Field>
              <Field label="Age (optional)" name="age" error={errors.age}>
                <Input {...fieldProps('age')} type="number" inputMode="numeric" min={10} max={100} value={form.age} onChange={(e) => update('age', e.target.value)} />
              </Field>
            </div>
            <Field label="Gender (optional)" name="gender" error={errors.gender}>
              <Select {...fieldProps('gender')} value={form.gender} onChange={(e) => update('gender', e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </Select>
            </Field>
            <Button type="submit" className="w-full">Continue</Button>
          </>
        )}

        {step === 2 && (
          <>
            <Field
              label="Education level"
              required
              name="educationLevel"
              error={errors.educationLevel}
              hint={isMinor ? 'You will take the Big Five personality assessment.' : 'You will take the MBTI-based assessment.'}
            >
              <Select {...fieldProps('educationLevel')} value={form.educationLevel} onChange={(e) => update('educationLevel', e.target.value)}>
                {EDUCATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            <Field label="School / College / Company (optional)" name="institutionName" error={errors.institutionName}>
              <Input {...fieldProps('institutionName')} autoComplete="organization" value={form.institutionName} onChange={(e) => update('institutionName', e.target.value)} />
            </Field>
            <Field label="Current class / year / job title (optional)" name="currentClassYear" error={errors.currentClassYear}>
              <Input {...fieldProps('currentClassYear')} value={form.currentClassYear} onChange={(e) => update('currentClassYear', e.target.value)} />
            </Field>
            <Field label="Location (optional)" name="location" error={errors.location}>
              <Input {...fieldProps('location')} autoComplete="address-level2" value={form.location} onChange={(e) => update('location', e.target.value)} />
            </Field>
            <Field label="Career goal (optional)" name="careerGoal" error={errors.careerGoal}>
              <Textarea {...fieldProps('careerGoal')} rows={2} value={form.careerGoal} onChange={(e) => update('careerGoal', e.target.value)} />
            </Field>

            {isMinor && (
              <fieldset className="rounded-lg border border-border bg-muted/50 p-4">
                <legend className="px-1 text-sm font-medium">Parent/Guardian details (required for Class 10)</legend>
                <div className="space-y-3">
                  <Field label="Guardian's full name" required name="guardianName" error={errors.guardianName}>
                    <Input {...fieldProps('guardianName')} value={form.guardianName} onChange={(e) => update('guardianName', e.target.value)} />
                  </Field>
                  <Field label="Guardian's email" required name="guardianEmail" error={errors.guardianEmail}>
                    <Input {...fieldProps('guardianEmail')} type="email" inputMode="email" value={form.guardianEmail} onChange={(e) => update('guardianEmail', e.target.value)} />
                  </Field>
                  <Field label="Relationship to student" required name="guardianRelation" error={errors.guardianRelation} hint="For example: Mother, Father, Guardian.">
                    <Input {...fieldProps('guardianRelation')} value={form.guardianRelation} onChange={(e) => update('guardianRelation', e.target.value)} />
                  </Field>
                  <CheckField
                    name="consents.guardianMinor"
                    error={errors['consents.guardianMinor']}
                    checked={consents.guardianMinor}
                    onChange={(v) => {
                      setConsents((c) => ({ ...c, guardianMinor: v }));
                      setErrors(({ 'consents.guardianMinor': _c, ...rest }) => rest);
                    }}
                  >
                    I am the parent/guardian and I consent to this assessment for my child. *
                  </CheckField>
                </div>
              </fieldset>
            )}

            <fieldset className="space-y-2 rounded-lg border border-border p-4 text-sm">
              <legend className="px-1 font-medium">Consent</legend>
              <p className="text-muted-foreground">
                Please read the{' '}
                <Link href="/privacy" target="_blank" className="font-medium text-foreground underline">
                  privacy notice
                </Link>{' '}
                (opens in a new tab): what we collect, how AI is used, how long we keep it and how to have it deleted.
              </p>
              <CheckField
                name="consents.dataProcessing"
                error={errors['consents.dataProcessing']}
                checked={consents.dataProcessing}
                onChange={(v) => {
                  setConsents((c) => ({ ...c, dataProcessing: v }));
                  setErrors(({ 'consents.dataProcessing': _c, ...rest }) => rest);
                }}
              >
                I consent to my data being processed to generate this career assessment. *
              </CheckField>
              <CheckField name="consents.analytics" checked={consents.analytics} onChange={(v) => setConsents((c) => ({ ...c, analytics: v }))}>
                I consent to anonymised usage analytics to help improve the product (optional).
              </CheckField>
            </fieldset>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button type="submit" className="flex-1" disabled={submitting}>{submitting ? 'Creating account...' : 'Create account'}</Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

function fieldId(name: string) {
  return `reg-${name.replace(/\./g, '-')}`;
}

function Field({
  label,
  name,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const id = fieldId(name);
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {required && <span aria-hidden> *</span>}
        {required && <span className="sr-only"> (required)</span>}
      </Label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function CheckField({
  name,
  checked,
  onChange,
  error,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  children: React.ReactNode;
}) {
  const id = fieldId(name);
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-2 text-sm">
        <input
          id={id}
          type="checkbox"
          className="mt-1 h-4 w-4"
          checked={checked}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="ml-6 mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

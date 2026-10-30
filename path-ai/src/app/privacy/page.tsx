import Link from 'next/link';

export const metadata = { title: 'Privacy notice — PATH AI' };

// Keep in step with docs/data-privacy-and-minors.md, which records what the code actually does.
const CONTACT_EMAIL = 'team@startupculture.co.in';
const LAST_UPDATED = '30 October 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-16">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">Privacy notice</h1>
        <p className="text-muted-foreground">
          PATH AI is the career assessment offered by Socio Potents at sociopotents.in/path-ai. This notice explains what
          we collect, how AI is used, how long we keep your data and how to have it deleted. Last updated {LAST_UPDATED}.
        </p>
      </header>

      <Section title="What we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Account details:</strong> your name, email and password (stored only in
            scrambled, hashed form), your education level, and anything optional you choose to add — phone, age, gender,
            location, school or company, class or job title and career goal.
          </li>
          <li>
            <strong className="text-foreground">Class 10 students:</strong> a parent or guardian&apos;s name, email and
            relationship, and their consent.
          </li>
          <li>
            <strong className="text-foreground">Your assessment:</strong> every question and answer, the AI&apos;s reading
            of each answer, your personality scores, career suggestions and your report, including its PDF.
          </li>
          <li>
            <strong className="text-foreground">AI mentor chat,</strong> if you use it: your messages and its replies.
          </li>
          <li>
            <strong className="text-foreground">Usage analytics,</strong> only if you tick the optional analytics box:
            events such as &ldquo;report viewed&rdquo;. Your name, email, phone, guardian details and location are removed
            before these are recorded.
          </li>
        </ul>
      </Section>

      <Section title="How AI is used">
        <p>
          The conversation, scoring and report text are produced with Google&apos;s Gemini AI. To do that, Google receives
          your answers, your education level, your first name, your career goal if you gave one and, for the AI mentor,
          your messages and a summary of your report.
        </p>
        <p>
          PATH AI currently uses Google&apos;s free Gemini service. Under Google&apos;s terms for unpaid use, Google may use
          the content sent to it to improve its products, and that content may be read by people working for Google.
          Please don&apos;t include details you would not want shared this way, such as health or financial information
          or other people&apos;s personal details.
        </p>
        <p>
          Your personality scores are calculated by our own scoring rules from the AI&apos;s reading of each answer.
          The report is for career exploration and self-reflection only — it is not a psychological or medical
          diagnosis, and no decision is made about you automatically.
        </p>
      </Section>

      <Section title="Who can see your data">
        <ul className="list-disc space-y-2 pl-5">
          <li>You. Your report and PDF can only be opened while you are signed in to your own account.</li>
          <li>
            Socio Potents staff with admin access (counsellors and administrators), to support students and run the
            service. They can see your account details, answers and reports.
          </li>
          <li>
            Service providers who run PATH AI for us: Google (the AI, as described above), Render (our hosting and
            database, in the United States) and, if enabled, our email provider for reminder emails and our analytics
            provider for the optional usage analytics.
          </li>
        </ul>
        <p>We do not sell your data or use it for advertising.</p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep your account, answers and reports for up to <strong className="text-foreground">2 years after your
          last activity</strong>, so you can come back to your report. After that, they are deleted. You can ask us to
          delete them sooner at any time.
        </p>
      </Section>

      <Section title="Seeing or deleting your data">
        <p>
          To get a copy of your data, correct it, or have your account and all your assessment data deleted, email{' '}
          <a className="font-medium text-foreground underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>{' '}
          from the email address you registered with. We will confirm when it is done.
        </p>
        <p>
          For a Class 10 student, the parent or guardian named at registration can make the same requests. You can also
          withdraw consent to the optional usage analytics at any time by emailing us.
        </p>
      </Section>

      <Section title="Questions">
        <p>
          Email{' '}
          <a className="font-medium text-foreground underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          . If we change this notice, the date at the top will change.
        </p>
      </Section>

      <p>
        <Link href="/" className="text-sm font-medium underline">
          Back to PATH AI
        </Link>
      </p>
    </div>
  );
}

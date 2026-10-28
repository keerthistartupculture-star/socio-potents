import { BASE_PATH } from '@/lib/basePath';
import { ReportView, type ReportJson } from '@/components/report/ReportView';
import { SAMPLE_REPORT } from '@/lib/sampleReport';

export const metadata = { title: 'Sample Strengths & Learning Report' };

// Public example of a finished report, so parents can see what they will receive.
export default function SampleReportPage() {
  return <ReportView report={SAMPLE_REPORT as unknown as ReportJson} reportId="sample" pdfHref={`${BASE_PATH}/api/report/sample/pdf`} />;
}

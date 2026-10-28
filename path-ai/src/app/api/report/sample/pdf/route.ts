import { NextResponse } from 'next/server';
import { renderReportPdfBuffer } from '@/services/pdfService';
import { SAMPLE_REPORT } from '@/lib/sampleReport';

export async function GET() {
  const buffer = await renderReportPdfBuffer(SAMPLE_REPORT);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="sample-strengths-report.pdf"',
    },
  });
}

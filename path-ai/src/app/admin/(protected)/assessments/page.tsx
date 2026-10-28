'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface AssessmentRow {
  id: string;
  framework: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  user: { id: string; name: string; email: string; educationLevel: string };
  personalityScore: { mbtiType: string | null } | null;
  report: { id: string; status: string } | null;
  recommendations: { career: { title: string } }[];
}

export default function AdminAssessmentsPage() {
  const [status, setStatus] = useState('');
  const [framework, setFramework] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; assessments: AssessmentRow[] } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (status) params.set('status', status);
    if (framework) params.set('framework', framework);
    fetch(`${BASE_PATH}/api/admin/assessments?${params}`).then((r) => r.json()).then(setData);
  }, [status, framework, page]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Assessments</h1>
      <div className="mb-4 flex gap-3">
        <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="max-w-xs">
          <option value="">All statuses</option>
          <option value="NOT_STARTED">Not started</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="PAUSED">Paused</option>
          <option value="COMPLETED">Completed</option>
          <option value="ABANDONED">Abandoned</option>
        </Select>
        <Select value={framework} onChange={(e) => { setPage(1); setFramework(e.target.value); }} className="max-w-xs">
          <option value="">All frameworks</option>
          <option value="BIG_FIVE">Big Five</option>
          <option value="MBTI">MBTI</option>
        </Select>
        <a href={`${BASE_PATH}/api/admin/export?type=assessments`}><Button variant="outline">Export CSV</Button></a>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Framework</th>
                <th className="p-3">Status</th>
                <th className="p-3">Result</th>
                <th className="p-3">Top career</th>
                <th className="p-3">Report</th>
              </tr>
            </thead>
            <tbody>
              {data?.assessments.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="p-3">
                    <Link href={`/admin/users/${a.user.id}`} className="font-medium hover:underline">{a.user.name}</Link>
                    <p className="text-xs text-muted-foreground">{a.user.email}</p>
                  </td>
                  <td className="p-3">{a.framework === 'BIG_FIVE' ? 'Big Five' : 'MBTI'}</td>
                  <td className="p-3">{a.status.replace('_', ' ')}</td>
                  <td className="p-3">{a.personalityScore?.mbtiType ?? '—'}</td>
                  <td className="p-3">{a.recommendations[0]?.career.title ?? '—'}</td>
                  <td className="p-3">
                    {a.report ? <a className="text-primary hover:underline" href={`${BASE_PATH}/api/report/${a.report.id}/pdf`}>PDF</a> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {data && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.total} total assessments</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page * 20 >= data.total} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ReportRow {
  id: string;
  status: string;
  personalityResultLabel: string | null;
  generatedAt: string | null;
  viewedAt: string | null;
  user: { name: string; email: string };
  assessment: { framework: string; status: string };
}

export default function AdminReportsPage() {
  const [data, setData] = useState<{ total: number; reports: ReportRow[] } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function reload() {
    fetch(BASE_PATH + '/api/admin/reports').then((r) => r.json()).then(setData);
  }
  useEffect(reload, []);

  async function regenerate(id: string) {
    setBusyId(id);
    await fetch(`${BASE_PATH}/api/admin/reports/${id}`, { method: 'POST' });
    setBusyId(null);
    reload();
  }

  async function remove(id: string) {
    if (!confirm('Delete this report permanently?')) return;
    await fetch(`${BASE_PATH}/api/admin/reports/${id}`, { method: 'DELETE' });
    reload();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Reports</h1>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Type</th>
                <th className="p-3">Result</th>
                <th className="p-3">Status</th>
                <th className="p-3">Viewed</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.reports.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="p-3">
                    <p className="font-medium">{r.user.name}</p>
                    <p className="text-xs text-muted-foreground">{r.user.email}</p>
                  </td>
                  <td className="p-3">{r.assessment.framework === 'BIG_FIVE' ? 'Big Five' : 'MBTI'}</td>
                  <td className="p-3">{r.personalityResultLabel ?? '—'}</td>
                  <td className="p-3">{r.status}</td>
                  <td className="p-3">{r.viewedAt ? 'Yes' : 'No'}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <a href={`${BASE_PATH}/api/report/${r.id}/pdf`}><Button size="sm" variant="outline">View</Button></a>
                      <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => regenerate(r.id)}>
                        {busyId === r.id ? 'Regenerating...' : 'Regenerate'}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface UserRow {
  id: string;
  name: string;
  email: string;
  educationLevel: string;
  createdAt: string;
  assessments: { id: string; status: string; framework: string; completedAt: string | null }[];
}

export default function AdminUsersPage() {
  const [q, setQ] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [data, setData] = useState<{ total: number; users: UserRow[] } | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (q) params.set('q', q);
    if (educationLevel) params.set('educationLevel', educationLevel);
    fetch(`${BASE_PATH}/api/admin/users?${params}`).then((r) => r.json()).then(setData);
  }, [q, educationLevel, page]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Users</h1>
      <div className="mb-4 flex gap-3">
        <Input placeholder="Search name or email..." value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} className="max-w-xs" />
        <Select value={educationLevel} onChange={(e) => { setPage(1); setEducationLevel(e.target.value); }} className="max-w-xs">
          <option value="">All education levels</option>
          <option value="CLASS_10">Class 10</option>
          <option value="CLASS_12">Class 12</option>
          <option value="DIPLOMA">Diploma</option>
          <option value="UNDERGRADUATE">Undergraduate</option>
          <option value="POSTGRADUATE">Postgraduate</option>
          <option value="WORKING_PROFESSIONAL">Working Professional</option>
        </Select>
        <a href={`${BASE_PATH}/api/admin/export?type=users`}>
          <Button variant="outline">Export CSV</Button>
        </a>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Education</th>
                <th className="p-3">Latest status</th>
                <th className="p-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="p-3"><Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">{u.name}</Link></td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3">{u.educationLevel.replace('_', ' ')}</td>
                  <td className="p-3">{u.assessments[0]?.status.replace('_', ' ') ?? '—'}</td>
                  <td className="p-3 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {data && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.total} total users</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page * 20 >= data.total} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

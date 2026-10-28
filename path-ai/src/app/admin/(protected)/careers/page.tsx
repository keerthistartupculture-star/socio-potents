'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface CareerRow {
  id: string;
  title: string;
  description: string;
  skillsRequired: string[];
  isActive: boolean;
  category: { name: string };
}
interface CategoryRow { id: string; name: string }

export default function AdminCareersPage() {
  const [careers, setCareers] = useState<CareerRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    categoryId: '', title: '', description: '', skillsRequired: '', workEnvironment: '', challenges: '',
  });

  function reload() {
    fetch(BASE_PATH + '/api/admin/careers').then((r) => r.json()).then((d) => { setCareers(d.careers); setCategories(d.categories); });
  }
  useEffect(reload, []);

  async function toggleActive(c: CareerRow) {
    await fetch(`${BASE_PATH}/api/admin/careers/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    reload();
  }

  async function createCareer() {
    setSaving(true);
    await fetch(BASE_PATH + '/api/admin/careers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        skillsRequired: form.skillsRequired.split(',').map((s) => s.trim()).filter(Boolean),
        personalityAlignment: {},
        educationPathway: [],
        entryLevelRoles: [],
        growthPath: [],
      }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ categoryId: '', title: '', description: '', skillsRequired: '', workEnvironment: '', challenges: '' });
    reload();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Careers</h1>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : 'Add Career'}</Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader><CardTitle>New career</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
              <div>
                <Label>Category</Label>
                <Select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
                  <option value="">Select...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Skills required (comma-separated)</Label><Input value={form.skillsRequired} onChange={(e) => setForm((f) => ({ ...f, skillsRequired: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Work environment</Label><Input value={form.workEnvironment} onChange={(e) => setForm((f) => ({ ...f, workEnvironment: e.target.value }))} /></div>
              <div><Label>Challenges</Label><Input value={form.challenges} onChange={(e) => setForm((f) => ({ ...f, challenges: e.target.value }))} /></div>
            </div>
            <Button disabled={saving || !form.title || !form.categoryId || !form.description} onClick={createCareer}>{saving ? 'Saving...' : 'Create career'}</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {careers.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium">{c.title} <span className="font-normal text-muted-foreground">· {c.category.name}</span></p>
                <p className="text-sm text-muted-foreground line-clamp-1">{c.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </span>
                <Button size="sm" variant="outline" onClick={() => toggleActive(c)}>{c.isActive ? 'Deactivate' : 'Activate'}</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

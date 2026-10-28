'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select, Textarea, Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface QuestionRow {
  id: string;
  code: string;
  framework: string;
  dimension: string;
  scenarioText: string;
  questionType: string;
  weight: number;
  difficulty: number;
  isActive: boolean;
  educationLevels: string[];
}

const EDUCATION_LEVELS = ['CLASS_10', 'CLASS_12', 'DIPLOMA', 'UNDERGRADUATE', 'POSTGRADUATE', 'WORKING_PROFESSIONAL'];

export default function AdminQuestionsPage() {
  const [framework, setFramework] = useState('');
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '', framework: 'BIG_FIVE', dimension: '', questionType: 'SCENARIO', scenarioText: '',
    weight: 1, difficulty: 2, educationLevels: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  function reload() {
    const params = new URLSearchParams();
    if (framework) params.set('framework', framework);
    fetch(`${BASE_PATH}/api/admin/questions?${params}`).then((r) => r.json()).then((d) => setQuestions(d.questions));
  }

  useEffect(reload, [framework]);

  async function toggleActive(q: QuestionRow) {
    await fetch(`${BASE_PATH}/api/admin/questions/${q.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !q.isActive }),
    });
    reload();
  }

  async function createQuestion() {
    setSaving(true);
    await fetch(BASE_PATH + '/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, isScenario: true }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ code: '', framework: 'BIG_FIVE', dimension: '', questionType: 'SCENARIO', scenarioText: '', weight: 1, difficulty: 2, educationLevels: [] });
    reload();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Question Bank</h1>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : 'Add Question'}</Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader><CardTitle>New question</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. BF-031" /></div>
              <div>
                <Label>Framework</Label>
                <Select value={form.framework} onChange={(e) => setForm((f) => ({ ...f, framework: e.target.value }))}>
                  <option value="BIG_FIVE">Big Five</option>
                  <option value="MBTI">MBTI</option>
                </Select>
              </div>
              <div><Label>Dimension</Label><Input value={form.dimension} onChange={(e) => setForm((f) => ({ ...f, dimension: e.target.value }))} placeholder="e.g. OPENNESS or E_I" /></div>
              <div><Label>Difficulty (1-5)</Label><Input type="number" min={1} max={5} value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>Scenario text</Label><Textarea rows={3} value={form.scenarioText} onChange={(e) => setForm((f) => ({ ...f, scenarioText: e.target.value }))} /></div>
            <div>
              <Label>Applicable education levels</Label>
              <div className="flex flex-wrap gap-3">
                {EDUCATION_LEVELS.map((lvl) => (
                  <label key={lvl} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={form.educationLevels.includes(lvl)}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          educationLevels: e.target.checked ? [...f.educationLevels, lvl] : f.educationLevels.filter((l) => l !== lvl),
                        }))
                      }
                    />
                    {lvl.replace('_', ' ')}
                  </label>
                ))}
              </div>
            </div>
            <Button disabled={saving || !form.code || !form.scenarioText} onClick={createQuestion}>{saving ? 'Saving...' : 'Create question'}</Button>
          </CardContent>
        </Card>
      )}

      <Select value={framework} onChange={(e) => setFramework(e.target.value)} className="mb-4 max-w-xs">
        <option value="">All frameworks</option>
        <option value="BIG_FIVE">Big Five</option>
        <option value="MBTI">MBTI</option>
      </Select>

      <div className="space-y-2">
        {questions.map((q) => (
          <Card key={q.id}>
            <CardContent className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium">{q.code} · {q.dimension} · {q.framework === 'BIG_FIVE' ? 'Big Five' : 'MBTI'}</p>
                <p className="text-sm text-muted-foreground">{q.scenarioText}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${q.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                  {q.isActive ? 'Active' : 'Inactive'}
                </span>
                <Button size="sm" variant="outline" onClick={() => toggleActive(q)}>{q.isActive ? 'Deactivate' : 'Activate'}</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';

// Brand-derived chart palette: yellow as the lead hue, stepping through black/gray/amber
// tones so multi-category charts (pie slices, grouped bars) stay legible without straying
// into an unrelated color family.
const COLORS = ['#F5C400', '#0A0A0A', '#8a6d00', '#6b7280', '#D4A600', '#404040', '#F5C400aa', '#9CA3AF'];

interface StatsResponse {
  cards: {
    totalUsers: number;
    totalAssessments: number;
    completedAssessments: number;
    incompleteAssessments: number;
    completionRate: number;
    avgDurationSeconds: number;
    reportsGenerated: number;
    voiceAssessments: number;
  };
  educationDistribution: { level: string; count: number }[];
  trend: { date: string; started: number; completed: number }[];
  mbtiDistribution: { type: string | null; count: number }[];
  bigFiveAverages: Record<string, number>;
  topCareerRecommendations: { career: string; count: number }[];
  funnel: { registered: number; started: number; completed: number; reportsViewed: number };
}

export default function AdminDashboardPage() {
  const [range, setRange] = useState('30d');
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE_PATH}/api/admin/stats?range=${range}`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        setStats(await r.json());
      })
      .catch(() => setError('The dashboard is not available for your role.'));
  }, [range]);

  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!stats) return <p className="text-muted-foreground">Loading dashboard...</p>;

  const cards = [
    { label: 'Total Students', value: stats.cards.totalUsers },
    { label: 'Assessments Completed', value: stats.cards.completedAssessments },
    { label: 'Completion Rate', value: `${stats.cards.completionRate}%` },
    { label: 'Reports Generated', value: stats.cards.reportsGenerated },
    { label: 'Incomplete Assessments', value: stats.cards.incompleteAssessments },
    { label: 'Voice Assessments', value: stats.cards.voiceAssessments },
    { label: 'Avg. Duration', value: formatDuration(stats.cards.avgDurationSeconds) },
    { label: 'Total Assessments', value: stats.cards.totalAssessments },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Select className="w-40" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="today">Today</option>
          <option value="7d">7 Days</option>
          <option value="30d">30 Days</option>
          <option value="90d">90 Days</option>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="py-5">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Assessment Trend (started vs completed)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="started" stroke="#0A0A0A" strokeWidth={2} />
                <Line type="monotone" dataKey="completed" stroke="#F5C400" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Education Level Distribution</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.educationDistribution} dataKey="count" nameKey="level" cx="50%" cy="50%" outerRadius={90} label>
                  {stats.educationDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>MBTI Type Distribution</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.mbtiDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0A0A0A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Big Five Averages</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={Object.entries(stats.bigFiveAverages).map(([dim, score]) => ({ dim, score }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dim" tick={{ fontSize: 9 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="score" fill="#F5C400" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top Career Recommendations</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topCareerRecommendations} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="career" width={120} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8a6d00" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Assessment Funnel</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.funnel).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="capitalize text-muted-foreground">{key}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0m';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

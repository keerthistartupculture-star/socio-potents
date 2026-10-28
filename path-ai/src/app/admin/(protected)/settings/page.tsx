'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface Branding { productName: string; primaryColor: string; logoUrl: string | null }
interface DemoMode { enabled: boolean }
interface RetakePolicy { minDaysBetweenRetakes: number }

export default function AdminSettingsPage() {
  const [branding, setBranding] = useState<Branding>({ productName: '', primaryColor: '#F5C400', logoUrl: null });
  const [demoMode, setDemoMode] = useState<DemoMode>({ enabled: false });
  const [retakePolicy, setRetakePolicy] = useState<RetakePolicy>({ minDaysBetweenRetakes: 90 });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(BASE_PATH + '/api/admin/settings').then((r) => r.json()).then((d) => {
      if (d.settings?.branding) setBranding(d.settings.branding);
      if (d.settings?.demoMode) setDemoMode(d.settings.demoMode);
      if (d.settings?.retakePolicy) setRetakePolicy(d.settings.retakePolicy);
    });
  }, []);

  async function save(key: string, value: unknown) {
    await fetch(BASE_PATH + '/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      {saved && <p className="text-sm text-emerald-600">Saved.</p>}

      <Card>
        <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Product name</Label>
            <Input value={branding.productName} onChange={(e) => setBranding((b) => ({ ...b, productName: e.target.value }))} />
          </div>
          <div>
            <Label>Primary color</Label>
            <Input type="color" value={branding.primaryColor} onChange={(e) => setBranding((b) => ({ ...b, primaryColor: e.target.value }))} className="h-11 w-24" />
          </div>
          <Button size="sm" onClick={() => save('branding', branding)}>Save branding</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Demo Mode</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            When enabled, users can take a simulated assessment with instant report generation, without consuming Gemini API credits.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={demoMode.enabled} onChange={(e) => setDemoMode({ enabled: e.target.checked })} />
            Enable demo mode option for users
          </label>
          <Button size="sm" onClick={() => save('demoMode', demoMode)}>Save demo mode</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Retake Policy</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Minimum days between retakes</Label>
            <Input
              type="number"
              min={1}
              value={retakePolicy.minDaysBetweenRetakes}
              onChange={(e) => setRetakePolicy({ minDaysBetweenRetakes: Number(e.target.value) })}
              className="w-32"
            />
          </div>
          <Button size="sm" onClick={() => save('retakePolicy', retakePolicy)}>Save retake policy</Button>
        </CardContent>
      </Card>
    </div>
  );
}

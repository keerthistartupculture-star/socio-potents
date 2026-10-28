'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CategoryDatum {
  name: string;
  count: number;
}

export function CategoryDistributionChart({ data, accentColor = '#F5C400' }: { data: CategoryDatum[]; accentColor?: string }) {
  const height = Math.max(220, data.length * 42);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fontSize: 12, fill: '#0A0A0A' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: 'rgba(245, 196, 0, 0.12)' }} formatter={(value: number) => [`${value} careers`, '']} labelFormatter={() => ''} />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={accentColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

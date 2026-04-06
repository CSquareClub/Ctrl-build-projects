import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { TopicEngagementPoint } from '../types'

type TopicEngagementChartProps = {
  data: TopicEngagementPoint[]
}

export function TopicEngagementChart({ data }: TopicEngagementChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No topic engagement data available yet.</p>
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 8)} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="topic" stroke="var(--muted)" tickLine={false} axisLine={false} />
          <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              color: 'var(--text)',
            }}
          />
          <Bar dataKey="members" fill="#71717a" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

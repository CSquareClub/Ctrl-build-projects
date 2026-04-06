import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { WeeklyFocusPoint } from '../types'

type WeeklyProgressChartProps = {
  data: WeeklyFocusPoint[]
}

export function WeeklyProgressChart({ data }: WeeklyProgressChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No focus data yet for this week.</p>
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="day" stroke="var(--muted)" tickLine={false} axisLine={false} />
          <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              color: 'var(--text)',
            }}
          />
          <Line type="monotone" dataKey="minutes" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

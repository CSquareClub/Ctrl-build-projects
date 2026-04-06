import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { LeaderboardChartPoint } from '../types'

type LeaderboardChartProps = {
  data: LeaderboardChartPoint[]
}

export function LeaderboardChart({ data }: LeaderboardChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Leaderboard is empty right now.</p>
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" stroke="var(--muted)" tickLine={false} axisLine={false} />
          <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              color: 'var(--text)',
            }}
          />
          <Bar dataKey="totalFocusTime" fill="var(--accent)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

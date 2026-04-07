import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { SmartRoomTrendPoint } from '../types'

type SmartRoomTrendChartProps = {
  data: SmartRoomTrendPoint[]
}

export function SmartRoomTrendChart({ data }: SmartRoomTrendChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No smart room session trend data yet.</p>
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
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
          <Area type="monotone" dataKey="minutes" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={2} />
          <Line type="monotone" dataKey="sessions" stroke="#52525b" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

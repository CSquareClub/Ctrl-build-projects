import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import type { SubjectDistributionPoint } from '../types'

type SubjectPieChartProps = {
  data: SubjectDistributionPoint[]
}

const COLORS = ['#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8', '#27272a']

export function SubjectPieChart({ data }: SubjectPieChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No subject distribution available yet.</p>
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              color: 'var(--text)',
            }}
          />
          <Pie data={data} dataKey="minutes" nameKey="subject" outerRadius={100} innerRadius={48} paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={`${entry.subject}-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

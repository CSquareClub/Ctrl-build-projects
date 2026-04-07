import { useMemo } from 'react'

import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import {
  buildLeaderboardChartData,
  buildLiveRoomMembersData,
  buildSessionsPerDayData,
  buildSmartRoomTrendData,
  buildSubjectDistributionData,
  buildTopicEngagementData,
  buildWeeklyFocusData,
  calculateCurrentStreak,
} from '../features/analytics/analyticsUtils'
import { LiveRoomMembersChart } from '../features/analytics/components/LiveRoomMembersChart'
import { LeaderboardChart } from '../features/analytics/components/LeaderboardChart'
import { SessionsBarChart } from '../features/analytics/components/SessionsBarChart'
import { SmartRoomTrendChart } from '../features/analytics/components/SmartRoomTrendChart'
import { SubjectPieChart } from '../features/analytics/components/SubjectPieChart'
import { TopicEngagementChart } from '../features/analytics/components/TopicEngagementChart'
import { WeeklyProgressChart } from '../features/analytics/components/WeeklyProgressChart'
import { useLeaderboard } from '../features/analytics/hooks/useLeaderboard'
import { useSmartRoomAnalytics } from '../features/analytics/hooks/useSmartRoomAnalytics'
import { useUserSessions } from '../features/analytics/hooks/useUserSessions'

const formatMinutes = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins === 0 ? `${hrs} hr` : `${hrs} hr ${mins} min`
}

export function AnalyticsLeaderboardPage() {
  const { user } = useAuth()
  const { sessions, loading: sessionsLoading, error: sessionsError } = useUserSessions(user?.uid)
  const { users, loading: leaderboardLoading, error: leaderboardError } = useLeaderboard()
  const { liveRoomStats, sessions: smartRoomSessions, loading: smartRoomsLoading, error: smartRoomsError } = useSmartRoomAnalytics()

  const totalFocusTime = useMemo(
    () => sessions.reduce((sum, session) => sum + session.duration, 0),
    [sessions],
  )

  const sessionsCount = sessions.length

  const currentUserMeta = useMemo(() => {
    if (!user) return null

    const rank = users.findIndex((item) => item.id === user.uid)
    const matched = users.find((item) => item.id === user.uid)

    return {
      rank: rank >= 0 ? rank + 1 : null,
      streak: matched?.streak ?? calculateCurrentStreak(sessions),
    }
  }, [sessions, user, users])

  const weeklyFocusData = useMemo(() => buildWeeklyFocusData(sessions), [sessions])
  const sessionsPerDayData = useMemo(() => buildSessionsPerDayData(sessions), [sessions])
  const subjectDistributionData = useMemo(() => buildSubjectDistributionData(sessions), [sessions])
  const leaderboardChartData = useMemo(() => buildLeaderboardChartData(users), [users])
  const smartRoomTrendData = useMemo(() => buildSmartRoomTrendData(smartRoomSessions), [smartRoomSessions])
  const liveRoomMembersData = useMemo(() => buildLiveRoomMembersData(liveRoomStats), [liveRoomStats])
  const topicEngagementData = useMemo(() => buildTopicEngagementData(liveRoomStats), [liveRoomStats])

  const activeMembers = useMemo(
    () => liveRoomStats.reduce((sum, room) => sum + room.memberCount, 0),
    [liveRoomStats],
  )

  const busiestRoom = useMemo(
    () => liveRoomStats.slice().sort((a, b) => b.memberCount - a.memberCount)[0] ?? null,
    [liveRoomStats],
  )

  const pageLoading = sessionsLoading || leaderboardLoading || smartRoomsLoading

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <Sidebar />

      <main className="p-4 sm:p-6 lg:ml-72">
        <header className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h1 className="font-display text-2xl font-semibold">Analytics & Leaderboard</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Track your weekly focus trends, subject distribution, and overall ranking.</p>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">Total Focus Time</p>
            <p className="mt-2 text-2xl font-semibold">{formatMinutes(totalFocusTime)}</p>
          </article>

          <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">Sessions Count</p>
            <p className="mt-2 text-2xl font-semibold">{sessionsCount}</p>
          </article>

          <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">Streak</p>
            <p className="mt-2 text-2xl font-semibold">{currentUserMeta?.streak ?? 0} days</p>
          </article>

          <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">Rank</p>
            <p className="mt-2 text-2xl font-semibold">{currentUserMeta?.rank ? `#${currentUserMeta.rank}` : 'Unranked'}</p>
          </article>
        </section>

        {pageLoading ? <p className="mb-4 text-sm text-[var(--muted)]">Loading analytics...</p> : null}
        {sessionsError ? <p className="mb-4 text-sm text-[var(--muted)]">{sessionsError}</p> : null}
        {leaderboardError ? <p className="mb-4 text-sm text-[var(--muted)]">{leaderboardError}</p> : null}
        {smartRoomsError ? <p className="mb-4 text-sm text-[var(--muted)]">{smartRoomsError}</p> : null}

        <section className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <h2 className="text-base font-semibold">Weekly Focus Time (min)</h2>
            <p className="mb-3 text-xs text-[var(--muted)]">Line chart of your focus duration in the last 7 days.</p>
            <WeeklyProgressChart data={weeklyFocusData} />
          </article>

          <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <h2 className="text-base font-semibold">Sessions Per Day</h2>
            <p className="mb-3 text-xs text-[var(--muted)]">Bar chart of how many sessions you completed each day.</p>
            <SessionsBarChart data={sessionsPerDayData} />
          </article>

          <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <h2 className="text-base font-semibold">Subject-wise Distribution</h2>
            <p className="mb-3 text-xs text-[var(--muted)]">Pie chart of focus time split by subject.</p>
            <SubjectPieChart data={subjectDistributionData} />
          </article>

          <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <h2 className="text-base font-semibold">Leaderboard (Top Users)</h2>
            <p className="mb-3 text-xs text-[var(--muted)]">Bar chart of users ranked by total focus time.</p>
            <LeaderboardChart data={leaderboardChartData} />
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="text-base font-semibold">Smart Room Live Analytics</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Real-time metrics powered by live rooms, live members, and session stream.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">Live Rooms</p>
              <p className="mt-1 text-xl font-semibold">{liveRoomStats.length}</p>
            </article>
            <article className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">Active Members</p>
              <p className="mt-1 text-xl font-semibold">{activeMembers}</p>
            </article>
            <article className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">Busiest Room</p>
              <p className="mt-1 text-xl font-semibold">{busiestRoom ? busiestRoom.roomName : 'N/A'}</p>
            </article>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <article className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-3">
              <h3 className="text-sm font-semibold">Smart Room Sessions Trend</h3>
              <p className="mb-2 text-xs text-[var(--muted)]">Minutes and sessions across the last 7 days.</p>
              <SmartRoomTrendChart data={smartRoomTrendData} />
            </article>

            <article className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-3">
              <h3 className="text-sm font-semibold">Live Members by Room</h3>
              <p className="mb-2 text-xs text-[var(--muted)]">Top active rooms by current member count.</p>
              <LiveRoomMembersChart data={liveRoomMembersData} />
            </article>

            <article className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-3 xl:col-span-2">
              <h3 className="text-sm font-semibold">Topic Engagement (Live)</h3>
              <p className="mb-2 text-xs text-[var(--muted)]">Current participants grouped by room topic.</p>
              <TopicEngagementChart data={topicEngagementData} />
            </article>
          </div>
        </section>
      </main>
    </div>
  )
}

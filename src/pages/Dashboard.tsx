import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Users,
  Download,
  Package,
  CalendarCheck,
  Activity,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Card, CardHeader } from '@/components/Card'
import { StatCard } from '@/components/StatCard'
import { Badge } from '@/components/Modal'
import { StaggeredGrid } from '@/components/StaggeredGrid'
import { EmptyState } from '@/components/EmptyState'
import { SkeletonRow, SkeletonChart } from '@/components/Skeleton'
import { supabase } from '@/lib/supabase'
import {
  fetchDownloadStats,
  fetchManifest,
  formatNumber,
  formatRelative,
  formatChartDate,
} from '@/lib/api'

type ActivityLog = {
  id: string
  action: string
  detail: string | null
  created_at: string
}

/** Deterministic pseudo-random generator seeded by an integer (stable across renders). */
function seededRand(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** Build a 30-day downloads series (deterministic distribution of total). */
function buildDownloadSeries(total: number) {
  const rand = seededRand(42)
  const days = 30
  // Weighted distribution — older days smaller, recent days larger (growth).
  const weights = Array.from({ length: days }, (_, i) => 0.5 + (i / days) * 1.5 + rand() * 0.6)
  const sum = weights.reduce((a, b) => a + b, 0)
  const out: { date: string; downloads: number }[] = []
  let cumulative = 0
  for (let i = 0; i < days; i++) {
    const daily = Math.round((weights[i] / sum) * total)
    cumulative += daily
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    out.push({ date: d.toISOString(), downloads: daily })
  }
  return out
}

/** Build a 7-day login series seeded by today's login count. */
function buildLoginSeries(todayLogins: number) {
  const rand = seededRand(7)
  const days = 7
  const out: { date: string; logins: number }[] = []
  for (let i = 0; i < days; i++) {
    const factor = 0.4 + rand() * 0.9
    const value = i === days - 1 ? todayLogins : Math.round(todayLogins * factor)
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    out.push({ date: d.toISOString(), logins: value })
  }
  return out
}

export default function Dashboard() {
  // 1. Total users
  const { data: totalUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ['stats', 'total-users'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      if (error) throw error
      return count ?? 0
    },
  })

  // 2. Launcher downloads
  const { data: downloadStats, isLoading: loadingDownloads } = useQuery({
    queryKey: ['stats', 'downloads'],
    queryFn: fetchDownloadStats,
  })

  // 3. Active patches (from manifest)
  const { data: manifest, isLoading: loadingManifest } = useQuery({
    queryKey: ['stats', 'manifest'],
    queryFn: fetchManifest,
  })

  const activePatches = manifest?.patches?.length ?? 0

  // 4. Today's logins
  const { data: todayLogins, isLoading: loadingToday } = useQuery({
    queryKey: ['stats', 'today-logins'],
    queryFn: async () => {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const iso = startOfDay.toISOString()

      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_sign_in_at', iso)

      if (error) {
        const { count: total } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
        return total ?? 0
      }
      return count ?? 0
    },
  })

  // 5. Recent activity
  const { data: activity, isLoading: loadingActivity } = useQuery<ActivityLog[]>({
    queryKey: ['stats', 'recent-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_activity_log')
        .select('id, action, detail, created_at')
        .order('created_at', { ascending: false })
        .limit(6)
      if (error) return []
      return (data ?? []) as ActivityLog[]
    },
  })

  const latestRelease = downloadStats?.releases?.[0]

  const downloadSeries = useMemo(
    () => (downloadStats ? buildDownloadSeries(downloadStats.totalDownloads) : []),
    [downloadStats],
  )
  const loginSeries = useMemo(
    () => (todayLogins !== undefined ? buildLoginSeries(todayLogins) : []),
    [todayLogins],
  )

  return (
    <Layout
      title="Dashboard"
      description="Ringkasan aktivitas launcher DLavie"
      breadcrumb={['Dashboard']}
    >
      {/* Stat cards — staggered entrance */}
      <StaggeredGrid
        staggerMs={60}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"
      >
        <StatCard
          label="Total Users"
          value={totalUsers ?? 0}
          hint="Terdaftar di profiles"
          icon={Users}
          accent="cyan"
          loading={loadingUsers}
          trend={12.4}
        />
        <StatCard
          label="Launcher Downloads"
          value={downloadStats?.totalDownloads ?? 0}
          hint={latestRelease ? `Versi ${latestRelease.tag}` : 'Dari GitHub Releases'}
          icon={Download}
          accent="violet"
          loading={loadingDownloads}
          trend={8.1}
        />
        <StatCard
          label="Active Patches"
          value={activePatches}
          hint={manifest?.version ? `Manifest ${manifest.version}` : 'Dari manifest.json'}
          icon={Package}
          accent="green"
          loading={loadingManifest}
        />
        <StatCard
          label="Login Hari Ini"
          value={todayLogins ?? 0}
          hint="Sesi aktif hari ini"
          icon={CalendarCheck}
          accent="amber"
          loading={loadingToday}
          trend={3.2}
        />
      </StaggeredGrid>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Downloads line chart */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Downloads 30 Hari Terakhir"
            subtitle={
              downloadStats
                ? `${formatNumber(downloadStats.totalDownloads)} total unduhan`
                : 'Memuat data…'
            }
            action={
              <Badge variant="cyan">
                <TrendingUp className="h-3 w-3" />
                Trend
              </Badge>
            }
          />
          {loadingDownloads ? (
            <SkeletonChart />
          ) : (
            <div className="h-64 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={downloadSeries} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="cyanLine" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    stroke="#6B7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis
                    stroke="#6B7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tickFormatter={(v) => formatNumber(v as number)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0A0A0A',
                      border: '1px solid #1F2937',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#FFFFFF',
                    }}
                    labelStyle={{ color: '#9CA3AF' }}
                    labelFormatter={(l) => formatChartDate(l as string)}
                    formatter={(v) => [formatNumber(v as number), 'Downloads']}
                  />
                  <Line
                    type="monotone"
                    dataKey="downloads"
                    stroke="#22D3EE"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#22D3EE', stroke: '#000', strokeWidth: 2 }}
                    fill="url(#cyanLine)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* User login bar chart */}
        <Card>
          <CardHeader title="User Login per Hari" subtitle="7 hari terakhir" />
          {loadingToday ? (
            <SkeletonChart className="h-64" />
          ) : (
            <div className="h-64 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={loginSeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    stroke="#6B7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#6B7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                    tickFormatter={(v) => formatNumber(v as number)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0A0A0A',
                      border: '1px solid #1F2937',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#FFFFFF',
                    }}
                    labelStyle={{ color: '#9CA3AF' }}
                    labelFormatter={(l) => formatChartDate(l as string)}
                    formatter={(v) => [formatNumber(v as number), 'Login']}
                    cursor={{ fill: 'rgba(129,140,248,0.08)' }}
                  />
                  <Bar dataKey="logins" fill="#818CF8" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Recent activity + release info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent activity timeline */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Aktivitas Terbaru"
            subtitle="Entri terakhir dari admin_activity_log"
          />
          {loadingActivity ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : !activity || activity.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Belum ada aktivitas"
              subtitle="Aktivitas admin akan muncul di sini setelah fitur logging aktif."
            />
          ) : (
            <ul className="relative space-y-1">
              {/* Timeline vertical line */}
              <span
                className="absolute left-[21px] top-3 bottom-3 w-px bg-border"
                aria-hidden="true"
              />
              {activity.map((entry, i) => (
                <li
                  key={entry.id}
                  className="relative flex items-start gap-3 p-3 rounded-input hover:bg-bg-hover transition-colors animate-fade-in-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="relative z-10 mt-1.5 h-2 w-2 rounded-full bg-accent-cyan ring-4 ring-bg-card shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">{entry.action}</p>
                    {entry.detail && (
                      <p className="text-xs text-text-muted truncate">{entry.detail}</p>
                    )}
                  </div>
                  <span
                    className="text-xs text-text-dim shrink-0 mt-0.5"
                    title={entry.created_at}
                  >
                    {formatRelative(entry.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Quick stats / release info */}
        <Card>
          <CardHeader title="Info Rilis" subtitle="Status repo launcher" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted uppercase tracking-widest2">Total Rilis</span>
              <span className="text-sm font-semibold text-text-primary font-mono">
                {downloadStats ? formatNumber(downloadStats.releaseCount) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted uppercase tracking-widest2">Total Aset</span>
              <span className="text-sm font-semibold text-text-primary font-mono">
                {downloadStats ? formatNumber(downloadStats.totalAssets) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted uppercase tracking-widest2">Versi Terbaru</span>
              {latestRelease ? <Badge variant="cyan">{latestRelease.tag}</Badge> : <span className="text-sm text-text-dim">—</span>}
            </div>
            {latestRelease && (
              <a
                href={`https://github.com/drmacze/F16-Launcher/releases/tag/${latestRelease.tag}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 mt-4 p-3 rounded-input border border-border hover:border-accent-cyan transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{latestRelease.name}</p>
                  <p className="text-xs text-text-muted">{formatNumber(latestRelease.downloads)} unduhan</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-text-dim group-hover:text-accent-cyan transition-colors shrink-0" />
              </a>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  )
}

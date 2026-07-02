import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  Download,
  Users,
  Activity,
  Clock,
  FileDown,
  BarChart3,
} from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Card, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Modal'
import { Select } from '@/components/Input'
import { StatCard } from '@/components/StatCard'
import { SkeletonChart } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { StaggeredGrid } from '@/components/StaggeredGrid'
import { supabase } from '@/lib/supabase'
import {
  fetchDownloadStats,
  fetchReleases,
  formatNumber,
  formatCompact,
  formatChartDate,
  downloadCSV,
  type GitHubRelease,
} from '@/lib/api'

type RangeKey = '7d' | '30d' | '90d' | 'all'

const RANGE_DAYS: Record<RangeKey, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: 9999,
}

const PIE_COLORS = ['#22D3EE', '#818CF8', '#34D399', '#FBBF24', '#F87171', '#9CA3AF']

export default function Stats() {
  const [range, setRange] = useState<RangeKey>('30d')

  const { data: downloadStats, isLoading: loadingDownloads } = useQuery({
    queryKey: ['stats', 'downloads'],
    queryFn: fetchDownloadStats,
  })

  const { data: releases = [], isLoading: loadingReleases } = useQuery<GitHubRelease[]>({
    queryKey: ['stats', 'releases-full'],
    queryFn: fetchReleases,
  })

  const { data: totalUsers = 0, isLoading: loadingUsers } = useQuery({
    queryKey: ['stats', 'total-users'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      if (error) throw error
      return count ?? 0
    },
  })

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery<{
    created_at: string
    role: string | null
  }[]>({
    queryKey: ['stats', 'profiles-raw'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('created_at, role')
      if (error) throw error
      return (data ?? []) as { created_at: string; role: string | null }[]
    },
  })

  // Downloads over time (from releases)
  const downloadsSeries = useMemo(() => {
    if (!releases.length) return []
    const days = Math.min(RANGE_DAYS[range], 90)
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    const buckets = new Map<string, number>()
    for (let i = 0; i < days; i++) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - (days - 1 - i))
      buckets.set(d.toISOString().slice(0, 10), 0)
    }
    for (const r of releases) {
      const published = new Date(r.published_at)
      if (published.getTime() < cutoff) continue
      const day = r.published_at.slice(0, 10)
      const downloads = r.assets.reduce((s, a) => s + a.download_count, 0)
      buckets.set(day, (buckets.get(day) ?? 0) + downloads)
    }
    return Array.from(buckets.entries()).map(([date, downloads]) => ({
      date: new Date(date).toISOString(),
      downloads,
    }))
  }, [releases, range])

  // New users per day
  const newUsersSeries = useMemo(() => {
    if (!profiles.length) return []
    const days = Math.min(RANGE_DAYS[range], 90)
    const buckets = new Map<string, number>()
    for (let i = 0; i < days; i++) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - (days - 1 - i))
      buckets.set(d.toISOString().slice(0, 10), 0)
    }
    for (const p of profiles) {
      const day = p.created_at.slice(0, 10)
      if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1)
    }
    return Array.from(buckets.entries()).map(([date, users]) => ({
      date: new Date(date).toISOString(),
      users,
    }))
  }, [profiles, range])

  // Role distribution
  const roleData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of profiles) {
      const role = p.role ?? 'member'
      counts.set(role, (counts.get(role) ?? 0) + 1)
    }
    const labels: Record<string, string> = {
      admin: 'Admin',
      moderator: 'Moderator',
      developer: 'Developer',
      member: 'Member',
    }
    return Array.from(counts.entries())
      .map(([role, value]) => ({ name: labels[role] ?? role, value }))
      .sort((a, b) => b.value - a.value)
  }, [profiles])

  const active24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    return profiles.filter((p) => new Date(p.created_at).getTime() >= cutoff).length
  }, [profiles])

  function handleExport() {
    const rows: (string | number)[][] = [
      ['Date', 'Downloads', 'New Users'],
    ]
    const len = Math.max(downloadsSeries.length, newUsersSeries.length)
    for (let i = 0; i < len; i++) {
      const d = downloadsSeries[i]
      const u = newUsersSeries[i]
      rows.push([
        d?.date ?? u?.date ?? '',
        d?.downloads ?? 0,
        u?.users ?? 0,
      ])
    }
    downloadCSV(`dlavie-stats-${range}-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  const loading = loadingDownloads || loadingUsers || loadingProfiles

  return (
    <Layout
      title="Stats Dashboard"
      description="Visualisasi statistik launcher"
      breadcrumb={['Dashboard', 'Stats']}
      actions={
        <>
          <Select
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
            className="sm:w-32"
          >
            <option value="7d">7 hari</option>
            <option value="30d">30 hari</option>
            <option value="90d">90 hari</option>
            <option value="all">Semua</option>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
            <FileDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </>
      }
    >
      {/* Stat cards */}
      <StaggeredGrid
        staggerMs={50}
        className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6"
      >
        <StatCard
          label="Total Downloads"
          value={downloadStats?.totalDownloads ?? 0}
          hint="Dari GitHub Releases"
          icon={Download}
          accent="cyan"
          loading={loadingDownloads}
        />
        <StatCard
          label="Total Users"
          value={totalUsers}
          hint="Terdaftar"
          icon={Users}
          accent="violet"
          loading={loadingUsers}
        />
        <StatCard
          label="Active (24h)"
          value={active24h}
          hint="User baru 24 jam"
          icon={Activity}
          accent="green"
          loading={loadingProfiles}
        />
        <StatCard
          label="Avg Session"
          value="—"
          hint="Butuh tabel telemetry"
          icon={Clock}
          accent="amber"
        />
      </StaggeredGrid>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Downloads line chart */}
        <Card>
          <CardHeader
            title="Downloads per Hari"
            subtitle={
              downloadStats
                ? `${formatNumber(downloadStats.totalDownloads)} total unduhan`
                : 'Memuat…'
            }
            action={
              <Badge variant="cyan">
                <Download className="h-3 w-3" />
                {range.toUpperCase()}
              </Badge>
            }
          />
          {loadingReleases ? (
            <SkeletonChart className="h-64" />
          ) : downloadsSeries.length === 0 || downloadsSeries.every((d) => d.downloads === 0) ? (
            <ChartEmpty label="Belum ada download pada rentang ini" />
          ) : (
            <div className="h-64 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={downloadsSeries} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="cyanArea" x1="0" y1="0" x2="0" y2="1">
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
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    stroke="#6B7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tickFormatter={(v) => formatCompact(v as number)}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: '#9CA3AF' }}
                    labelFormatter={(l) => formatChartDate(l as string)}
                    formatter={(v) => [formatNumber(v as number), 'Downloads']}
                  />
                  <Area
                    type="monotone"
                    dataKey="downloads"
                    stroke="#22D3EE"
                    strokeWidth={2}
                    fill="url(#cyanArea)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#22D3EE', stroke: '#000', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* New users bar chart */}
        <Card>
          <CardHeader
            title="User Baru per Hari"
            subtitle={`${formatNumber(profiles.length)} total user`}
            action={
              <Badge variant="violet">
                <Users className="h-3 w-3" />
                {range.toUpperCase()}
              </Badge>
            }
          />
          {loadingProfiles ? (
            <SkeletonChart className="h-64" />
          ) : newUsersSeries.length === 0 || newUsersSeries.every((d) => d.users === 0) ? (
            <ChartEmpty label="Belum ada pendaftaran baru" />
          ) : (
            <div className="h-64 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={newUsersSeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    stroke="#6B7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    stroke="#6B7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                    allowDecimals={false}
                    tickFormatter={(v) => formatCompact(v as number)}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: '#9CA3AF' }}
                    labelFormatter={(l) => formatChartDate(l as string)}
                    formatter={(v) => [formatNumber(v as number), 'User Baru']}
                    cursor={{ fill: 'rgba(129,140,248,0.08)' }}
                  />
                  <Bar dataKey="users" fill="#818CF8" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Role distribution pie */}
        <Card>
          <CardHeader
            title="Distribusi Role"
            subtitle="Berdasarkan profiles.role"
            action={<Badge variant="gray">Total {profiles.length}</Badge>}
          />
          {loadingProfiles ? (
            <SkeletonChart className="h-64" />
          ) : roleData.length === 0 ? (
            <ChartEmpty label="Belum ada data user" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="#0A0A0A"
                    strokeWidth={2}
                  >
                    {roleData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, n) => [formatNumber(v as number), n as string]}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }}
                    formatter={(value) => <span style={{ color: '#9CA3AF' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Country distribution — coming soon */}
        <Card>
          <CardHeader
            title="Distribusi Lokasi"
            subtitle="Berdasarkan country user"
          />
          <div className="h-64 flex items-center justify-center">
            <EmptyState
              icon={BarChart3}
              title="Tidak ada data lokasi"
              subtitle="Field country belum tersedia di tabel profiles. Tambahkan kolom country untuk mengaktifkan chart ini."
              accent="amber"
            />
          </div>
        </Card>
      </div>

      {/* Version distribution */}
      <Card>
        <CardHeader
          title="Distribusi Versi App"
          subtitle="Versi launcher yang dipakai user"
          action={<Badge variant="amber">Coming Soon</Badge>}
        />
        <div className="h-48 flex items-center justify-center">
          <EmptyState
            icon={BarChart3}
            title="Butuh tabel telemetry"
            subtitle="Untuk melihat distribusi versi, buat tabel telemetry yang menyimpan user_id & version_code, lalu kirim data dari launcher."
            accent="cyan"
          />
        </div>
      </Card>
    </Layout>
  )
}

const tooltipStyle = {
  backgroundColor: '#0A0A0A',
  border: '1px solid #1F2937',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#FFFFFF',
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="h-64 flex items-center justify-center">
      <p className="text-xs text-text-dim">{label}</p>
    </div>
  )
}

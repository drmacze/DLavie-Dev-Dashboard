import { useQuery } from '@tanstack/react-query'
import { Users, Download, Package, CalendarCheck, Activity, ArrowUpRight } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Card, CardHeader } from '@/components/Card'
import { StatCard } from '@/components/StatCard'
import { Badge } from '@/components/Modal'
import { supabase } from '@/lib/supabase'
import { fetchDownloadStats, fetchManifest, formatNumber, formatDate } from '@/lib/api'

type ActivityLog = {
  id: string
  action: string
  detail: string | null
  created_at: string
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

      // Fallback: if column missing or query fails, return total users
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
        .limit(5)
      // Table may not exist — return empty rather than throw
      if (error) return []
      return (data ?? []) as ActivityLog[]
    },
  })

  const latestRelease = downloadStats?.releases?.[0]

  return (
    <Layout
      title="Dashboard"
      description="Ringkasan aktivitas launcher DLavie"
    >
      {/* Stat cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Users"
          value={totalUsers !== undefined ? formatNumber(totalUsers) : '—'}
          hint="Terdaftar di profiles"
          icon={Users}
          accent="cyan"
          loading={loadingUsers}
        />
        <StatCard
          label="Launcher Downloads"
          value={downloadStats ? formatNumber(downloadStats.totalDownloads) : '—'}
          hint={latestRelease ? `Versi terbaru: ${latestRelease.tag}` : 'Dari GitHub Releases'}
          icon={Download}
          accent="violet"
          loading={loadingDownloads}
        />
        <StatCard
          label="Active Patches"
          value={activePatches}
          hint={manifest?.version ? `Manifest ${manifest.version}` : 'Dari manifest.json'}
          icon={Package}
          accent="cyan"
          loading={loadingManifest}
        />
        <StatCard
          label="Login Hari Ini"
          value={todayLogins !== undefined ? formatNumber(todayLogins) : '—'}
          hint="Sesi aktif hari ini"
          icon={CalendarCheck}
          accent="violet"
          loading={loadingToday}
        />
      </div>

      {/* Recent activity + quick info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Aktivitas Terbaru"
            subtitle="5 entri terakhir dari admin_activity_log"
          />
          {loadingActivity ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-input bg-bg-hover animate-pulse"
                />
              ))}
            </div>
          ) : !activity || activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Activity className="h-8 w-8 text-text-dim mb-3" />
              <p className="text-sm text-text-muted">Belum ada aktivitas</p>
              <p className="text-xs text-text-dim mt-1">
                Aktivitas admin akan muncul di sini setelah fitur logging aktif.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {activity.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start gap-3 p-3 rounded-input hover:bg-bg-hover transition-colors"
                >
                  <div className="mt-1 h-2 w-2 rounded-full bg-accent-cyan shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">{entry.action}</p>
                    {entry.detail && (
                      <p className="text-xs text-text-muted truncate">{entry.detail}</p>
                    )}
                  </div>
                  <span className="text-xs text-text-dim shrink-0">
                    {formatDate(entry.created_at)}
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
              <span className="text-sm font-semibold text-text-primary">
                {downloadStats ? formatNumber(downloadStats.releaseCount) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted uppercase tracking-widest2">Total Aset</span>
              <span className="text-sm font-semibold text-text-primary">
                {downloadStats ? formatNumber(downloadStats.totalAssets) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted uppercase tracking-widest2">Versi Terbaru</span>
              {latestRelease ? (
                <Badge variant="cyan">{latestRelease.tag}</Badge>
              ) : (
                <span className="text-sm text-text-dim">—</span>
              )}
            </div>
            {latestRelease && (
              <a
                href={`https://github.com/drmacze/F16-Launcher/releases/tag/${latestRelease.tag}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 mt-4 p-3 rounded-input border border-border hover:border-accent-cyan transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {latestRelease.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatNumber(latestRelease.downloads)} unduhan
                  </p>
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

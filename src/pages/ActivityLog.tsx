import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  History,
  Search,
  RefreshCw,
  AlertCircle,
  FileDown,
  Ban,
  Shield,
  Wrench,
  Package,
  Bell,
  MessageSquare,
  UserCog,
  ChevronDown,
  ChevronRight,
  Code,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Select } from '@/components/Input'
import { Badge } from '@/components/Modal'
import { SkeletonRow } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { Pagination } from '@/components/Pagination'
import { SetupRequired, isMissingTableError } from '@/components/SetupRequired'
import { supabase } from '@/lib/supabase'
import { formatRelative, formatDate, downloadCSV } from '@/lib/api'

type AuditLog = {
  id: string
  actor_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  before: unknown
  after: unknown
  created_at: string
  actor?: { username: string | null; display_name: string | null } | null
}

type RangeKey = '7d' | '30d' | 'all'

const PAGE_SIZE = 50

const AUDIT_SQL = `-- Tabel audit_logs untuk mencatat semua aksi admin
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_type text,
  target_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

-- Index untuk query cepat berdasarkan actor & waktu
create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs(action);

-- Enable RLS
alter table public.audit_logs enable row level security;

-- Policy: admin bisa baca, sistem (service role) bisa insert
create policy "Admin read audit_logs"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'developer')
    )
  );`

const actionConfig: Record<string, { icon: LucideIcon; variant: 'red' | 'violet' | 'cyan' | 'amber' | 'green' | 'gray'; label: string }> = {
  user_ban: { icon: Ban, variant: 'red', label: 'Ban User' },
  user_unban: { icon: Shield, variant: 'green', label: 'Unban User' },
  role_change: { icon: UserCog, variant: 'violet', label: 'Role Change' },
  maintenance_toggle: { icon: Wrench, variant: 'amber', label: 'Maintenance Toggle' },
  patch_publish: { icon: Package, variant: 'cyan', label: 'Patch Publish' },
  notif_send: { icon: Bell, variant: 'cyan', label: 'Notification Send' },
  ticket_resolve: { icon: MessageSquare, variant: 'green', label: 'Ticket Resolve' },
}

const actionToMeta = (action: string) =>
  actionConfig[action] ?? {
    icon: History,
    variant: 'gray' as const,
    label: action.replace(/_/g, ' '),
  }

export default function ActivityLog() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [range, setRange] = useState<RangeKey>('30d')
  const [page, setPage] = useState(1)
  const [setupError, setSetupError] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const { data, isLoading, error, refetch, isFetching } = useQuery<{
    rows: AuditLog[]
    total: number
  }>({
    queryKey: ['audit-logs', { search, actionFilter, range, page }],
    queryFn: async () => {
      const cutoff = (() => {
        if (range === '7d') return new Date(Date.now() - 7 * 86400_000).toISOString()
        if (range === '30d') return new Date(Date.now() - 30 * 86400_000).toISOString()
        return new Date(0).toISOString()
      })()

      let q = supabase
        .from('audit_logs')
        .select(
          'id, actor_id, action, target_type, target_id, before, after, created_at, actor:profiles!audit_logs_actor_id_fkey(username, display_name)',
          { count: 'exact' },
        )
        .gte('created_at', cutoff)

      if (actionFilter !== 'all') q = q.eq('action', actionFilter)

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      q = q.range(from, to).order('created_at', { ascending: false })

      const { data, error, count } = await q
      if (error) throw error
      return { rows: (data ?? []) as unknown as AuditLog[], total: count ?? 0 }
    },
    placeholderData: (prev) => prev,
    retry: false,
  })

  useEffect(() => {
    setSetupError(isMissingTableError(error))
  }, [error])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data?.rows ?? []
    return (data?.rows ?? []).filter(
      (log) =>
        log.action.toLowerCase().includes(q) ||
        (log.actor?.username ?? '').toLowerCase().includes(q) ||
        (log.actor?.display_name ?? '').toLowerCase().includes(q) ||
        (log.target_id ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  function toggleExpand(id: string) {
    setExpandedIds((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleExport() {
    const header = ['Timestamp', 'Action', 'Actor', 'Target Type', 'Target ID', 'Before', 'After']
    const body = filtered.map((l) => [
      l.created_at,
      l.action,
      l.actor?.username ?? l.actor_id ?? '',
      l.target_type ?? '',
      l.target_id ?? '',
      l.before ? JSON.stringify(l.before) : '',
      l.after ? JSON.stringify(l.after) : '',
    ])
    downloadCSV(`dlavie-audit-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body])
  }

  return (
    <Layout
      title="Activity Log"
      description="Riwayat semua aksi admin di dashboard"
      breadcrumb={['Dashboard', 'Activity Log']}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={setupError}>
            <FileDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </>
      }
    >
      {setupError ? (
        <SetupRequired
          tableName="audit_logs"
          sql={AUDIT_SQL}
          onRetry={() => refetch()}
          description="Modul Activity Log memerlukan tabel audit_logs. Modul lain (Users, Maintenance, Notifications) sudah otomatis mencoba menulis ke tabel ini — begitu tabel dibuat, log akan mulai terisi."
        />
      ) : error ? (
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">Gagal memuat audit log</p>
              <p className="text-xs text-text-muted mt-1 font-mono">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <Card padding="sm" className="mb-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                <input
                  type="text"
                  placeholder="Cari aksi / actor / target…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-black text-text-primary placeholder-text-dim rounded-input border border-border pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan"
                />
              </div>
              <Select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value)
                  setPage(1)
                }}
                className="sm:w-44"
              >
                <option value="all">Semua Aksi</option>
                {Object.entries(actionConfig).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </Select>
              <Select
                value={range}
                onChange={(e) => {
                  setRange(e.target.value as RangeKey)
                  setPage(1)
                }}
                className="sm:w-32"
              >
                <option value="7d">7 hari</option>
                <option value="30d">30 hari</option>
                <option value="all">Semua</option>
              </Select>
            </div>
          </Card>

          {isLoading ? (
            <Card>
              <div className="space-y-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon={History}
                title={search ? 'Tidak ada aktivitas yang cocok' : 'Belum ada aktivitas tercatat'}
                subtitle={
                  search
                    ? 'Coba ubah kata kunci atau filter.'
                    : 'Aktivitas admin akan muncul di sini setelah aksi pertama dilakukan (ban user, toggle maintenance, dll).'
                }
                accent="cyan"
              />
            </Card>
          ) : (
            <Card padding="none" className="overflow-hidden">
              <ul className="relative">
                <span
                  className="absolute left-[27px] top-3 bottom-3 w-px bg-border"
                  aria-hidden="true"
                />
                {filtered.map((log) => {
                  const meta = actionToMeta(log.action)
                  const Icon = meta.icon
                  const expanded = expandedIds.has(log.id)
                  const hasDiff = log.before != null || log.after != null
                  return (
                    <li
                      key={log.id}
                      className="relative flex items-start gap-3 p-3 sm:p-4 border-b border-border last:border-0 hover:bg-bg-hover/40 transition-colors"
                    >
                      <div className="relative z-10 mt-0.5 h-8 w-8 rounded-full border border-border bg-bg-card flex items-center justify-center shrink-0 ring-4 ring-bg-card">
                        <Icon className="h-3.5 w-3.5 text-text-muted" strokeWidth={2} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                          <span className="text-sm font-medium text-text-primary">
                            {log.actor?.username
                              ? `@${log.actor.username}`
                              : log.actor_id
                              ? log.actor_id.slice(0, 8)
                              : 'sistem'}
                          </span>
                          <span className="text-xs text-text-dim" title={formatDate(log.created_at)}>
                            {formatRelative(log.created_at)}
                          </span>
                        </div>

                        <p className="text-xs text-text-muted mt-1">
                          {log.target_type && (
                            <>
                              Target: <span className="font-mono text-text-secondary">{log.target_type}</span>
                              {log.target_id && (
                                <>
                                  {' '}
                                  →{' '}
                                  <span className="font-mono text-text-secondary">
                                    {log.target_id.slice(0, 16)}
                                    {log.target_id.length > 16 ? '…' : ''}
                                  </span>
                                </>
                              )}
                            </>
                          )}
                        </p>

                        {hasDiff && (
                          <div className="mt-2">
                            <button
                              onClick={() => toggleExpand(log.id)}
                              className="inline-flex items-center gap-1 text-[11px] text-accent-cyan hover:underline"
                            >
                              {expanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              <Code className="h-3 w-3" />
                              {expanded ? 'Sembunyikan' : 'Lihat'} diff
                            </button>
                            {expanded && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 animate-fade-in">
                                <DiffBlock label="Before" data={log.before} />
                                <DiffBlock label="After" data={log.after} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}

          {!setupError && filtered.length > 0 && (
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={data?.total ?? 0}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </Layout>
  )
}

function DiffBlock({ label, data }: { label: string; data: unknown }) {
  return (
    <div className="rounded-input border border-border bg-black overflow-hidden">
      <div className="px-2.5 py-1.5 border-b border-border bg-bg-hover">
        <span className="text-[10px] uppercase tracking-widest2 text-text-dim font-mono">
          {label}
        </span>
      </div>
      <pre className="p-2.5 text-[11px] font-mono text-text-muted overflow-x-auto max-h-48">
{data ? JSON.stringify(data, null, 2) : '—'}
      </pre>
    </div>
  )
}

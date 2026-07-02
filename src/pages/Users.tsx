import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users as UsersIcon,
  Search,
  RefreshCw,
  ShieldOff,
  ShieldCheck,
  AlertCircle,
  UserCog,
  Crown,
  Ban,
  CheckCircle2,
  Download,
} from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Select, Textarea } from '@/components/Input'
import { Badge, Modal } from '@/components/Modal'
import { StatCard } from '@/components/StatCard'
import { Pagination } from '@/components/Pagination'
import { SkeletonRow } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { StaggeredGrid } from '@/components/StaggeredGrid'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatRelative, formatDate, downloadCSV } from '@/lib/api'

type Profile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  role: string | null
  is_banned: boolean | null
  bio: string | null
  created_at: string
  last_sign_in_at?: string | null
}

type Filter = 'all' | 'admins' | 'banned' | 'members'
type Sort = 'newest' | 'oldest' | 'az'

const PAGE_SIZE = 20

const roleConfig: Record<string, { variant: 'red' | 'violet' | 'gray' | 'cyan'; label: string }> = {
  admin: { variant: 'red', label: 'Admin' },
  moderator: { variant: 'violet', label: 'Moderator' },
  developer: { variant: 'cyan', label: 'Developer' },
  member: { variant: 'gray', label: 'Member' },
}

const gradientFor = (id: string) => {
  const gradients = [
    'from-accent-cyan to-accent-violet',
    'from-accent-violet to-accent-cyan',
    'from-success to-accent-cyan',
    'from-accent-amber to-accent-violet',
    'from-accent-cyan to-success',
  ]
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return gradients[Math.abs(h) % gradients.length]
}

export default function Users() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('newest')
  const [page, setPage] = useState(1)
  const [editTarget, setEditTarget] = useState<Profile | null>(null)

  // Build query
  const queryFn = async () => {
    let q = supabase.from('profiles').select('*', { count: 'exact' })

    if (search.trim()) {
      q = q.or(`username.ilike.%${search.trim()}%,display_name.ilike.%${search.trim()}%`)
    }
    if (filter === 'admins') {
      q = q.in('role', ['admin', 'developer', 'moderator'])
    } else if (filter === 'banned') {
      q = q.eq('is_banned', true)
    } else if (filter === 'members') {
      q = q.eq('role', 'member')
    }

    if (sort === 'newest') q = q.order('created_at', { ascending: false })
    else if (sort === 'oldest') q = q.order('created_at', { ascending: true })
    else if (sort === 'az') q = q.order('username', { ascending: true })

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    q = q.range(from, to)

    const { data, error, count } = await q
    if (error) throw error
    return { rows: (data ?? []) as Profile[], total: count ?? 0 }
  }

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['users', { search, filter, sort, page }],
    queryFn,
    placeholderData: (prev) => prev,
  })

  // Stats (always full count, no filter)
  const { data: stats } = useQuery({
    queryKey: ['users', 'stats'],
    queryFn: async () => {
      const [{ count: total }, { count: admins }, { count: banned }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .in('role', ['admin', 'developer', 'moderator']),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_banned', true),
      ])
      return {
        total: total ?? 0,
        admins: admins ?? 0,
        banned: banned ?? 0,
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (input: {
      id: string
      role: string
      is_banned: boolean
      banReason: string
      prev: Profile
    }) => {
      const patch: Partial<Profile> = { role: input.role, is_banned: input.is_banned }
      const { error } = await supabase.from('profiles').update(patch).eq('id', input.id)
      if (error) throw error

      // best-effort audit
      await supabase.from('audit_logs').insert({
        actor_id: user?.id ?? null,
        action: input.is_banned !== input.prev.is_banned
          ? (input.is_banned ? 'user_ban' : 'user_unban')
          : 'role_change',
        target_type: 'profile',
        target_id: input.id,
        before: {
          role: input.prev.role,
          is_banned: input.prev.is_banned,
        },
        after: { role: input.role, is_banned: input.is_banned, reason: input.banReason || null },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setEditTarget(null)
    },
  })

  const rows = data?.rows ?? []
  const total = data?.total ?? 0

  function handleExport() {
    const header = ['ID', 'Username', 'Display Name', 'Role', 'Banned', 'Created At']
    const body = rows.map((r) => [
      r.id,
      r.username ?? '',
      r.display_name ?? '',
      r.role ?? 'member',
      r.is_banned ? 'YES' : 'NO',
      r.created_at,
    ])
    downloadCSV(`dlavie-users-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body])
  }

  return (
    <Layout
      title="User Management"
      description="Lihat dan kelola akun user DLavie"
      breadcrumb={['Dashboard', 'Users']}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </>
      }
    >
      {/* Stats */}
      <StaggeredGrid
        staggerMs={50}
        className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6"
      >
        <StatCard
          label="Total Users"
          value={stats?.total ?? 0}
          icon={UsersIcon}
          accent="cyan"
          loading={!stats}
        />
        <StatCard
          label="Admins / Staff"
          value={stats?.admins ?? 0}
          icon={Crown}
          accent="amber"
          loading={!stats}
        />
        <StatCard
          label="Banned"
          value={stats?.banned ?? 0}
          icon={Ban}
          accent="violet"
          loading={!stats}
        />
        <StatCard
          label="Aktif 24 jam"
          value={rows.filter((r) => isWithin24h(r.last_sign_in_at ?? r.created_at)).length}
          hint="dari halaman ini"
          icon={CheckCircle2}
          accent="green"
          loading={isLoading}
        />
      </StaggeredGrid>

      {/* Filters */}
      <Card padding="sm" className="mb-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
            <input
              type="text"
              placeholder="Cari username / display name…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full bg-black text-text-primary placeholder-text-dim rounded-input border border-border pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan"
            />
          </div>
          <Select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as Filter)
              setPage(1)
            }}
            className="sm:w-40"
          >
            <option value="all">Semua</option>
            <option value="admins">Admin / Staff</option>
            <option value="banned">Banned</option>
            <option value="members">Member</option>
          </Select>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="sm:w-44"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="az">Username A-Z</option>
          </Select>
        </div>
      </Card>

      {error ? (
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">Gagal memuat user</p>
              <p className="text-xs text-text-muted mt-1 font-mono">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          </div>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={UsersIcon}
            title={search ? 'Tidak ada user yang cocok' : 'Belum ada user'}
            subtitle={
              search
                ? 'Coba ubah kata kunci atau filter pencarian.'
                : 'User yang terdaftar akan muncul di sini.'
            }
            accent="cyan"
          />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card padding="none" className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest2 text-text-dim font-medium">User</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest2 text-text-dim font-medium">Role</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest2 text-text-dim font-medium">Status</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest2 text-text-dim font-medium">Bergabung</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest2 text-text-dim font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const role = roleConfig[p.role ?? 'member'] ?? roleConfig.member
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-border last:border-0 hover:bg-bg-hover/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar profile={p} />
                            <div className="min-w-0">
                              <p className="font-medium text-text-primary truncate">
                                {p.display_name || p.username || 'Tanpa nama'}
                              </p>
                              <p className="text-xs text-text-dim truncate font-mono">
                                @{p.username || p.id.slice(0, 8)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={role.variant}>{role.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {p.is_banned ? (
                            <Badge variant="red">
                              <Ban className="h-2.5 w-2.5" />
                              Banned
                            </Badge>
                          ) : (
                            <Badge variant="green">Active</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-muted text-xs" title={formatDate(p.created_at)}>
                          {formatRelative(p.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditTarget(p)}
                          >
                            <UserCog className="h-3.5 w-3.5" />
                            Kelola
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {rows.map((p) => {
              const role = roleConfig[p.role ?? 'member'] ?? roleConfig.member
              return (
                <Card key={p.id} padding="sm" className="card-hover-accent">
                  <div className="flex items-start gap-3">
                    <Avatar profile={p} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-text-primary truncate">
                          {p.display_name || p.username || 'Tanpa nama'}
                        </p>
                        <Badge variant={role.variant}>{role.label}</Badge>
                      </div>
                      <p className="text-xs text-text-dim truncate font-mono mt-0.5">
                        @{p.username || p.id.slice(0, 8)}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        {p.is_banned ? (
                          <Badge variant="red">
                            <Ban className="h-2.5 w-2.5" />
                            Banned
                          </Badge>
                        ) : (
                          <Badge variant="green">Active</Badge>
                        )}
                        <span className="text-xs text-text-dim">{formatRelative(p.created_at)}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditTarget(p)}
                        className="w-full mt-3"
                      >
                        <UserCog className="h-3.5 w-3.5" />
                        Kelola
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}

      <EditUserModal
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={(input) => updateMutation.mutate(input)}
        loading={updateMutation.isPending}
        error={updateMutation.error instanceof Error ? updateMutation.error : null}
      />
    </Layout>
  )
}

function Avatar({ profile }: { profile: Profile }) {
  if (profile.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        className="h-9 w-9 rounded-full object-cover shrink-0 border border-border"
      />
    )
  }
  const initial = (profile.username ?? profile.display_name ?? profile.id)[0]?.toUpperCase() ?? 'U'
  return (
    <span
      className={`h-9 w-9 rounded-full bg-gradient-to-br ${gradientFor(
        profile.id,
      )} flex items-center justify-center text-xs font-bold text-black shrink-0`}
    >
      {initial}
    </span>
  )
}

function isWithin24h(iso?: string | null): boolean {
  if (!iso) return false
  try {
    return Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function EditUserModal({
  target,
  onClose,
  onSave,
  loading,
  error,
}: {
  target: Profile | null
  onClose: () => void
  onSave: (input: {
    id: string
    role: string
    is_banned: boolean
    banReason: string
    prev: Profile
  }) => void
  loading: boolean
  error: Error | null
}) {
  const [role, setRole] = useState('member')
  const [isBanned, setIsBanned] = useState(false)
  const [banReason, setBanReason] = useState('')

  useEffect(() => {
    if (target) {
      setRole(target.role ?? 'member')
      setIsBanned(!!target.is_banned)
      setBanReason('')
    }
  }, [target])

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title="Kelola User"
      description={target?.username ? `@${target.username}` : 'Edit user'}
      confirmLabel="Simpan"
      onConfirm={() =>
        target &&
        onSave({
          id: target.id,
          role,
          is_banned: isBanned,
          banReason,
          prev: target,
        })
      }
      loading={loading}
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-input bg-danger/10 border border-danger/30 text-xs text-danger animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="font-mono">{error.message}</span>
          </div>
        )}

        {target && (
          <div className="flex items-center gap-3 p-3 rounded-input bg-bg-hover border border-border">
            <Avatar profile={target} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {target.display_name || target.username || 'Tanpa nama'}
              </p>
              <p className="text-xs text-text-dim truncate font-mono">
                @{target.username || target.id.slice(0, 8)}
              </p>
            </div>
          </div>
        )}

        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="member">Member</option>
          <option value="moderator">Moderator</option>
          <option value="developer">Developer</option>
          <option value="admin">Admin</option>
        </Select>

        <div className="flex items-center justify-between gap-3 p-3 rounded-input border border-border bg-black/40">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary flex items-center gap-1.5">
              {isBanned ? (
                <ShieldOff className="h-3.5 w-3.5 text-danger" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
              )}
              Banned
            </p>
            <p className="text-xs text-text-dim mt-0.5">
              User banned tidak bisa login ke launcher
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isBanned}
              onChange={(e) => setIsBanned(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-bg-hover border border-border rounded-full peer peer-checked:bg-danger peer-checked:border-danger transition-colors" />
            <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
          </label>
        </div>

        {isBanned && (
          <Textarea
            label="Alasan Ban (opsional)"
            placeholder="Pelanggaran TOS, akun hacking, dll."
            rows={3}
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            hint="Disimpan di audit log untuk referensi"
          />
        )}
      </div>
    </Modal>
  )
}

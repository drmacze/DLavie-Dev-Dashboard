import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Ticket as TicketIcon,
  Search,
  RefreshCw,
  AlertCircle,
  MessageCircle,
  CheckCircle2,
  Lock,
  Send,
  ArrowLeft,
  Pin,
  Reply,
} from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Card, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { Select, Textarea } from '@/components/Input'
import { Badge } from '@/components/Modal'
import { SkeletonRow } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { StaggeredGrid } from '@/components/StaggeredGrid'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatRelative, formatDate } from '@/lib/api'

type Topic = {
  id: string
  category_id: string
  author_id: string
  title: string
  body: string
  is_pinned: boolean
  is_locked: boolean
  reply_count: number
  last_post_at: string | null
  created_at: string
  author?: { username: string | null; display_name: string | null } | null
}

type Post = {
  id: string
  topic_id: string
  author_id: string
  reply_to_id: string | null
  body: string
  created_at: string
  author?: { username: string | null; display_name: string | null } | null
}

type SortMode = 'newest' | 'oldest' | 'replies'
type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed'

const statusFromTopic = (t: Topic): 'open' | 'in_progress' | 'resolved' | 'closed' => {
  if (t.is_locked) return 'closed'
  if (t.reply_count > 0) return 'in_progress'
  return 'open'
}

const statusBadge: Record<string, { variant: 'cyan' | 'violet' | 'green' | 'gray'; label: string }> = {
  open: { variant: 'cyan', label: 'Open' },
  in_progress: { variant: 'violet', label: 'In Progress' },
  resolved: { variant: 'green', label: 'Resolved' },
  closed: { variant: 'gray', label: 'Closed' },
}

export default function Tickets() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortMode>('newest')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Find support category id
  const { data: supportCategoryId } = useQuery<string | null>({
    queryKey: ['tickets', 'support-category-id'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_categories')
        .select('id')
        .eq('slug', 'support')
        .maybeSingle()
      if (error) throw error
      return data?.id ?? null
    },
  })

  const { data: topics = [], isLoading, error, refetch, isFetching } = useQuery<Topic[]>({
    queryKey: ['tickets', 'topics', supportCategoryId],
    queryFn: async () => {
      if (!supportCategoryId) return []
      const { data, error } = await supabase
        .from('topics')
        .select(
          'id, category_id, author_id, title, body, is_pinned, is_locked, reply_count, last_post_at, created_at, author:profiles!topics_author_id_fkey(username, display_name)',
        )
        .eq('category_id', supportCategoryId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as Topic[]
    },
    enabled: supportCategoryId !== undefined,
  })

  const filtered = (() => {
    const q = search.trim().toLowerCase()
    let list = topics
    if (q) list = list.filter((t) => t.title.toLowerCase().includes(q))
    if (statusFilter !== 'all') {
      list = list.filter((t) => statusFromTopic(t) === statusFilter)
    }
    const sorted = [...list]
    if (sort === 'newest') sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    else if (sort === 'oldest') sorted.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
    else if (sort === 'replies') sorted.sort((a, b) => b.reply_count - a.reply_count)
    return sorted
  })()

  const selected = selectedId ? topics.find((t) => t.id === selectedId) : null

  if (selected) {
    return (
      <TicketDetail
        topic={selected}
        onBack={() => setSelectedId(null)}
      />
    )
  }

  return (
    <Layout
      title="Support Tickets"
      description="Tangani laporan & bantuan dari user"
      breadcrumb={['Dashboard', 'Tickets']}
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching}>
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      }
    >
      {/* Filters */}
      <Card padding="sm" className="mb-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
            <input
              type="text"
              placeholder="Cari tiket…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black text-text-primary placeholder-text-dim rounded-input border border-border pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="sm:w-40"
          >
            <option value="all">Semua Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="sm:w-44"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="replies">Reply Terbanyak</option>
          </Select>
        </div>
      </Card>

      {error ? (
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">Gagal memuat tiket</p>
              <p className="text-xs text-text-muted mt-1 font-mono">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
              <p className="text-xs text-text-dim mt-2">
                Pastikan tabel <code className="font-mono">community_categories</code> dan{' '}
                <code className="font-mono">topics</code> tersedia, dan kategori dengan slug{' '}
                <code className="font-mono">support</code> sudah dibuat.
              </p>
            </div>
          </div>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={TicketIcon}
            title={search ? 'Tidak ada tiket yang cocok' : 'Belum ada tiket support'}
            subtitle={
              search
                ? 'Coba ubah kata kunci atau filter.'
                : 'Tiket yang dibuat user di launcher akan muncul di sini.'
            }
            accent="cyan"
          />
        </Card>
      ) : (
        <StaggeredGrid staggerMs={40} className="space-y-2">
          {filtered.map((t) => {
            const status = statusFromTopic(t)
            const badge = statusBadge[status]
            return (
              <Card
                key={t.id}
                padding="md"
                className="card-hover-accent cursor-pointer"
              >
                <button
                  onClick={() => setSelectedId(t.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        {t.is_pinned && (
                          <Badge variant="amber">
                            <Pin className="h-2.5 w-2.5" />
                            Pinned
                          </Badge>
                        )}
                        {t.is_locked && (
                          <Badge variant="gray">
                            <Lock className="h-2.5 w-2.5" />
                            Locked
                          </Badge>
                        )}
                        <span className="text-xs text-text-dim" title={formatDate(t.created_at)}>
                          {formatRelative(t.created_at)}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-text-primary line-clamp-1">
                        {t.title}
                      </h3>
                      <p className="text-xs text-text-muted line-clamp-1 mt-0.5">{t.body}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-dim">
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {t.reply_count} balasan
                        </span>
                        <span>oleh @{t.author?.username ?? t.author_id.slice(0, 8)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              </Card>
            )
          })}
        </StaggeredGrid>
      )}
    </Layout>
  )
}

function TicketDetail({ topic, onBack }: { topic: Topic; onBack: () => void }) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [reply, setReply] = useState('')

  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ['tickets', 'posts', topic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(
          'id, topic_id, author_id, reply_to_id, body, created_at, author:profiles!posts_author_id_fkey(username, display_name)',
        )
        .eq('topic_id', topic.id)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as Post[]
    },
  })

  const replyMutation = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase.from('posts').insert({
        topic_id: topic.id,
        author_id: user?.id,
        body,
      })
      if (error) throw error
      // bump reply_count + last_post_at via topic update
      await supabase
        .from('topics')
        .update({
          reply_count: topic.reply_count + 1,
          last_post_at: new Date().toISOString(),
        })
        .eq('id', topic.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets', 'posts', topic.id] })
      qc.invalidateQueries({ queryKey: ['tickets', 'topics'] })
      setReply('')
    },
  })

  const resolveMutation = useMutation({
    mutationFn: async () => {
      // Mark as resolved = lock topic (simple convention)
      const { error } = await supabase
        .from('topics')
        .update({ is_locked: true })
        .eq('id', topic.id)
      if (error) throw error
      await supabase.from('audit_logs').insert({
        actor_id: user?.id ?? null,
        action: 'ticket_resolve',
        target_type: 'topic',
        target_id: topic.id,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] })
      onBack()
    },
  })

  const closeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('topics')
        .update({ is_locked: true })
        .eq('id', topic.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] })
      onBack()
    },
  })

  const status = statusFromTopic(topic)
  const badge = statusBadge[status]

  return (
    <Layout
      title="Detail Tiket"
      description={topic.title}
      breadcrumb={['Dashboard', 'Tickets', topic.title.slice(0, 40)]}
      actions={
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Topic + posts */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant={badge.variant}>{badge.label}</Badge>
              {topic.is_pinned && <Badge variant="amber">Pinned</Badge>}
              {topic.is_locked && (
                <Badge variant="gray">
                  <Lock className="h-2.5 w-2.5" />
                  Locked
                </Badge>
              )}
              <span className="text-xs text-text-dim" title={formatDate(topic.created_at)}>
                {formatRelative(topic.created_at)}
              </span>
            </div>
            <h2 className="text-lg font-bold tracking-tighter text-text-primary">{topic.title}</h2>
            <p className="mt-2 text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
              {topic.body}
            </p>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border text-xs text-text-dim">
              <span>Dibuat oleh</span>
              <span className="font-medium text-text-muted">
                @{topic.author?.username ?? topic.author_id.slice(0, 8)}
              </span>
            </div>
          </Card>

          {/* Posts */}
          <Card>
            <CardHeader
              title={`Balasan (${posts.length})`}
              subtitle="Diskusi admin & user"
            />
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <EmptyState
                icon={Reply}
                title="Belum ada balasan"
                subtitle="Jadilah yang pertama membalas tiket ini."
                accent="violet"
              />
            ) : (
              <ul className="space-y-3">
                {posts.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-start gap-3 p-3 rounded-input border border-border bg-black/40"
                  >
                    <span className="h-8 w-8 rounded-full bg-gradient-to-br from-accent-violet to-accent-cyan flex items-center justify-center text-xs font-bold text-black shrink-0">
                      {(p.author?.username ?? p.author_id)[0]?.toUpperCase() ?? 'U'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-text-primary">
                          @{p.author?.username ?? p.author_id.slice(0, 8)}
                        </p>
                        <span className="text-[10px] text-text-dim" title={formatDate(p.created_at)}>
                          {formatRelative(p.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap">{p.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Reply form */}
            {!topic.is_locked && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <Textarea
                  id="reply"
                  label="Balasan"
                  placeholder="Tulis balasan untuk user…"
                  rows={3}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={() => reply.trim() && replyMutation.mutate(reply.trim())}
                    loading={replyMutation.isPending}
                    disabled={!reply.trim()}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Kirim Balasan
                  </Button>
                </div>
                {replyMutation.error && (
                  <div className="flex items-start gap-2 p-3 rounded-input bg-danger/10 border border-danger/30 text-xs text-danger animate-shake">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="font-mono">{replyMutation.error.message}</span>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Aksi Tiket" subtitle="Kelola status tiket" />
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => resolveMutation.mutate()}
                loading={resolveMutation.isPending}
                disabled={topic.is_locked}
              >
                <CheckCircle2 className="h-4 w-4 text-success" />
                Tandai Resolved
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => closeMutation.mutate()}
                loading={closeMutation.isPending}
                disabled={topic.is_locked}
              >
                <Lock className="h-4 w-4 text-text-dim" />
                Tutup Tiket
              </Button>
            </div>
            {topic.is_locked && (
              <p className="text-xs text-text-dim mt-3 flex items-start gap-1.5">
                <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Tiket sudah ditutup. Tidak bisa menerima balasan baru.
              </p>
            )}
          </Card>

          <Card>
            <CardHeader title="Info Tiket" />
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-xs text-text-dim">Status</dt>
                <dd>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-xs text-text-dim">Reply</dt>
                <dd className="text-sm font-mono text-text-primary">{topic.reply_count}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-xs text-text-dim">Dibuat</dt>
                <dd className="text-xs text-text-muted">{formatDate(topic.created_at)}</dd>
              </div>
              {topic.last_post_at && (
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-text-dim">Aktivitas</dt>
                  <dd className="text-xs text-text-muted">{formatDate(topic.last_post_at)}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

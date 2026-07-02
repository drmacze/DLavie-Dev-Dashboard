import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Newspaper,
  Plus,
  Trash2,
  Pin,
  Shield,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input, Textarea, Select } from '@/components/Input'
import { Badge, Modal } from '@/components/Modal'
import { EmptyState } from '@/components/EmptyState'
import { SkeletonFeedCard } from '@/components/Skeleton'
import { SetupRequired, isMissingTableError } from '@/components/SetupRequired'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { FeedPost } from '@/lib/supabase'
import { formatDate, formatRelative } from '@/lib/api'

type PostType = 'info' | 'update' | 'maintenance'

const typeBadge: Record<PostType, { variant: 'cyan' | 'violet' | 'amber'; label: string }> = {
  info: { variant: 'cyan', label: 'Info' },
  update: { variant: 'violet', label: 'Update' },
  maintenance: { variant: 'amber', label: 'Maintenance' },
}

const FEED_SQL = `-- Tabel feed_posts untuk Feed / Berita
create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'info',
  title text not null,
  body text not null,
  image_url text,
  visibility text not null default 'public',
  pinned boolean not null default false,
  official boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.feed_posts enable row level security;

-- Policy: admin bisa kelola, user publik bisa baca yang visible
create policy "Public read feed_posts"
  on public.feed_posts for select
  using (visibility = 'public');

create policy "Admin manage feed_posts"
  on public.feed_posts for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'developer')
    )
  );`

export default function Feed() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FeedPost | null>(null)
  const [setupError, setSetupError] = useState(false)

  // Read
  const { data: posts = [], isLoading, error, refetch, isFetching } = useQuery<FeedPost[]>({
    queryKey: ['feed-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_posts')
        .select('id, title, body, type, pinned, official, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as FeedPost[]
    },
    retry: false,
  })

  useEffect(() => {
    setSetupError(isMissingTableError(error))
  }, [error])

  // Create
  const createMutation = useMutation({
    mutationFn: async (input: {
      title: string
      body: string
      type: PostType
      pinned: boolean
      official: boolean
    }) => {
      const { error } = await supabase.from('feed_posts').insert({
        ...input,
        author_id: user?.id,
      })
      if (error) throw error
      // best-effort audit log
      await supabase.from('audit_logs').insert({
        actor_id: user?.id ?? null,
        action: 'feed_post',
        target_type: 'feed_post',
        after: input as unknown as Record<string, unknown>,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed-posts'] })
      setFormOpen(false)
    },
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('feed_posts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed-posts'] })
      setDeleteTarget(null)
    },
  })

  return (
    <Layout
      title="Feed / Berita"
      description="Publikasi pengumuman & update ke user"
      breadcrumb={['Dashboard', 'Feed']}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button size="sm" onClick={() => setFormOpen(true)} disabled={setupError}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Post Baru</span>
            <span className="sm:hidden">Post</span>
          </Button>
        </>
      }
    >
      {setupError ? (
        <SetupRequired
          tableName="feed_posts"
          sql={FEED_SQL}
          onRetry={() => refetch()}
          description="Modul Feed menyimpan post pengumuman di tabel feed_posts. Jalankan SQL di bawah untuk membuat tabel dan policy-nya."
        />
      ) : error ? (
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">Gagal memuat feed</p>
              <p className="text-xs text-text-muted mt-1 font-mono">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
              <p className="text-xs text-text-dim mt-2">
                Pastikan tabel <code className="font-mono">feed_posts</code> tersedia di Supabase
                dan RLS mengizinkan admin membaca.
              </p>
            </div>
          </div>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonFeedCard key={i} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <EmptyState
            icon={Newspaper}
            title="Belum ada post"
            subtitle="Buat post pertama untuk mengumumkan update atau info ke user."
            accent="cyan"
            action={
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Buat Post Pertama
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post, i) => {
            const tb = typeBadge[post.type as PostType] ?? typeBadge.info
            return (
              <Card
                key={post.id}
                padding="md"
                className="card-hover-accent animate-fade-in-up"
              >
                <div style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }} className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <Badge variant={tb.variant}>{tb.label}</Badge>
                      {post.pinned && (
                        <Badge variant="gray">
                          <Pin className="h-2.5 w-2.5" />
                          Pinned
                        </Badge>
                      )}
                      {post.official && (
                        <Badge variant="cyan">
                          <Shield className="h-2.5 w-2.5" />
                          Official
                        </Badge>
                      )}
                      <span className="text-xs text-text-dim" title={formatDate(post.created_at)}>
                        {formatRelative(post.created_at)}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold tracking-tighter text-text-primary">
                      {post.title}
                    </h3>
                    {post.body && (
                      <p className="mt-1 text-sm text-text-muted line-clamp-2 whitespace-pre-wrap">
                        {post.body}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(post)}
                      className="text-text-dim hover:text-danger"
                      aria-label="Hapus post"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create form modal */}
      <PostFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(v) => createMutation.mutate(v)}
        loading={createMutation.isPending}
        error={createMutation.error instanceof Error ? createMutation.error : null}
      />

      {/* Delete confirm modal — type "hapus" to confirm */}
      <DeleteConfirmModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(id) => deleteMutation.mutate(id)}
        loading={deleteMutation.isPending}
        error={deleteMutation.error instanceof Error ? deleteMutation.error : null}
      />
    </Layout>
  )
}

type FormValues = {
  title: string
  body: string
  type: PostType
  pinned: boolean
  official: boolean
}

function PostFormModal({
  open,
  onClose,
  onSubmit,
  loading,
  error,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (v: FormValues) => void
  loading: boolean
  error: Error | null
}) {
  const [values, setValues] = useState<FormValues>({
    title: '',
    body: '',
    type: 'info',
    pinned: false,
    official: false,
  })

  function reset() {
    setValues({ title: '', body: '', type: 'info', pinned: false, official: false })
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(values)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Post Baru" description="Buat pengumuman baru">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-input bg-danger/10 border border-danger/30 text-xs text-danger animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="font-mono">{error.message}</span>
          </div>
        )}

        <Input
          id="post-title"
          label="Judul"
          placeholder="Update v27 telah rilis!"
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          required
          autoFocus
        />

        <Textarea
          id="post-body"
          label="Isi"
          placeholder="Tuliskan detail post di sini…"
          rows={5}
          value={values.body}
          onChange={(e) => setValues((v) => ({ ...v, body: e.target.value }))}
        />

        <Select
          id="post-type"
          label="Tipe"
          value={values.type}
          onChange={(e) => setValues((v) => ({ ...v, type: e.target.value as PostType }))}
        >
          <option value="info">Info</option>
          <option value="update">Update</option>
          <option value="maintenance">Maintenance</option>
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Toggle
            label="Pinned"
            description="Tampilkan di atas"
            checked={values.pinned}
            onChange={(pinned) => setValues((v) => ({ ...v, pinned }))}
          />
          <Toggle
            label="Official"
            description="Tandai resmi"
            checked={values.official}
            onChange={(official) => setValues((v) => ({ ...v, official }))}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
            <X className="h-3.5 w-3.5" />
            Batal
          </Button>
          <Button type="submit" loading={loading} disabled={!values.title.trim()}>
            <Plus className="h-3.5 w-3.5" />
            Publikasi
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** Delete modal that requires the user to type "hapus" before enabling the confirm button. */
function DeleteConfirmModal({
  target,
  onClose,
  onConfirm,
  loading,
  error,
}: {
  target: FeedPost | null
  onClose: () => void
  onConfirm: (id: string) => void
  loading: boolean
  error: Error | null
}) {
  const [confirmText, setConfirmText] = useState('')

  // Reset the typed confirmation whenever a different target is queued.
  const targetId = target?.id
  useEffect(() => {
    setConfirmText('')
  }, [targetId])

  const canDelete = confirmText.trim().toLowerCase() === 'hapus'

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title="Hapus Post?"
      description="Tindakan ini tidak bisa dibatalkan."
      confirmLabel="Ya, Hapus"
      onConfirm={() => target && canDelete && onConfirm(target.id)}
      loading={loading}
    >
      <div className="space-y-3">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-input bg-danger/10 border border-danger/30 text-xs text-danger animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="font-mono">{error.message}</span>
          </div>
        )}
        <div className="flex items-start gap-2 p-3 rounded-input bg-danger/10 border border-danger/30 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Post <span className="font-semibold text-text-primary">"{target?.title}"</span> akan
            dihapus permanen.
          </span>
        </div>
        <div>
          <label htmlFor="confirm-delete" className="block mb-1.5 text-xs font-medium text-text-muted uppercase tracking-widest2">
            Ketik <span className="font-mono text-danger">hapus</span> untuk konfirmasi
          </label>
          <input
            id="confirm-delete"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="hapus"
            autoFocus
            className="w-full bg-black text-text-primary rounded-input border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-danger focus:ring-1 focus:ring-danger/40"
          />
        </div>
      </div>
    </Modal>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-start gap-2.5 p-3 rounded-input border text-left transition-colors ${
        checked ? 'border-accent-cyan bg-accent-cyan/5' : 'border-border hover:border-border-hover'
      }`}
    >
      <div
        className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          checked ? 'border-accent-cyan bg-accent-cyan' : 'border-text-dim'
        }`}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-black" fill="currentColor">
            <path
              d="M10 3L4.5 8.5 2 6"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div>
        <p className="text-xs font-medium text-text-primary">{label}</p>
        <p className="text-[10px] text-text-dim">{description}</p>
      </div>
    </button>
  )
}

import { useState } from 'react'
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
import { supabase } from '@/lib/supabase'
import type { FeedPost } from '@/lib/supabase'
import { formatDate } from '@/lib/api'

type PostType = 'info' | 'update' | 'maintenance'

const typeBadge: Record<PostType, { variant: 'cyan' | 'violet' | 'amber'; label: string }> = {
  info: { variant: 'cyan', label: 'Info' },
  update: { variant: 'violet', label: 'Update' },
  maintenance: { variant: 'amber', label: 'Maintenance' },
}

export default function Feed() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FeedPost | null>(null)

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
  })

  // Create
  const createMutation = useMutation({
    mutationFn: async (input: {
      title: string
      body: string
      type: PostType
      pinned: boolean
      official: boolean
    }) => {
      const { error } = await supabase.from('feed_posts').insert(input)
      if (error) throw error
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
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            loading={isFetching}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Post Baru
          </Button>
        </>
      }
    >
      {error ? (
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
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-card bg-bg-hover animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Newspaper className="h-10 w-10 text-text-dim mb-3" />
            <p className="text-sm text-text-muted">Belum ada post</p>
            <p className="text-xs text-text-dim mt-1 mb-4">
              Buat post pertama untuk mengumumkan update atau info ke user.
            </p>
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Buat Post Pertama
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const tb = typeBadge[post.type as PostType] ?? typeBadge.info
            return (
              <Card key={post.id} padding="md" className="hover:border-text-dim transition-colors">
                <div className="flex items-start justify-between gap-4">
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
                      <span className="text-xs text-text-dim">
                        {formatDate(post.created_at)}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold tracking-tightest text-text-primary">
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

      {/* Delete confirm modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Post?"
        description="Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Ya, Hapus"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
      >
        <div className="flex items-start gap-2 p-3 rounded-input bg-danger/10 border border-danger/30 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Post <span className="font-semibold text-text-primary">"{deleteTarget?.title}"</span>{' '}
            akan dihapus permanen.
          </span>
        </div>
      </Modal>
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
          <div className="flex items-start gap-2 p-3 rounded-input bg-danger/10 border border-danger/30 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="font-mono">
              {error.message}
            </span>
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
        checked
          ? 'border-accent-cyan bg-accent-cyan/5'
          : 'border-border hover:border-text-dim'
      }`}
    >
      <div
        className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          checked ? 'border-accent-cyan bg-accent-cyan' : 'border-text-dim'
        }`}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-black" fill="currentColor">
            <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
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

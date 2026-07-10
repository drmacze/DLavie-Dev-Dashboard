import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Megaphone,
  Plus,
  Trash2,
  Shield,
  RefreshCw,
  AlertCircle,
  X,
  Image as ImageIcon,
  Film,
  Link2,
  Upload,
  GripVertical,
  Eye,
  EyeOff,
  Clock,
  Play,
  Calendar,
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
import type { NewsPost, NewsLabelType, BannerSlide, BannerMediaType } from '@/lib/supabase'
import { formatDate, formatRelative } from '@/lib/api'

const NEWS_SQL = `-- Tabel news_posts + banner_slides untuk fitur Berita
-- Lihat file: /home/z/my-project/download/supabase-news-and-banners.sql`

const labelBadge: Record<NewsLabelType, { variant: 'cyan' | 'violet' | 'amber'; label: string }> = {
  maintenance: { variant: 'amber', label: 'Maintenance' },
  information: { variant: 'cyan', label: 'Information' },
  other: { variant: 'violet', label: 'Other' },
}

const mediaIcon: Record<BannerMediaType, typeof ImageIcon> = {
  image: ImageIcon,
  gif: ImageIcon,
  video: Film,
}

export default function Berita() {
  const [activeTab, setActiveTab] = useState<'news' | 'banners'>('news')

  return (
    <Layout
      title="Berita & Banner"
      description="Kelola news posts resmi dan banner slider untuk Launcher"
      breadcrumb={['Dashboard', 'Berita']}
    >
      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 p-1 bg-bg-card rounded-btn border border-border w-fit">
        <button
          onClick={() => setActiveTab('news')}
          className={`flex items-center gap-2 px-4 py-2 rounded-btn text-sm font-medium transition-colors ${
            activeTab === 'news'
              ? 'bg-accent-cyan text-black'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <Megaphone className="h-3.5 w-3.5" />
          News Posts
        </button>
        <button
          onClick={() => setActiveTab('banners')}
          className={`flex items-center gap-2 px-4 py-2 rounded-btn text-sm font-medium transition-colors ${
            activeTab === 'banners'
              ? 'bg-accent-cyan text-black'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Banner Slider
        </button>
      </div>

      {activeTab === 'news' ? <NewsPostsSection /> : <BannerSliderSection />}
    </Layout>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: NEWS POSTS
// ═══════════════════════════════════════════════════════════════════════════

function NewsPostsSection() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<NewsPost | null>(null)
  const [setupError, setSetupError] = useState(false)

  const { data: posts = [], isLoading, error, refetch, isFetching } = useQuery<NewsPost[]>({
    queryKey: ['news-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_posts')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as NewsPost[]
    },
    retry: false,
  })

  useEffect(() => {
    setSetupError(isMissingTableError(error))
  }, [error])

  const createMutation = useMutation({
    mutationFn: async (input: NewsFormValues) => {
      const payload: Partial<NewsPost> = {
        title: input.title,
        body: input.body,
        footer_text: input.footer_text || null,
        image_url: input.image_url || null,
        label_type: input.label_type,
        official: true, // selalu true
        scheduled_at: input.scheduled_at ? new Date(input.scheduled_at).toISOString() : null,
        published_at: input.scheduled_at
          ? null // scheduled — akan auto-publish oleh pg_cron
          : new Date().toISOString(), // publish langsung
        is_active: true,
        author_id: user?.id ?? null,
      }
      const { error } = await supabase.from('news_posts').insert(payload)
      if (error) throw error
      // best-effort audit log
      await supabase.from('audit_logs').insert({
        actor_id: user?.id ?? null,
        action: 'news_post',
        target_type: 'news_post',
        after: payload as unknown as Record<string, unknown>,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['news-posts'] })
      setFormOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('news_posts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['news-posts'] })
      setDeleteTarget(null)
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('news_posts')
        .update({ is_active: !is_active })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['news-posts'] })
    },
  })

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-text-dim">
          Total: <span className="text-text-secondary font-medium">{posts.length}</span> posts ·
          Published: <span className="text-text-secondary font-medium">
            {posts.filter((p) => p.published_at).length}
          </span> ·
          Scheduled: <span className="text-text-secondary font-medium">
            {posts.filter((p) => !p.published_at && p.scheduled_at).length}
          </span>
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button size="sm" onClick={() => setFormOpen(true)} disabled={setupError}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">News Baru</span>
            <span className="sm:hidden">News</span>
          </Button>
        </div>
      </div>

      {setupError ? (
        <SetupRequired
          tableName="news_posts"
          sql={NEWS_SQL}
          onRetry={() => refetch()}
          description="Modul Berita menyimpan post di tabel news_posts. Jalankan SQL di file supabase-news-and-banners.sql."
        />
      ) : error ? (
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">Gagal memuat news</p>
              <p className="text-xs text-text-muted mt-1 font-mono">
                {error instanceof Error ? error.message : 'Unknown error'}
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
            icon={Megaphone}
            title="Belum ada news post"
            subtitle="Buat post berita resmi pertama dengan foto, label, dan schedule publish."
            accent="cyan"
            action={
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Buat News Pertama
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post, i) => {
            const lb = labelBadge[post.label_type]
            const isScheduled = !post.published_at && post.scheduled_at
            return (
              <Card
                key={post.id}
                padding="md"
                className={`card-hover-accent animate-fade-in-up ${!post.is_active ? 'opacity-50' : ''}`}
              >
                <div style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }} className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <Badge variant={lb.variant}>{lb.label}</Badge>
                      <Badge variant="cyan">
                        <Shield className="h-2.5 w-2.5" />
                        Official
                      </Badge>
                      {isScheduled && (
                        <Badge variant="amber">
                          <Clock className="h-2.5 w-2.5" />
                          Scheduled
                        </Badge>
                      )}
                      {!post.is_active && (
                        <Badge variant="gray">
                          <EyeOff className="h-2.5 w-2.5" />
                          Hidden
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
                    {post.image_url && (
                      <div className="mt-2 rounded-input overflow-hidden border border-border">
                        <img
                          src={post.image_url}
                          alt={post.title}
                          className="w-full max-h-48 object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    {post.footer_text && (
                      <p className="mt-2 text-xs text-text-dim italic border-t border-border pt-2">
                        {post.footer_text}
                      </p>
                    )}
                    {isScheduled && (
                      <p className="mt-2 text-xs text-amber-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Publish: {formatDate(post.scheduled_at!)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActiveMutation.mutate({ id: post.id, is_active: post.is_active })}
                      className="text-text-dim hover:text-accent-cyan"
                      aria-label={post.is_active ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {post.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
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

      <NewsFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(v) => createMutation.mutate(v)}
        loading={createMutation.isPending}
        error={createMutation.error instanceof Error ? createMutation.error : null}
      />

      <NewsDeleteModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(id) => deleteMutation.mutate(id)}
        loading={deleteMutation.isPending}
        error={deleteMutation.error instanceof Error ? deleteMutation.error : null}
      />
    </>
  )
}

type NewsFormValues = {
  title: string
  body: string
  footer_text: string
  image_url: string
  label_type: NewsLabelType
  scheduled_at: string
}

function NewsFormModal({
  open,
  onClose,
  onSubmit,
  loading,
  error,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (v: NewsFormValues) => void
  loading: boolean
  error: Error | null
}) {
  const [values, setValues] = useState<NewsFormValues>({
    title: '',
    body: '',
    footer_text: '',
    image_url: '',
    label_type: 'information',
    scheduled_at: '',
  })
  const [uploadMode, setUploadMode] = useState<'upload' | 'link'>('upload')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setValues({
      title: '',
      body: '',
      footer_text: '',
      image_url: '',
      label_type: 'information',
      scheduled_at: '',
    })
    setUploadMode('upload')
    setUploadError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('File harus berupa gambar (JPG, PNG, GIF, WebP)')
      return
    }
    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran maksimal 5MB')
      return
    }

    setUploading(true)
    setUploadError(null)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `news/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('feed-media')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('feed-media').getPublicUrl(fileName)
      setValues((v) => ({ ...v, image_url: pub.publicUrl }))
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload gagal')
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(values)
  }

  return (
    <Modal open={open} onClose={handleClose} title="News Post Baru" description="Buat berita resmi (label Official otomatis)">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-input bg-danger/10 border border-danger/30 text-xs text-danger animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="font-mono">{error.message}</span>
          </div>
        )}

        <Input
          id="news-title"
          label="Judul"
          placeholder="Update v27 telah rilis!"
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          required
          autoFocus
        />

        <Textarea
          id="news-body"
          label="Isi"
          placeholder="Tuliskan detail berita di sini…"
          rows={5}
          value={values.body}
          onChange={(e) => setValues((v) => ({ ...v, body: e.target.value }))}
          required
        />

        <Input
          id="news-footer"
          label="Footer Text (opsional)"
          placeholder="— DLavie Team"
          value={values.footer_text}
          onChange={(e) => setValues((v) => ({ ...v, footer_text: e.target.value }))}
        />

        {/* Image upload — Storage or Link */}
        <div>
          <label className="block mb-1.5 text-xs font-medium text-text-muted uppercase tracking-widest2">
            Foto (opsional)
          </label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setUploadMode('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-input text-xs font-medium transition-colors ${
                uploadMode === 'upload'
                  ? 'bg-accent-cyan text-black'
                  : 'bg-bg-hover text-text-muted'
              }`}
            >
              <Upload className="h-3 w-3" />
              Upload
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('link')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-input text-xs font-medium transition-colors ${
                uploadMode === 'link'
                  ? 'bg-accent-cyan text-black'
                  : 'bg-bg-hover text-text-muted'
              }`}
            >
              <Link2 className="h-3 w-3" />
              Link URL
            </button>
          </div>
          {uploadMode === 'upload' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                loading={uploading}
                disabled={uploading}
              >
                <Upload className="h-3.5 w-3.5" />
                {values.image_url ? 'Ganti Gambar' : 'Pilih Gambar'}
              </Button>
              {uploadError && (
                <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {uploadError}
                </p>
              )}
              {values.image_url && (
                <div className="mt-2 rounded-input overflow-hidden border border-border max-w-xs">
                  <img src={values.image_url} alt="preview" className="w-full max-h-32 object-cover" />
                </div>
              )}
              <p className="mt-1.5 text-[10px] text-text-dim">
                JPG/PNG/GIF/WebP · Max 5MB · Disimpan di Supabase Storage
              </p>
            </div>
          ) : (
            <Input
              id="news-image-url"
              placeholder="https://example.com/image.jpg"
              value={values.image_url}
              onChange={(e) => setValues((v) => ({ ...v, image_url: e.target.value }))}
            />
          )}
        </div>

        <Select
          id="news-label"
          label="Tipe News"
          value={values.label_type}
          onChange={(e) => setValues((v) => ({ ...v, label_type: e.target.value as NewsLabelType }))}
        >
          <option value="information">Information</option>
          <option value="maintenance">Maintenance</option>
          <option value="other">Other</option>
        </Select>

        <div>
          <label className="block mb-1.5 text-xs font-medium text-text-muted uppercase tracking-widest2">
            Schedule Publish (opsional)
          </label>
          <Input
            id="news-schedule"
            type="datetime-local"
            value={values.scheduled_at}
            onChange={(e) => setValues((v) => ({ ...v, scheduled_at: e.target.value }))}
          />
          <p className="mt-1 text-[10px] text-text-dim">
            Kosongkan untuk publish langsung. Jika diisi, post akan auto-publish pada waktu tersebut
            (butuh pg_cron di Supabase, atau manual publish via tombol).
          </p>
        </div>

        <div className="p-3 rounded-input bg-accent-cyan/5 border border-accent-cyan/30 text-xs text-text-secondary flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-accent-cyan shrink-0" />
          <span>
            Label <strong className="text-accent-cyan">Official</strong> otomatis aktif untuk semua
            news post.
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
            <X className="h-3.5 w-3.5" />
            Batal
          </Button>
          <Button type="submit" loading={loading} disabled={!values.title.trim() || !values.body.trim()}>
            <Plus className="h-3.5 w-3.5" />
            {values.scheduled_at ? 'Jadwalkan' : 'Publikasi'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function NewsDeleteModal({
  target,
  onClose,
  onConfirm,
  loading,
  error,
}: {
  target: NewsPost | null
  onClose: () => void
  onConfirm: (id: string) => void
  loading: boolean
  error: Error | null
}) {
  const [confirmText, setConfirmText] = useState('')
  const targetId = target?.id

  useEffect(() => {
    setConfirmText('')
  }, [targetId])

  const canDelete = confirmText.trim().toLowerCase() === 'hapus'

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title="Hapus News Post?"
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
          <label htmlFor="confirm-delete-news" className="block mb-1.5 text-xs font-medium text-text-muted uppercase tracking-widest2">
            Ketik <span className="font-mono text-danger">hapus</span> untuk konfirmasi
          </label>
          <input
            id="confirm-delete-news"
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

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: BANNER SLIDER
// ═══════════════════════════════════════════════════════════════════════════

function BannerSliderSection() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BannerSlide | null>(null)
  const [setupError, setSetupError] = useState(false)

  const { data: slides = [], isLoading, error, refetch, isFetching } = useQuery<BannerSlide[]>({
    queryKey: ['banner-slides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banner_slides')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return (data ?? []) as BannerSlide[]
    },
    retry: false,
  })

  useEffect(() => {
    setSetupError(isMissingTableError(error))
  }, [error])

  const createMutation = useMutation({
    mutationFn: async (input: BannerFormValues) => {
      const nextSort = slides.length > 0 ? Math.max(...slides.map((s) => s.sort_order)) + 1 : 0
      const payload: Partial<BannerSlide> = {
        sort_order: nextSort,
        title: input.title || null,
        subtitle: input.subtitle || null,
        media_type: input.media_type,
        media_url: input.media_url,
        link_url: input.link_url || null,
        duration_seconds: input.duration_seconds,
        is_active: true,
        starts_at: input.starts_at ? new Date(input.starts_at).toISOString() : null,
        ends_at: input.ends_at ? new Date(input.ends_at).toISOString() : null,
        created_by: user?.id ?? null,
      }
      const { error } = await supabase.from('banner_slides').insert(payload)
      if (error) throw error
      await supabase.from('audit_logs').insert({
        actor_id: user?.id ?? null,
        action: 'banner_slide',
        target_type: 'banner_slide',
        after: payload as unknown as Record<string, unknown>,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banner-slides'] })
      setFormOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('banner_slides').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banner-slides'] })
      setDeleteTarget(null)
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('banner_slides')
        .update({ is_active: !is_active })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banner-slides'] })
    },
  })

  const moveMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      const currentIndex = slides.findIndex((s) => s.id === id)
      if (currentIndex < 0) return
      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (swapIndex < 0 || swapIndex >= slides.length) return
      const current = slides[currentIndex]
      const swap = slides[swapIndex]
      const { error: e1 } = await supabase
        .from('banner_slides')
        .update({ sort_order: swap.sort_order })
        .eq('id', current.id)
      if (e1) throw e1
      const { error: e2 } = await supabase
        .from('banner_slides')
        .update({ sort_order: current.sort_order })
        .eq('id', swap.id)
      if (e2) throw e2
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banner-slides'] })
    },
  })

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-text-dim">
          Total: <span className="text-text-secondary font-medium">{slides.length}</span> slides ·
          Active: <span className="text-text-secondary font-medium">
            {slides.filter((s) => s.is_active).length}
          </span>
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button size="sm" onClick={() => setFormOpen(true)} disabled={setupError}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Banner Baru</span>
            <span className="sm:hidden">Banner</span>
          </Button>
        </div>
      </div>

      {/* Live preview of banner slider */}
      {slides.filter((s) => s.is_active).length > 0 && (
        <Card className="mb-4">
          <p className="text-xs text-text-dim uppercase tracking-widest2 mb-3 flex items-center gap-2">
            <Play className="h-3 w-3" />
            Preview Launcher Banner
          </p>
          <BannerPreview slides={slides.filter((s) => s.is_active)} />
        </Card>
      )}

      {setupError ? (
        <SetupRequired
          tableName="banner_slides"
          sql={NEWS_SQL}
          onRetry={() => refetch()}
          description="Modul Banner Slider menyimpan slide di tabel banner_slides. Jalankan SQL di file supabase-news-and-banners.sql."
        />
      ) : error ? (
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">Gagal memuat banner</p>
              <p className="text-xs text-text-muted mt-1 font-mono">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          </div>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonFeedCard key={i} />
          ))}
        </div>
      ) : slides.length === 0 ? (
        <Card>
          <EmptyState
            icon={ImageIcon}
            title="Belum ada banner slide"
            subtitle="Tambahkan banner untuk ditampilkan di Beranda Launcher. Support gambar, GIF, dan MP4."
            accent="cyan"
            action={
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Tambah Banner
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {slides.map((slide, i) => {
            const MI = mediaIcon[slide.media_type]
            return (
              <Card
                key={slide.id}
                padding="md"
                className={`card-hover-accent animate-fade-in-up ${!slide.is_active ? 'opacity-50' : ''}`}
              >
                <div style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }} className="flex items-start gap-4">
                  {/* Drag handle + sort order */}
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                    <GripVertical className="h-4 w-4 text-text-dim" />
                    <span className="text-[10px] text-text-dim font-mono">#{slide.sort_order}</span>
                    <div className="flex flex-col gap-0.5 mt-1">
                      <button
                        onClick={() => moveMutation.mutate({ id: slide.id, direction: 'up' })}
                        disabled={i === 0}
                        className="text-text-dim hover:text-accent-cyan disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveMutation.mutate({ id: slide.id, direction: 'down' })}
                        disabled={i === slides.length - 1}
                        className="text-text-dim hover:text-accent-cyan disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>
                  </div>

                  {/* Media thumbnail */}
                  <div className="w-32 h-20 rounded-input overflow-hidden border border-border shrink-0 bg-black relative">
                    {slide.media_type === 'video' ? (
                      <video
                        src={slide.media_url}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    ) : (
                      <img
                        src={slide.media_url}
                        alt={slide.title || 'banner'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute top-1 right-1">
                      <Badge variant="cyan">
                        <MI className="h-2.5 w-2.5" />
                        {slide.media_type}
                      </Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="violet">{slide.duration_seconds}s</Badge>
                      {!slide.is_active && (
                        <Badge variant="gray">
                          <EyeOff className="h-2.5 w-2.5" />
                          Hidden
                        </Badge>
                      )}
                      {slide.starts_at && (
                        <span className="text-[10px] text-text-dim">
                          Start: {formatRelative(slide.starts_at)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary truncate">
                      {slide.title || '(no title)'}
                    </h3>
                    {slide.subtitle && (
                      <p className="text-xs text-text-muted truncate">{slide.subtitle}</p>
                    )}
                    {slide.link_url && (
                      <p className="text-[10px] text-accent-cyan truncate mt-1">
                        <Link2 className="h-2.5 w-2.5 inline" /> {slide.link_url}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActiveMutation.mutate({ id: slide.id, is_active: slide.is_active })}
                      className="text-text-dim hover:text-accent-cyan"
                      aria-label={slide.is_active ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {slide.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(slide)}
                      className="text-text-dim hover:text-danger"
                      aria-label="Hapus banner"
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

      <BannerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(v) => createMutation.mutate(v)}
        loading={createMutation.isPending}
        error={createMutation.error instanceof Error ? createMutation.error : null}
      />

      <BannerDeleteModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(id) => deleteMutation.mutate(id)}
        loading={deleteMutation.isPending}
        error={deleteMutation.error instanceof Error ? deleteMutation.error : null}
      />
    </>
  )
}

// Live preview component — mimics Launcher banner slider
function BannerPreview({ slides }: { slides: BannerSlide[] }) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (slides.length === 0) return
    const slide = slides[current]
    if (!slide) return
    const timer = setTimeout(() => {
      setCurrent((c) => (c + 1) % slides.length)
    }, Math.max(1, slide.duration_seconds) * 1000)
    return () => clearTimeout(timer)
  }, [current, slides])

  if (slides.length === 0) return null
  const slide = slides[current]
  if (!slide) return null

  return (
    <div>
      <div className="relative w-full overflow-hidden rounded-input border border-border bg-black" style={{ aspectRatio: '16 / 9' }}>
        {slide.media_type === 'video' ? (
          <video
            key={slide.id}
            src={slide.media_url}
            className="w-full h-full object-cover"
            muted
            loop
            autoPlay
            playsInline
          />
        ) : (
          <img
            key={slide.id}
            src={slide.media_url}
            alt={slide.title || 'banner'}
            className="w-full h-full object-cover"
          />
        )}
        {/* Overlay text */}
        {(slide.title || slide.subtitle) && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
            {slide.title && (
              <p className="text-white font-bold text-sm sm:text-base">{slide.title}</p>
            )}
            {slide.subtitle && (
              <p className="text-white/80 text-xs mt-0.5">{slide.subtitle}</p>
            )}
          </div>
        )}
        {/* Duration indicator */}
        <div className="absolute top-2 right-2">
          <Badge variant="cyan">{slide.duration_seconds}s</Badge>
        </div>
      </div>
      {/* Dots indicator */}
      <div className="flex justify-center gap-1.5 mt-3">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === current ? 'w-6 bg-accent-cyan' : 'w-1.5 bg-border'
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

type BannerFormValues = {
  title: string
  subtitle: string
  media_type: BannerMediaType
  media_url: string
  link_url: string
  duration_seconds: number
  starts_at: string
  ends_at: string
}

function BannerFormModal({
  open,
  onClose,
  onSubmit,
  loading,
  error,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (v: BannerFormValues) => void
  loading: boolean
  error: Error | null
}) {
  const [values, setValues] = useState<BannerFormValues>({
    title: '',
    subtitle: '',
    media_type: 'image',
    media_url: '',
    link_url: '',
    duration_seconds: 5,
    starts_at: '',
    ends_at: '',
  })
  const [uploadMode, setUploadMode] = useState<'upload' | 'link'>('upload')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setValues({
      title: '',
      subtitle: '',
      media_type: 'image',
      media_url: '',
      link_url: '',
      duration_seconds: 5,
      starts_at: '',
      ends_at: '',
    })
    setUploadMode('upload')
    setUploadError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Detect media type from file
    let detectedType: BannerMediaType = 'image'
    if (file.type.startsWith('video/')) detectedType = 'video'
    else if (file.type === 'image/gif') detectedType = 'gif'
    else if (file.type.startsWith('image/')) detectedType = 'image'
    else {
      setUploadError('File harus berupa gambar, GIF, atau video (MP4)')
      return
    }

    // Max sizes: image 5MB, video 50MB
    const maxSize = detectedType === 'video' ? 50 * 1024 * 1024 : 5 * 1024 * 1024
    if (file.size > maxSize) {
      setUploadError(`Ukuran maksimal ${detectedType === 'video' ? '50MB (video)' : '5MB (gambar)'}`)
      return
    }

    setUploading(true)
    setUploadError(null)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
      const fileName = `banners/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('feed-media')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('feed-media').getPublicUrl(fileName)
      setValues((v) => ({ ...v, media_url: pub.publicUrl, media_type: detectedType }))
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload gagal')
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(values)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Banner Slide Baru" description="Banner akan tampil di Beranda Launcher dengan auto-slide">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-input bg-danger/10 border border-danger/30 text-xs text-danger animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="font-mono">{error.message}</span>
          </div>
        )}

        <Input
          id="banner-title"
          label="Judul (opsional)"
          placeholder="Update v27 — Cloud Gaming Iter 4"
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
        />

        <Input
          id="banner-subtitle"
          label="Subtitle (opsional)"
          placeholder="Tampil di bawah judul"
          value={values.subtitle}
          onChange={(e) => setValues((v) => ({ ...v, subtitle: e.target.value }))}
        />

        {/* Media upload — Storage or Link */}
        <div>
          <label className="block mb-1.5 text-xs font-medium text-text-muted uppercase tracking-widest2">
            Media Banner <span className="text-danger">*</span>
          </label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setUploadMode('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-input text-xs font-medium transition-colors ${
                uploadMode === 'upload'
                  ? 'bg-accent-cyan text-black'
                  : 'bg-bg-hover text-text-muted'
              }`}
            >
              <Upload className="h-3 w-3" />
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('link')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-input text-xs font-medium transition-colors ${
                uploadMode === 'link'
                  ? 'bg-accent-cyan text-black'
                  : 'bg-bg-hover text-text-muted'
              }`}
            >
              <Link2 className="h-3 w-3" />
              Link URL
            </button>
          </div>
          {uploadMode === 'upload' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                loading={uploading}
                disabled={uploading}
              >
                <Upload className="h-3.5 w-3.5" />
                {values.media_url ? 'Ganti Media' : 'Pilih Media'}
              </Button>
              {uploadError && (
                <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {uploadError}
                </p>
              )}
              {values.media_url && (
                <div className="mt-2 rounded-input overflow-hidden border border-border max-w-xs" style={{ aspectRatio: '16 / 9' }}>
                  {values.media_type === 'video' ? (
                    <video src={values.media_url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                  ) : (
                    <img src={values.media_url} alt="preview" className="w-full h-full object-cover" />
                  )}
                </div>
              )}
              <p className="mt-1.5 text-[10px] text-text-dim">
                Image/GIF: JPG/PNG/GIF/WebP, max 5MB · Video: MP4/WebM, max 50MB
              </p>
            </div>
          ) : (
            <div>
              <Input
                id="banner-media-url"
                placeholder="https://example.com/banner.jpg atau .mp4 atau .gif"
                value={values.media_url}
                onChange={(e) => setValues((v) => ({ ...v, media_url: e.target.value }))}
                required
              />
              <Select
                id="banner-media-type"
                label="Tipe Media"
                value={values.media_type}
                onChange={(e) => setValues((v) => ({ ...v, media_type: e.target.value as BannerMediaType }))}
              >
                <option value="image">Image (JPG/PNG/WebP)</option>
                <option value="gif">GIF</option>
                <option value="video">Video (MP4/WebM)</option>
              </Select>
            </div>
          )}
        </div>

        <Input
          id="banner-link"
          label="Link URL (opsional)"
          placeholder="https://... (klik banner → redirect)"
          value={values.link_url}
          onChange={(e) => setValues((v) => ({ ...v, link_url: e.target.value }))}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block mb-1.5 text-xs font-medium text-text-muted uppercase tracking-widest2">
              Durasi Auto-Slide (detik)
            </label>
            <Input
              id="banner-duration"
              type="number"
              min={1}
              max={60}
              value={values.duration_seconds}
              onChange={(e) => setValues((v) => ({ ...v, duration_seconds: parseInt(e.target.value) || 5 }))}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block mb-1.5 text-xs font-medium text-text-muted uppercase tracking-widest2">
              Schedule Start (opsional)
            </label>
            <Input
              id="banner-start"
              type="datetime-local"
              value={values.starts_at}
              onChange={(e) => setValues((v) => ({ ...v, starts_at: e.target.value }))}
            />
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-medium text-text-muted uppercase tracking-widest2">
              Schedule End (opsional)
            </label>
            <Input
              id="banner-end"
              type="datetime-local"
              value={values.ends_at}
              onChange={(e) => setValues((v) => ({ ...v, ends_at: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
            <X className="h-3.5 w-3.5" />
            Batal
          </Button>
          <Button type="submit" loading={loading} disabled={!values.media_url.trim()}>
            <Plus className="h-3.5 w-3.5" />
            Tambah Banner
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function BannerDeleteModal({
  target,
  onClose,
  onConfirm,
  loading,
  error,
}: {
  target: BannerSlide | null
  onClose: () => void
  onConfirm: (id: string) => void
  loading: boolean
  error: Error | null
}) {
  const [confirmText, setConfirmText] = useState('')
  const targetId = target?.id

  useEffect(() => {
    setConfirmText('')
  }, [targetId])

  const canDelete = confirmText.trim().toLowerCase() === 'hapus'

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title="Hapus Banner?"
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
            Banner <span className="font-semibold text-text-primary">"{target?.title || 'untitled'}"</span>{' '}
            akan dihapus permanen.
          </span>
        </div>
        <div>
          <label htmlFor="confirm-delete-banner" className="block mb-1.5 text-xs font-medium text-text-muted uppercase tracking-widest2">
            Ketik <span className="font-mono text-danger">hapus</span> untuk konfirmasi
          </label>
          <input
            id="confirm-delete-banner"
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

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Plus,
  RefreshCw,
  Send,
  AlertCircle,
  Trash2,
  Save,
  Smartphone,
  Mail,
  Users as UsersIcon,
  Globe,
} from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input, Select } from '@/components/Input'
import { Badge, Modal } from '@/components/Modal'
import { SkeletonFeedCard } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { StaggeredGrid } from '@/components/StaggeredGrid'
import { SetupRequired, isMissingTableError } from '@/components/SetupRequired'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatRelative, formatDate } from '@/lib/api'

type NotificationCampaign = {
  id: string
  created_by: string | null
  title: string
  body: string
  target: { type: 'all' | 'role'; role?: string }
  action: { type: 'open_app' | 'open_url'; url?: string }
  sent_at: string | null
  created_at: string
}

type Target = { type: 'all' | 'role'; role?: string }
type Action = { type: 'open_app' | 'open_url'; url?: string }

const TITLE_MAX = 50
const BODY_MAX = 200

const NOTIF_SQL = `-- Tabel notification_campaigns untuk push notification
create table if not exists public.notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id),
  title text not null,
  body text not null,
  target jsonb not null default '{"type": "all"}'::jsonb,
  action jsonb not null default '{"type": "open_app"}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.notification_campaigns enable row level security;

-- Policy: admins can read & write, others cannot
create policy "Admin manage notifications"
  on public.notification_campaigns for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'developer')
    )
  );`

export default function Notifications() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [formOpen, setFormOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<Partial<FormState> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NotificationCampaign | null>(null)
  const [setupError, setSetupError] = useState(false)

  const { data: campaigns = [], isLoading, error, refetch, isFetching } = useQuery<NotificationCampaign[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as NotificationCampaign[]
    },
    retry: false,
  })

  useEffect(() => {
    setSetupError(isMissingTableError(error))
  }, [error])

  const createMutation = useMutation({
    mutationFn: async (input: { form: FormState; sendNow: boolean }) => {
      const target: Target = input.form.targetType === 'all'
        ? { type: 'all' }
        : { type: 'role', role: input.form.targetRole }
      const action: Action = input.form.actionType === 'open_app'
        ? { type: 'open_app' }
        : { type: 'open_url', url: input.form.actionUrl }
      const { error } = await supabase.from('notification_campaigns').insert({
        created_by: user?.id ?? null,
        title: input.form.title,
        body: input.form.body,
        target,
        action,
        sent_at: input.sendNow ? new Date().toISOString() : null,
      })
      if (error) throw error

      if (input.sendNow) {
        await supabase.from('audit_logs').insert({
          actor_id: user?.id ?? null,
          action: 'notif_send',
          target_type: 'notification_campaign',
          after: { title: input.form.title, target, action } as unknown as Record<string, unknown>,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      setFormOpen(false)
      setConfirmTarget(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notification_campaigns').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      setDeleteTarget(null)
    },
  })

  return (
    <Layout
      title="Push Notifications"
      description="Kirim notifikasi push ke user launcher"
      breadcrumb={['Dashboard', 'Notifications']}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button size="sm" onClick={() => setFormOpen(true)} disabled={setupError}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Buat Notifikasi</span>
            <span className="sm:hidden">Buat</span>
          </Button>
        </>
      }
    >
      {setupError ? (
        <SetupRequired
          tableName="notification_campaigns"
          sql={NOTIF_SQL}
          onRetry={() => refetch()}
          description="Modul Push Notification memerlukan tabel notification_campaigns untuk menyimpan riwayat kampanye."
        />
      ) : error ? (
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">Gagal memuat notifikasi</p>
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
      ) : campaigns.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bell}
            title="Belum ada notifikasi"
            subtitle="Buat kampanye notifikasi pertama untuk mengirim pesan ke user launcher."
            accent="cyan"
            action={
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Buat Notifikasi Pertama
              </Button>
            }
          />
        </Card>
      ) : (
        <StaggeredGrid staggerMs={40} className="space-y-3">
          {campaigns.map((c) => {
            const sent = !!c.sent_at
            const targetLabel =
              c.target?.type === 'role' ? `Role: ${c.target.role}` : 'Semua User'
            return (
              <Card key={c.id} padding="md" className="card-hover-accent">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <Badge variant={sent ? 'green' : 'gray'}>
                        {sent ? 'Terkirim' : 'Draft'}
                      </Badge>
                      <span className="text-xs text-text-dim" title={formatDate(c.created_at)}>
                        {formatRelative(c.sent_at ?? c.created_at)}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary truncate">{c.title}</h3>
                    <p className="mt-1 text-xs text-text-muted line-clamp-2">{c.body}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="cyan">
                        {c.target?.type === 'role' ? (
                          <>
                            <UsersIcon className="h-2.5 w-2.5" />
                            {targetLabel}
                          </>
                        ) : (
                          <>
                            <Globe className="h-2.5 w-2.5" />
                            {targetLabel}
                          </>
                        )}
                      </Badge>
                      {c.action?.type === 'open_url' && c.action.url && (
                        <Badge variant="violet">
                          <Mail className="h-2.5 w-2.5" />
                          URL
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(c)}
                    className="text-text-dim hover:text-danger shrink-0"
                    aria-label="Hapus"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </StaggeredGrid>
      )}

      {/* Create form modal */}
      <NotifFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmitDraft={async (form) => {
          try {
            await createMutation.mutateAsync({ form, sendNow: false })
          } catch {
            // error handled in mutation
          }
        }}
        onRequestSend={(form) => setConfirmTarget(form)}
        loading={createMutation.isPending}
        error={createMutation.error instanceof Error ? createMutation.error : null}
      />

      {/* Send confirmation */}
      <Modal
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        title="Konfirmasi Kirim"
        description="Notifikasi akan langsung dikirim ke user."
        confirmLabel="Kirim Sekarang"
        onConfirm={() =>
          confirmTarget &&
          createMutation.mutate({ form: confirmTarget as FormState, sendNow: true })
        }
        loading={createMutation.isPending}
      >
        <div className="space-y-3">
          {createMutation.error && (
            <div className="flex items-start gap-2 p-3 rounded-input bg-danger/10 border border-danger/30 text-xs text-danger animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-mono">{createMutation.error.message}</span>
            </div>
          )}
          <p className="text-sm text-text-muted">
            Notif akan dikirim ke{' '}
            <span className="text-text-primary font-medium">
              {confirmTarget?.targetType === 'all'
                ? 'semua user'
                : `user dengan role ${confirmTarget?.targetRole}`}
            </span>
            . Lanjutkan?
          </p>
          {confirmTarget && (
            <div className="p-3 rounded-input border border-border bg-black/40">
              <p className="text-sm font-semibold text-text-primary">{confirmTarget.title}</p>
              <p className="text-xs text-text-muted mt-1">{confirmTarget.body}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Notifikasi?"
        description="Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Ya, Hapus"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
      >
        <p className="text-sm text-text-muted">
          Notifikasi <span className="font-semibold text-text-primary">"{deleteTarget?.title}"</span>{' '}
          akan dihapus permanen.
        </p>
      </Modal>
    </Layout>
  )
}

type FormState = {
  title: string
  body: string
  targetType: 'all' | 'role'
  targetRole: string
  actionType: 'open_app' | 'open_url'
  actionUrl: string
}

function NotifFormModal({
  open,
  onClose,
  onSubmitDraft,
  onRequestSend,
  loading,
  error,
}: {
  open: boolean
  onClose: () => void
  onSubmitDraft: (form: FormState) => void
  onRequestSend: (form: FormState) => void
  loading: boolean
  error: Error | null
}) {
  const [form, setForm] = useState<FormState>({
    title: '',
    body: '',
    targetType: 'all',
    targetRole: 'member',
    actionType: 'open_app',
    actionUrl: '',
  })

  useEffect(() => {
    if (!open) {
      setForm({
        title: '',
        body: '',
        targetType: 'all',
        targetRole: 'member',
        actionType: 'open_app',
        actionUrl: '',
      })
    }
  }, [open])

  const titleLen = form.title.length
  const bodyLen = form.body.length
  const titleOver = titleLen > TITLE_MAX * 0.85
  const bodyOver = bodyLen > BODY_MAX * 0.85

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Buat Notifikasi"
      description="Susun notifikasi yang akan dikirim ke user"
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-input bg-danger/10 border border-danger/30 text-xs text-danger animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="font-mono">{error.message}</span>
          </div>
        )}

        {/* Title with counter */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-text-muted uppercase tracking-widest2">
              Judul
            </label>
            <span
              className={`text-[10px] font-mono ${
                titleOver ? 'text-danger' : 'text-text-dim'
              }`}
            >
              {titleLen}/{TITLE_MAX}
            </span>
          </div>
          <input
            type="text"
            placeholder="Update v27 telah rilis!"
            value={form.title}
            maxLength={TITLE_MAX}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full bg-black text-text-primary placeholder-text-dim rounded-input border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan"
          />
        </div>

        {/* Body with counter */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-text-muted uppercase tracking-widest2">
              Isi Pesan
            </label>
            <span
              className={`text-[10px] font-mono ${
                bodyOver ? 'text-danger' : 'text-text-dim'
              }`}
            >
              {bodyLen}/{BODY_MAX}
            </span>
          </div>
          <textarea
            placeholder="Tuliskan isi notifikasi di sini…"
            rows={4}
            maxLength={BODY_MAX}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            className="w-full bg-black text-text-primary placeholder-text-dim rounded-input border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Target"
            value={form.targetType}
            onChange={(e) =>
              setForm((f) => ({ ...f, targetType: e.target.value as FormState['targetType'] }))
            }
          >
            <option value="all">Semua User</option>
            <option value="role">Role Tertentu</option>
          </Select>
          {form.targetType === 'role' && (
            <Select
              label="Role"
              value={form.targetRole}
              onChange={(e) => setForm((f) => ({ ...f, targetRole: e.target.value }))}
            >
              <option value="member">Member</option>
              <option value="moderator">Moderator</option>
              <option value="developer">Developer</option>
              <option value="admin">Admin</option>
            </Select>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Action"
            value={form.actionType}
            onChange={(e) =>
              setForm((f) => ({ ...f, actionType: e.target.value as FormState['actionType'] }))
            }
          >
            <option value="open_app">Buka App</option>
            <option value="open_url">Buka URL</option>
          </Select>
          {form.actionType === 'open_url' && (
            <Input
              label="URL"
              placeholder="https://…"
              value={form.actionUrl}
              onChange={(e) => setForm((f) => ({ ...f, actionUrl: e.target.value }))}
            />
          )}
        </div>

        {/* Preview */}
        <div>
          <p className="text-[10px] uppercase tracking-widest2 text-text-dim mb-2">Preview</p>
          <div className="rounded-input border border-border bg-black p-3 flex items-start gap-3">
            <div className="h-8 w-8 rounded-btn bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center shrink-0">
              <Smartphone className="h-4 w-4 text-black" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-text-primary">DLavie Launcher</p>
                <span className="text-[10px] text-text-dim">sekarang</span>
              </div>
              <p className="text-sm font-medium text-text-primary mt-0.5 truncate">
                {form.title || 'Judul notifikasi'}
              </p>
              <p className="text-xs text-text-muted line-clamp-2">
                {form.body || 'Isi pesan akan tampil di sini.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-border">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading || !form.title.trim() || !form.body.trim()}
          >
            Batal
          </Button>
          <Button
            variant="outline"
            onClick={() => onSubmitDraft(form)}
            disabled={loading || !form.title.trim() || !form.body.trim()}
          >
            <Save className="h-3.5 w-3.5" />
            Simpan Draft
          </Button>
          <Button
            onClick={() => onRequestSend(form)}
            disabled={loading || !form.title.trim() || !form.body.trim()}
          >
            <Send className="h-3.5 w-3.5" />
            Kirim
          </Button>
        </div>
      </div>
    </Modal>
  )
}

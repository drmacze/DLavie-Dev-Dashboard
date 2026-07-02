import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Wrench,
  RefreshCw,
  Save,
  AlertCircle,
  CheckCircle2,
  Server,
  Eye,
  ShieldAlert,
} from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Card, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input, Textarea, Select } from '@/components/Input'
import { Toggle } from '@/components/Toggle'
import { Badge } from '@/components/Modal'
import { SkeletonBlock } from '@/components/Skeleton'
import { SetupRequired, isMissingTableError } from '@/components/SetupRequired'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

type MaintenanceConfig = {
  enabled: boolean
  scope: 'none' | 'full' | 'partial'
  title: string
  message: string
  allow_offline_play: boolean
}

const DEFAULT_CONFIG: MaintenanceConfig = {
  enabled: false,
  scope: 'none',
  title: '',
  message: '',
  allow_offline_play: true,
}

const APP_CONFIG_SQL = `-- Tabel app_config untuk menyimpan konfigurasi launcher
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

-- Seed default values
insert into public.app_config(key, value) values
  ('maintenance', '{"enabled": false, "scope": "none", "title": "", "message": "", "allow_offline_play": true}'::jsonb),
  ('launcher', '{"minimum_version_code": 30, "latest_version_name": "0.9.0-dlavie26-hub", "stable": true, "beta": false, "developer": false}'::jsonb)
on conflict (key) do nothing;

-- Enable RLS
alter table public.app_config enable row level security;

-- Policy: anyone can read, only admins can write
create policy "Public read app_config"
  on public.app_config for select
  using (true);

create policy "Admin write app_config"
  on public.app_config for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'developer')
    )
  );`

export default function Maintenance() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [form, setForm] = useState<MaintenanceConfig>(DEFAULT_CONFIG)
  const [setupError, setSetupError] = useState(false)

  const { data, isLoading, error, refetch, isFetching } = useQuery<MaintenanceConfig>({
    queryKey: ['app-config', 'maintenance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'maintenance')
        .maybeSingle()

      if (error) throw error
      if (!data) return DEFAULT_CONFIG
      return { ...DEFAULT_CONFIG, ...(data.value as Partial<MaintenanceConfig>) }
    },
    retry: false,
  })

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  useEffect(() => {
    setSetupError(isMissingTableError(error))
  }, [error])

  const saveMutation = useMutation({
    mutationFn: async (next: MaintenanceConfig) => {
      const { error } = await supabase
        .from('app_config')
        .upsert({
          key: 'maintenance',
          value: next as unknown as Record<string, unknown>,
          updated_by: user?.id ?? null,
        })
      if (error) throw error

      // Best-effort audit log (ignore failure if table missing)
      await supabase.from('audit_logs').insert({
        actor_id: user?.id ?? null,
        action: 'maintenance_toggle',
        target_type: 'app_config',
        target_id: 'maintenance',
        before: data as unknown as Record<string, unknown> | null,
        after: next as unknown as Record<string, unknown>,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-config', 'maintenance'] })
    },
  })

  const dirty = JSON.stringify(form) !== JSON.stringify(data ?? DEFAULT_CONFIG)
  const enabled = form.enabled

  return (
    <Layout
      title="Maintenance Mode"
      description="Kontrol mode maintenance launcher untuk semua user"
      breadcrumb={['Dashboard', 'Maintenance']}
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching}>
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      }
    >
      {/* Status indicator */}
      <Card padding="none" className="mb-4 overflow-hidden">
        <div
          className={`flex items-center gap-3 p-4 ${
            enabled
              ? 'bg-accent-amber/10 border-b border-accent-amber/20'
              : 'bg-success/10 border-b border-success/20'
          }`}
        >
          <div
            className={`h-10 w-10 rounded-btn border flex items-center justify-center shrink-0 ${
              enabled
                ? 'border-accent-amber/30 bg-accent-amber/10'
                : 'border-success/30 bg-success/10'
            }`}
          >
            {enabled ? (
              <ShieldAlert className="h-5 w-5 text-accent-amber animate-pulse" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-success" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary">
              {enabled ? 'Maintenance Aktif' : 'Sistem Aktif'}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {enabled
                ? `Sedang dalam mode maintenance (${form.scope}). User akan melihat banner peringatan.`
                : 'Launcher berjalan normal. Tidak ada maintenance aktif.'}
            </p>
          </div>
          <Badge variant={enabled ? 'amber' : 'green'}>
            {enabled ? 'ON' : 'OFF'}
          </Badge>
        </div>
      </Card>

      {setupError ? (
        <SetupRequired
          tableName="app_config"
          sql={APP_CONFIG_SQL}
          onRetry={() => refetch()}
          description="Tabel konfigurasi belum tersedia. Modul Maintenance menyimpan state-nya di tabel app_config."
        />
      ) : error ? (
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">Gagal memuat konfigurasi</p>
              <p className="text-xs text-text-muted mt-1 font-mono">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          </div>
        </Card>
      ) : isLoading ? (
        <Card>
          <SkeletonBlock className="h-96 w-full" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Form */}
          <Card className="lg:col-span-2">
            <CardHeader
              title="Konfigurasi"
              subtitle="Atur parameter maintenance yang akan dilihat user"
            />

            <div className="space-y-5">
              {/* Master toggle */}
              <div className="flex items-center justify-between gap-4 p-4 rounded-input border border-border bg-black/40">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary">Maintenance Mode</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Aktifkan untuk menampilkan banner maintenance di launcher
                  </p>
                </div>
                <Toggle
                  checked={form.enabled}
                  onChange={(enabled) => setForm((f) => ({ ...f, enabled }))}
                  id="maintenance-enabled"
                />
              </div>

              <Input
                id="maintenance-title"
                label="Judul"
                placeholder="Server Maintenance"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                hint="Judul singkat yang ditampilkan di banner"
              />

              <Textarea
                id="maintenance-message"
                label="Pesan"
                placeholder="Kami sedang melakukan maintenance. Mohon tunggu."
                rows={4}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                hint="Detail pesan untuk user"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  id="maintenance-scope"
                  label="Scope"
                  value={form.scope}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scope: e.target.value as MaintenanceConfig['scope'] }))
                  }
                >
                  <option value="none">None — Tidak ada pembatasan</option>
                  <option value="partial">Partial — Beberapa fitur diblokir</option>
                  <option value="full">Full — Launcher tidak bisa dipakai</option>
                </Select>

                <div className="flex items-end">
                  <div className="flex items-center justify-between gap-3 w-full p-3 rounded-input border border-border bg-black/40">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">Allow Offline Play</p>
                      <p className="text-xs text-text-dim mt-0.5">
                        Izinkan user main offline saat maintenance
                      </p>
                    </div>
                    <Toggle
                      checked={form.allow_offline_play}
                      onChange={(allow_offline_play) =>
                        setForm((f) => ({ ...f, allow_offline_play }))
                      }
                    />
                  </div>
                </div>
              </div>

              {saveMutation.error && (
                <div className="flex items-start gap-2 p-3 rounded-input bg-danger/10 border border-danger/30 text-xs text-danger animate-shake">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="font-mono">
                    {saveMutation.error instanceof Error
                      ? saveMutation.error.message
                      : 'Gagal menyimpan'}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setForm(data ?? DEFAULT_CONFIG)}
                  disabled={!dirty || saveMutation.isPending}
                >
                  Reset
                </Button>
                <Button
                  onClick={() => saveMutation.mutate(form)}
                  loading={saveMutation.isPending}
                  disabled={!dirty}
                >
                  <Save className="h-3.5 w-3.5" />
                  Simpan
                </Button>
              </div>
            </div>
          </Card>

          {/* Preview */}
          <div className="space-y-4">
            <Card>
              <CardHeader
                title="Preview"
                subtitle="Tampilan yang akan dilihat user"
                action={
                  <span className="text-text-dim">
                    <Eye className="h-4 w-4" />
                  </span>
                }
              />
              <div className="rounded-input border border-border overflow-hidden">
                {/* Launcher mock header */}
                <div className="h-8 bg-gradient-to-r from-accent-cyan/20 to-accent-violet/20 flex items-center px-3">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-danger/60" />
                    <span className="h-2 w-2 rounded-full bg-accent-amber/60" />
                    <span className="h-2 w-2 rounded-full bg-success/60" />
                  </div>
                </div>

                <div className="p-5 bg-black min-h-[200px]">
                  {enabled ? (
                    <div className="flex flex-col items-center text-center gap-3 py-4">
                      <div className="h-12 w-12 rounded-card border border-accent-amber/30 bg-accent-amber/10 flex items-center justify-center">
                        <Wrench className="h-6 w-6 text-accent-amber" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-primary">
                          {form.title || 'Maintenance'}
                        </p>
                        <p className="text-xs text-text-muted mt-1.5 max-w-[220px]">
                          {form.message || 'Pesan maintenance akan tampil di sini.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="amber">{form.scope}</Badge>
                        {form.allow_offline_play && (
                          <Badge variant="green">Offline OK</Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center gap-3 py-4">
                      <div className="h-12 w-12 rounded-card border border-success/30 bg-success/10 flex items-center justify-center">
                        <Server className="h-6 w-6 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-primary">Sistem Normal</p>
                        <p className="text-xs text-text-muted mt-1.5 max-w-[220px]">
                          Launcher berjalan normal tanpa maintenance.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card padding="sm">
              <div className="flex items-start gap-2.5 p-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-accent-amber" />
                <p className="text-xs text-text-muted leading-relaxed">
                  Perubahan disimpan ke <code className="font-mono">app_config</code> dengan
                  key <code className="font-mono">maintenance</code>. Launcher membaca config ini
                  saat startup untuk menentukan mode.
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </Layout>
  )
}

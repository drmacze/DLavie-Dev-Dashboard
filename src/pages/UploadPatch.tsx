import { useEffect, useRef, useState } from 'react'
import {
  Upload,
  FileArchive,
  CheckCircle2,
  Info,
  Hash,
  AlertTriangle,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Card, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input, Textarea } from '@/components/Input'
import { Badge, Modal } from '@/components/Modal'
import { sha256OfFile, formatBytes } from '@/lib/api'

type FormState = {
  version: string
  name: string
  releaseNotes: string
  sha256: string
  url: string
}

const DATA_REPO_BASE = 'https://github.com/drmacze/DLavie-Launcher-Data/releases/download'

export default function UploadPatch() {
  const [form, setForm] = useState<FormState>({
    version: '',
    name: '',
    releaseNotes: '',
    sha256: '',
    url: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [hashing, setHashing] = useState(false)
  const [hashProgress, setHashProgress] = useState(0)
  const [hashError, setHashError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishProgress, setPublishProgress] = useState(0)
  const [success, setSuccess] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-derive URL when version changes
  useEffect(() => {
    if (form.version && file) {
      setForm((f) => ({
        ...f,
        url: `${DATA_REPO_BASE}/${f.version}/${encodeURIComponent(file.name)}`,
      }))
    }
  }, [form.version, file])

  async function handleFile(f: File) {
    setFile(f)
    setHashError(null)
    setHashProgress(0)
    setForm((prev) => ({
      ...prev,
      sha256: '',
      url: prev.version ? `${DATA_REPO_BASE}/${prev.version}/${encodeURIComponent(f.name)}` : '',
    }))

    setHashing(true)
    try {
      const hash = await sha256OfFile(f)
      setForm((prev) => ({ ...prev, sha256: hash }))
      // Simulate smooth progress fill for UX (hash itself is near-instant for small files)
      for (let p = 0; p <= 100; p += 20) {
        setHashProgress(p)
        await new Promise((r) => setTimeout(r, 40))
      }
    } catch {
      setHashError('Gagal menghitung SHA256. Anda dapat memasukkan manual.')
    } finally {
      setHashing(false)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) void handleFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) void handleFile(f)
  }

  function clearFile() {
    setFile(null)
    setHashProgress(0)
    setForm((f) => ({ ...f, sha256: '', url: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const ready =
    form.version.trim() &&
    form.name.trim() &&
    form.sha256.trim() &&
    form.url.trim() &&
    file !== null

  const previewManifestEntry = {
    version: form.version,
    name: form.name,
    sha256: form.sha256,
    url: form.url,
    type: 'patch',
    size: file?.size ?? 0,
    releaseNotes: form.releaseNotes,
  }

  async function handlePublish() {
    setPublishing(true)
    setPublishProgress(0)
    // Simulate upload progress
    for (let p = 0; p <= 100; p += 10) {
      setPublishProgress(p)
      await new Promise((r) => setTimeout(r, 90))
    }
    setPublishing(false)
    setConfirmOpen(false)
    setSuccess(true)
  }

  function resetForm() {
    setForm({ version: '', name: '', releaseNotes: '', sha256: '', url: '' })
    setFile(null)
    setSuccess(false)
    setHashError(null)
    setHashProgress(0)
    setPublishProgress(0)
  }

  if (success) {
    return (
      <Layout title="Upload Patch" description="Unggah patch baru untuk launcher DLavie" breadcrumb={['Dashboard', 'Upload Patch']}>
        <div className="flex items-center justify-center py-8 md:py-12">
          <Card padding="lg" className="max-w-lg w-full text-center relative overflow-hidden">
            {/* Confetti burst */}
            <ConfettiBurst />

            <div className="mx-auto h-20 w-20 rounded-card border border-success/30 bg-success/10 flex items-center justify-center mb-5 animate-check-pop">
              <CheckCircle2 className="h-10 w-10 text-success" strokeWidth={1.75} />
            </div>
            <h2 className="text-2xl font-bold tracking-tightest text-text-primary mb-2 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
              Patch Disiapkan
            </h2>
            <p className="text-sm text-text-muted leading-relaxed mb-5 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              Entri manifest telah divalidasi dan siap dipublikasikan. Upload file ke GitHub
              Release akan diaktifkan di Phase 2 (membutuhkan GitHub token dengan write access).
            </p>
            <div className="text-left bg-black border border-border rounded-input p-4 mb-5 animate-fade-in-up" style={{ animationDelay: '280ms' }}>
              <p className="text-[10px] uppercase tracking-widest2 text-text-dim mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-accent-amber" />
                Entry manifest yang dihasilkan
              </p>
              <pre className="text-xs font-mono text-text-primary overflow-x-auto leading-relaxed">
{JSON.stringify(previewManifestEntry, null, 2)}
              </pre>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 animate-fade-in-up" style={{ animationDelay: '360ms' }}>
              <Button onClick={resetForm} variant="outline" className="w-full sm:flex-1">
                Upload Patch Lain
              </Button>
              <a
                href="/DLavie-Dev-Dashboard/manifest"
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-btn bg-accent-cyan text-black font-semibold text-sm hover:bg-accent-cyan-hover transition-colors w-full sm:flex-1"
              >
                Lihat Manifest
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Upload Patch" description="Unggah patch baru untuk launcher DLavie" breadcrumb={['Dashboard', 'Upload Patch']}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader title="Detail Patch" subtitle="Isi metadata patch yang akan diunggah" />

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="version"
                label="Patch Version"
                placeholder="v27"
                value={form.version}
                onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
              />
              <Input
                id="name"
                label="Patch Name"
                placeholder="Gameplay Mod v27"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <Textarea
              id="releaseNotes"
              label="Release Notes"
              placeholder="Perubahan apa saja yang ada di patch ini?"
              rows={5}
              value={form.releaseNotes}
              onChange={(e) => setForm((f) => ({ ...f, releaseNotes: e.target.value }))}
            />

            {/* Drag-drop file zone */}
            <div>
              <label className="block mb-1.5 text-xs font-medium text-text-muted uppercase tracking-widest2">
                File Patch (ZIP)
              </label>
              <input
                ref={fileInputRef}
                id="patchFile"
                type="file"
                accept=".zip,application/zip"
                className="sr-only"
                onChange={handleFileSelect}
              />
              {!file ? (
                <label
                  htmlFor="patchFile"
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center gap-2.5 p-8 rounded-input border-2 border-dashed cursor-pointer transition-all duration-200 ${
                    dragging
                      ? 'border-accent-cyan bg-accent-cyan/5 scale-[1.01]'
                      : 'border-border hover:border-accent-cyan hover:bg-bg-hover'
                  }`}
                >
                  <div className={`h-12 w-12 rounded-card border flex items-center justify-center transition-colors ${dragging ? 'border-accent-cyan/40 bg-accent-cyan/10' : 'border-border bg-bg-hover'}`}>
                    <FileArchive className={`h-6 w-6 ${dragging ? 'text-accent-cyan' : 'text-text-dim'}`} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-text-secondary">
                      <span className="text-accent-cyan font-medium">Klik untuk memilih</span> atau drag ZIP ke sini
                    </p>
                    <p className="text-xs text-text-dim mt-1">Hanya file .zip</p>
                  </div>
                </label>
              ) : (
                <div className="p-4 rounded-input border border-border bg-black flex items-center gap-3 animate-fade-in-up">
                  <div className="h-10 w-10 rounded-btn border border-accent-cyan/30 bg-accent-cyan/10 flex items-center justify-center shrink-0">
                    <FileArchive className="h-5 w-5 text-accent-cyan" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
                    <p className="text-xs text-text-muted font-mono">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    onClick={clearFile}
                    className="h-8 w-8 flex items-center justify-center rounded-btn text-text-dim hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                    aria-label="Hapus file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* SHA256 with hashing progress */}
            <Input
              id="sha256"
              label="SHA256 Hash"
              placeholder={hashing ? 'Menghitung hash…' : 'Otomatis dari file, atau masukkan manual'}
              value={form.sha256}
              onChange={(e) => setForm((f) => ({ ...f, sha256: e.target.value }))}
              disabled={hashing}
              hint={
                hashing
                  ? 'Menghitung hash dari file yang dipilih…'
                  : hashError ?? '64 karakter hex — divalidasi launcher sebelum diaplikasikan'
              }
              className="font-mono text-xs"
            />
            {hashing && (
              <div className="h-1 w-full rounded-full bg-bg-hover overflow-hidden">
                <div
                  className="h-full bg-accent-cyan transition-all duration-100"
                  style={{ width: `${hashProgress}%` }}
                />
              </div>
            )}

            {hashError && (
              <div className="flex items-start gap-2 p-3 rounded-input bg-accent-amber/10 border border-accent-amber/30 text-xs text-accent-amber animate-shake">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{hashError}</span>
              </div>
            )}

            {/* Auto-derived URL */}
            <Input
              id="url"
              label="Download URL (auto)"
              placeholder="Akan terisi otomatis dari versi + nama file"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              hint="URL file setelah diunggah ke GitHub Release"
              className="font-mono text-xs"
            />
          </div>
        </Card>

        {/* Preview + Publish */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Preview Manifest" subtitle="Entri yang akan ditambahkan" />
            {ready ? (
              <div className="space-y-3 text-sm">
                <PreviewRow label="version" value={form.version} mono />
                <PreviewRow label="name" value={form.name} />
                <PreviewRow
                  label="sha256"
                  value={form.sha256 ? `${form.sha256.slice(0, 16)}…` : '—'}
                  mono
                />
                <PreviewRow label="size" value={file ? formatBytes(file.size) : '—'} mono />
                <PreviewRow label="type" value="patch" mono />
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] uppercase tracking-widest2 text-text-dim mb-1">releaseNotes</p>
                  <p className="text-xs text-text-muted whitespace-pre-wrap line-clamp-4">
                    {form.releaseNotes || '(kosong)'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Hash className="h-6 w-6 text-text-dim mb-2" />
                <p className="text-xs text-text-muted">Lengkapi form & pilih file untuk melihat preview</p>
              </div>
            )}
          </Card>

          <Card padding="sm">
            <div className="flex items-start gap-2.5 p-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-accent-violet" />
              <p className="text-xs text-text-muted leading-relaxed">
                <span className="text-text-primary font-medium">Coming Phase 2:</span>{' '}
                Upload file ke GitHub Release butuh backend dengan token write access. Saat ini
                preview manifest sudah siap dipakai.
              </p>
            </div>
          </Card>

          <Button onClick={() => setConfirmOpen(true)} disabled={!ready} size="lg" className="w-full">
            <Upload className="h-4 w-4" />
            Publish Patch
          </Button>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => !publishing && setConfirmOpen(false)}
        title="Konfirmasi Publish"
        description="Pastikan data sudah benar."
        confirmLabel={publishing ? 'Mengunggah…' : 'Ya, Publish'}
        onConfirm={handlePublish}
        loading={publishing}
      >
        <div className="space-y-3">
          {publishing && (
            <div className="mb-2">
              <div className="h-1.5 w-full rounded-full bg-bg-hover overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-cyan to-accent-violet transition-all duration-100"
                  style={{ width: `${publishProgress}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-text-dim font-mono text-right">{publishProgress}%</p>
            </div>
          )}
          <p className="text-sm text-text-muted">
            Patch akan langsung <span className="text-text-primary font-medium">visible ke semua user</span> setelah dipublikasikan. Pastikan:
          </p>
          <ul className="space-y-1.5 text-sm text-text-muted">
            <li className="flex items-start gap-2"><span className="text-success">✓</span>Version & name sudah benar</li>
            <li className="flex items-start gap-2"><span className="text-success">✓</span>SHA256 cocok dengan file</li>
            <li className="flex items-start gap-2"><span className="text-success">✓</span>Release notes jelas & informatif</li>
          </ul>
          <div className="flex items-center gap-2 p-3 rounded-input bg-bg-hover border border-border">
            <Badge variant="cyan">{form.version || 'v?'}</Badge>
            <span className="text-sm text-text-primary truncate">{form.name}</span>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}

function PreviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] uppercase tracking-widest2 text-text-dim">{label}</span>
      <span className={`text-sm text-text-primary truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}

/** Lightweight CSS-only confetti burst for the success state. */
function ConfettiBurst() {
  const pieces = Array.from({ length: 14 })
  const colors = ['#22D3EE', '#818CF8', '#34D399', '#FBBF24', '#F87171']
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((_, i) => {
        const left = (i / pieces.length) * 100
        const color = colors[i % colors.length]
        const delay = (i % 5) * 60
        return (
          <span
            key={i}
            className="absolute top-8 h-2 w-1.5 rounded-sm animate-confetti-fall"
            style={{
              left: `${left}%`,
              backgroundColor: color,
              animationDelay: `${delay}ms`,
            }}
          />
        )
      })}
    </div>
  )
}

import { useEffect, useState } from 'react'
import {
  Upload,
  FileArchive,
  CheckCircle2,
  Info,
  Hash,
  AlertTriangle,
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
  const [hashError, setHashError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [success, setSuccess] = useState(false)

  // Auto-derive URL when version changes (best-effort convention)
  useEffect(() => {
    if (form.version && file) {
      setForm((f) => ({
        ...f,
        url: `${DATA_REPO_BASE}/${f.version}/${encodeURIComponent(file.name)}`,
      }))
    }
  }, [form.version, file])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setHashError(null)
    setForm((prev) => ({
      ...prev,
      sha256: '',
      url: prev.version
        ? `${DATA_REPO_BASE}/${prev.version}/${encodeURIComponent(f.name)}`
        : '',
    }))

    // Compute SHA256 client-side
    setHashing(true)
    try {
      const hash = await sha256OfFile(f)
      setForm((prev) => ({ ...prev, sha256: hash }))
    } catch {
      setHashError('Gagal menghitung SHA256. Anda dapat memasukkan manual.')
    } finally {
      setHashing(false)
    }
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
    // Phase 1: simulate success. Actual GitHub Release upload needs server-side token.
    await new Promise((r) => setTimeout(r, 800))
    setPublishing(false)
    setConfirmOpen(false)
    setSuccess(true)
  }

  function resetForm() {
    setForm({ version: '', name: '', releaseNotes: '', sha256: '', url: '' })
    setFile(null)
    setSuccess(false)
    setHashError(null)
  }

  if (success) {
    return (
      <Layout title="Upload Patch" description="Unggah patch baru untuk launcher DLavie">
        <div className="flex items-center justify-center py-12">
          <Card padding="lg" className="max-w-lg w-full text-center">
            <div className="mx-auto h-16 w-16 rounded-card border border-success/30 bg-success/10 flex items-center justify-center mb-5">
              <CheckCircle2 className="h-8 w-8 text-success" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-bold tracking-tightest text-text-primary mb-2">
              Patch Disiapkan
            </h2>
            <p className="text-sm text-text-muted leading-relaxed mb-5">
              Entri manifest telah divalidasi dan siap dipublikasikan. Upload file ke GitHub
              Release akan diaktifkan di Phase 2 (membutuhkan GitHub token dengan write access).
            </p>
            <div className="text-left bg-black border border-border rounded-input p-4 mb-5">
              <p className="text-[10px] uppercase tracking-widest2 text-text-dim mb-2">
                Entry manifest yang dihasilkan
              </p>
              <pre className="text-xs font-mono text-text-primary overflow-x-auto">
{JSON.stringify(previewManifestEntry, null, 2)}
              </pre>
            </div>
            <Button onClick={resetForm} variant="outline" className="w-full">
              Upload Patch Lain
            </Button>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Upload Patch" description="Unggah patch baru untuk launcher DLavie">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Detail Patch"
            subtitle="Isi metadata patch yang akan diunggah"
          />

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

            {/* File upload */}
            <div>
              <label className="block mb-1.5 text-xs font-medium text-text-muted uppercase tracking-widest2">
                File Patch (ZIP)
              </label>
              <label
                htmlFor="patchFile"
                className="flex flex-col items-center justify-center gap-2 p-6 rounded-input border border-dashed border-border hover:border-accent-cyan transition-colors cursor-pointer"
              >
                <FileArchive className="h-8 w-8 text-text-dim" />
                {file ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-text-primary">{file.name}</p>
                    <p className="text-xs text-text-muted">{formatBytes(file.size)}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-text-muted">
                      <span className="text-accent-cyan font-medium">Klik untuk memilih</span>{' '}
                      atau drag file ZIP ke sini
                    </p>
                    <p className="text-xs text-text-dim mt-1">Hanya file .zip</p>
                  </div>
                )}
                <input
                  id="patchFile"
                  type="file"
                  accept=".zip,application/zip"
                  className="sr-only"
                  onChange={handleFileSelect}
                />
              </label>
            </div>

            {/* SHA256 */}
            <Input
              id="sha256"
              label="SHA256 Hash"
              placeholder={
                hashing
                  ? 'Menghitung hash…'
                  : 'Otomatis dari file, atau masukkan manual'
              }
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

            {hashError && (
              <div className="flex items-start gap-2 p-3 rounded-input bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
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
                <PreviewRow
                  label="size"
                  value={file ? formatBytes(file.size) : '—'}
                  mono
                />
                <PreviewRow label="type" value="patch" mono />
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] uppercase tracking-widest2 text-text-dim mb-1">
                    releaseNotes
                  </p>
                  <p className="text-xs text-text-muted whitespace-pre-wrap line-clamp-4">
                    {form.releaseNotes || '(kosong)'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Hash className="h-6 w-6 text-text-dim mb-2" />
                <p className="text-xs text-text-muted">
                  Lengkapi form & pilih file untuk melihat preview
                </p>
              </div>
            )}
          </Card>

          <Card padding="sm">
            <div className="flex items-start gap-2.5 p-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-accent-violet" />
              <p className="text-xs text-text-muted leading-relaxed">
                <span className="text-text-primary font-medium">Coming Phase 2:</span>{' '}
                Upload file ke GitHub Release butuh backend dengan token write access.
                Saat ini preview manifest sudah siap dipakai.
              </p>
            </div>
          </Card>

          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!ready}
            size="lg"
            className="w-full"
          >
            <Upload className="h-4 w-4" />
            Publish Patch
          </Button>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Konfirmasi Publish"
        description="Pastikan data sudah benar."
        confirmLabel="Ya, Publish"
        onConfirm={handlePublish}
        loading={publishing}
      >
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            Patch akan langsung <span className="text-text-primary font-medium">visible ke semua user</span>{' '}
            setelah dipublikasikan. Pastikan:
          </p>
          <ul className="space-y-1.5 text-sm text-text-muted">
            <li className="flex items-start gap-2">
              <span className="text-accent-cyan">✓</span>
              Version & name sudah benar
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-cyan">✓</span>
              SHA256 cocok dengan file
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-cyan">✓</span>
              Release notes jelas & informatif
            </li>
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
      <span
        className={`text-sm text-text-primary truncate ${mono ? 'font-mono text-xs' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}

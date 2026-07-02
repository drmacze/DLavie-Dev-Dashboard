import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Package,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Download,
  Hash,
  Trash2,
  ExternalLink,
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileCode,
  Copy,
  Check,
  Terminal,
} from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Select } from '@/components/Input'
import { Badge, Modal } from '@/components/Modal'
import { EmptyState } from '@/components/EmptyState'
import { StaggeredGrid } from '@/components/StaggeredGrid'
import { SkeletonFeedCard } from '@/components/Skeleton'
import {
  fetchReleases,
  fetchManifest,
  formatNumber,
  formatRelative,
  formatBytes,
  copyToClipboard,
  truncateMiddle,
  extractSha256FromRelease,
  type GitHubRelease,
} from '@/lib/api'

type SortMode = 'newest' | 'oldest' | 'downloads'

export default function Patches() {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('newest')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GitHubRelease | null>(null)

  const { data: releases = [], isLoading, error, refetch, isFetching } = useQuery<GitHubRelease[]>({
    queryKey: ['patches', 'releases'],
    queryFn: fetchReleases,
  })

  const { data: manifest } = useQuery({
    queryKey: ['patches', 'manifest'],
    queryFn: fetchManifest,
  })

  // Build a map of patch version → sha256 from manifest
  const manifestShaMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of manifest?.patches ?? []) {
      map.set(p.version.toLowerCase(), p.sha256)
    }
    return map
  }, [manifest])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = releases
    if (q) {
      list = list.filter(
        (r) =>
          r.tag_name.toLowerCase().includes(q) ||
          (r.name ?? '').toLowerCase().includes(q),
      )
    }
    const sorted = [...list]
    if (sort === 'newest') {
      sorted.sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at))
    } else if (sort === 'oldest') {
      sorted.sort((a, b) => +new Date(a.published_at) - +new Date(b.published_at))
    } else if (sort === 'downloads') {
      sorted.sort((a, b) => sumDownloads(b) - sumDownloads(a))
    }
    return sorted
  }, [releases, search, sort])

  const totalDownloads = useMemo(
    () => releases.reduce((sum, r) => sum + sumDownloads(r), 0),
    [releases],
  )

  return (
    <Layout
      title="Patch Management"
      description={`${formatNumber(releases.length)} patch · ${formatNumber(totalDownloads)} total unduhan`}
      breadcrumb={['Dashboard', 'Patch Management']}
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
              placeholder="Cari patch (versi / nama)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black text-text-primary placeholder-text-dim rounded-input border border-border pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan"
            />
          </div>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="sm:w-44"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="downloads">Unduhan Terbanyak</option>
          </Select>
        </div>
      </Card>

      {error ? (
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">Gagal memuat patch</p>
              <p className="text-xs text-text-muted mt-1 font-mono">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
              <p className="text-xs text-text-dim mt-2">
                GitHub API mungkin sedang rate-limited. Coba lagi dalam beberapa menit.
              </p>
            </div>
          </div>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonFeedCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title={search ? 'Tidak ada patch yang cocok' : 'Belum ada patch'}
            subtitle={
              search
                ? 'Coba ubah kata kunci pencarian atau filter.'
                : 'Patch yang dirilis via GitHub Releases akan muncul di sini otomatis.'
            }
            accent="cyan"
          />
        </Card>
      ) : (
        <StaggeredGrid staggerMs={40} className="space-y-3">
          {filtered.map((release) => (
            <PatchCard
              key={release.id}
              release={release}
              sha256={lookupSha256(release, manifestShaMap)}
              expanded={expandedId === release.id}
              onToggle={() =>
                setExpandedId((cur) => (cur === release.id ? null : release.id))
              }
              onDelete={() => setDeleteTarget(release)}
            />
          ))}
        </StaggeredGrid>
      )}

      <DeletePatchModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </Layout>
  )
}

function sumDownloads(r: GitHubRelease): number {
  return r.assets.reduce((s, a) => s + a.download_count, 0)
}

function lookupSha256(release: GitHubRelease, map: Map<string, string>): string | null {
  const fromManifest = map.get(release.tag_name.toLowerCase())
  if (fromManifest) return fromManifest
  return extractSha256FromRelease(release)
}

function PatchCard({
  release,
  sha256,
  expanded,
  onToggle,
  onDelete,
}: {
  release: GitHubRelease
  sha256: string | null
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const downloads = sumDownloads(release)
  const isDraft = release.draft === true
  const publishedLabel = isDraft ? 'Draft' : 'Published'

  return (
    <Card padding="none" className="overflow-hidden card-hover-accent">
      <button
        onClick={onToggle}
        className="w-full text-left p-4 sm:p-5 hover:bg-bg-hover/50 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <Badge variant={isDraft ? 'amber' : 'cyan'}>
                {isDraft ? 'Draft' : publishedLabel}
              </Badge>
              {release.prerelease && <Badge variant="violet">Pre-release</Badge>}
              <span className="text-xs text-text-dim flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatRelative(release.published_at)}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold tracking-tighter text-text-primary font-mono">
                {release.tag_name}
              </h3>
              {release.name && release.name !== release.tag_name && (
                <span className="text-sm text-text-muted">— {release.name}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1">
                <Download className="h-3 w-3" />
                {formatNumber(downloads)} unduhan
              </span>
              {release.assets.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <FileCode className="h-3 w-3" />
                  {release.assets.length} file · {formatBytes(sumSize(release))}
                </span>
              )}
              {sha256 && (
                <span className="inline-flex items-center gap-1 font-mono text-text-dim">
                  <Hash className="h-3 w-3" />
                  {truncateMiddle(sha256, 10, 6)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className="h-8 w-8 inline-flex items-center justify-center rounded-btn text-text-dim hover:text-text-primary transition-colors"
              aria-hidden="true"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 sm:p-5 space-y-4 bg-black/40 animate-fade-in-up">
          {/* Release notes */}
          {release.body && (
            <div>
              <p className="text-[10px] uppercase tracking-widest2 text-text-dim mb-1.5">
                Release Notes
              </p>
              <pre className="text-sm text-text-secondary whitespace-pre-wrap font-sans leading-relaxed max-h-72 overflow-y-auto">
{release.body}
              </pre>
            </div>
          )}

          {/* SHA256 full */}
          {sha256 && <ShaRow sha={sha256} />}

          {/* Assets */}
          {release.assets.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest2 text-text-dim mb-2">Assets</p>
              <div className="space-y-1.5">
                {release.assets.map((a) => (
                  <a
                    key={a.name}
                    href={a.browser_download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 p-2.5 rounded-input border border-border hover:border-accent-cyan transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">{a.name}</p>
                      <p className="text-xs text-text-dim font-mono">
                        {formatBytes(a.size)} · {formatNumber(a.download_count)} unduhan
                      </p>
                    </div>
                    <Download className="h-4 w-4 text-text-dim group-hover:text-accent-cyan shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border">
            <a
              href={release.html_url ?? `https://github.com/drmacze/F16-Launcher/releases/tag/${release.tag_name}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-accent-cyan transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Lihat di GitHub
            </a>
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-text-dim hover:text-danger">
              <Trash2 className="h-3.5 w-3.5" />
              Hapus Patch
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function ShaRow({ sha }: { sha: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await copyToClipboard(sha)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest2 text-text-dim mb-1.5">SHA256</p>
      <div className="flex items-center gap-2 p-2.5 rounded-input border border-border bg-black">
        <code className="text-xs font-mono text-text-secondary break-all flex-1">{sha}</code>
        <button
          onClick={copy}
          className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-btn text-text-dim hover:text-accent-cyan hover:bg-accent-cyan/5 transition-colors"
          aria-label="Copy SHA256"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

function DeletePatchModal({
  target,
  onClose,
}: {
  target: GitHubRelease | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const cmd = target
    ? `gh release delete ${target.tag_name} --repo drmacze/F16-Launcher --yes`
    : ''

  async function copyCmd() {
    if (!cmd) return
    await copyToClipboard(cmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title="Hapus Patch"
      description="Hapus release dari GitHub. Token write access dibutuhkan."
      cancelLabel="Tutup"
    >
      <div className="space-y-3">
        <div className="flex items-start gap-2 p-3 rounded-input bg-accent-amber/10 border border-accent-amber/30 text-sm text-accent-amber">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Menghapus patch dari dashboard butuh GitHub token write access yang tidak tersedia di
            browser. Jalankan command berikut di terminal:
          </span>
        </div>

        <div className="relative">
          <div className="flex items-center justify-between px-3 py-2 bg-black border border-border rounded-t-input">
            <span className="text-[10px] uppercase tracking-widest2 text-text-dim font-mono inline-flex items-center gap-1.5">
              <Terminal className="h-3 w-3" />
              Shell Command
            </span>
            <button
              onClick={copyCmd}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium text-text-muted hover:text-accent-cyan hover:bg-accent-cyan/5 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-success" />
                  <span className="text-success">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>
          </div>
          <pre className="bg-black border border-t-0 border-border rounded-b-input p-3 overflow-x-auto text-xs font-mono text-text-secondary leading-relaxed">
{cmd}
          </pre>
        </div>

        {target && (
          <div className="flex items-center gap-2 p-3 rounded-input bg-bg-hover border border-border">
            <Badge variant="cyan">{target.tag_name}</Badge>
            <span className="text-sm text-text-primary truncate">{target.name ?? target.tag_name}</span>
          </div>
        )}

        <div className="text-xs text-text-dim flex items-start gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-success" />
          <span>
            Setelah release dihapus, manifest di <code className="font-mono">DLavie-Launcher-Data</code> juga perlu diupdate agar user tidak mendownload patch yang sudah tidak tersedia.
          </span>
        </div>
      </div>
    </Modal>
  )
}

function sumSize(r: GitHubRelease): number {
  return r.assets.reduce((s, a) => s + a.size, 0)
}

// GitHub API helpers — all client-side reads, no secrets needed

const LAUNCHER_REPO = 'drmacze/F16-Launcher'
const DATA_MANIFEST_URL =
  'https://github.com/drmacze/DLavie-Launcher-Data/releases/download/v26/manifest.json'
const GITHUB_API = 'https://api.github.com'

export type GitHubAsset = {
  name: string
  download_count: number
  size: number
  browser_download_url: string
}

export type GitHubRelease = {
  id: number
  tag_name: string
  name: string | null
  published_at: string
  body?: string | null
  draft?: boolean
  prerelease?: boolean
  html_url?: string
  assets: GitHubAsset[]
}

export type DownloadStats = {
  totalDownloads: number
  totalAssets: number
  releaseCount: number
  latestVersion: string | null
  releases: {
    tag: string
    name: string
    downloads: number
    publishedAt: string
  }[]
}

export type ManifestFile = {
  path: string
  type: string
  size: number
  sha256: string
}

export type Manifest = {
  version: string
  package: string
  targetActivity?: string
  baseUrl?: string
  patches?: {
    version: string
    name: string
    sha256: string
    url: string
    type?: string
    size?: number
    releaseNotes?: string
  }[]
  files?: ManifestFile[]
  [key: string]: unknown
}

/** Fetch all releases + summed download counts from GitHub API */
export async function fetchDownloadStats(): Promise<DownloadStats> {
  const releases = await fetchReleases()

  let totalDownloads = 0
  let totalAssets = 0
  const releasesSummary: DownloadStats['releases'] = []

  for (const r of releases) {
    let releaseDownloads = 0
    for (const a of r.assets) {
      releaseDownloads += a.download_count
      totalAssets += 1
    }
    totalDownloads += releaseDownloads
    releasesSummary.push({
      tag: r.tag_name,
      name: r.name ?? r.tag_name,
      downloads: releaseDownloads,
      publishedAt: r.published_at,
    })
  }

  return {
    totalDownloads,
    totalAssets,
    releaseCount: releases.length,
    latestVersion: releases[0]?.tag_name ?? null,
    releases: releasesSummary,
  }
}

/** Fetch all releases (full payload) from GitHub API */
export async function fetchReleases(): Promise<GitHubRelease[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${LAUNCHER_REPO}/releases?per_page=100`,
    {
      headers: { Accept: 'application/vnd.github+json' },
    },
  )

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`)
  }

  return (await res.json()) as GitHubRelease[]
}

/** Fetch the launcher manifest from GitHub release asset */
export async function fetchManifest(): Promise<Manifest> {
  const res = await fetch(DATA_MANIFEST_URL, { redirect: 'follow' })
  if (!res.ok) {
    throw new Error(`Failed to fetch manifest: ${res.status}`)
  }
  return (await res.json()) as Manifest
}

/** Calculate SHA256 hash of a file using Web Crypto API */
export async function sha256OfFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  const bytes = Array.from(new Uint8Array(digest))
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Format bytes to human readable */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/** Format ISO date to Indonesian locale */
export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

/** Format ISO date as a short relative time in Indonesian ("2 jam lalu") */
export function formatRelative(iso: string): string {
  try {
    const then = new Date(iso).getTime()
    const now = Date.now()
    const diff = Math.max(0, now - then)
    const sec = Math.floor(diff / 1000)
    const min = Math.floor(sec / 60)
    const hr = Math.floor(min / 60)
    const day = Math.floor(hr / 24)

    if (sec < 60) return 'baru saja'
    if (min < 60) return `${min} menit lalu`
    if (hr < 24) return `${hr} jam lalu`
    if (day < 7) return `${day} hari lalu`
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

/** Format a short date label "12 Mar" for chart axes */
export function formatChartDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
    })
  } catch {
    return iso
  }
}

/** Format a number with thousand separators */
export function formatNumber(n: number): string {
  return n.toLocaleString('id-ID')
}

/** Compact number formatting: 1234 → "1.2K", 1234567 → "1.2M" */
export function formatCompact(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  return `${(n / 1_000_000_000).toFixed(1)}B`
}

/** Copy text to clipboard with graceful fallback */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return
    }
    // Fallback for non-secure contexts
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  } catch (e) {
    console.warn('copyToClipboard failed', e)
  }
}

/** Trigger a CSV download in the browser */
export function downloadCSV(filename: string, rows: (string | number)[][]): void {
  const escape = (v: string | number) => {
    const s = String(v ?? '')
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const csv = rows.map((row) => row.map(escape).join(',')).join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Truncate a long hash/id for display, e.g. "abc123…def789" */
export function truncateMiddle(s: string, head = 8, tail = 6): string {
  if (!s) return ''
  if (s.length <= head + tail + 1) return s
  return `${s.slice(0, head)}…${s.slice(-tail)}`
}

/** GitHub release SHA256 — try to extract from manifest or assets */
export function extractSha256FromRelease(release: GitHubRelease): string | null {
  // GitHub releases don't include SHA256 natively. Some repos include it in body.
  const body = (release as unknown as { body?: string }).body ?? ''
  const match = body.match(/sha[\s-]?256[:\s]*([a-fA-F0-9]{64})/i)
  return match ? match[1] : null
}

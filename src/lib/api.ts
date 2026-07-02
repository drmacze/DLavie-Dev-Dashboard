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
  const res = await fetch(
    `${GITHUB_API}/repos/${LAUNCHER_REPO}/releases?per_page=100`,
    {
      headers: { Accept: 'application/vnd.github+json' },
    },
  )

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`)
  }

  const releases: GitHubRelease[] = await res.json()

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

/** Format a number with thousand separators */
export function formatNumber(n: number): string {
  return n.toLocaleString('id-ID')
}

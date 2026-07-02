import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Save, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Card, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Modal'
import { fetchManifest, formatBytes } from '@/lib/api'
import type { Manifest } from '@/lib/api'

export default function ManifestEditor() {
  const { data: manifest, isLoading, refetch, isFetching } = useQuery<Manifest>({
    queryKey: ['manifest', 'editor'],
    queryFn: fetchManifest,
  })

  const [text, setText] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Populate textarea once manifest loads
  useEffect(() => {
    if (manifest) {
      setText(JSON.stringify(manifest, null, 2))
      setParseError(null)
    }
  }, [manifest])

  function handleTextChange(value: string) {
    setText(value)
    setSaved(false)
    try {
      JSON.parse(value)
      setParseError(null)
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'JSON tidak valid')
    }
  }

  function handleSave() {
    // Phase 1: just acknowledge. Actual save needs GitHub token with write access.
    setSaved(true)
    setTimeout(() => setSaved(false), 4000)
  }

  const files = manifest?.files ?? []
  const patches = manifest?.patches ?? []

  return (
    <Layout
      title="Manifest Editor"
      description="Edit manifest.json launcher DLavie"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          loading={isFetching}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-24 rounded-card bg-bg-hover animate-pulse" />
          <div className="h-96 rounded-card bg-bg-hover animate-pulse" />
        </div>
      ) : (
        <>
          {/* Manifest summary header */}
          <Card className="mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryItem label="Version" value={manifest?.version ?? '—'} mono />
              <SummaryItem label="Package" value={manifest?.package ?? '—'} mono />
              <SummaryItem
                label="Target Activity"
                value={(manifest?.targetActivity as string) ?? '—'}
                mono
              />
              <SummaryItem
                label="Total Files"
                value={`${files.length + patches.length} entri`}
              />
            </div>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
            {/* JSON editor */}
            <Card className="xl:col-span-3">
              <CardHeader
                title="JSON Editor"
                subtitle="Edit manifest dalam format JSON"
                action={
                  parseError ? (
                    <Badge variant="red">
                      <AlertCircle className="h-3 w-3" />
                      Invalid
                    </Badge>
                  ) : saved ? (
                    <Badge variant="green">
                      <CheckCircle2 className="h-3 w-3" />
                      Saved
                    </Badge>
                  ) : (
                    <Badge variant="green">Valid</Badge>
                  )
                }
              />

              {parseError && (
                <div className="flex items-start gap-2 mb-3 p-3 rounded-input bg-danger/10 border border-danger/30 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="font-mono">{parseError}</span>
                </div>
              )}

              <textarea
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                spellCheck={false}
                className="w-full h-[480px] bg-black border border-border rounded-input p-4 font-mono text-xs leading-relaxed text-text-primary focus:outline-none focus:border-accent-cyan resize-none"
                placeholder="Loading manifest…"
              />

              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-text-dim">
                  {text.length.toLocaleString('id-ID')} karakter · {text.split('\n').length} baris
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => manifest && setText(JSON.stringify(manifest, null, 2))}
                    disabled={!manifest}
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!!parseError || !text}
                  >
                    <Save className="h-3.5 w-3.5" />
                    Simpan
                  </Button>
                </div>
              </div>

              {saved && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-input bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Manifest akan diupdate di Phase 2 (butuh GitHub token dengan write access ke
                    repo <code className="font-mono">DLavie-Launcher-Data</code>).
                  </span>
                </div>
              )}
            </Card>

            {/* Files table */}
            <Card className="xl:col-span-2">
              <CardHeader
                title="File dalam Manifest"
                subtitle={`${files.length} file · ${patches.length} patch`}
              />
              <div className="max-h-[520px] overflow-y-auto -mr-2 pr-2">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-bg-card">
                    <tr className="text-left text-[10px] uppercase tracking-widest2 text-text-dim border-b border-border">
                      <th className="py-2 pr-2 font-medium">Path</th>
                      <th className="py-2 px-2 font-medium">Type</th>
                      <th className="py-2 px-2 font-medium text-right">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((f, i) => (
                      <tr
                        key={`f-${i}`}
                        className="border-b border-border-subtle hover:bg-bg-hover transition-colors"
                      >
                        <td className="py-2 pr-2">
                          <p className="text-xs font-mono text-text-primary truncate max-w-[160px]">
                            {f.path}
                          </p>
                          <p className="text-[10px] font-mono text-text-dim truncate max-w-[160px]">
                            {f.sha256?.slice(0, 16) ?? '—'}…
                          </p>
                        </td>
                        <td className="py-2 px-2">
                          <Badge variant="gray">{f.type}</Badge>
                        </td>
                        <td className="py-2 px-2 text-right text-xs font-mono text-text-muted">
                          {formatBytes(f.size ?? 0)}
                        </td>
                      </tr>
                    ))}
                    {patches.map((p, i) => (
                      <tr
                        key={`p-${i}`}
                        className="border-b border-border-subtle hover:bg-bg-hover transition-colors"
                      >
                        <td className="py-2 pr-2">
                          <p className="text-xs font-mono text-text-primary truncate max-w-[160px]">
                            {p.version}
                          </p>
                          <p className="text-[10px] text-text-muted truncate max-w-[160px]">
                            {p.name}
                          </p>
                        </td>
                        <td className="py-2 px-2">
                          <Badge variant="cyan">patch</Badge>
                        </td>
                        <td className="py-2 px-2 text-right text-xs font-mono text-text-muted">
                          {p.size ? formatBytes(p.size) : '—'}
                        </td>
                      </tr>
                    ))}
                    {files.length === 0 && patches.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-sm text-text-muted">
                          <FileText className="h-6 w-6 text-text-dim mx-auto mb-2" />
                          Tidak ada file di manifest
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </Layout>
  )
}

function SummaryItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest2 text-text-dim mb-1">{label}</p>
      <p
        className={`text-sm text-text-primary truncate ${mono ? 'font-mono text-xs' : 'font-semibold'}`}
      >
        {value}
      </p>
    </div>
  )
}

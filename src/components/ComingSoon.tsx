import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Hammer, Sparkles } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'

type ComingSoonProps = {
  title: string
  description: string
  icon: LucideIcon
  phase?: string
}

export function ComingSoon({ title, description, icon: Icon, phase = 'Phase 2' }: ComingSoonProps) {
  const navigate = useNavigate()

  return (
    <Layout title={title} description={description} breadcrumb={['Dashboard', title]}>
      <div className="flex items-center justify-center py-8 md:py-16 animate-fade-in-up">
        <Card padding="none" className="max-w-xl w-full overflow-hidden">
          {/* Decorative top gradient band */}
          <div className="h-1.5 bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-cyan opacity-60" />

          <div className="p-8 md:p-12 text-center">
            {/* Large icon (48px) */}
            <div className="mx-auto h-20 w-20 rounded-card border border-accent-violet/20 bg-accent-violet/5 flex items-center justify-center mb-6 animate-scale-in">
              <Icon className="h-10 w-10 text-accent-violet" strokeWidth={1.5} />
            </div>

            {/* Phase pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-accent-violet/10 border border-accent-violet/20 text-accent-violet text-[10px] uppercase tracking-widest2 font-medium mb-4">
              <Hammer className="h-3 w-3" />
              {phase} · Coming Soon
            </div>

            <h2 className="text-2xl font-bold tracking-tightest text-text-primary mb-2">{title}</h2>
            <p className="text-sm text-text-muted leading-relaxed max-w-md mx-auto mb-8">
              Modul ini akan tersedia di {phase}. Saat ini silakan gunakan fitur lain yang sudah
              aktif di panel ini.
            </p>

            {/* Progress indicator — 3 dots (Phase 1 done, Phase 2 current, Phase 3 pending) */}
            <div className="flex items-center justify-center gap-2.5 mb-8">
              <PhaseDot label="Phase 1" state="done" />
              <div className="h-px w-8 bg-border" />
              <PhaseDot label="Phase 2" state="current" />
              <div className="h-px w-8 bg-border" />
              <PhaseDot label="Phase 3" state="pending" />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Dashboard
              </Button>
              <span className="inline-flex items-center gap-1.5 text-xs text-text-dim">
                <Sparkles className="h-3.5 w-3.5 text-accent-amber" />
                Sedang dalam pengembangan
              </span>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}

function PhaseDot({
  label,
  state,
}: {
  label: string
  state: 'done' | 'current' | 'pending'
}) {
  const styles = {
    done: 'bg-success border-success text-black',
    current: 'bg-accent-cyan border-accent-cyan text-black animate-pulse',
    pending: 'bg-bg-hover border-border text-text-dim',
  }[state]

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={`h-3 w-3 rounded-full border-2 ${styles} transition-colors`}
        aria-label={`${label} (${state})`}
      />
      <span
        className={`text-[10px] uppercase tracking-widest2 ${
          state === 'pending' ? 'text-text-dim' : 'text-text-muted'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

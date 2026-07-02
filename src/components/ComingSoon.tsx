import type { LucideIcon } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/Card'
import { Hammer } from 'lucide-react'

type ComingSoonProps = {
  title: string
  description: string
  icon: LucideIcon
  phase?: string
}

export function ComingSoon({ title, description, icon: Icon, phase = 'Phase 2' }: ComingSoonProps) {
  return (
    <Layout title={title} description={description}>
      <div className="flex items-center justify-center py-12">
        <Card padding="lg" className="max-w-lg w-full text-center">
          <div className="mx-auto h-16 w-16 rounded-card border border-accent-violet/20 bg-accent-violet/5 flex items-center justify-center mb-5">
            <Icon className="h-7 w-7 text-accent-violet" strokeWidth={2} />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-violet/10 border border-accent-violet/20 text-accent-violet text-[10px] uppercase tracking-widest2 font-medium mb-4">
            <Hammer className="h-3 w-3" />
            {phase} · Coming Soon
          </div>
          <h2 className="text-xl font-bold tracking-tightest text-text-primary mb-2">{title}</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            Fitur ini sedang dalam pengembangan dan akan tersedia di {phase}. Saat ini silakan
            gunakan fitur lain yang sudah aktif di panel ini.
          </p>
        </Card>
      </div>
    </Layout>
  )
}

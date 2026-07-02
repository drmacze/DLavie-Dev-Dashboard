import type { ReactNode } from 'react'
import { Sidebar } from '@/components/Sidebar'

type LayoutProps = {
  children: ReactNode
  title?: string
  description?: string
  actions?: ReactNode
}

export function Layout({ children, title, description, actions }: LayoutProps) {
  return (
    <div className="min-h-screen flex bg-bg-base text-text-primary">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        {(title || actions) && (
          <header className="h-16 border-b border-border flex items-center justify-between gap-4 px-6 sticky top-0 bg-bg-base/95 backdrop-blur-sm z-10">
            <div className="min-w-0">
              {title && (
                <h1 className="text-lg font-bold tracking-tightest text-text-primary truncate">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-xs text-text-muted truncate">{description}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
          </header>
        )}
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  )
}

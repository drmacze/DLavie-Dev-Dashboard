import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, LogOut, ChevronRight, User as UserIcon, Zap } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { useAuth } from '@/hooks/useAuth'

type LayoutProps = {
  children: ReactNode
  title?: string
  description?: string
  /** Optional breadcrumb segments shown before the title (root → leaf). */
  breadcrumb?: string[]
  actions?: ReactNode
}

function UserMenu() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const initials = (user?.email ?? 'A')[0]?.toUpperCase() ?? 'A'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-pill border border-border hover:border-border-hover transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="h-7 w-7 rounded-full bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center text-xs font-bold text-black">
          {initials}
        </span>
        <span className="hidden sm:block text-xs text-text-secondary max-w-[140px] truncate">
          {user?.email ?? 'Admin'}
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 bg-bg-card border border-border rounded-btn shadow-dropdown z-50 overflow-hidden animate-scale-in origin-top-right"
          role="menu"
        >
          <div className="p-3 border-b border-border">
            <p className="text-xs font-medium text-text-primary truncate">{user?.email ?? 'Admin'}</p>
            <p className="text-[10px] uppercase tracking-widest2 text-text-dim mt-0.5">Admin Panel</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-text-muted hover:bg-bg-hover hover:text-danger transition-colors"
            role="menuitem"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

export function Layout({ children, title, description, breadcrumb, actions }: LayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Lock body scroll when drawer open on mobile
  useEffect(() => {
    if (!drawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [drawerOpen])

  // Close drawer when navigating to desktop width
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) setDrawerOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const crumbs = breadcrumb ?? (title ? [title] : [])

  return (
    <div className="min-h-screen flex bg-bg-base text-text-primary">
      {/* Desktop sidebar — static, 256px */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="md:hidden fixed inset-y-0 left-0 z-50 animate-slide-in-left">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-border flex items-center justify-between gap-3 px-4 md:px-6 sticky top-0 bg-bg-base/95 backdrop-blur-md z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden h-9 w-9 -ml-1 flex items-center justify-center rounded-btn text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
              aria-label="Buka menu"
            >
              <Menu className="h-5 w-5" strokeWidth={2} />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <Zap className="h-4 w-4 text-accent-cyan shrink-0 hidden sm:block" strokeWidth={2.5} />
              <nav className="flex items-center gap-1.5 min-w-0" aria-label="Breadcrumb">
                {crumbs.length > 0 ? (
                  crumbs.map((c, i) => (
                    <span key={i} className="flex items-center gap-1.5 min-w-0">
                      {i > 0 && (
                        <ChevronRight className="h-3.5 w-3.5 text-text-dim shrink-0" strokeWidth={2} />
                      )}
                      <span
                        className={`text-sm truncate ${
                          i === crumbs.length - 1
                            ? 'font-semibold text-text-primary'
                            : 'text-text-muted'
                        }`}
                      >
                        {c}
                      </span>
                    </span>
                  ))
                ) : (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                    <UserIcon className="h-3.5 w-3.5 text-text-dim" />
                    Dashboard
                  </span>
                )}
              </nav>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {actions}
            <UserMenu />
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6">
          {(title || description) && (
            <div className="mb-5 animate-fade-in-up">
              {title && (
                <h1 className="text-xl md:text-2xl font-bold tracking-tightest text-text-primary">
                  {title}
                </h1>
              )}
              {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  )
}

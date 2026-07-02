import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Upload,
  FileText,
  Package,
  Newspaper,
  Wrench,
  Users,
  Bell,
  BarChart3,
  Ticket,
  History,
  LogOut,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/Button'

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  phase: 1 | 2
}

const items: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, phase: 1 },
  { to: '/upload', label: 'Upload Patch', icon: Upload, phase: 1 },
  { to: '/manifest', label: 'Manifest Editor', icon: FileText, phase: 1 },
  { to: '/patches', label: 'Patch Management', icon: Package, phase: 2 },
  { to: '/feed', label: 'Feed/Berita', icon: Newspaper, phase: 1 },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench, phase: 2 },
  { to: '/users', label: 'User Management', icon: Users, phase: 2 },
  { to: '/notifications', label: 'Push Notif', icon: Bell, phase: 2 },
  { to: '/stats', label: 'Stats', icon: BarChart3, phase: 2 },
  { to: '/tickets', label: 'Support Tickets', icon: Ticket, phase: 2 },
  { to: '/activity-log', label: 'Activity Log', icon: History, phase: 2 },
]

export function Sidebar() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 bg-bg-base border-r border-border flex flex-col">
      {/* Logo header */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border">
        <div className="h-8 w-8 rounded-btn border border-accent-cyan/40 bg-accent-cyan/5 flex items-center justify-center">
          <Zap className="h-4 w-4 text-accent-cyan" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tightest text-text-primary">DLavie Dev</p>
          <p className="text-[10px] uppercase tracking-widest2 text-text-dim">Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 px-3 py-2 rounded-btn text-sm transition-colors duration-200 border-l-2',
                      isActive
                        ? 'bg-accent-cyan/5 text-text-primary border-accent-cyan'
                        : 'text-text-muted border-transparent hover:bg-bg-hover hover:text-text-primary',
                    ].join(' ')
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  <span className="truncate">{item.label}</span>
                  {item.phase === 2 && (
                    <span className="ml-auto text-[9px] uppercase tracking-widest2 text-text-dim border border-border rounded px-1 py-0.5">
                      Soon
                    </span>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User + Logout */}
      <div className="border-t border-border p-3">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs text-text-dim truncate">
            {user?.email ?? 'Tidak ada sesi'}
          </p>
          <p className="text-[10px] uppercase tracking-widest2 text-text-dim mt-0.5">Admin</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start">
          <LogOut className="h-4 w-4" strokeWidth={2} />
          Logout
        </Button>
      </div>
    </aside>
  )
}

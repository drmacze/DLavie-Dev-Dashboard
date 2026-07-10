import { NavLink } from 'react-router-dom'
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
  Star,
  Zap,
  Megaphone,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
}

const items: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload', label: 'Upload Patch', icon: Upload },
  { to: '/manifest', label: 'Manifest Editor', icon: FileText },
  { to: '/patches', label: 'Patch Management', icon: Package },
  { to: '/feed', label: 'Feed Komunitas', icon: Newspaper },
  { to: '/berita', label: 'Berita & Banner', icon: Megaphone },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
  { to: '/tickets', label: 'Tickets', icon: Ticket },
  { to: '/activity-log', label: 'Activity Log', icon: History },
  { to: '/ratings', label: 'Ratings', icon: Star },
]

type SidebarProps = {
  /** Called after a nav link is clicked (used to close the mobile drawer). */
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { user } = useAuth()

  return (
    <aside className="w-64 shrink-0 h-screen bg-bg-base border-r border-border flex flex-col">
      {/* Logo header */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border shrink-0">
        <div className="h-8 w-8 rounded-btn border border-accent-cyan/40 bg-accent-cyan/5 flex items-center justify-center">
          <Zap className="h-4 w-4 text-accent-cyan" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tightest text-text-primary">DLavie Dev</p>
          <p className="text-[10px] uppercase tracking-widest2 text-text-dim">Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-none">
        <p className="px-3 mb-2 text-[10px] font-medium uppercase tracking-widest2 text-text-dim">
          Menu
        </p>
        <ul className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    [
                      'group flex items-center gap-3 px-3 py-2 rounded-btn text-sm transition-all duration-150 border-l-2',
                      isActive
                        ? 'bg-bg-active text-text-primary border-accent-cyan font-medium'
                        : 'text-text-muted border-transparent hover:bg-bg-hover hover:text-text-secondary',
                    ].join(' ')
                  }
                >
                  <Icon
                    className="h-4 w-4 shrink-0 transition-colors"
                    strokeWidth={2}
                  />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-3 shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <span className="h-8 w-8 rounded-full bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center text-xs font-bold text-black shrink-0">
            {(user?.email ?? 'A')[0]?.toUpperCase() ?? 'A'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-text-secondary truncate">{user?.email ?? 'Tidak ada sesi'}</p>
            <p className="text-[10px] uppercase tracking-widest2 text-text-dim mt-0.5">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

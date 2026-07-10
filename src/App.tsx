import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { useAdminCheck } from '@/hooks/useAdminCheck'
import { PageTransition } from '@/components/PageTransition'
import { Zap } from 'lucide-react'

// Lazy-load pages to keep initial bundle small
const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const UploadPatch = lazy(() => import('@/pages/UploadPatch'))
const ManifestEditor = lazy(() => import('@/pages/ManifestEditor'))
const Feed = lazy(() => import('@/pages/Feed'))
const Berita = lazy(() => import('@/pages/Berita'))
const Patches = lazy(() => import('@/pages/Patches'))
const Maintenance = lazy(() => import('@/pages/Maintenance'))
const Users = lazy(() => import('@/pages/Users'))
const Notifications = lazy(() => import('@/pages/Notifications'))
const Stats = lazy(() => import('@/pages/Stats'))
const Tickets = lazy(() => import('@/pages/Tickets'))
const ActivityLog = lazy(() => import('@/pages/ActivityLog'))
const Ratings = lazy(() => import('@/pages/Ratings'))

function FullScreenLoader({ label = 'Memuat…' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-card border border-accent-cyan/40 bg-accent-cyan/5 flex items-center justify-center">
          <Zap className="h-5 w-5 text-accent-cyan animate-pulse" strokeWidth={2.5} />
        </div>
        <p className="text-xs uppercase tracking-widest2 text-text-muted">{label}</p>
      </div>
    </div>
  )
}

function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading, error } = useAdminCheck()

  if (authLoading) return <FullScreenLoader label="Memuat sesi…" />
  if (!user) return <Navigate to="/login" replace />

  if (adminLoading) return <FullScreenLoader label="Memverifikasi akses admin…" />

  if (error || !isAdmin) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-bg-card border border-danger/30 rounded-card p-6 text-center">
          <div className="mx-auto h-14 w-14 rounded-card border border-danger/40 bg-danger/10 flex items-center justify-center mb-4">
            <Zap className="h-7 w-7 text-danger" strokeWidth={2} />
          </div>
          <h1 className="text-lg font-bold tracking-tightest text-text-primary mb-2">
            Akses Ditolak
          </h1>
          <p className="text-sm text-text-muted mb-5">
            {error ?? 'Akun Anda tidak memiliki izin admin.'}
          </p>
          <a
            href="/DLavie-Dev-Dashboard/login"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-btn bg-accent-cyan text-black font-semibold text-sm hover:bg-accent-cyan-hover transition-colors"
          >
            Kembali ke Login
          </a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

function AppRoutes() {
  const location = useLocation()
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <AdminGate>
              <PageTransition key={location.pathname}>
                <Routes location={location}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/upload" element={<UploadPatch />} />
                  <Route path="/manifest" element={<ManifestEditor />} />
                  <Route path="/feed" element={<Feed />} />
                  <Route path="/berita" element={<Berita />} />
                  <Route path="/patches" element={<Patches />} />
                  <Route path="/maintenance" element={<Maintenance />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/stats" element={<Stats />} />
                  <Route path="/tickets" element={<Tickets />} />
                  <Route path="/activity-log" element={<ActivityLog />} />
                  <Route path="/ratings" element={<Ratings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </PageTransition>
            </AdminGate>
          }
        />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Zap, AlertCircle, Lock, Mail } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'

export default function Login() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Already logged in → redirect to dashboard
  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email.trim(), password)
      // AuthProvider will update state, then admin-check runs in App shell.
      navigate('/', { replace: true })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal masuk. Periksa kembali kredensial Anda.'
      // Supabase returns generic "Invalid login credentials"
      if (/invalid login credentials/i.test(message)) {
        setError('Email atau password salah. Silakan coba lagi.')
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-card border border-accent-cyan/40 bg-accent-cyan/5 flex items-center justify-center mb-4">
            <Zap className="h-7 w-7 text-accent-cyan" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tightest text-text-primary">DLavie Dev</h1>
          <p className="mt-1 text-xs uppercase tracking-widest2 text-text-muted">
            Admin Panel · Launcher
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-bg-card border border-border rounded-card p-6">
          <h2 className="text-base font-semibold tracking-tightest text-text-primary mb-1">
            Masuk ke Dashboard
          </h2>
          <p className="text-xs text-text-muted mb-5">
            Gunakan akun admin DLavie Anda untuk melanjutkan.
          </p>

          {error && (
            <div className="flex items-start gap-2.5 mb-4 p-3 rounded-input bg-danger/10 border border-danger/30 text-sm text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-danger" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-[38px] h-4 w-4 text-text-dim pointer-events-none" />
              <Input
                id="email"
                type="email"
                label="Email"
                placeholder="admin@dlavie.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-[38px] h-4 w-4 text-text-dim pointer-events-none" />
              <Input
                id="password"
                type="password"
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="pl-9"
              />
            </div>

            <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
              {loading ? 'Memproses…' : 'Masuk'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-text-dim leading-relaxed">
          Akun non-admin akan ditolak otomatis.<br />
          Hubungi developer utama untuk akses.
        </p>
      </div>
    </div>
  )
}

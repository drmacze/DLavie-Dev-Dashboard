import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Zap, AlertCircle, Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function Login() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shakeKey, setShakeKey] = useState(0)

  // Already logged in → redirect to dashboard
  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal masuk. Periksa kembali kredensial Anda.'
      if (/invalid login credentials/i.test(message)) {
        setError('Email atau password salah. Silakan coba lagi.')
      } else {
        setError(message)
      }
      setShakeKey((k) => k + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-gradient-to-br from-bg-card via-bg-base to-black flex-col justify-between p-12 border-r border-border">
        {/* Decorative gradient blobs */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-accent-cyan/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-accent-violet/10 blur-3xl" aria-hidden="true" />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
          aria-hidden="true"
        />

        {/* Logo + brand */}
        <div className="relative animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-card border border-accent-cyan/40 bg-accent-cyan/5 flex items-center justify-center">
              <Zap className="h-6 w-6 text-accent-cyan" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <p className="text-base font-bold tracking-tightest text-text-primary">DLavie Dev</p>
              <p className="text-[10px] uppercase tracking-widest2 text-text-dim">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <h1 className="text-4xl xl:text-5xl font-bold tracking-tightest text-text-primary leading-[1.1] mb-4">
            Panel kontrol untuk{' '}
            <span className="text-gradient-cyan">Launcher DLavie</span>
          </h1>
          <p className="text-base text-text-muted leading-relaxed max-w-md">
            Kelola rilis patch, manifest, feed berita, dan aktivitas pengguna — semuanya dalam satu
            dasbor premium.
          </p>

          {/* Feature bullets */}
          <div className="mt-8 space-y-3">
            {[
              'Upload & validasi patch otomatis',
              'Editor manifest dengan validasi real-time',
              'Feed pengumuman ke seluruh user',
            ].map((feat, i) => (
              <div
                key={feat}
                className="flex items-center gap-2.5 text-sm text-text-secondary animate-fade-in-up"
                style={{ animationDelay: `${200 + i * 80}ms` }}
              >
                <ShieldCheck className="h-4 w-4 text-success shrink-0" strokeWidth={2} />
                {feat}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative text-[11px] text-text-dim">
          © {new Date().getFullYear()} DLavie. Semua hak dilindungi.
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-sm animate-slide-in-right">
          {/* Mobile compact branding */}
          <div className="lg:hidden flex flex-col items-center mb-8 animate-scale-in">
            <div className="h-14 w-14 rounded-card border border-accent-cyan/40 bg-accent-cyan/5 flex items-center justify-center mb-3">
              <Zap className="h-7 w-7 text-accent-cyan" strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold tracking-tightest text-text-primary">DLavie Dev</h1>
            <p className="mt-0.5 text-[10px] uppercase tracking-widest2 text-text-muted">
              Admin Panel · Launcher
            </p>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tightest text-text-primary mb-1.5">
              Masuk ke Dashboard
            </h2>
            <p className="text-sm text-text-muted">
              Gunakan akun admin DLavie Anda untuk melanjutkan.
            </p>
          </div>

          {/* Error (shake on reappear) */}
          {error && (
            <div
              key={shakeKey}
              className="flex items-start gap-2.5 mb-4 p-3 rounded-input bg-danger/10 border border-danger/30 text-sm text-danger animate-shake"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Floating label: Email */}
            <FloatingField
              id="email"
              label="Email"
              type="email"
              icon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={setEmail}
              placeholder="admin@dlavie.id"
              autoComplete="email"
              required
            />

            {/* Floating label: Password with show/hide */}
            <FloatingField
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              icon={<Lock className="h-4 w-4" />}
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-text-dim hover:text-text-secondary transition-colors"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            <button
              type="submit"
              disabled={loading}
              className="group w-full h-11 rounded-btn bg-accent-cyan text-black font-semibold text-sm hover:bg-accent-cyan-hover transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-[0_0_0_0_rgba(34,211,238,0)] hover:shadow-[0_8px_24px_rgba(34,211,238,0.2)]"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Memproses…
                </>
              ) : (
                <>
                  Masuk
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] text-text-dim leading-relaxed">
            Akun non-admin akan ditolak otomatis.
            <br />
            Hubungi developer utama untuk akses.
          </p>
        </div>
      </div>
    </div>
  )
}

type FloatingFieldProps = {
  id: string
  label: string
  type: string
  icon: React.ReactNode
  value: string
  onChange: (v: string) => void
  placeholder: string
  autoComplete?: string
  required?: boolean
  trailing?: React.ReactNode
}

function FloatingField({
  id,
  label,
  type,
  icon,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  trailing,
}: FloatingFieldProps) {
  const hasValue = value.length > 0
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none transition-colors peer-focus:text-accent-cyan">
        {icon}
      </div>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="peer w-full h-12 bg-black text-text-primary rounded-input border border-border px-10 pt-3 text-sm transition-all duration-200 placeholder-transparent focus:outline-none focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/20"
      />
      <label
        htmlFor={id}
        className={`absolute left-10 transition-all duration-200 pointer-events-none ${
          hasValue
            ? 'top-1.5 text-[10px] uppercase tracking-widest2 text-text-muted'
            : 'top-1/2 -translate-y-1/2 text-sm text-text-dim'
        } peer-focus:top-1.5 peer-focus:-translate-y-0 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-widest2 peer-focus:text-accent-cyan`}
      >
        {label}
      </label>
      {trailing && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>
      )}
    </div>
  )
}

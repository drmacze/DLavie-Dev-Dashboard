import { useEffect, useRef, useState } from 'react'

type AnimatedCounterProps = {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  /** Locale used for thousand separators (default id-ID) */
  locale?: string
  className?: string
  /** Disable animation and render instantly (useful for SSR / reduced motion) */
  instant?: boolean
}

// easeOutExpo — fast start, gentle settle. Feels premium.
function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

/**
 * Count-up animation driven by requestAnimationFrame.
 * Renders 0 → value over `duration` ms with easeOutExpo easing.
 */
export function AnimatedCounter({
  value,
  duration = 1500,
  decimals = 0,
  prefix = '',
  suffix = '',
  locale = 'id-ID',
  className = '',
  instant = false,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(instant ? value : 0)
  const fromRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (instant) {
      setDisplay(value)
      return
    }

    // Respect reduced-motion users — jump straight to the value.
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setDisplay(value)
      return
    }

    const from = fromRef.current
    const delta = value - from
    if (delta === 0) return

    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutExpo(progress)
      const current = from + delta * eased
      setDisplay(current)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = value
        setDisplay(value)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration, instant])

  const formatted =
    decimals > 0
      ? display.toLocaleString(locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : Math.round(display).toLocaleString(locale)

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}

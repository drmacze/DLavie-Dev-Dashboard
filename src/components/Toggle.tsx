type ToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  /** Optional id to associate with a label */
  id?: string
}

/**
 * iOS-style toggle switch with cyan accent when ON.
 * Renders as a button for accessibility.
 */
export function Toggle({ checked, onChange, label, description, disabled, id }: ToggleProps) {
  const trigger = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-black',
        checked ? 'bg-accent-cyan' : 'bg-bg-hover border border-border',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  )

  if (!label && !description) return trigger

  return (
    <label
      htmlFor={id}
      className="flex items-center gap-3 cursor-pointer select-none"
      onClick={(e) => {
        // Only toggle when clicking the label text, not the trigger itself (button handles its own click)
        if (e.target === e.currentTarget || (e.target as HTMLElement).tagName !== 'BUTTON') {
          e.preventDefault()
          if (!disabled) onChange(!checked)
        }
      }}
    >
      {trigger}
      <div className="min-w-0">
        {label && <p className="text-sm font-medium text-text-primary">{label}</p>}
        {description && <p className="text-xs text-text-dim mt-0.5">{description}</p>}
      </div>
    </label>
  )
}

import { forwardRef } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react'

const baseField =
  'w-full bg-black text-text-primary placeholder-text-dim rounded-input border border-border ' +
  'px-3 py-2 text-sm transition-colors duration-200 ' +
  'focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, className = '', id, ...rest },
  ref,
) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block mb-1.5 text-xs font-medium text-text-muted uppercase tracking-widest2">
          {label}
        </label>
      )}
      <input ref={ref} id={id} className={`${baseField} ${className}`} {...rest} />
      {hint && <p className="mt-1 text-xs text-text-dim">{hint}</p>}
    </div>
  )
})

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, className = '', id, ...rest },
  ref,
) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block mb-1.5 text-xs font-medium text-text-muted uppercase tracking-widest2">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={`${baseField} font-mono ${className}`}
        {...rest}
      />
      {hint && <p className="mt-1 text-xs text-text-dim">{hint}</p>}
    </div>
  )
})

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: string }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, className = '', id, children, ...rest },
  ref,
) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block mb-1.5 text-xs font-medium text-text-muted uppercase tracking-widest2">
          {label}
        </label>
      )}
      <select ref={ref} id={id} className={`${baseField} ${className}`} {...rest}>
        {children}
      </select>
    </div>
  )
})

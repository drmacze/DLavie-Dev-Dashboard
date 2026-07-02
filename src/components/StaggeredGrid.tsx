import { Children, cloneElement, type CSSProperties, type ReactNode, type ReactElement } from 'react'

type StaggeredGridProps = {
  children: ReactNode
  /** Delay between each child in ms */
  staggerMs?: number
  /** Initial delay before the first child animates */
  initialDelay?: number
  className?: string
}

/**
 * Wrapper that animates each direct child with a staggered fade-in-up.
 * Each child receives animationDelay = initialDelay + index * staggerMs.
 *
 * Direct children should be elements (they are cloned with an injected
 * `className` + `style`). Non-element children are wrapped in a div.
 */
export function StaggeredGrid({
  children,
  staggerMs = 50,
  initialDelay = 0,
  className = '',
}: StaggeredGridProps) {
  const items = Children.toArray(children)

  return (
    <div className={className}>
      {items.map((child, index) => {
        const delay = initialDelay + index * staggerMs
        const style: CSSProperties = { animationDelay: `${delay}ms` }

        if (typeof child !== 'object' || child === null || !('props' in child)) {
          return (
            <div key={index} className="page-enter" style={style}>
              {child}
            </div>
          )
        }

        const element = child as ReactElement<{ className?: string; style?: CSSProperties }>
        const mergedClassName = ['page-enter', element.props.className ?? '']
          .filter(Boolean)
          .join(' ')
        const mergedStyle = { ...element.props.style, ...style }

        return cloneElement(element, { key: index, className: mergedClassName, style: mergedStyle })
      })}
    </div>
  )
}

import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from './cx'
import { tabId, tabPanelId } from './tab-ids'

export interface TabItem<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

interface TabsProps<T extends string> {
  items: ReadonlyArray<TabItem<T>>
  value: T
  onChange: (value: T) => void
  /** Prefix for the generated ids so each panel can point back at its tab. */
  idBase: string
  /** Accessible name for the tab list itself. */
  label: string
  className?: string
}

/**
 * Segmented control implementing the ARIA tabs pattern: roving tabindex plus
 * arrow/Home/End navigation. The caller owns the active-tab state and must give
 * each panel `role="tabpanel"` with the ids from `tabPanelId`/`tabId`.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  idBase,
  label,
  className = '',
}: TabsProps<T>) {
  const buttonRefs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({})

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = items.findIndex((item) => item.value === value)

    if (currentIndex === -1) {
      return
    }

    let nextIndex: number | null = null

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % items.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + items.length) % items.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = items.length - 1
    }

    if (nextIndex === null) {
      return
    }

    event.preventDefault()
    const nextValue = items[nextIndex].value
    onChange(nextValue)
    buttonRefs.current[nextValue]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cx(
        'flex gap-1 rounded-xl border border-border bg-surface-raised p-1',
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.value === value

        return (
          <button
            key={item.value}
            ref={(node) => {
              buttonRefs.current[item.value] = node
            }}
            type="button"
            role="tab"
            id={tabId(idBase, item.value)}
            aria-selected={isActive}
            aria-controls={tabPanelId(idBase, item.value)}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cx(
              'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-1.5 py-2.5 sm:gap-2 sm:px-3',
              'text-center text-[12px] font-semibold leading-tight transition-all duration-150 sm:whitespace-nowrap sm:text-sm',
              isActive
                ? 'bg-accent text-white shadow-raised'
                : 'text-muted hover:bg-surface-overlay hover:text-ink',
            )}
          >
            {item.icon ? (
              <span className="max-sm:hidden" aria-hidden="true">
                {item.icon}
              </span>
            ) : null}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '@/components/ui/cx'

export interface MenuAction {
  id: string
  label: string
  icon?: ReactNode
  tone?: 'default' | 'danger'
  disabled?: boolean
  onSelect: () => void
}

interface MenuProps {
  label: string
  trigger: ReactNode
  items: MenuAction[]
}

export function Menu({ label, trigger, items }: MenuProps) {
  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      return
    }

    const rect = triggerRef.current.getBoundingClientRect()
    const menuWidth = 208
    const estimatedHeight = items.length * 40 + 16
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      window.innerWidth - menuWidth - 8,
    )
    const openUp = rect.bottom + estimatedHeight > window.innerHeight - 8
    const top = openUp
      ? Math.max(8, rect.top - estimatedHeight - 6)
      : rect.bottom + 6

    setPosition({ top, left })
  }, [open, items.length])

  useEffect(() => {
    if (!open) {
      return
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    const onScroll = () => setOpen(false)

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        className={cx(
          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
          'text-subtle transition-colors duration-150',
          'hover:bg-surface-overlay hover:text-white',
          open && 'bg-surface-overlay text-white',
        )}
      >
        {trigger}
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={label}
              style={{ top: position.top, left: position.left }}
              className={cx(
                'fixed z-50 w-52 rounded-xl border border-border bg-surface-raised p-1',
                'shadow-panel',
              )}
            >
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    if (item.disabled) {
                      return
                    }
                    setOpen(false)
                    item.onSelect()
                  }}
                  className={cx(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium',
                    'transition-colors duration-150',
                    item.tone === 'danger'
                      ? 'text-live hover:bg-live/15'
                      : 'text-muted hover:bg-surface-overlay hover:text-white',
                    'disabled:pointer-events-none disabled:opacity-40',
                  )}
                >
                  {item.icon ? (
                    <span className="shrink-0" aria-hidden="true">
                      {item.icon}
                    </span>
                  ) : null}
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

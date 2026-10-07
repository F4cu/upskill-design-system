import { useEffect, useRef } from 'react'
import type { HTMLAttributes, KeyboardEvent } from 'react'
import styles from './DropdownMenu.module.css'

export type DropdownMenuItem = {
  value: string
  label: string
}

export type DropdownMenuProps = {
  items: DropdownMenuItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
  value?: string
  onSelect: (value: string) => void
  listRole?: 'menu' | 'listbox'
  id?: string
} & Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'onSelect'>

export function DropdownMenu({
  items,
  open,
  onOpenChange,
  value: selectedValue,
  onSelect,
  listRole = 'menu',
  id,
  className,
  ...rest
}: DropdownMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  function handleItemKeyDown(e: KeyboardEvent<HTMLDivElement>, index: number, value: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(value)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const options = panelRef.current?.querySelectorAll<HTMLElement>('[role="option"], [role="menuitem"]')
      options?.[index + 1]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const options = panelRef.current?.querySelectorAll<HTMLElement>('[role="option"], [role="menuitem"]')
      options?.[index - 1]?.focus()
    }
  }

  if (!open) return null

  return (
    <div
      ref={panelRef}
      role={listRole}
      id={id}
      className={[styles.panel, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {items.map((item, index) => (
        <div
          key={item.value}
          role={listRole === 'listbox' ? 'option' : 'menuitem'}
          aria-selected={listRole === 'listbox' ? item.value === selectedValue : undefined}
          className={[
            styles.item,
            item.value === selectedValue && styles.itemSelected,
          ]
            .filter(Boolean)
            .join(' ')}
          tabIndex={-1}
          onClick={() => onSelect(item.value)}
          onKeyDown={e => handleItemKeyDown(e, index, item.value)}
        >
          {item.label}
        </div>
      ))}
    </div>
  )
}

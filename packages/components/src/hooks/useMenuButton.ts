import { useEffect, useId, useRef, useState } from 'react'
import type { FocusEvent, RefObject } from 'react'

export type UseMenuButtonReturn = {
  open: boolean
  toggle: () => void
  close: (returnFocus: boolean) => void
  onOpenChange: (open: boolean) => void
  onBlur: (e: FocusEvent<HTMLElement>) => void
  wrapperRef: RefObject<HTMLDivElement>
  triggerId: string
  menuId: string
}

// APG menu button state for a trigger + DropdownMenu sharing one wrapper.
// Focus returns to the trigger only after Escape or a selection; an outside
// click or Tab-out closes the menu and leaves focus where the user put it.
export function useMenuButton(): UseMenuButtonReturn {
  const triggerId = useId()
  const menuId = `${triggerId}-menu`
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  function close(returnFocus: boolean) {
    setOpen(false)
    if (returnFocus) wrapperRef.current?.querySelector('button')?.focus()
  }

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (open) {
      wrapperRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    }
  }, [open])

  return {
    open,
    toggle: () => setOpen(prev => !prev),
    close,
    onOpenChange: next => (next ? setOpen(true) : close(true)),
    onBlur: e => {
      if (open && !e.currentTarget.contains(e.relatedTarget)) setOpen(false)
    },
    wrapperRef,
    triggerId,
    menuId,
  }
}

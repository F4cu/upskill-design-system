import { useEffect, useId, useRef } from 'react'
import type { DialogHTMLAttributes, KeyboardEvent, ReactNode, SyntheticEvent } from 'react'
import { Button } from '../Button'
import { Heading } from '../Heading'
import { Inline } from '../Inline'
import { Text } from '../Text'
import styles from './Dialog.module.css'

type OwnedAttributes =
  | 'open'
  | 'title'
  | 'role'
  | OwnedAria
  | 'onCancel'
  | 'onClose'
  | 'children'

export type DialogProps = {
  /** Whether the dialog is shown. Dialog is controlled only. */
  open: boolean
  /** Called with `false` on Escape and on the Close button. */
  onOpenChange: (open: boolean) => void
  /** Visible heading; also the dialog's accessible name. */
  title: string
  /** Short supporting text under the title; also the accessible description. */
  description?: string
  /** Dialog body. Scrolls on its own when taller than the viewport. */
  children?: ReactNode
  /** Footer actions (Button, TextLink), right-aligned. */
  actions?: ReactNode
  /** Heading level of the title. */
  headingLevel?: 2 | 3 | 4 | 5 | 6
  /** Opens with show() in the page flow: no backdrop, the page stays interactive. */
  nonModal?: boolean
} & Omit<DialogHTMLAttributes<HTMLDialogElement>, OwnedAttributes> & {
  // Hyphenated JSX attributes bypass excess-property checks, so Omit alone
  // can't forbid them; `never` does. A mapped type keeps them out of the
  // declared props spec:validate compares against the spec (as in Icon).
  [K in OwnedAria]?: never
}

type OwnedAria = 'aria-modal' | 'aria-label' | 'aria-labelledby' | 'aria-describedby'

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  actions,
  headingLevel = 2,
  nonModal = false,
  className,
  onKeyDown,
  ...rest
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!open || !dialog) return
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (nonModal) dialog.show()
    else dialog.showModal()
    // Heading doesn't forward a ref (#114), so the Title is found by its part marker.
    const target =
      dialog.querySelector<HTMLElement>('[data-autofocus]') ??
      dialog.querySelector<HTMLElement>('[data-part="Title"]')
    target?.focus()

    return () => {
      if (dialog.open) dialog.close()
      const active = document.activeElement
      const focusLeftBehind = !active || active === document.body || dialog.contains(active)
      if (!focusLeftBehind) return
      if (returnTo?.isConnected) returnTo.focus()
      else if (active instanceof HTMLElement && dialog.contains(active)) active.blur()
    }
  }, [open, nonModal])

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    onOpenChange(false)
  }

  // close is queued as a task, so one fired by the effect cleanup can arrive
  // after the effect reopened the dialog; only resync when it is still closed.
  function handleClose(event: SyntheticEvent<HTMLDialogElement>) {
    if (open && !event.currentTarget.open) onOpenChange(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    onKeyDown?.(event)
    if (nonModal && event.key === 'Escape' && !event.defaultPrevented) onOpenChange(false)
  }

  return (
    <dialog
      ref={dialogRef}
      data-part="Root"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={[styles.root, nonModal && styles.nonModal, className].filter(Boolean).join(' ')}
      onCancel={handleCancel}
      onClose={handleClose}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      <Inline data-part="Header" justify="space-between" align="start" gap="md" wrap={false}>
        <Heading
          data-part="Title"
          id={titleId}
          as={`h${headingLevel}`}
          size="subheader"
          tabIndex={-1}
        >
          {title}
        </Heading>
        <Button
          data-part="Close"
          variant="transparent"
          size="sm"
          shape="round"
          icon="x"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
        />
      </Inline>
      {description && (
        <Text data-part="Description" id={descriptionId} size="body-small" color="subtle">
          {description}
        </Text>
      )}
      {children && (
        <div data-part="Body" className={styles.body}>
          {children}
        </div>
      )}
      {actions && (
        <Inline data-part="Actions" className={styles.actions} justify="end" gap="sm">
          {actions}
        </Inline>
      )}
    </dialog>
  )
}

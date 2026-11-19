import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '../Icon'
import { Text } from '../Text'
import styles from './Accordion.module.css'

const supportsUntilFound = typeof document !== 'undefined' && 'onbeforematch' in document

type AccordionItemOpenState =
  | { open: boolean; defaultOpen?: never }
  | { open?: undefined; defaultOpen?: boolean }

export type AccordionItemProps = {
  title: string
  subtitle?: string
  onOpenChange?: (open: boolean) => void
  headingLevel?: 2 | 3 | 4 | 5 | 6
  children: ReactNode
  className?: string
} & AccordionItemOpenState

export function AccordionItem({
  title,
  subtitle,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  headingLevel = 3,
  children,
  className,
}: AccordionItemProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  if (import.meta.env.DEV && isControlled && defaultOpen !== false) {
    console.warn('AccordionItem: do not supply both `open` and `defaultOpen`.')
  }

  const panelId = useId()
  const titleId = useId()
  const metaId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelOuterRef = useRef<HTMLDivElement>(null)
  const hasMountedRef = useRef(false)

  // React's HTMLAttributes typings (@types/react 18) don't include `inert` yet,
  // even though it's a real DOM property — set it directly so focusable
  // descendants can't be tabbed into or clicked while the panel is collapsed,
  // without forcing display:none (which would break the height transition).
  // A close while focus is inside the panel (a controlled close from panel
  // content) would strand focus on <body> once the panel is inert, so focus
  // moves to the trigger first.
  useLayoutEffect(() => {
    const panel = panelRef.current
    const outer = panelOuterRef.current
    if (!panel || !outer) return
    if (!isOpen && panel.contains(document.activeElement)) triggerRef.current?.focus()
    const isFirstRun = !hasMountedRef.current
    hasMountedRef.current = true

    if (isOpen) {
      panel.removeAttribute('hidden')
      panel.inert = false
      return
    }
    panel.inert = true
    if (!supportsUntilFound) return

    // `hidden=until-found` collapses the panel instantly (content-visibility:
    // hidden), so it waits until the height transition has finished; inert
    // covers the panel meanwhile. Inert content is skipped by find-in-page, so
    // inert comes off once until-found takes over.
    const hide = () => {
      panel.inert = false
      panel.setAttribute('hidden', 'until-found')
    }
    if (isFirstRun || !parseFloat(getComputedStyle(outer).transitionDuration)) {
      hide()
      return
    }
    const onEnd = (event: TransitionEvent) => {
      if (event.target === outer && event.propertyName === 'grid-template-rows') hide()
    }
    outer.addEventListener('transitionend', onEnd)
    return () => outer.removeEventListener('transitionend', onEnd)
  }, [isOpen])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel || !supportsUntilFound) return
    const onBeforeMatch = () => {
      if (isControlled) onOpenChange?.(true)
      else setInternalOpen(true)
    }
    panel.addEventListener('beforematch', onBeforeMatch)
    return () => panel.removeEventListener('beforematch', onBeforeMatch)
  }, [isControlled, onOpenChange])

  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

  function toggle() {
    if (isControlled) {
      onOpenChange?.(!isOpen)
    } else {
      setInternalOpen((prev) => !prev)
    }
  }

  return (
    <div data-part="Item" className={[styles.item, className].filter(Boolean).join(' ')}>
      <Heading data-part="Heading" className={styles.heading}>
        <button
          ref={triggerRef}
          data-part="Trigger"
          type="button"
          className={styles.trigger}
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-labelledby={titleId}
          aria-describedby={subtitle ? metaId : undefined}
          onClick={toggle}
        >
          <div data-part="TitleGroup" className={styles.titleGroup}>
            <Text data-part="Title" id={titleId} as="span" className={styles.title}>{title}</Text>
            {subtitle && <Text data-part="Meta" id={metaId} as="span" size="metadata" color="subtle">{subtitle}</Text>}
          </div>
          <Icon data-part="Indicator" name={isOpen ? 'chevron-up' : 'chevron-down'} size="md" className={styles.indicator} />
        </button>
      </Heading>
      <div
        ref={panelOuterRef}
        data-part="PanelOuter"
        className={[styles.panelOuter, isOpen ? styles.panelOuterOpen : ''].filter(Boolean).join(' ')}
      >
        <div data-part="PanelInner" className={styles.panelInner}>
          <div
            ref={panelRef}
            data-part="Panel"
            id={panelId}
            role="group"
            aria-labelledby={titleId}
            className={styles.panel}
            aria-hidden={!isOpen ? true : undefined}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export type AccordionProps = {
  children: ReactNode
  className?: string
}

export function Accordion({ children, className }: AccordionProps) {
  return (
    <div data-part="Root" className={[styles.accordion, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

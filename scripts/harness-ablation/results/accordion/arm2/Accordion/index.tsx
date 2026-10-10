import { createContext, useContext, useId, useRef, useState } from 'react'
import type { HTMLAttributes, KeyboardEvent, ReactNode, RefObject } from 'react'
import { Heading } from '../Heading'
import { Text } from '../Text'
import { Icon } from '../Icon'
import styles from './Accordion.module.css'

export type AccordionHeadingLevel = 2 | 3 | 4 | 5 | 6

type AccordionContextValue = {
  headingLevel: AccordionHeadingLevel
  rootRef: RefObject<HTMLDivElement | null>
}

const AccordionContext = createContext<AccordionContextValue | null>(null)

function useAccordion(part: string) {
  const context = useContext(AccordionContext)
  if (!context) throw new Error(`Accordion.${part} must be rendered inside Accordion`)
  return context
}

export type AccordionProps = {
  headingLevel?: AccordionHeadingLevel
  children: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'role'>

function AccordionRoot({ headingLevel = 3, className, children, ...rest }: AccordionProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  return (
    <AccordionContext.Provider value={{ headingLevel, rootRef }}>
      <div ref={rootRef} data-accordion="" className={[styles.root, className].filter(Boolean).join(' ')} {...rest}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

export type AccordionItemProps = {
  title: string
  subtitle?: string
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'title'>

function Item({
  title,
  subtitle,
  open,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  ...rest
}: AccordionItemProps) {
  const { headingLevel, rootRef } = useAccordion('Item')
  const id = useId()
  const headerId = `${id}-header`
  const titleId = `${id}-title`
  const subtitleId = `${id}-subtitle`
  const panelId = `${id}-panel`
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = open ?? internalOpen

  function toggle() {
    const next = !isOpen
    if (open === undefined) setInternalOpen(next)
    onOpenChange?.(next)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const root = rootRef.current
    if (!root) return
    const headers = Array.from(root.querySelectorAll<HTMLElement>('[data-accordion-header]')).filter(
      header => header.closest('[data-accordion]') === root,
    )
    const index = headers.indexOf(e.currentTarget)
    const last = headers.length - 1
    const next =
      e.key === 'ArrowDown' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowUp' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null
    if (next === null) return
    e.preventDefault()
    headers[next].focus()
  }

  return (
    <div className={[styles.item, isOpen && styles.itemOpen, className].filter(Boolean).join(' ')} {...rest}>
      <Heading as={`h${headingLevel}`} size="title-small">
        <button
          type="button"
          id={headerId}
          data-accordion-header=""
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-labelledby={titleId}
          aria-describedby={subtitle ? subtitleId : undefined}
          className={styles.header}
          onClick={toggle}
          onKeyDown={handleKeyDown}
        >
          <Text as="span" size="inherit" id={titleId}>
            {title}
          </Text>
          {subtitle && (
            <Text as="span" size="body-default" color="subtle" id={subtitleId} className={styles.subtitle}>
              {subtitle}
            </Text>
          )}
          <span className={styles.chevron} aria-hidden="true">
            <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} />
          </span>
        </button>
      </Heading>
      <div id={panelId} role="region" aria-labelledby={titleId} hidden={!isOpen} className={styles.panel}>
        {children}
      </div>
    </div>
  )
}

export const Accordion = Object.assign(AccordionRoot, { Item })

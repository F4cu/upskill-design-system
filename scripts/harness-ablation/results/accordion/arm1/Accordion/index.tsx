import { useId, useState } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import { Heading } from '../Heading'
import { Icon } from '../Icon'
import { Text } from '../Text'
import styles from './Accordion.module.css'

export type AccordionHeadingLevel = 2 | 3 | 4 | 5 | 6

export type AccordionItem = {
  title: string
  subtitle?: string
  /** A string renders as body text; pass nodes for richer content. */
  content: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export type AccordionProps = {
  items: AccordionItem[]
  /** Outline level of every section title. */
  headingLevel?: AccordionHeadingLevel
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>

function Section({ item, headingLevel }: { item: AccordionItem; headingLevel: AccordionHeadingLevel }) {
  const { title, subtitle, content, open, defaultOpen = false, onOpenChange } = item
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = open ?? internalOpen
  const id = useId()
  const triggerId = `${id}-trigger`
  const panelId = `${id}-panel`

  function toggle() {
    const next = !isOpen
    if (open === undefined) setInternalOpen(next)
    onOpenChange?.(next)
  }

  return (
    <div className={[styles.section, isOpen && styles.open].filter(Boolean).join(' ')}>
      <Heading as={`h${headingLevel}`} size="title-small">
        <button
          type="button"
          id={triggerId}
          className={styles.trigger}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={toggle}
        >
          <span className={styles.title}>{title}</span>
          {subtitle && (
            <Text as="span" size="body-default" color="subtle" className={styles.subtitle}>
              {subtitle}
            </Text>
          )}
          <span className={styles.chevron}>
            <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size="md" aria-hidden />
          </span>
        </button>
      </Heading>
      <div id={panelId} role="region" aria-labelledby={triggerId} hidden={!isOpen} className={styles.panel}>
        {typeof content === 'string' ? <Text size="body-default">{content}</Text> : content}
      </div>
    </div>
  )
}

export function Accordion({ items, headingLevel = 3, className, ...rest }: AccordionProps) {
  return (
    <div className={[styles.accordion, className].filter(Boolean).join(' ')} {...rest}>
      {items.map((item, index) => (
        <Section key={index} item={item} headingLevel={headingLevel} />
      ))}
    </div>
  )
}

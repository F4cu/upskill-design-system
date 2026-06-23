import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '../Icon'
import styles from './Accordion.module.css'

export type AccordionItemProps = {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  headingLevel?: 2 | 3 | 4 | 5 | 6
  children: ReactNode
  className?: string
}

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

  const triggerId = useId()
  const panelId = useId()

  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

  function toggle() {
    if (isControlled) {
      onOpenChange?.(!isOpen)
    } else {
      setInternalOpen((prev) => !prev)
    }
  }

  return (
    <div className={[styles.item, className].filter(Boolean).join(' ')}>
      <Heading className={styles.heading}>
        <button
          id={triggerId}
          className={styles.trigger}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={toggle}
        >
          <div className={styles.titleGroup}>
            <span className={styles.title}>{title}</span>
            {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
          </div>
          <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size="md" aria-hidden />
        </button>
      </Heading>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        className={styles.panel}
        hidden={!isOpen}
      >
        {children}
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
    <div className={[styles.accordion, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

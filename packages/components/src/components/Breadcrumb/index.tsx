import type { HTMLAttributes } from 'react'
import { Icon } from '../Icon'
import { Text } from '../Text'
import styles from './Breadcrumb.module.css'

export type BreadcrumbItem = {
  label: string
  href?: string
}

export type BreadcrumbProps = {
  items: BreadcrumbItem[]
} & HTMLAttributes<HTMLElement>

export function Breadcrumb({ items, className, ...rest }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={[styles.breadcrumb, className].filter(Boolean).join(' ')} {...rest}>
      <ol className={styles.list}>
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={i} className={styles.item}>
              {i > 0 && <Icon name="chevron-right" size="sm" className={styles.separator} aria-hidden />}
              {isLast || !item.href ? (
                <Text
                  as="span"
                  size="body-small"
                  color={isLast ? 'default' : 'subtle'}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </Text>
              ) : (
                <a href={item.href} className={styles.link}>
                  <Text as="span" size="body-small" color="subtle">{item.label}</Text>
                </a>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

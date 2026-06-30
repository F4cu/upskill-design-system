import type { AnchorHTMLAttributes } from 'react'
import styles from './TextLink.module.css'

export type TextLinkSize = 'body-default' | 'body-small' | 'metadata' | 'label'

export type TextLinkProps = {
  size?: TextLinkSize
  children: React.ReactNode
} & AnchorHTMLAttributes<HTMLAnchorElement>

export function TextLink({ size = 'body-default', children, className, ...rest }: TextLinkProps) {
  return (
    <a
      className={[styles.textLink, styles[size], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </a>
  )
}

import type { CSSProperties, ImgHTMLAttributes } from 'react'
import styles from './Avatar.module.css'

export type AvatarSize = 'sm' | 'md' | 'lg'

export type AvatarProps = {
  src: string
  alt: string
  size?: AvatarSize
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'>

export function Avatar({ src, alt, size = 'md', className, style, ...rest }: AvatarProps) {
  const cssVars = {
    '--_avatar-size': `var(--ds-size-avatar-${size})`,
    ...style,
  } as CSSProperties

  return (
    <img
      src={src}
      alt={alt}
      className={[styles.avatar, className].filter(Boolean).join(' ')}
      style={cssVars}
      {...rest}
    />
  )
}

import type { HTMLAttributes } from 'react'
import styles from './VideoFrame.module.css'

export type VideoFrameProps = {
  src?: string
  alt?: string
} & HTMLAttributes<HTMLDivElement>

export function VideoFrame({ src, alt = '', className, ...rest }: VideoFrameProps) {
  return (
    <div className={[styles.frame, className].filter(Boolean).join(' ')} {...rest}>
      <img src={src} alt={alt} className={styles.thumbnail} />
      <div className={styles.playOverlay} aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.playIcon}>
          <circle cx="24" cy="24" r="24" fill="rgba(0,0,0,0.4)" />
          <polygon points="18,14 36,24 18,34" fill="white" />
        </svg>
      </div>
    </div>
  )
}

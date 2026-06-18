import type { HTMLAttributes } from 'react'
import { Avatar } from '../Avatar'
import { Icon } from '../Icon'
import { TextField } from '../TextField'
import styles from './AppHeader.module.css'

export type NavItem = {
  label: string
  href: string
  active?: boolean
}

export type AppHeaderProps = {
  logoSrc: string
  logoSrcDark?: string
  logoAlt?: string
  navItems?: NavItem[]
  searchValue?: string
  onSearchChange?: (value: string) => void
  userAvatarSrc?: string
  userName?: string
  onUserClick?: () => void
} & HTMLAttributes<HTMLElement>

export function AppHeader({
  logoSrc,
  logoSrcDark,
  logoAlt = 'Logo',
  navItems = [],
  searchValue,
  onSearchChange,
  userAvatarSrc,
  userName,
  onUserClick,
  className,
  ...rest
}: AppHeaderProps) {
  return (
    <header className={[styles.appHeader, className].filter(Boolean).join(' ')} {...rest}>
      <div className={styles.inner}>
        <div className={styles.logoWrapper}>
          <img src={logoSrc} alt={logoAlt} className={styles.logoLight} />
          {logoSrcDark && (
            <img src={logoSrcDark} alt="" aria-hidden className={styles.logoDark} />
          )}
        </div>

        <div className={styles.search}>
          <TextField
            label="Search"
            hideLabel
            placeholder="Search"
            shape="round"
            icon="search"
            value={searchValue ?? ''}
            onChange={e => onSearchChange?.(e.target.value)}
          />
        </div>

        <div className={styles.navRight}>
          {navItems.length > 0 && (
            <nav aria-label="Main navigation">
              <ul className={styles.navList}>
                {navItems.map(item => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className={[styles.navLink, item.active && styles.navLinkActive].filter(Boolean).join(' ')}
                      aria-current={item.active ? 'page' : undefined}
                    >
                      <span className={styles.navLabel}>{item.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {(userAvatarSrc || userName) && (
            <button type="button" className={styles.userButton} onClick={onUserClick}>
              {userAvatarSrc && <Avatar src={userAvatarSrc} alt={userName ?? 'User'} size="sm" />}
              {userName && <span className={styles.navLabel}>{userName}</span>}
              <Icon name="chevron-down" size="sm" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

import type { HTMLAttributes } from 'react'
import { Avatar } from '../Avatar'
import { Icon } from '../Icon'
import { TextField } from '../TextField'
import { Text } from '../Text'
import styles from './AppHeader.module.css'

export type NavItem = {
  label: string
  href: string
  active?: boolean
}

export type AppHeaderProps = {
  logoSrc: string
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
        <img src={logoSrc} alt={logoAlt} className={styles.logo} />

        <div className={styles.search}>
          <TextField
            label="Search"
            hideLabel
            placeholder="Search courses…"
            shape="round"
            icon="search"
            value={searchValue ?? ''}
            onChange={e => onSearchChange?.(e.target.value)}
          />
        </div>

        {navItems.length > 0 && (
          <nav className={styles.nav} aria-label="Main navigation">
            <ul className={styles.navList}>
              {navItems.map(item => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className={[styles.navLink, item.active && styles.navLinkActive].filter(Boolean).join(' ')}
                    aria-current={item.active ? 'page' : undefined}
                  >
                    <Text as="span" size="body-small">{item.label}</Text>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {(userAvatarSrc || userName) && (
          <button type="button" className={styles.userButton} onClick={onUserClick}>
            {userAvatarSrc && <Avatar src={userAvatarSrc} alt={userName ?? 'User'} size="sm" />}
            {userName && <Text as="span" size="body-small">{userName}</Text>}
            <Icon name="chevron-down" size="sm" />
          </button>
        )}
      </div>
    </header>
  )
}

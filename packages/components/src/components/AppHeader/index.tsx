import { useEffect, useRef, useState } from 'react'
import type { HTMLAttributes } from 'react'
import { Avatar } from '../Avatar'
import { DropdownMenu } from '../DropdownMenu'
import type { DropdownMenuItem } from '../DropdownMenu'
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
  userMenuItems?: DropdownMenuItem[]
  onUserMenuSelect?: (value: string) => void
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
  userMenuItems,
  onUserMenuSelect,
  onUserClick,
  className,
  ...rest
}: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  function handleUserClick() {
    if (userMenuItems?.length) {
      setMenuOpen(prev => !prev)
    }
    onUserClick?.()
  }

  function handleMenuSelect(value: string) {
    onUserMenuSelect?.(value)
    setMenuOpen(false)
  }

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
            <div ref={userRef} className={styles.userWrapper}>
              <button
                type="button"
                className={styles.userButton}
                onClick={handleUserClick}
                aria-haspopup={userMenuItems?.length ? 'menu' : undefined}
                aria-expanded={userMenuItems?.length ? menuOpen : undefined}
              >
                {userAvatarSrc && <Avatar src={userAvatarSrc} alt={userName ?? 'User'} size="sm" />}
                {userName && <span className={styles.navLabel}>{userName}</span>}
                <Icon
                  name="chevron-down"
                  size="sm"
                  className={[styles.chevron, menuOpen && styles.chevronOpen].filter(Boolean).join(' ')}
                />
              </button>
              {menuOpen && userMenuItems?.length && (
                <DropdownMenu
                  items={userMenuItems}
                  onSelect={handleMenuSelect}
                  onClose={() => setMenuOpen(false)}
                  className={styles.userMenu}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

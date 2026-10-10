import type { HTMLAttributes } from 'react'
import { useMenuButton } from '../../hooks/useMenuButton'
import { Avatar } from '../Avatar'
import { DropdownMenu } from '../DropdownMenu'
import type { DropdownMenuItem } from '../DropdownMenu'
import { Icon } from '../Icon'
import { TextField } from '../TextField'
import styles from './AppHeader.module.css'

export type NavItem = {
  label: string
  href: string
  current?: boolean
}

export type AppHeaderProps = {
  logoSrc: string
  logoSrcDark?: string
  logoAlt?: string
  navItems?: NavItem[]
  searchValue?: string
  onSearchValueChange?: (value: string) => void
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
  onSearchValueChange,
  userAvatarSrc,
  userName,
  userMenuItems,
  onUserMenuSelect,
  onUserClick,
  className,
  ...rest
}: AppHeaderProps) {
  const { open: menuOpen, toggle, close, onOpenChange, onBlur, wrapperRef, triggerId, menuId } = useMenuButton()
  const hasMenu = !!userMenuItems?.length

  function handleUserClick() {
    if (hasMenu) toggle()
    onUserClick?.()
  }

  function handleMenuSelect(value: string) {
    onUserMenuSelect?.(value)
    close(true)
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
            onChange={e => onSearchValueChange?.(e.target.value)}
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
                      className={[styles.navLink, item.current && styles.navLinkCurrent].filter(Boolean).join(' ')}
                      aria-current={item.current ? 'page' : undefined}
                    >
                      <span className={styles.navLabel}>{item.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {(userAvatarSrc || userName) && (
            <div ref={wrapperRef} className={styles.userWrapper} onBlur={hasMenu ? onBlur : undefined}>
              <button
                id={triggerId}
                type="button"
                className={styles.userButton}
                onClick={handleUserClick}
                aria-haspopup={hasMenu ? 'menu' : undefined}
                aria-expanded={hasMenu ? menuOpen : undefined}
                aria-controls={menuOpen ? menuId : undefined}
              >
                {userAvatarSrc && (
                  <Avatar src={userAvatarSrc} alt={userName ? '' : 'User'} size="sm" />
                )}
                {userName && <span className={styles.navLabel}>{userName}</span>}
                <Icon
                  name="chevron-down"
                  size="sm"
                  className={[styles.chevron, menuOpen && styles.chevronOpen].filter(Boolean).join(' ')}
                />
              </button>
              {hasMenu && (
                <DropdownMenu
                  items={userMenuItems}
                  open={menuOpen}
                  onOpenChange={onOpenChange}
                  id={menuId}
                  aria-labelledby={triggerId}
                  onSelect={handleMenuSelect}
                  className={styles.userMenu}
                />
              )}
            </div>
          )}
        </div>

        {navItems.length > 0 && (
          <button
            type="button"
            className={styles.hamburger}
            aria-label="Open menu"
          >
            <Icon name="menu" />
          </button>
        )}
      </div>
    </header>
  )
}

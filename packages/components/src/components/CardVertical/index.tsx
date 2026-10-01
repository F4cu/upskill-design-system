import { Children, createContext, isValidElement, useContext, useEffect, useId, useRef, useState } from 'react'
import type { FocusEvent, HTMLAttributes, ReactElement, ReactNode } from 'react'
import { Button } from '../Button'
import { DropdownMenu } from '../DropdownMenu'
import type { DropdownMenuItem } from '../DropdownMenu'
import { Heading } from '../Heading'
import type { HeadingTag } from '../Heading'
import { Icon } from '../Icon'
import { Image } from '../Image'
import { Inline } from '../Inline'
import { ProgressBar } from '../ProgressBar'
import { Stack } from '../Stack'
import { Text } from '../Text'
import styles from './CardVertical.module.css'

export type CardVerticalSize = 'sm' | 'lg'

type CardVerticalContextValue = {
  size: CardVerticalSize
  titleId: string
}

const CardVerticalContext = createContext<CardVerticalContextValue | null>(null)

function useCardVertical(part: string) {
  const context = useContext(CardVerticalContext)
  if (!context) throw new Error(`CardVertical.${part} must be rendered inside CardVertical.Root`)
  return context
}

export type CardVerticalRootProps = {
  size?: CardVerticalSize
  children: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children'>

function Root({ size = 'lg', className, children, ...rest }: CardVerticalRootProps) {
  const titleId = useId()
  return (
    <CardVerticalContext.Provider value={{ size, titleId }}>
      <div
        role="article"
        aria-labelledby={titleId}
        className={[styles.card, styles[size], className].filter(Boolean).join(' ')}
        {...rest}
      >
        {children}
      </div>
    </CardVerticalContext.Provider>
  )
}

export type CardVerticalMediaProps = {
  src?: string
  alt?: string
  children?: ReactElement<CardVerticalActionProps>
}

function Media({ src, alt = '', children }: CardVerticalMediaProps) {
  const { size } = useCardVertical('Media')
  const items = Children.toArray(children)
  if (items.length > 1 || (items.length === 1 && (!isValidElement(items[0]) || items[0].type !== Action))) {
    throw new Error('CardVertical.Media accepts at most one CardVertical.Action')
  }
  return (
    <div className={styles.media}>
      <Image
        src={src}
        alt={alt}
        aspectRatio={size === 'lg' ? '4/5' : '3/2'}
        className={styles.thumbnail}
      />
      {children}
    </div>
  )
}

export type CardVerticalActionProps = {
  children: ReactElement<CardVerticalFavoriteProps> | ReactElement<CardVerticalMenuProps>
}

function Action({ children }: CardVerticalActionProps) {
  useCardVertical('Action')
  const items = Children.toArray(children)
  const only = items[0]
  if (items.length !== 1 || !isValidElement(only) || (only.type !== Favorite && only.type !== Menu)) {
    throw new Error('CardVertical.Action accepts exactly one CardVertical.Favorite or CardVertical.Menu')
  }
  return <div className={styles.action}>{children}</div>
}

export type CardVerticalFavoriteProps = {
  pressed?: boolean
  defaultPressed?: boolean
  onPressedChange?: (pressed: boolean) => void
}

function Favorite({ pressed, defaultPressed = false, onPressedChange }: CardVerticalFavoriteProps) {
  const { titleId } = useCardVertical('Favorite')
  const id = useId()
  const [internalPressed, setInternalPressed] = useState(defaultPressed)
  const isPressed = pressed ?? internalPressed

  function handleClick() {
    const next = !isPressed
    if (pressed === undefined) setInternalPressed(next)
    onPressedChange?.(next)
  }

  return (
    <Button
      id={id}
      variant="elevated"
      size="sm"
      shape="round"
      icon="heart"
      aria-label="Save"
      aria-labelledby={`${id} ${titleId}`}
      aria-pressed={isPressed}
      className={styles.favorite}
      onClick={handleClick}
    />
  )
}

export type CardVerticalMenuProps = {
  items: DropdownMenuItem[]
  onSelect: (value: string) => void
}

function Menu({ items, onSelect }: CardVerticalMenuProps) {
  const { titleId } = useCardVertical('Menu')
  const id = useId()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const menuId = `${id}-menu`

  function close(returnFocus: boolean) {
    setOpen(false)
    if (returnFocus) wrapperRef.current?.querySelector('button')?.focus()
  }

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (open) {
      wrapperRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    }
  }, [open])

  if (items.length === 0) return null

  function handleSelect(value: string) {
    onSelect(value)
    close(true)
  }

  function handleBlur(e: FocusEvent<HTMLDivElement>) {
    if (open && !e.currentTarget.contains(e.relatedTarget)) setOpen(false)
  }

  return (
    <div ref={wrapperRef} className={styles.menu} onBlur={handleBlur}>
      <Button
        id={id}
        variant="elevated"
        size="sm"
        shape="round"
        icon="more-vertical"
        aria-label="More options"
        aria-labelledby={`${id} ${titleId}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(prev => !prev)}
      />
      {open && (
        <DropdownMenu
          items={items}
          id={menuId}
          aria-labelledby={`${id} ${titleId}`}
          onSelect={handleSelect}
          onClose={() => close(true)}
          className={styles.menuPanel}
        />
      )}
    </div>
  )
}

export type CardVerticalProgressProps = {
  value: number
}

function Progress({ value }: CardVerticalProgressProps) {
  const { titleId } = useCardVertical('Progress')
  return <ProgressBar value={value} aria-labelledby={titleId} />
}

export type CardVerticalBodyProps = {
  children: ReactNode
}

function Body({ children }: CardVerticalBodyProps) {
  useCardVertical('Body')
  return <Stack gap="sm">{children}</Stack>
}

export type CardVerticalTitleProps = {
  as?: HeadingTag
  children: ReactNode
}

function Title({ as = 'h3', children }: CardVerticalTitleProps) {
  const { titleId } = useCardVertical('Title')
  return (
    <Heading as={as} id={titleId} size="headline-serif" className={styles.title}>
      {children}
    </Heading>
  )
}

export type CardVerticalMetaProps = {
  children: ReactNode
}

function Meta({ children }: CardVerticalMetaProps) {
  useCardVertical('Meta')
  return <Inline gap="sm" wrap align="center">{children}</Inline>
}

export type CardVerticalDurationProps = {
  children: ReactNode
}

function Duration({ children }: CardVerticalDurationProps) {
  useCardVertical('Duration')
  return <Text as="span" size="metadata" color="subtle">{children}</Text>
}

function Certified() {
  useCardVertical('Certified')
  return (
    <span className={styles.badge}>
      <Icon name="badge-check" size="sm" />
      <Text as="span" size="metadata" color="subtle">Certified</Text>
    </span>
  )
}

export type CardVerticalProps = {
  thumbnailSrc?: string
  thumbnailAlt?: string
  title: string
  duration?: string
  certified?: boolean
  progress?: number
  size?: CardVerticalSize
  /** One `<CardVertical.Favorite />` or `<CardVertical.Menu />`, overlaid on the thumbnail. */
  action?: ReactElement<CardVerticalFavoriteProps> | ReactElement<CardVerticalMenuProps>
} & Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children'>

function CardVerticalPreset({
  thumbnailSrc,
  thumbnailAlt = '',
  title,
  duration,
  certified,
  progress,
  size = 'lg',
  action,
  ...rest
}: CardVerticalProps) {
  return (
    <Root size={size} {...rest}>
      <Media src={thumbnailSrc} alt={thumbnailAlt}>
        {action && <Action>{action}</Action>}
      </Media>
      {progress !== undefined && <Progress value={progress} />}
      <Body>
        <Title>{title}</Title>
        {(duration || certified) && (
          <Meta>
            {duration && <Duration>{duration}</Duration>}
            {certified && <Certified />}
          </Meta>
        )}
      </Body>
    </Root>
  )
}

export const CardVertical = Object.assign(CardVerticalPreset, {
  Root,
  Media,
  Action,
  Favorite,
  Menu,
  Progress,
  Body,
  Title,
  Meta,
  Duration,
  Certified,
})

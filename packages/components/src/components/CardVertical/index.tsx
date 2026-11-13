import { Children, createContext, isValidElement, useContext, useId, useState } from 'react'
import type { HTMLAttributes, ReactElement, ReactNode } from 'react'
import { useMenuButton } from '../../hooks/useMenuButton'
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
        data-part="Root"
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
    <div data-part="Media" className={styles.media}>
      <Image
        src={src}
        alt={alt}
        aspectRatio={size === 'lg' ? '4/5' : '3/2'}
        className={styles.thumbnail}
        data-part="Thumbnail"
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
  return <div data-part="Action" className={styles.action}>{children}</div>
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
      variant="transparent"
      size="sm"
      shape="round"
      icon="heart"
      aria-label="Save"
      aria-labelledby={`${id} ${titleId}`}
      aria-pressed={isPressed}
      className={[styles.onMedia, styles.favorite].join(' ')}
      data-part="Favorite"
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
  const { open, toggle, close, onOpenChange, onBlur, wrapperRef, triggerId: id, menuId } = useMenuButton()

  if (items.length === 0) return null

  function handleSelect(value: string) {
    onSelect(value)
    close(true)
  }

  return (
    <div ref={wrapperRef} data-part="Menu" className={styles.menu} onBlur={onBlur}>
      <Button
        id={id}
        variant="transparent"
        size="sm"
        shape="round"
        icon="more-vertical"
        className={styles.onMedia}
        data-part="MenuTrigger"
        aria-label="More options"
        aria-labelledby={`${id} ${titleId}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
      />
      <DropdownMenu
        items={items}
        open={open}
        onOpenChange={onOpenChange}
        id={menuId}
        aria-labelledby={`${id} ${titleId}`}
        onSelect={handleSelect}
        className={styles.menuPanel}
        data-part="MenuPanel"
      />
    </div>
  )
}

export type CardVerticalProgressProps = {
  value: number
}

function Progress({ value }: CardVerticalProgressProps) {
  useCardVertical('Progress')
  return <ProgressBar value={value} label="Completion" className={styles.progress} data-part="Progress" />
}

export type CardVerticalBodyProps = {
  children: ReactNode
}

function Body({ children }: CardVerticalBodyProps) {
  useCardVertical('Body')
  return <Stack gap="sm" data-part="Body">{children}</Stack>
}

export type CardVerticalTitleProps = {
  as?: HeadingTag
  /** The course page. The link covers the whole card; Favorite and Menu stay on top of it. */
  href?: string
  children: ReactNode
}

function Title({ as = 'h3', href, children }: CardVerticalTitleProps) {
  const { titleId } = useCardVertical('Title')
  return (
    <Heading as={as} id={titleId} size="headline-serif" className={styles.title} data-part="Title">
      {href ? <a href={href} className={styles.titleLink} data-part="TitleLink">{children}</a> : children}
    </Heading>
  )
}

export type CardVerticalMetaProps = {
  children: ReactNode
}

function Meta({ children }: CardVerticalMetaProps) {
  useCardVertical('Meta')
  return <Inline gap="sm" wrap align="center" data-part="Meta">{children}</Inline>
}

export type CardVerticalDurationProps = {
  children: ReactNode
}

function Duration({ children }: CardVerticalDurationProps) {
  useCardVertical('Duration')
  return <Text as="span" size="metadata" color="subtle" data-part="Duration">{children}</Text>
}

function Certified() {
  useCardVertical('Certified')
  return (
    <span data-part="Certified" className={styles.badge}>
      <Icon name="badge-check" size="sm" data-part="CertifiedIcon" />
      <Text as="span" size="metadata" color="subtle" data-part="CertifiedLabel">Certified</Text>
    </span>
  )
}

function Completed() {
  useCardVertical('Completed')
  return (
    <span data-part="Completed" className={styles.badge}>
      <Icon name="check" size="sm" data-part="CompletedIcon" />
      <Text as="span" size="metadata" color="subtle" data-part="CompletedLabel">Completed</Text>
    </span>
  )
}

export type CardVerticalProps = {
  thumbnailSrc?: string
  thumbnailAlt?: string
  title: string
  /** The course page. The link covers the whole card; the action stays on top of it. */
  href?: string
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
  href,
  duration,
  certified,
  progress,
  size = 'lg',
  action,
  ...rest
}: CardVerticalProps) {
  const completed = progress !== undefined && progress >= 100
  return (
    <Root size={size} {...rest}>
      <Body>
        <Title href={href}>{title}</Title>
        {(duration || certified || completed) && (
          <Meta>
            {duration && <Duration>{duration}</Duration>}
            {certified && <Certified />}
            {completed && <Completed />}
          </Meta>
        )}
      </Body>
      {progress !== undefined && <Progress value={progress} />}
      <Media src={thumbnailSrc} alt={thumbnailAlt}>
        {action && <Action>{action}</Action>}
      </Media>
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
  Completed,
})

import { useEffect, useId, useRef, useState } from 'react'
import type { HTMLAttributes, KeyboardEvent } from 'react'
import { DropdownMenu } from '../DropdownMenu'
import { Icon } from '../Icon'
import { Text } from '../Text'
import styles from './Select.module.css'
import utilStyles from '../../styles/utilities.module.css'

export type SelectOption = { value: string; label: string }

export type SelectProps = {
  label: string
  hideLabel?: boolean
  options: SelectOption[]
  placeholder?: string
  error?: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  id?: string
  name?: string
  required?: boolean
} & Omit<HTMLAttributes<HTMLDivElement>, 'onChange'>

export function Select({
  label,
  hideLabel,
  options,
  placeholder,
  error,
  value: valueProp,
  defaultValue,
  onValueChange,
  disabled,
  id: idProp,
  name,
  required,
  className,
  ...rest
}: SelectProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const errorId = `${id}-error`
  const listboxId = `${id}-listbox`

  const isControlled = valueProp !== undefined
  const [internalValue, setInternalValue] = useState<string>(defaultValue ?? '')
  const selectedValue = isControlled ? valueProp : internalValue

  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const prevOpenRef = useRef(false)

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
    if (!open || !wrapperRef.current) return
    const listbox = wrapperRef.current.querySelector<HTMLElement>('[role="listbox"]')
    if (!listbox) return
    const selected = listbox.querySelector<HTMLElement>('[aria-selected="true"]')
    const first = listbox.querySelector<HTMLElement>('[role="option"]')
    ;(selected || first)?.focus()
  }, [open])

  useEffect(() => {
    if (prevOpenRef.current && !open) {
      triggerRef.current?.focus()
    }
    prevOpenRef.current = open
  }, [open])

  function handleTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      setOpen(true)
    }
  }

  function handleSelect(val: string) {
    if (!isControlled) setInternalValue(val)
    onValueChange?.(val)
    setOpen(false)
  }

  const selectedLabel =
    options.find(o => o.value === selectedValue)?.label ?? placeholder ?? ''

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')} {...rest}>
      <Text
        as="label"
        htmlFor={id}
        className={[utilStyles.label, hideLabel && utilStyles.visuallyHidden].filter(Boolean).join(' ')}
      >
        {label}
      </Text>

      <div ref={wrapperRef} className={styles.wrapper}>
        <button
          ref={triggerRef}
          type="button"
          id={id}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          aria-required={required}
          disabled={disabled}
          className={[
            styles.trigger,
            error && styles.hasError,
            !selectedValue && styles.hasPlaceholder,
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => setOpen(prev => !prev)}
          onKeyDown={handleTriggerKeyDown}
        >
          <Text as="span" className={styles.triggerLabel}>{selectedLabel}</Text>
          <span className={styles.arrow} aria-hidden="true">
            <Icon
              name="chevron-down"
              size="sm"
              className={[styles.chevron, open && styles.chevronOpen].filter(Boolean).join(' ')}
            />
          </span>
        </button>

        {open && (
          <DropdownMenu
            id={listboxId}
            listRole="listbox"
            items={options}
            selectedValue={selectedValue}
            onSelect={handleSelect}
            onClose={() => setOpen(false)}
            className={styles.dropdown}
          />
        )}

        {/* Hidden native select for form submission */}
        <select
          tabIndex={-1}
          aria-hidden="true"
          name={name}
          value={selectedValue}
          required={required}
          disabled={disabled}
          onChange={() => {}}
          className={utilStyles.visuallyHidden}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map(({ value, label: optionLabel }) => (
            <option key={value} value={value}>
              {optionLabel}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <Text as="span" id={errorId} className={styles.errorMessage} role="alert">
          {error}
        </Text>
      )}
    </div>
  )
}

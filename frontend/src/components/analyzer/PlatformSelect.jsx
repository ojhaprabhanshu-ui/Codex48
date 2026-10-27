import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, MoreHorizontal } from 'lucide-react'

function PlatformIcon({ name }) {
  if (name === 'Instagram') {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="#E4405F" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="#E4405F" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1.25" fill="#E4405F" />
      </svg>
    )
  }

  if (name === 'LinkedIn') {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
        <rect width="24" height="24" rx="4" fill="#0A66C2" />
        <path fill="#fff" d="M7.8 6.3a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0ZM5.3 9.1h2.2v9.6H5.3V9.1Zm3.7 0h2.1v1.3h.03c.29-.55 1.01-1.53 2.75-1.53 2.94 0 3.49 1.94 3.49 4.46v5.37h-2.2v-4.76c0-1.14-.02-2.6-1.59-2.6-1.59 0-1.83 1.24-1.83 2.52v4.84H9V9.1Z" />
      </svg>
    )
  }

  if (name === 'Facebook') {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#0866FF" />
        <path fill="#fff" d="M13.6 21v-8.25h2.77l.42-3.22H13.6V7.48c0-.93.26-1.56 1.6-1.56h1.71V3.04c-.3-.04-1.51-.14-2.83-.14-2.75 0-4.64 1.68-4.64 4.76v1.87h-3.1v3.22h3.1V21h4.16Z" />
      </svg>
    )
  }

  if (name === 'X') {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0 text-ink" fill="currentColor" aria-hidden="true">
        <path d="M18.901 1.153h3.68l-8.04 9.188 9.456 12.506h-7.406l-5.8-7.584-6.638 7.584h-3.682l8.6-9.827L.999 1.153h7.594l5.242 6.932zm-1.291 19.49h2.039L7.82 3.24H5.632z" />
      </svg>
    )
  }

  return <MoreHorizontal size={18} className="shrink-0 text-muted" aria-hidden="true" />
}

export default function PlatformSelect({ id, value, onChange, options }) {
  const [open, setOpen] = useState(false)
  const selectedIndex = options.indexOf(value)
  const [activeIndex, setActiveIndex] = useState(Math.max(0, selectedIndex))
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const listboxId = useId()

  useEffect(() => {
    if (!open) return undefined
    function closeOnOutsidePointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [open])

  function selectOption(option) {
    onChange(option)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function handleKeyDown(event) {
    if (event.key === 'Tab') {
      setOpen(false)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      if (!open) {
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : direction === 1 ? 0 : options.length - 1)
        setOpen(true)
      } else {
        setActiveIndex((current) => (current + direction + options.length) % options.length)
      }
      return
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setActiveIndex(event.key === 'Home' ? 0 : options.length - 1)
      setOpen(true)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (open) selectOption(options[activeIndex])
      else {
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
        setOpen(true)
      }
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? `${listboxId}-option-${activeIndex}` : undefined}
        onClick={() => {
          if (!open) setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
          setOpen((current) => !current)
        }}
        onKeyDown={handleKeyDown}
        className="field-control platform-select-trigger h-11 w-full gap-3"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {value && <PlatformIcon name={value} />}
          <span className={value ? 'truncate text-ink' : 'truncate text-muted'}>{value || 'Choose a platform'}</span>
        </span>
        <ChevronDown size={15} className={'shrink-0 text-muted transition-transform ' + (open ? 'rotate-180' : '')} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Platform options"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-elevated"
        >
          {options.map((option, index) => (
            <div
              id={`${listboxId}-option-${index}`}
              key={option}
              role="option"
              aria-selected={value === option}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectOption(option)}
              className={'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-colors ' + (activeIndex === index ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-canvas')}
            >
              <PlatformIcon name={option} />
              <span className="min-w-0 flex-1 truncate">{option}</span>
              {value === option && <Check size={14} className="shrink-0 text-accent" aria-hidden="true" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Bell, ChevronDown, Menu, Moon, Sun } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAppContext } from '../../context/useAppContext'

const pageTitles = {
  '/dashboard': 'Overview',
  '/analyze': 'Content analyzer',
  '/guidelines': 'Brand guidelines',
  '/reviews': 'Review queue',
  '/history': 'Submission history',
  '/settings': 'Settings',
}

export default function Navbar({ onMenuClick, demoMode }) {
  const { pathname } = useLocation()
  const { brands, activeBrand, activeBrandId, setActiveBrandId, theme, toggleTheme } = useAppContext()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [brandMenuOpen, setBrandMenuOpen] = useState(false)
  const title = pageTitles[pathname] || 'BrandProof'

  return (
    <header className={'sticky z-30 border-b border-line bg-surface/90 backdrop-blur-xl ' + (demoMode ? 'top-8' : 'top-0')}>
      <div className="flex h-[68px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onMenuClick} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line text-secondary hover:bg-canvas md:hidden" aria-label="Open navigation menu">
            <Menu size={18} aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">{title}</h2>
            <p className="hidden text-[10px] text-muted sm:block">BrandProof <span className="px-1">/</span> Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => { setBrandMenuOpen((open) => !open); setNotificationsOpen(false) }}
              className="flex max-w-[170px] items-center gap-2 rounded-xl border border-line bg-surface px-2.5 py-2 text-left hover:bg-canvas sm:max-w-[210px] sm:px-3"
              aria-haspopup="listbox"
              aria-expanded={brandMenuOpen}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-100 text-[9px] font-bold text-amber-800">{activeBrand?.initials || 'BP'}</span>
              <span className="hidden min-w-0 sm:block">
                <span className="block truncate text-[11px] font-semibold text-ink">{activeBrand?.name || 'Select brand'}</span>
                <span className="mt-0.5 block text-[9px] text-muted">Active brand</span>
              </span>
              <ChevronDown size={14} className="shrink-0 text-muted" aria-hidden="true" />
            </button>
            {brandMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-elevated" role="listbox" aria-label="Select active brand">
                {brands.map((brand) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={String(brand.id) === String(activeBrandId)}
                    key={brand.id}
                    onClick={() => { setActiveBrandId(brand.id); setBrandMenuOpen(false) }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-canvas"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-[9px] font-bold text-amber-800">{brand.initials || brand.name.slice(0, 2).toUpperCase()}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-ink">{brand.name}</span>
                      <span className="block text-[10px] text-muted">Brand workspace</span>
                    </span>
                  </button>
                ))}
                {brands.length === 0 && <p className="px-3 py-2 text-xs text-secondary">No brands are available yet.</p>}
              </div>
            )}
          </div>

          <div className="relative">
            <button type="button" onClick={() => { setNotificationsOpen((open) => !open); setBrandMenuOpen(false) }} className="relative grid h-9 w-9 place-items-center rounded-xl text-secondary hover:bg-canvas hover:text-ink" aria-label="Notifications" aria-expanded={notificationsOpen}>
              <Bell size={17} strokeWidth={1.8} aria-hidden="true" />
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-line bg-surface p-4 shadow-elevated">
                <p className="text-xs font-semibold text-ink">You’re all caught up</p>
                <p className="mt-1 text-xs leading-5 text-secondary">Notifications will appear here when a connected review workflow is available.</p>
              </div>
            )}
          </div>

          <button type="button" onClick={toggleTheme} className="grid h-9 w-9 place-items-center rounded-xl text-secondary hover:bg-canvas hover:text-ink" aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}>
            {theme === 'light' ? <Moon size={17} strokeWidth={1.8} aria-hidden="true" /> : <Sun size={17} strokeWidth={1.8} aria-hidden="true" />}
          </button>

          <div className="ml-1 hidden items-center gap-2 border-l border-line pl-3 sm:flex">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700">BP</div>
            <span className="hidden text-[11px] font-medium text-ink lg:block">Brand team</span>
          </div>
        </div>
      </div>
    </header>
  )
}

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { USE_MOCK_API } from '../services/apiClient'
import Navbar from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {USE_MOCK_API && (
        <div className="demo-ribbon notice-warning sticky top-0 z-[60] flex min-h-8 items-center justify-center gap-2 border-b px-2 py-1.5 text-center text-[9px] font-medium leading-4 sm:text-[11px]">
          <span className="notice-warning-strong shrink-0 whitespace-nowrap rounded bg-canvas px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] sm:text-[9px]">Demo data</span>
          <span className="whitespace-nowrap sm:hidden">Fixtures active · no ML or Gemini</span>
          <span className="hidden sm:inline">Development fixtures are active. Rule checks are illustrative; ML and Gemini are not called.</span>
        </div>
      )}
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} demoMode={USE_MOCK_API} />
      <div className="min-h-screen md:pl-[252px]">
        <Navbar onMenuClick={() => setMenuOpen(true)} demoMode={USE_MOCK_API} />
        <main className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  ChevronLeft,
  ClipboardCheck,
  Clock3,
  FileSearch2,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
} from 'lucide-react'

const primaryLinks = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/analyze', label: 'Analyze content', icon: FileSearch2 },
  { to: '/guidelines', label: 'Brand guidelines', icon: ShieldCheck },
]

const moreLinks = [
  { to: '/reviews', label: 'Review queue', icon: ClipboardCheck },
  { to: '/history', label: 'History', icon: Clock3 },
  { to: '/settings', label: 'Settings', icon: Settings2 },
]

function LinkList({ links, onNavigate }) {
  return (
    <div className="space-y-1">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => 'sidebar-link ' + (isActive ? 'sidebar-link-active' : '')}>
          <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </div>
  )
}

export default function Sidebar({ open, onClose, demoMode }) {
  return (
    <>
      {open && <button type="button" aria-label="Close navigation" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] md:hidden" />}
      <aside className={'sidebar fixed bottom-0 left-0 z-50 flex w-[252px] flex-col px-4 py-5 transition-transform duration-200 md:translate-x-0 ' + (demoMode ? 'top-8' : 'top-0') + ' ' + (open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="mb-9 flex items-center justify-between px-2">
          <NavLink to="/dashboard" onClick={onClose} className="flex items-center gap-3" aria-label="BrandProof overview">
            <div className="grid h-10 w-10 place-items-center rounded-[13px] bg-gradient-to-br from-indigo-400 to-violet-500 text-white shadow-lg shadow-violet-950/20">
              <span className="text-[13px] font-bold tracking-[-0.08em]">BP</span>
            </div>
            <div>
              <span className="block text-[16px] font-semibold tracking-[-0.03em] text-ink">BrandProof</span>
              <span className="sidebar-brand-subtitle mt-0.5 block text-[10px] font-medium uppercase tracking-[0.17em]">Compliance studio</span>
            </div>
          </NavLink>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-secondary hover:bg-canvas hover:text-ink md:hidden" aria-label="Close menu">
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
        </div>

        <p className="sidebar-label mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em]">Workspace</p>
        <nav aria-label="Primary navigation">
          <LinkList links={primaryLinks} onNavigate={onClose} />
          <div className="mb-2 mt-8 flex items-center justify-between px-3">
            <p className="sidebar-label text-[10px] font-semibold uppercase tracking-[0.16em]">Manage</p>
          </div>
          <LinkList links={moreLinks} onNavigate={onClose} />
        </nav>

        <div className="sidebar-footer mt-auto rounded-2xl border p-3.5">
          <div className="flex items-center gap-2.5">
            <div className="sidebar-footer-icon grid h-8 w-8 place-items-center rounded-xl">
              <BarChart3 size={15} aria-hidden="true" />
            </div>
            <div>
              <p className="sidebar-footer-title text-xs font-medium">CODEX48 workspace</p>
              <p className="sidebar-footer-copy mt-0.5 text-[10px]">Brand checks, made clear.</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

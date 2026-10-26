import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './layouts/AppShell'

const AnalyzerPage = lazy(() => import('./pages/AnalyzerPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const GuidelinesPage = lazy(() => import('./pages/GuidelinesPage'))

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Suspense fallback={<PageLoading />}><DashboardPage /></Suspense>} />
        <Route path="analyze" element={<Suspense fallback={<PageLoading />}><AnalyzerPage /></Suspense>} />
        <Route path="guidelines" element={<Suspense fallback={<PageLoading />}><GuidelinesPage /></Suspense>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

function PageLoading() {
  return <div role="status" className="rounded-2xl border border-line bg-surface p-8 text-sm text-secondary">Loading workspace…</div>
}

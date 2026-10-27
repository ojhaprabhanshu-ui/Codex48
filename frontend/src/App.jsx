import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './layouts/AppShell'

const AnalyzerPage = lazy(() => import('./pages/AnalyzerPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const GuidelinesPage = lazy(() => import('./pages/GuidelinesPage'))
<<<<<<< HEAD
const AnalysisDetailsPage = lazy(() => import('./pages/AnalysisDetailsPage'))
const ReviewQueuePage = lazy(() => import('./pages/ReviewQueuePage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
=======
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'))
>>>>>>> 15a6666f3533020822919ab70b94f38309e74d69

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Suspense fallback={<PageLoading />}><DashboardPage /></Suspense>} />
        <Route path="analyze" element={<Suspense fallback={<PageLoading />}><AnalyzerPage /></Suspense>} />
        <Route path="guidelines" element={<Suspense fallback={<PageLoading />}><GuidelinesPage /></Suspense>} />
<<<<<<< HEAD
        <Route path="analysis/:id" element={<Suspense fallback={<PageLoading />}><AnalysisDetailsPage /></Suspense>} />
        <Route path="reviews" element={<Suspense fallback={<PageLoading />}><ReviewQueuePage /></Suspense>} />
        <Route path="reviews/:id" element={<Suspense fallback={<PageLoading />}><ReviewQueuePage /></Suspense>} />
        <Route path="history" element={<Suspense fallback={<PageLoading />}><HistoryPage /></Suspense>} />
        <Route path="history/:id" element={<Suspense fallback={<PageLoading />}><HistoryPage /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<PageLoading />}><SettingsPage /></Suspense>} />
=======
        <Route path="reviews" element={<Suspense fallback={<PageLoading />}><ReviewsPage /></Suspense>} />
>>>>>>> 15a6666f3533020822919ab70b94f38309e74d69
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

function PageLoading() {
  return <div role="status" className="rounded-2xl border border-line bg-surface p-8 text-sm text-secondary">Loading workspace…</div>
}

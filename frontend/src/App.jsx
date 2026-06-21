import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import CitizenReport from './pages/CitizenReport'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'

import { useEffect } from 'react'
import { api } from './api'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('demo-token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  useEffect(() => {
    // Initial sync check
    api.syncOfflineQueue()

    // Sync when coming back online
    const handleOnline = () => api.syncOfflineQueue()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/report" element={<CitizenReport />} />
      <Route path="/my-reports" element={<Navigate to="/report" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
    </Routes>
  )
}

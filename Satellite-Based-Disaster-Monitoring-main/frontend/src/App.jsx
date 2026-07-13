import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Upload from './pages/Upload.jsx'
import Reports from './pages/Reports.jsx'
import Alerts from './pages/Alerts.jsx'
import MapPage from './pages/Map.jsx'
import Detail from './pages/Detail.jsx'
import Admin from './pages/Admin.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import Icon from './components/Icons.jsx'
import { api } from './api.js'
import { useAuth } from './context/AuthContext.jsx'
import { StatusProvider } from './context/StatusContext.jsx'

function Shell() {
  const [mock, setMock] = useState(undefined)
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const ping = () => api.health()
      .then((h) => { setMock(h.mock_mode); setOnline(true) })
      .catch(() => setOnline(false))
    ping()
    const id = setInterval(ping, 30000)
    return () => clearInterval(id)
  }, [])

  return (
    <StatusProvider value={{ mock, online }}>
      <div className="app">
        <Sidebar />
        <main className="main">
          {!online && (
            <div className="banner" style={{ borderColor: 'var(--border-strong)' }}>
              <span className="b-ico"><Icon name="alert" size={18} /></span>
              <span><b>Backend not reachable.</b> Open a terminal, run{' '}
              <code>cd backend</code> then{' '}
              <code>python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000</code>.
              Keep frontend running with <code>npm run dev</code>.</span>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </StatusProvider>
  )
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />
      <Route path="/admin-login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace /> : <AdminLogin />} />
      <Route element={user ? <Shell /> : <Navigate to="/login" replace />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/reports/:id" element={<Detail />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/admin" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

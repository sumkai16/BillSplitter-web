import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Register from './pages/Register'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import LandingPage from './pages/LandingPage'
import BillDetail from './pages/BillDetail'
import JoinBill from './pages/JoinBill'
import Archive from './pages/Archive'
import UserProfile from './pages/UserProfile'

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin" />
        <p className="text-sm text-slate-400">Restoring your session...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <AuthLoadingScreen />
  if (!user) return <Navigate to="/login" />
  return children
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <AuthLoadingScreen />

  return (
    <Routes>
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/landing"} />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/bills/:id" element={<BillDetail />} />
      <Route path="/join" element={<JoinBill />} />
      <Route path="/archive" element={<ProtectedRoute><Archive /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
    </Routes>
  )
}

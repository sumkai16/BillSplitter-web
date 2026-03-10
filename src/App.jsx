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
import UserProfile from './pages/UserProfile'


function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div>Loading...</div>
  if (!user) return <Navigate to="/login" />
  return children
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div>Loading...</div>

  return (
    <Routes>
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      <Route path="/" element={<LandingPage />} />      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/bills/:id" element={<BillDetail />} />
      <Route path="/join" element={<JoinBill />} />
      <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />

    </Routes>
  )
}

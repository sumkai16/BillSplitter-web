import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const { signIn } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email || !password) return toast.error('All fields are required')
        setLoading(true)
        try {
            await signIn(email, password)
            navigate('/dashboard')
        } catch {
            toast.error('Incorrect email or password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
            <Toaster position="top-center" />
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8"
            >
                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">💸</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
                    <p className="text-gray-500 mt-1 text-sm">Sign in to your BillSplitter account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm"
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm"
                        />
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="cursor-pointer w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                        {loading ? 'Signing in...' : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                    </motion.button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-violet-600 font-semibold hover:underline">Register</Link>
                </p>
            </motion.div>
        </div>
    )
}
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Mail, Lock, AtSign, ArrowRight } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function Register() {
    const [form, setForm] = useState({
        firstName: '', lastName: '', nickname: '',
        username: '', email: '', password: '', confirmPassword: ''
    })
    const [loading, setLoading] = useState(false)
    const { signUp } = useAuth()
    const navigate = useNavigate()

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

    const validate = () => {
        for (const value of Object.values(form)) {
            if (!value || value.trim() === '') return 'All fields are required. Spaces are not valid input.'
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email address'
        if (form.password.length < 8 || form.password.length > 16) return 'Password must be 8-16 characters'
        if (!/[A-Z]/.test(form.password)) return 'Password needs at least one uppercase letter'
        if (!/[a-z]/.test(form.password)) return 'Password needs at least one lowercase letter'
        if (!/[0-9]/.test(form.password)) return 'Password needs at least one number'
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) return 'Password needs at least one special character'
        if (form.password !== form.confirmPassword) return 'Passwords do not match'
        return null
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const error = validate()
        if (error) return toast.error(error)
        setLoading(true)
        try {
            await signUp(form.email, form.password, {
                firstName: form.firstName,
                lastName: form.lastName,
                nickname: form.nickname,
                username: form.username,
            })
            toast.success('Account created!')
            navigate('/dashboard')
        } catch (err) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const fields = [
        { name: 'firstName', placeholder: 'First Name', icon: User, type: 'text' },
        { name: 'lastName', placeholder: 'Last Name', icon: User, type: 'text' },
        { name: 'nickname', placeholder: 'Nickname', icon: AtSign, type: 'text' },
        { name: 'username', placeholder: 'Username', icon: AtSign, type: 'text' },
        { name: 'email', placeholder: 'Email address', icon: Mail, type: 'email' },
        { name: 'password', placeholder: 'Password', icon: Lock, type: 'password' },
        { name: 'confirmPassword', placeholder: 'Confirm Password', icon: Lock, type: 'password' },
    ]

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
                    <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
                    <p className="text-gray-500 mt-1 text-sm">Join BillSplitter and split bills with ease</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    {fields.map(({ name, placeholder, icon: Icon, type }) => (
                        <div key={name} className="relative">
                            <Icon className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
                            <input
                                type={type}
                                name={name}
                                placeholder={placeholder}
                                value={form[name]}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm"
                            />
                        </div>
                    ))}

                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="cursor-pointer w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors mt-2"
                    >
                        {loading ? 'Creating account...' : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                    </motion.button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                    Already have an account?{' '}
                    <Link to="/login" className="text-violet-600 font-semibold hover:underline">Sign In</Link>
                </p>
            </motion.div>
        </div>
    )
}
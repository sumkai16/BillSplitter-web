import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import { LogOut, User, Mail, AtSign, Shield, Calendar, Receipt } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const accountBadge = {
    guest: { label: 'Guest', color: 'bg-gray-100 text-gray-600' },
    standard: { label: 'Standard', color: 'bg-violet-100 text-violet-700' },
    premium: { label: 'Premium ⭐', color: 'bg-amber-100 text-amber-700' },
}

export default function Dashboard() {
    const { user, signOut } = useAuth()
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    if (!user) return null

    useEffect(() => {
        const fetchProfile = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()
            if (error) toast.error('Failed to load profile')
            else setProfile(data)
            setLoading(false)
        }
        fetchProfile()
    }, [user.id])

    const badge = accountBadge[profile?.account_type] || accountBadge.standard

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50">
            <Toaster position="top-center" />

            {/* Navbar */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">💸</span>
                        <span className="font-bold text-gray-900 text-lg">BillSplitter</span>
                    </div>
                    <button
                        onClick={signOut}
                        className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-4 border-violet-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Welcome Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-3xl p-8 text-white shadow-lg"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-violet-200 text-sm mb-1">Welcome back ya</p>
                                    <h2 className="text-2xl font-bold">{profile?.first_name} {profile?.last_name}</h2>
                                    <p className="text-violet-300 text-sm mt-1">@{profile?.username}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.color}`}>
                                    {badge.label}
                                </span>
                            </div>
                        </motion.div>

                        {/* Account Details */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6"
                        >
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <User className="w-4 h-4 text-violet-500" /> Account Details
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { icon: Mail, label: 'Email', value: profile?.email },
                                    { icon: AtSign, label: 'Nickname', value: profile?.nickname },
                                    { icon: Shield, label: 'Account Type', value: profile?.account_type },
                                    { icon: Calendar, label: 'Member Since', value: new Date(profile?.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
                                ].map(({ icon: Icon, label, value }) => (
                                    <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                                            <Icon className="w-4 h-4" />
                                            {label}
                                        </div>
                                        <span className="text-gray-900 text-sm font-medium">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Bills Placeholder */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6"
                        >
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Receipt className="w-4 h-4 text-violet-500" /> My Bills
                            </h3>
                            <div className="text-center py-10">
                                <span className="text-4xl">🧾</span>
                                <p className="text-gray-500 text-sm mt-3">No bills yet. Create one to get started!</p>
                                <button className="mt-4 px-6 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
                                    + New Bill
                                </button>
                            </div>
                        </motion.div>

                        {/* Account Plans */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6"
                        >
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-violet-500" /> Account Plans
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { type: 'Guest', emoji: '👤', color: 'bg-gray-50 border-gray-200', badge: 'bg-gray-100 text-gray-600', perks: ['View bills only', '6hr access limit', 'No registration needed'] },
                                    { type: 'Standard', emoji: '⭐', color: 'bg-violet-50 border-violet-200', badge: 'bg-violet-100 text-violet-700', perks: ['Up to 5 bills', 'Up to 3 members', 'Full access'] },
                                    { type: 'Premium', emoji: '🚀', color: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700', perks: ['Unlimited bills', 'Unlimited members', 'Priority support'] },
                                ].map(({ type, emoji, color, badge, perks }) => (
                                    <div key={type} className={`rounded-2xl border p-4 ${color} ${profile?.account_type === type.toLowerCase() ? 'ring-2 ring-violet-400' : ''}`}>
                                        <div className="text-center mb-3">
                                            <span className="text-2xl">{emoji}</span>
                                            <span className={`block mt-1 text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>{type}</span>
                                        </div>
                                        <ul className="space-y-1">
                                            {perks.map(perk => (
                                                <li key={perk} className="text-xs text-gray-600 flex items-start gap-1">
                                                    <span className="text-green-500 mt-0.5">✓</span> {perk}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </div>
        </div>
    )
}
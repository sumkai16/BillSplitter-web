import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import {
    LogOut,
    User,
    Mail,
    AtSign,
    Shield,
    Calendar,
    Receipt,
    Users,
    Wallet,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const accountBadge = {
    guest: { label: "Guest", color: "bg-gray-800 text-gray-300" },
    standard: { label: "Standard", color: "bg-emerald-900/40 text-white-400" },
    premium: { label: "Premium ⭐", color: "bg-amber-900/40 text-white-400" },
};

export default function Dashboard() {

    const { user, signOut } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateBill, setShowCreateBill] = useState(false);
    const navigate = useNavigate();

    const [billName, setBillName] = useState('');
    const [billCode, setBillCode] = useState(generateCode());
    const [billLoading, setBillLoading] = useState(false);
    const [bills, setBills] = useState([]);

    function generateCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return Array.from({ length: 6 }, () =>
            chars[Math.floor(Math.random() * chars.length)]
        ).join('');
    }

    useEffect(() => {

        const fetchProfile = async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (error) toast.error("Failed to load profile");
            else setProfile(data);

            setLoading(false);
        };

        const fetchBills = async () => {
            const { data, error } = await supabase
                .from('bills')
                .select("*")
                .eq("host_id", user.id)
                .order("created_at", { ascending: false });

            if (!error) setBills(data);
        };

        fetchBills();
        fetchProfile();

    }, [user.id]);

    const badge = accountBadge[profile?.account_type] || accountBadge.standard;

    const handleCreateBill = async () => {

        if (!billName.trim()) return toast.error('Bill name is required');

        setBillLoading(true);

        try {

            const { data: bill, error: billError } = await supabase
                .from('bills')
                .insert({
                    name: billName.trim(),
                    code: billCode,
                    host_id: profile.id,
                    status: 'active',
                })
                .select()
                .single();

            if (billError) throw billError;

            const { error: memberError } = await supabase
                .from('bill_members')
                .insert({
                    bill_id: bill.id,
                    user_id: profile.id,
                    role: 'host',
                    member_type: 'registered',
                })

            if (memberError) throw memberError;

            toast.success('Bill created successfully');

            setShowCreateBill(false);
            setBillName('');
            setBillCode(generateCode());

        } catch {
            toast.error('Failed to create bill');
        } finally {
            setBillLoading(false);
        }

    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white">

            <Toaster position="top-center" />

            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-800">

                <img
                    src="public/hlogo.png"
                    alt="Logo"
                    className="w-50 h-auto object-contain transition-transform duration-300 hover:scale-110 cursor-pointer"
                />

                <div className="flex items-center gap-6">

                    <span className="text-xl text-slate-300 font-medium">
                        {profile?.first_name}
                    </span>

                    <button
                        onClick={signOut}
                        className="flex items-center gap-2 text-red-400 hover:text-red-500 transition"
                    >
                        <LogOut className="w-6 h-6" />
                        Logout
                    </button>

                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* UPDATED WELCOME CARD */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 rounded-3xl p-8 shadow-xl shadow-emerald-900/40"
                        >

                            <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/3" />
                            <div className="absolute bottom-0 left-0 w-60 h-60 bg-black/20 rounded-full blur-3xl opacity-40 translate-y-1/2 -translate-x-1/3" />

                            <div className="relative flex justify-between items-start">

                                <div>
                                    <p className="text-emerald-100 text-sm mb-1">
                                        Welcome back,
                                    </p>

                                    <h2 className="text-3xl font-bold tracking-tight">
                                        {profile?.first_name} {profile?.last_name}!
                                    </h2>

                                    <p className="text-emerald-100 text-sm mt-1">
                                        @{profile?.username}
                                    </p>
                                </div>

                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
                                    {badge.label}
                                </span>

                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="grid grid-cols-1 md:grid-cols-3 gap-6"
                        >
                            <StatCard icon={Receipt} label="Total Bills" value={bills.length} />
                            <StatCard icon={Users} label="Active Members" value="" />
                            <StatCard icon={Wallet} label="Total Expenses" value="" />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-6"
                        >

                            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                <User className="w-4 h-4 text-emerald-400" />
                                Account Details
                            </h3>

                            <div className="space-y-3">

                                {[
                                    { icon: Mail, label: "Email", value: profile?.email },
                                    { icon: AtSign, label: "Nickname", value: profile?.nickname },
                                    { icon: Shield, label: "Account Type", value: profile?.account_type },
                                    {
                                        icon: Calendar,
                                        label: "Member Since",
                                        value: profile?.created_at
                                            ? new Date(profile.created_at).toLocaleDateString()
                                            : "",
                                    },
                                ].map(({ icon: Icon, label, value }) => (

                                    <div
                                        key={label}
                                        className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
                                    >

                                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                                            <Icon className="w-4 h-4" />
                                            {label}
                                        </div>

                                        <span className="text-white text-sm font-medium">
                                            {value ? value.charAt(0).toUpperCase() + value.slice(1) : '—'}
                                        </span>

                                    </div>

                                ))}
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-6"
                        >

                            <div className="flex items-center justify-between mb-4">

                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Receipt className="w-4 h-4 text-emerald-400" />
                                    My Bills
                                </h3>

                                <button
                                    onClick={() => setShowCreateBill(true)}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-semibold transition"
                                >
                                    + New Bill
                                </button>

                            </div>

                            {bills.length === 0 ? (

                                <div className="text-center py-10">
                                    <span className="text-4xl">🧾</span>
                                    <p className="text-slate-400 text-sm mt-3">
                                        No bills yet. Create one to get started!
                                    </p>
                                </div>

                            ) : (

                                <div className="space-y-3">

                                    {bills.map((bill) => (

                                        <div
                                            key={bill.id}
                                            onClick={() => navigate(`/bills/${bill.id}`)}
                                            className="flex items-center justify-between p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800 transition cursor-pointer"
                                        >

                                            <div>
                                                <p className="font-semibold text-white text-sm">
                                                    {bill.name}
                                                </p>

                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    Code:
                                                    <span className="font-mono font-bold tracking-wider ml-1">
                                                        {bill.code}
                                                    </span>
                                                </p>
                                            </div>

                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                bill.status === 'active'
                                                    ? 'bg-emerald-900/40 text-emerald-400'
                                                    : 'bg-gray-800 text-gray-400'
                                            }`}>
                                                {bill.status}
                                            </span>

                                        </div>

                                    ))}

                                </div>

                            )}
                        </motion.div>
                    </>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value }) {

    return (
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-6 hover:border-emerald-500/40 transition">

            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{label}</p>
                <Icon className="w-5 h-5 text-emerald-400" />
            </div>

            <h3 className="text-2xl font-bold text-white mt-2">
                {value}
            </h3>

        </div>
    );
}
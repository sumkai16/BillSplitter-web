import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "../lib/supabase";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const { resetPassword } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return toast.error("Please enter your email address");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Please enter a valid email address");
        setLoading(true);
        try {
            //validate email if exists
            const { data, error } = await supabase
                .from('profiles')
                .select('email')
                .eq('email', email)
                .single()
            if (error || !data) {
                toast.error("No account found with that email address");
                setLoading(false);
                return;
            }
            //email exists
            await resetPassword(email);
            setSubmitted(true);
        } catch {
            toast.error("Failed to send reset link. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100 flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 w-full max-w-md p-10 text-center"
                >
                    <div className="text-5xl mb-4">📩</div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                        Check your email!
                    </h2>
                    <p className="text-slate-500 text-sm mb-6">
                        We sent a password reset link to{" "}
                        <span className="font-semibold text-emerald-600">{email}</span>.
                        Click it to reset your password.
                    </p>
                    <Link
                        to="/login"
                        className="inline-block bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg"
                    >
                        Back to Login
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100 flex items-center justify-center p-6">
            <Toaster position="top-center" />
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 w-full max-w-md p-10"
            >
                <div className="flex justify-center mb-6">
                    <img
                        src="public/hlogo.png"
                        alt="Logo"
                        className="w-48 h-auto object-contain"
                    />
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-800">FORGOT PASSWORD</h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        Enter your email and we'll send you a reset link
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-sm transition"
                        />
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-70"
                    >
                        {loading ? "Sending..." : <>Send Reset Link <ArrowRight className="w-4 h-4" /></>}
                    </motion.button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-8">
                    Remember your password?{" "}
                    <Link to="/login" className="text-emerald-600 font-semibold hover:text-emerald-800">
                        Back to Login
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
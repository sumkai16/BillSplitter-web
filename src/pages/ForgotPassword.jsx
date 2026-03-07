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

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return toast.error("Please enter a valid email address");

        setLoading(true);

        try {

            const { data, error } = await supabase
                .from("profiles")
                .select("email")
                .eq("email", email)
                .single();

            if (error || !data) {
                toast.error("No account found with that email address");
                setLoading(false);
                return;
            }

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

            <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black flex items-center justify-center p-6 text-white">

                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl w-full max-w-md p-10 text-center"
                >

                    <div className="text-5xl mb-4">📩</div>

                    <h2 className="text-2xl font-semibold mb-2">
                        Check your email
                    </h2>

                    <p className="text-slate-400 text-sm mb-6">
                        We sent a password reset link to{" "}
                        <span className="text-emerald-400 font-semibold">
                            {email}
                        </span>.
                        Click it to reset your password.
                    </p>

                    <Link
                        to="/login"
                        className="inline-block bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl font-semibold transition"
                    >
                        Back to Login
                    </Link>

                </motion.div>

            </div>

        );

    }

    return (

        <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black flex items-center justify-center p-6 text-white">

            <Toaster position="top-center" />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl w-full max-w-md p-10"
            >

                <div className="flex justify-center mb-6">

                    <img
                        src="public/hlogo.png"
                        alt="Logo"
                        className="w-44 h-auto object-contain hover:scale-105 transition"
                    />

                </div>

                <div className="text-center mb-8">

                    <h1 className="text-2xl font-semibold">
                        Forgot Password
                    </h1>

                    <p className="text-slate-400 mt-1 text-sm">
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
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition"
                        />

                    </div>

                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition disabled:opacity-70"
                    >

                        {loading
                            ? "Sending..."
                            : <>Send Reset Link <ArrowRight className="w-4 h-4" /></>
                        }

                    </motion.button>

                </form>

                <p className="text-center text-sm text-slate-400 mt-8">

                    Remember your password?{" "}

                    <Link
                        to="/login"
                        className="text-emerald-400 font-semibold hover:text-emerald-300"
                    >
                        Back to Login
                    </Link>

                </p>

            </motion.div>

        </div>

    );

}
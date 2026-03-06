import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, ArrowRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const validate = () => {
        if (!password || !confirmPassword) return "All fields are required";
        if (password.length < 8 || password.length > 16) return "Password must be 8-16 characters";
        if (!/[A-Z]/.test(password)) return "Password needs at least one uppercase letter";
        if (!/[a-z]/.test(password)) return "Password needs at least one lowercase letter";
        if (!/[0-9]/.test(password)) return "Password needs at least one number";
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Password needs at least one special character";
        if (password !== confirmPassword) return "Passwords do not match";
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const error = validate();
        if (error) return toast.error(error);
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            toast.success("Password updated successfully!");
            setTimeout(() => navigate("/login"), 2000);
        } catch {
            toast.error("Failed to update password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

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
                    <h1 className="text-2xl font-bold text-slate-800">RESET PASSWORD</h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        Enter your new password below
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                        <input
                            type="password"
                            placeholder="New password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-sm transition"
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                        <input
                            type="password"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-sm transition"
                        />
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-70"
                    >
                        {loading ? "Updating..." : <>Update Password <ArrowRight className="w-4 h-4" /></>}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
}
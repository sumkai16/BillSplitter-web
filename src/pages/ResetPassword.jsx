import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, ArrowRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "../lib/supabase";
import PageNavbar, { BrandLogo, NavbarLink } from "../components/PageNavbar";
import {
    getPasswordError,
    getConfirmPasswordError,
} from "../utils/passwordValidation";

export default function ResetPassword() {

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const validate = () => {

        if (!password || !confirmPassword) return "All fields are required";

        const passwordError = getPasswordError(password);
        if (passwordError) return passwordError;

        const confirmError = getConfirmPasswordError(password, confirmPassword);
        if (confirmError) return confirmError;

        return null;

    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        const errorMessage = validate();

        if (errorMessage) return toast.error(errorMessage);

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

        <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black flex items-center justify-center p-6 text-white">

            <Toaster position="top-center" />
            <PageNavbar
                fixed
                maxWidthClass="max-w-6xl"
                className="border-transparent bg-transparent backdrop-blur-0"
                left={<BrandLogo to="/landing" />}
                right={
                    <>
                        <NavbarLink to="/landing" tone="subtle">Home</NavbarLink>
                        <NavbarLink to="/login" tone="subtle">Sign In</NavbarLink>
                    </>
                }
            />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl w-full max-w-md p-10"
            >
                <div className="text-center mb-8">

                    <h1 className="text-2xl font-semibold">
                        Reset Password
                    </h1>

                    <p className="text-slate-400 text-sm mt-1">
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
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition"
                        />

                    </div>

                    <div className="relative">

                        <Lock className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />

                        <input
                            type="password"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
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
                            ? "Updating..."
                            : <>Update Password <ArrowRight className="w-4 h-4" /></>
                        }

                    </motion.button>

                </form>

            </motion.div>

        </div>

    );
}

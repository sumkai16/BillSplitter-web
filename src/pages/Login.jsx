import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error("All fields are required");
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch {
      toast.error("Incorrect email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email address");
    setLoading(true);
    try {
      await resetPassword(email);
      toast.success("Password reset link sent to your email");
    } catch {
      toast.error("Failed to send password reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-black via-slate-900 to-black p-4 text-white">

      <Toaster position="top-center" />

      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl w-full max-w-md p-8"
      >

        <div className="flex justify-center mb-6">
          <img
            src="public/hlogo.png"
            alt="Logo"
            className="w-48 h-auto object-contain transition-transform duration-300 hover:scale-110"
          />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">
            Welcome Back
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Sign in to your Bill Split account
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
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition"
            />
          </div>

          <p className="text-start text-xs text-slate-400 mt-[-5px] ml-2">
            <Link
              to="/forgot-password"
              className="text-emerald-400 font-bold hover:text-emerald-300 transition"
            >
              Forgot Password?
            </Link>
          </p>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="cursor-pointer w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20 disabled:opacity-70"
          >
            {loading ? (
              "Signing in..."
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>

        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-emerald-400 font-semibold hover:text-emerald-300 transition"
          >
            Register
          </Link>
        </p>

      </motion.div>
    </div>
  );
}
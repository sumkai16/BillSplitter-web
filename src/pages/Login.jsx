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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100 flex items-center justify-center p-4">
      <Toaster position="top-center" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 w-full max-w-md p-8"
      >
    <div className="flex justify-center mb-6">
  <img
    src="public/hlogo.png"
    alt="Logo"
    className="w-48 h-auto object-contain"
  />
</div>

<div className="text-center mb-8">
  <h1 className="text-2xl font-bold text-slate-800">
    Welcome back!
  </h1>
  <p className="text-slate-500 mt-1 text-sm">
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
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-sm transition"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-sm transition"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="cursor-pointer w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-70"
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

        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-emerald-600 font-semibold hover:text-emerald-700 transition"
          >
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

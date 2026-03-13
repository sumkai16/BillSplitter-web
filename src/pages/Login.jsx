import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const getEmailError = (value) => {
    if (!value || value.trim() === "") return "";
    if (/\s/.test(value)) return "Email cannot contain spaces";
    const atCount = (value.match(/@/g) || []).length;
    if (atCount === 0) return 'Email must include "@"';
    if (atCount > 1) return 'Email must contain only one "@"';
    const [local, domain] = value.split("@");
    if (!local) return "Email must include a username before @";
    if (!domain) return "Email must include a domain after @";
    if (!domain.includes(".")) return "Email domain must include a dot";
    if (domain.startsWith(".") || domain.endsWith("."))
      return "Email domain cannot start or end with a dot";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      return "Please enter a valid email address";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email && !password) {
      setFormError("All fields are required");
      return;
    }
    if (!email || !password) {
      if (!password) setPasswordError("Password is required");
      if (!email) setEmailError("Email is required");
      return;
    }
    const emailValidation = getEmailError(email);
    if (emailValidation) {
      setEmailError(emailValidation);
      return;
    }
    if (!password) {
      setPasswordError("Password is required");
      return;
    }
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
    const emailValidation = getEmailError(email);
    if (emailValidation) {
      setEmailError(emailValidation);
      return;
    }
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
            className="w-48 h-auto object-contain transition-transform duration-300 hover:scale-110 cursor-pointer"
          />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">WELCOME BACK!</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Sign in to your Bill Split account
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => {
                const nextValue = e.target.value;
                setEmail(nextValue);
                setEmailError(getEmailError(nextValue));
                setPasswordError((prev) => prev);
                setFormError("");
              }}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-sm transition ${
                email.trim() === "" ? "hover:border-red-400" : "hover:border-emerald-200"
              }`}
            />
            {emailError ? (
              <p className="mt-1 ml-1 text-xs text-red-500">{emailError}</p>
            ) : null}
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                const nextValue = e.target.value;
                setPassword(nextValue);
                setPasswordError(nextValue ? "" : "Password is required");
                setFormError("");
              }}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-sm transition ${
                password.trim() === ""
                  ? "hover:border-red-400"
                  : "hover:border-emerald-200"
              }`}
            />
            {passwordError ? (
              <p className="mt-1 ml-1 text-xs text-red-500">{passwordError}</p>
            ) : null}
          </div>

          <p className="text-start text-xs text-slate-500 mt-[-10px] ml-2">
            {" "}
            <Link
              to="/forgot-password"
              className="text-emerald-600 font-semibold hover:text-emerald-700 transition"
            >
              Forgot Password
            </Link>
          </p>

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

      {formError ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setFormError("")}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-sm rounded-3xl bg-white shadow-2xl border border-white/60 p-6 text-center"
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xl">
              !
            </div>
            <h3 className="text-lg font-bold text-slate-800">Missing Details</h3>
            <p className="text-sm text-slate-500 mt-2">{formError}</p>
            <button
              onClick={() => setFormError("")}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-2.5 text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 transition"
            >
              Okay
            </button>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
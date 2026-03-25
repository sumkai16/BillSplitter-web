import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import PageNavbar, { BrandLogo, NavbarLink } from "../components/PageNavbar";

export default function Login() {

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const { signIn } = useAuth();
  const navigate = useNavigate();

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
      if (!email) setEmailError("This field is required");
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

  return (

    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-black via-slate-900 to-black p-4 text-white">

      {/* Spotify Glow Background */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />

      <Toaster position="top-center" />

      <PageNavbar
        fixed
        maxWidthClass="max-w-6xl"
        className="border-transparent bg-transparent backdrop-blur-0"
        left={<BrandLogo to="/landing" />}
        right={
          <>
            <NavbarLink to="/landing" tone="subtle">Home</NavbarLink>
            <NavbarLink to="/register" tone="subtle">Register</NavbarLink>
          </>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-8"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            Welcome Back
          </h1>

          <p className="text-slate-400 mt-1 text-sm">
            Sign in to your Splitify account
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
                setFormError("");

              }}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-800/70 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition"
            />

            {emailError && (
              <p className="mt-1 ml-1 text-xs text-red-400">
                {emailError}
              </p>
            )}

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
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-800/70 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition"
            />

            {passwordError && (
              <p className="mt-1 ml-1 text-xs text-red-400">
                {passwordError}
              </p>
            )}

          </div>

          <p className="text-xs text-slate-400 ml-2">

            <Link
              to="/forgot-password"
              className="text-emerald-400 font-semibold hover:text-emerald-300 transition"
            >
              Forgot Password?
            </Link>

          </p>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition"
          >

            {loading ? "Signing in..." : (
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

      {formError && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setFormError("")}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 text-center"
          >

            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-900/40 text-emerald-400 text-xl">
              !
            </div>

            <h3 className="text-lg font-semibold">
              Missing Details
            </h3>

            <p className="text-sm text-slate-400 mt-2">
              {formError}
            </p>

            <button
              onClick={() => setFormError("")}
              className="mt-5 w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black py-2.5 text-sm font-semibold transition"
            >
              Okay
            </button>

          </motion.div>

        </div>

      )}

    </div>
  );
}

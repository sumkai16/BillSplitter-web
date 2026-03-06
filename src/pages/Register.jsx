import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Mail, Lock, AtSign, ArrowRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "../lib/supabase";

export default function Register() {

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    nickname: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const [registered, setRegistered] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    for (const value of Object.values(form)) {
      if (!value || value.trim() === "")
        return "All fields are required. Spaces are not valid input.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Please enter a valid email address";

    if (form.password.length < 8 || form.password.length > 16)
      return "Password must be 8-16 characters";

    if (!/[A-Z]/.test(form.password))
      return "Password needs at least one uppercase letter";

    if (!/[a-z]/.test(form.password))
      return "Password needs at least one lowercase letter";

    if (!/[0-9]/.test(form.password))
      return "Password needs at least one number";

    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(form.password))
      return "Password needs at least one special character";

    if (form.password !== form.confirmPassword)
      return "Passwords do not match";

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const error = validate();
    if (error) return toast.error(error);

    setLoading(true);

    try {
      await signUp(form.email, form.password, {
        firstName: form.firstName,
        lastName: form.lastName,
        nickname: form.nickname,
        username: form.username,
      });

      setRegistered(true);

    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-black via-slate-900 to-black p-6 text-white">

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl w-full max-w-md p-10 text-center"
        >
          <div className="text-5xl mb-4">📬</div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Check your email
          </h2>

          <p className="text-slate-400 text-sm mb-6">
            We sent a confirmation link to
            <span className="font-semibold text-emerald-400">
              {" "} {form.email}
            </span>.
          </p>

          <Link
            to="/login"
            className="inline-block bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl font-semibold transition shadow-lg shadow-emerald-500/20"
          >
            Go to Login
          </Link>

        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-black via-slate-900 to-black p-6 text-white">

      <Toaster position="top-center" />

      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl w-full max-w-2xl p-10"
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
            Create Account
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Join BillSplitter and split bills with ease
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField icon={User} name="firstName" placeholder="First Name" type="text" value={form.firstName} onChange={handleChange} />
            <InputField icon={User} name="lastName" placeholder="Last Name" type="text" value={form.lastName} onChange={handleChange} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField icon={AtSign} name="nickname" placeholder="Nickname" type="text" value={form.nickname} onChange={handleChange} />
            <InputField icon={AtSign} name="username" placeholder="Username" type="text" value={form.username} onChange={handleChange} />
          </div>

          <InputField icon={Mail} name="email" placeholder="Email address" type="email" value={form.email} onChange={handleChange} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField icon={Lock} name="password" placeholder="Password" type="password" value={form.password} onChange={handleChange} />
            <InputField icon={Lock} name="confirmPassword" placeholder="Confirm Password" type="password" value={form.confirmPassword} onChange={handleChange} />
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20 disabled:opacity-70"
          >
            {loading ? "Creating account..." : <>Create Account <ArrowRight className="w-4 h-4" /></>}
          </motion.button>

        </form>

        <p className="text-center text-sm text-slate-400 mt-8">
          Already have an account?{" "}
          <Link to="/login" className="text-emerald-400 font-semibold hover:text-emerald-300">
            Sign In
          </Link>
        </p>

      </motion.div>
    </div>
  );
}

function InputField({ icon: Icon, ...props }) {
  return (
    <div className="relative">

      <Icon className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />

      <input
        {...props}
        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition"
      />

    </div>
  );
}
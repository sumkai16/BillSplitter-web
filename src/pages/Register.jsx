import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Mail, Lock, AtSign, ArrowRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

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
  const navigate = useNavigate();

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
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password))
      return "Password needs at least one special character";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
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
      toast.success("Account created!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message);
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
        className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 w-full max-w-2xl p-10"
      >
        <div className="text-center mb-10">
          <div className="w-36 h-14 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-md flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-black text-white tracking-wide">
              SPLITIFY
            </span>
          </div>

          <h1 className="text-3xl font-bold text-slate-800">Create Account</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Join BillSplitter and split bills with ease
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              icon={User}
              name="firstName"
              placeholder="First Name"
              type="text"
              value={form.firstName}
              onChange={handleChange}
            />
            <InputField
              icon={User}
              name="lastName"
              placeholder="Last Name"
              type="text"
              value={form.lastName}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              icon={AtSign}
              name="nickname"
              placeholder="Nickname"
              type="text"
              value={form.nickname}
              onChange={handleChange}
            />
            <InputField
              icon={AtSign}
              name="username"
              placeholder="Username"
              type="text"
              value={form.username}
              onChange={handleChange}
            />
          </div>

          <InputField
            icon={Mail}
            name="email"
            placeholder="Email address"
            type="email"
            value={form.email}
            onChange={handleChange}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              icon={Lock}
              name="password"
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={handleChange}
            />
            <InputField
              icon={Lock}
              name="confirmPassword"
              placeholder="Confirm Password"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-70"
          >
            {loading ? (
              "Creating account..."
            ) : (
              <>
                Create Account <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-8">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-emerald-600 font-semibold hover:text-emerald-800"
          >
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
        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-sm transition"
      />
    </div>
  );
}

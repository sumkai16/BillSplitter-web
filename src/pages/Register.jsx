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

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [emailError, setEmailError] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

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

  const getFieldError = (name, value, nextForm) => {

    const trimmed = value?.trim?.() ?? value;

    if (
      ["firstName", "lastName", "nickname", "username"].includes(name) &&
      (!trimmed || trimmed === "")
    ) return "This field is required";

    if (name === "email") return getEmailError(value);

    if (name === "password") {

      if (!trimmed) return "Password is required";

      if (value.length < 8 || value.length > 16)
        return "Password must be 8-16 characters";

      if (!/[A-Z]/.test(value))
        return "Password needs at least one uppercase letter";

      if (!/[a-z]/.test(value))
        return "Password needs at least one lowercase letter";

      if (!/[0-9]/.test(value))
        return "Password needs at least one number";

      if (!/[!@#$%^&*(),.?\":{}|<>]/.test(value))
        return "Password needs at least one special character";

    }

    if (name === "confirmPassword") {

      if (!trimmed) return "Please confirm your password";

      if (value !== nextForm.password) return "Passwords do not match";

    }

    return "";

  };

  const validateAll = (nextForm) => {

    const errors = {};

    Object.entries(nextForm).forEach(([name, value]) => {

      const message = getFieldError(name, value, nextForm);

      if (message) errors[name] = message;

    });

    return errors;

  };

  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e) => {

    e.preventDefault();

    const allEmpty = Object.values(form).every(
      (value) => !value || value.trim() === ""
    );

    if (allEmpty) {
      setFormError("All fields are required");
      setFieldErrors(validateAll(form));
      return;
    }

    const errors = validateAll(form);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setEmailError(errors.email || "");
      setFormError("");
      return;
    }

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

      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-slate-900 to-black text-white">

        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl"/>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl"/>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-10 text-center"
        >

          <div className="text-5xl mb-4">📬</div>

          <h2 className="text-2xl font-semibold mb-2">
            Check your email
          </h2>

          <p className="text-slate-400 text-sm mb-6">
            We sent a confirmation link to{" "}
            <span className="text-emerald-400 font-semibold">
              {form.email}
            </span>
          </p>

          <Link
            to="/login"
            className="inline-block bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl font-semibold transition"
          >
            Go to Login
          </Link>

        </motion.div>

      </div>

    );

  }

  return (

    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-slate-900 to-black text-white p-6">

      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl"/>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl"/>

      <Toaster position="top-center"/>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl p-10"
      >

        <div className="flex justify-center mb-6">
          <img
            src="public/hlogo.png"
            alt="Logo"
            className="w-44 object-contain hover:scale-105 transition"
          />
        </div>

        <div className="text-center mb-8">

          <h1 className="text-3xl font-bold">
            Create Account
          </h1>

          <p className="text-slate-400 text-sm mt-1">
            Join Splitify and split bills with ease
          </p>

        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          <div className="grid md:grid-cols-2 gap-4">

            <InputField icon={User} name="firstName" placeholder="First Name" value={form.firstName} onChange={handleChange} error={fieldErrors.firstName}/>
            <InputField icon={User} name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleChange} error={fieldErrors.lastName}/>

          </div>

          <div className="grid md:grid-cols-2 gap-4">

            <InputField icon={AtSign} name="nickname" placeholder="Nickname" value={form.nickname} onChange={handleChange} error={fieldErrors.nickname}/>
            <InputField icon={AtSign} name="username" placeholder="Username" value={form.username} onChange={handleChange} error={fieldErrors.username}/>

          </div>

          <InputField icon={Mail} name="email" placeholder="Email address" value={form.email} onChange={handleChange} error={emailError || fieldErrors.email}/>

          <div className="grid md:grid-cols-2 gap-4">

            <InputField icon={Lock} name="password" placeholder="Password" type="password" value={form.password} onChange={handleChange} error={fieldErrors.password}/>
            <InputField icon={Lock} name="confirmPassword" placeholder="Confirm Password" type="password" value={form.confirmPassword} onChange={handleChange} error={fieldErrors.confirmPassword}/>

          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition"
          >

            {loading
              ? "Creating account..."
              : <>Create Account <ArrowRight className="w-4 h-4"/></>
            }

          </motion.button>

        </form>

        <p className="text-center text-sm text-slate-400 mt-8">

          Already have an account?{" "}

          <Link
            to="/login"
            className="text-emerald-400 font-semibold hover:text-emerald-300"
          >
            Sign In
          </Link>

        </p>

      </motion.div>

    </div>

  );

}

function InputField({ icon: Icon, error, ...props }) {

  return (

    <div className="relative">

      <Icon className="absolute left-3 top-3.5 text-slate-400 w-4 h-4"/>

      <input
        {...props}
        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-800/70 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition"
      />

      {error && (
        <p className="mt-1 ml-1 text-xs text-red-400">
          {error}
        </p>
      )}

    </div>

  );

}
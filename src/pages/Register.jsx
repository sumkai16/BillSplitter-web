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
    ) {
      return "This field is required";
    }
    if (name === "email") {
      return getEmailError(value);
    }
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
      //validate if email already exists
      // const { data, error } = await supabase
      //   .from('profiles')
      //   .select('email')
      //   .eq('email', email)
      //   .single()
      // if (error || !data) {
      //   toast.error("Email already exists");
      //   setLoading(false);
      //   return;
      // }
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 w-full max-w-md p-10 text-center"
        >
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Check your email!
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            We sent a confirmation link to{" "}
            <span className="font-semibold text-emerald-600">{form.email}</span>
            . Click it to activate your account.
          </p>
          <Link
            to="/login"
            className="inline-block bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg"
          >
            Go to Login
          </Link>
        </motion.div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100 flex items-center justify-center p-6">
      <Toaster position="top-center" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 w-full max-w-2xl p-10"
      >
        <div className="flex justify-center mb-6">
          <img
            src="public/hlogo.png"
            alt="Logo"
            className="w-48 h-auto object-contain transition-transform duration-300 hover:scale-110 cursor-pointer"
          />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">CREATE ACCOUNT</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Join BillSplitter and split bills with ease
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              icon={User}
              name="firstName"
              placeholder="First Name"
              type="text"
              value={form.firstName}
              onChange={(e) => {
                handleChange(e);
                const nextValue = e.target.value;
                setFieldErrors((prev) => ({
                  ...prev,
                  firstName: getFieldError("firstName", nextValue, {
                    ...form,
                    firstName: nextValue,
                  }),
                }));
                setFormError("");
              }}
              error={fieldErrors.firstName}
            />
            <InputField
              icon={User}
              name="lastName"
              placeholder="Last Name"
              type="text"
              value={form.lastName}
              onChange={(e) => {
                handleChange(e);
                const nextValue = e.target.value;
                setFieldErrors((prev) => ({
                  ...prev,
                  lastName: getFieldError("lastName", nextValue, {
                    ...form,
                    lastName: nextValue,
                  }),
                }));
                setFormError("");
              }}
              error={fieldErrors.lastName}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              icon={AtSign}
              name="nickname"
              placeholder="Nickname"
              type="text"
              value={form.nickname}
              onChange={(e) => {
                handleChange(e);
                const nextValue = e.target.value;
                setFieldErrors((prev) => ({
                  ...prev,
                  nickname: getFieldError("nickname", nextValue, {
                    ...form,
                    nickname: nextValue,
                  }),
                }));
                setFormError("");
              }}
              error={fieldErrors.nickname}
            />
            <InputField
              icon={AtSign}
              name="username"
              placeholder="Username"
              type="text"
              value={form.username}
              onChange={(e) => {
                handleChange(e);
                const nextValue = e.target.value;
                setFieldErrors((prev) => ({
                  ...prev,
                  username: getFieldError("username", nextValue, {
                    ...form,
                    username: nextValue,
                  }),
                }));
                setFormError("");
              }}
              error={fieldErrors.username}
            />
          </div>

          <InputField
            icon={Mail}
            name="email"
            placeholder="Email address"
            type="email"
            value={form.email}
            onChange={(e) => {
              handleChange(e);
              const nextValue = e.target.value;
              const nextError = getEmailError(nextValue);
              setEmailError(nextError);
              setFieldErrors((prev) => ({ ...prev, email: nextError }));
              setFormError("");
            }}
            error={emailError || fieldErrors.email}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              icon={Lock}
              name="password"
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) => {
                handleChange(e);
                const nextValue = e.target.value;
                setFieldErrors((prev) => ({
                  ...prev,
                  password: getFieldError("password", nextValue, {
                    ...form,
                    password: nextValue,
                  }),
                  confirmPassword: getFieldError(
                    "confirmPassword",
                    form.confirmPassword,
                    { ...form, password: nextValue }
                  ),
                }));
                setFormError("");
              }}
              error={fieldErrors.password}
            />
            <InputField
              icon={Lock}
              name="confirmPassword"
              placeholder="Confirm Password"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => {
                handleChange(e);
                const nextValue = e.target.value;
                setFieldErrors((prev) => ({
                  ...prev,
                  confirmPassword: getFieldError(
                    "confirmPassword",
                    nextValue,
                    { ...form, confirmPassword: nextValue }
                  ),
                }));
                setFormError("");
              }}
              error={fieldErrors.confirmPassword}
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

function InputField({ icon: Icon, error, ...props }) {
  const isEmpty =
    props.value === undefined ||
    props.value === null ||
    props.value.toString().trim() === "";

  const inputClassName = [
    "w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/70",
    "focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400",
    "text-sm transition",
    isEmpty ? "hover:border-red-400" : "hover:border-emerald-200",
  ].join(" ");

  return (
    <div className="relative">
      <Icon className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
      <input
        {...props}
        className={inputClassName}
      />
      {error ? <p className="mt-1 ml-1 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

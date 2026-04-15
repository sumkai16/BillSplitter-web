import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AtSign,
  BadgeCheck,
  Calendar,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Save,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import PageNavbar, { BrandLogo, NavbarButton } from "../components/PageNavbar";
import { getConfirmPasswordError, getPasswordError } from "../utils/passwordValidation";

const accountBadge = {
  guest: { label: "Guest", color: "bg-slate-800 text-slate-400" },
  standard: { label: "Standard", color: "bg-emerald-950/60 text-emerald-300" },
  premium: { label: "Premium", color: "bg-amber-950/60 text-amber-300" },
};

const TOAST_STYLE = {
  style: {
    background: "#1e293b",
    color: "#fff",
    border: "1px solid #334155",
    fontSize: "13px",
  },
};

const emptyForm = {
  firstName: "",
  lastName: "",
  username: "",
  nickname: "",
  email: "",
};

export default function UserProfile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [pwModalOpen, setPwModalOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        toast.error("Failed to load profile");
      } else {
        setProfile(data);
        setForm({
          firstName: data?.first_name ?? "",
          lastName: data?.last_name ?? "",
          username: data?.username ?? "",
          nickname: data?.nickname ?? "",
          email: data?.email ?? "",
        });
      }
      setLoading(false);
    };

    if (user?.id) fetchProfile();
  }, [user?.id]);

  const badge = accountBadge[profile?.account_type] || accountBadge.standard;

  const isDirty = useMemo(() => {
    if (!profile) return false;
    return (
      form.firstName !== (profile.first_name ?? "") ||
      form.lastName !== (profile.last_name ?? "") ||
      form.username !== (profile.username ?? "") ||
      form.nickname !== (profile.nickname ?? "") ||
      form.email !== (profile.email ?? "")
    );
  }, [form, profile]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const getEmailError = (value) => {
    if (!value || value.trim() === "") return "Email is required";
    if (/\s/.test(value)) return "Email cannot contain spaces";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      return "Please enter a valid email address";
    return "";
  };

  const handleReset = () => {
    if (!profile) return;
    setForm({
      firstName: profile.first_name ?? "",
      lastName: profile.last_name ?? "",
      username: profile.username ?? "",
      nickname: profile.nickname ?? "",
      email: profile.email ?? "",
    });
  };

  const handleSave = async () => {
    if (!profile) return;
    if (!form.firstName.trim() || !form.lastName.trim() || !form.username.trim())
      return toast.error("Please complete all required fields");

    const emailError = getEmailError(form.email);
    if (emailError) return toast.error(emailError);

    setSaving(true);
    try {
      if (form.email.trim() !== (profile.email ?? "")) {
        const { error: emailErrorUpdate } = await supabase.auth.updateUser({
          email: form.email.trim(),
        });
        if (emailErrorUpdate) throw emailErrorUpdate;
      }

      const updates = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        username: form.username.trim(),
        nickname: form.nickname.trim(),
        email: form.email.trim(),
      };

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", profile.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      setForm({
        firstName: data?.first_name ?? "",
        lastName: data?.last_name ?? "",
        username: data?.username ?? "",
        nickname: data?.nickname ?? "",
        email: data?.email ?? "",
      });
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };
  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <Toaster position="top-center" toastOptions={TOAST_STYLE} />

      {/* Ambient Neon Blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-[28rem] w-[28rem] bg-emerald-500/12 blur-[140px]" />
        <div className="absolute right-0 top-16 h-[24rem] w-[24rem] bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[20rem] w-[20rem] bg-emerald-300/8 blur-[120px]" />
      </div>

      <PageNavbar
        sticky
        maxWidthClass="max-w-6xl"
        left={<BrandLogo to="/dashboard" />}
        right={
          <>
            <NavbarButton onClick={() => navigate("/dashboard")}>Dashboard</NavbarButton>
            <NavbarButton onClick={handleLogout} tone="danger">
              Sign out
            </NavbarButton>
          </>
        }
      />

      <main className="relative max-w-6xl mx-auto px-6 py-8 space-y-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Profile Banner */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-[34px] border border-emerald-500/15 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(10,14,31,0.96))] p-8 shadow-2xl shadow-black/35"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-emerald-300 text-sm mb-1 uppercase tracking-widest font-semibold flex items-center gap-2">
                    <User className="w-4 h-4" /> Personal Profile
                  </p>
                  <h2 className="text-3xl font-black tracking-tight mt-2 text-white">
                    {profile?.first_name} {profile?.last_name}
                  </h2>
                  <p className="text-emerald-400 font-medium text-sm mt-1">
                    @{profile?.username}
                  </p>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Edit Form */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="lg:col-span-2 bg-slate-900/60 backdrop-blur-xl rounded-[30px] border border-slate-800/80 p-8 shadow-lg shadow-slate-950/30"
              >
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-emerald-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg tracking-tight">Personal Information</h3>
                    <p className="text-sm text-slate-400">Update your account details and identity.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <ProfileField
                    label="First Name"
                    value={form.firstName}
                    onChange={handleChange("firstName")}
                    required
                  />
                  <ProfileField
                    label="Last Name"
                    value={form.lastName}
                    onChange={handleChange("lastName")}
                    required
                  />
                  <ProfileField
                    label="Username"
                    value={form.username}
                    onChange={handleChange("username")}
                    required
                    icon={AtSign}
                  />
                  <ProfileField
                    label="Nickname"
                    value={form.nickname}
                    onChange={handleChange("nickname")}
                  />
                  <ProfileField
                    label="Email"
                    value={form.email}
                    onChange={handleChange("email")}
                    required
                    icon={Mail}
                    type="email"
                    className="md:col-span-2"
                  />
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleReset}
                    disabled={!isDirty || saving}
                    className="group relative flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 px-6 py-3 text-sm font-bold text-slate-400 transition-all hover:border-slate-700 hover:bg-slate-900 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <span>Reset changes</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={!isDirty || saving}
                    className="group relative flex items-center gap-2 overflow-hidden rounded-2xl bg-emerald-500 px-8 py-3 text-sm font-black uppercase tracking-wider text-emerald-950 shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? "Processing..." : "Save changes"}</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLogout}
                    className="ml-auto rounded-2xl border border-slate-800 bg-slate-950/50 px-6 py-3 text-sm font-bold text-rose-400/80 transition-all hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    Disconnect account
                  </motion.button>
                </div>
              </motion.div>

              {/* Account Summary */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-slate-900/60 backdrop-blur-xl rounded-[30px] border border-slate-800/80 p-8 shadow-lg shadow-slate-950/30 flex flex-col"
              >
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
                    <BadgeCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg tracking-tight">System details</h3>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <SummaryRow
                    label="Account Type"
                    value={profile?.account_type}
                    formatValue={(value) =>
                      value ? value.charAt(0).toUpperCase() + value.slice(1) : "-"
                    }
                  />
                  <SummaryRow
                    label="Member Since"
                    value={
                      profile?.created_at
                        ? new Date(profile.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                        : "-"
                    }
                    icon={Calendar}
                  />
                  <SummaryRow
                    label="Profile ID"
                    value={profile?.id ? profile.id.slice(0, 8) : "-"}
                  />
                </div>

                {/* Change Password */}
                <div className="mt-6 pt-5 border-t border-slate-800/60">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setPwModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-5 py-3 text-sm font-bold text-emerald-400 transition-all hover:bg-emerald-500/15 hover:border-emerald-500/40 hover:text-emerald-300"
                  >
                    <KeyRound className="w-4 h-4" />
                    Change Password
                  </motion.button>
                </div>
              </motion.div>

              {/* Change Password Modal */}
              <AnimatePresence>
                {pwModalOpen && (
                  <ChangePasswordModal
                    email={profile?.email ?? user?.email ?? ""}
                    onClose={() => setPwModalOpen(false)}
                  />
                )}
              </AnimatePresence>

            </div>
          </>
        )}

      </main>

    </div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  required,
  icon: Icon,
  type = "text",
  className = "",
}) {
  return (
    <label className={`space-y-1 text-sm text-slate-400 ${className}`}>
      <span className="flex items-center gap-2 font-semibold uppercase tracking-wider text-[11px] text-slate-500">
        {Icon ? <Icon className="w-3.5 h-3.5 text-emerald-500/70" /> : null}
        {label}
        {required ? <span className="text-rose-400">*</span> : null}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 rounded-[14px] bg-slate-950/50 border border-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 text-sm transition-all shadow-inner"
      />
    </label>
  );
}

function SummaryRow({ label, value, icon: Icon, formatValue }) {
  const displayValue =
    typeof formatValue === "function" ? formatValue(value) : value;
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors px-2 rounded-xl -mx-2">
      <div className="flex items-center gap-2.5 text-slate-400 text-sm font-medium">
        {Icon ? <Icon className="w-4 h-4 text-slate-500" /> : null}
        {label}
      </div>
      <span className="text-white text-sm font-medium">{displayValue || "-"}</span>
    </div>
  );
}

function ChangePasswordModal({ email, onClose }) {
  const dialogRef = useRef(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    // Focus the first input once mounted.
    const input = dialogRef.current?.querySelector("input");
    input?.focus?.();
  }, []);

  const validate = () => {
    const pwError = getPasswordError(password);
    if (pwError) return pwError;
    const confirmError = getConfirmPasswordError(password, confirmPassword);
    if (confirmError) return confirmError;
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errorMessage = validate();
    if (errorMessage) return toast.error(errorMessage);

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated successfully");
      onClose?.();
    } catch {
      toast.error("Failed to update password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onMouseDown={onClose}
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Change password"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-slate-800/90 bg-slate-950/80 backdrop-blur-xl shadow-2xl shadow-black/40"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/70 px-6 py-5">
          <div className="space-y-1">
            <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Security
            </p>
            <h3 className="text-lg font-black tracking-tight text-white">
              Change Password
            </h3>
            {email ? (
              <p className="text-sm text-slate-400">
                Updating password for <span className="text-slate-200">{email}</span>
              </p>
            ) : (
              <p className="text-sm text-slate-400">Set a new password for your account.</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-800 bg-slate-950/40 p-2 text-slate-300 transition hover:bg-slate-900 hover:text-white"
            aria-label="Close modal"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              New password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password"
                className="w-full pr-11 px-4 py-3 rounded-[14px] bg-slate-950/50 border border-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 text-sm transition-all"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:text-slate-200"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password ? (
              <p className="text-xs text-slate-500">
                {getPasswordError(password) ? (
                  <span className="text-rose-400/90">{getPasswordError(password)}</span>
                ) : (
                  <span className="text-emerald-400/90">Looks good.</span>
                )}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Confirm new password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full pr-11 px-4 py-3 rounded-[14px] bg-slate-950/50 border border-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 text-sm transition-all"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:text-slate-200"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {confirmPassword ? (
              <p className="text-xs text-slate-500">
                {getConfirmPasswordError(password, confirmPassword) ? (
                  <span className="text-rose-400/90">
                    {getConfirmPasswordError(password, confirmPassword)}
                  </span>
                ) : (
                  <span className="text-emerald-400/90">Passwords match.</span>
                )}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-800 bg-slate-950/40 px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-900 hover:text-white"
              disabled={submitting}
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-black uppercase tracking-wider text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? "Updating..." : "Update password"}
            </motion.button>
          </div>

          <div className="pt-4 border-t border-slate-800/70">
            <p className="text-xs text-slate-500">
              Tip: If you’re having trouble changing your password, use{" "}
              <span className="text-slate-300 font-semibold">Forgot password</span>{" "}
              on the login page to get a reset link.
            </p>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AtSign,
  BadgeCheck,
  Calendar,
  Mail,
  Save,
  User,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import PageNavbar, { BrandLogo, NavbarButton } from "../components/PageNavbar";

const accountBadge = {
  guest: { label: "Guest", color: "bg-gray-800 text-gray-400" },
  standard: { label: "Standard", color: "bg-emerald-900/40 text-emerald-400" },
  premium: { label: "Premium ⭐", color: "bg-amber-900/40 text-amber-400" },
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
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white">
      <Toaster position="top-center" />

      <PageNavbar
        sticky
        maxWidthClass="max-w-5xl"
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

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
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
              className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 text-white shadow-xl"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-emerald-100 text-sm mb-1">Personal Profile</p>
                  <h2 className="text-2xl font-bold">
                    {profile?.first_name} {profile?.last_name}
                  </h2>
                  <p className="text-emerald-200 text-sm mt-1">
                    @{profile?.username}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.color}`}>
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
                className="lg:col-span-2 bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-6"
              >
                <h3 className="font-bold text-white mb-5 flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="flex flex-wrap gap-3 mt-6">
                  <button
                    onClick={handleReset}
                    disabled={!isDirty || saving}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 font-semibold hover:bg-slate-800 transition text-sm disabled:opacity-40"
                  >
                    Reset
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={!isDirty || saving}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition text-sm disabled:opacity-40 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLogout}
                    className=" px-4 py-2 rounded-xl border border-slate-700 text-slate-400 font-semibold hover:bg-slate-800 transition text-sm"
                  >
                    Logout
                  </motion.button>

                </div>
              </motion.div>

              {/* Account Summary */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-6 space-y-4"
              >
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-emerald-400" />
                  Account Summary
                </h3>

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
              </motion.div>

            </div>
          </>
        )}

      </div>

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
      <span className="flex items-center gap-2 font-medium">
        {Icon ? <Icon className="w-4 h-4 text-emerald-400" /> : null}
        {label}
        {required ? <span className="text-emerald-400">*</span> : null}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition"
      />
    </label>
  );
}

function SummaryRow({ label, value, icon: Icon, formatValue }) {
  const displayValue =
    typeof formatValue === "function" ? formatValue(value) : value;
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        {Icon ? <Icon className="w-4 h-4" /> : null}
        {label}
      </div>
      <span className="text-white text-sm font-medium">{displayValue || "-"}</span>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import {
  LogOut,
  User,
  Mail,
  AtSign,
  Shield,
  Calendar,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const accountBadge = {
  guest: { label: "Guest", color: "bg-gray-100 text-gray-600" },
  standard: { label: "Standard", color: "bg-emerald-100 text-emerald-700" },
  premium: { label: "Premium ⭐", color: "bg-amber-100 text-amber-700" },
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  if (!user) return null;

  useEffect(() => {
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) toast.error("Failed to load profile");
      else setProfile(data);

      setLoading(false);
    };

    fetchProfile();
  }, [user.id]);

  const badge = accountBadge[profile?.account_type] || accountBadge.standard;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100">
      <Toaster position="top-center" />

      <div className="flex justify-between items-center px-8 py-5">
        <img
          src="public/hlogo.png"
          alt="Logo"
          className="w-50 h-auto object-contain transition-transform duration-300 hover:scale-110 cursor-pointer"
        />

        <div className="flex items-center gap-6">
          <span className="text-xl text-slate-600 font-medium">
            {profile?.first_name}
          </span>

          <button
            onClick={signOut}
            className="transition-all duration-300 hover:scale-102 flex items-center gap-2 text-xl text-red-500 hover:text-red-600"
          >
            <LogOut className="w-6 h-6" />
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="transition-all duration-300 hover:scale-102 hover:shadow-lg bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 text-white shadow-xl"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-emerald-100 text-sm mb-1">
                    Welcome back 👋
                  </p>
                  <h2 className="text-2xl font-bold">
                    {profile?.first_name} {profile?.last_name}
                  </h2>
                  <p className="text-emerald-200 text-sm mt-1">
                    @{profile?.username}
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${badge.color}`}
                >
                  {badge.label}
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <StatCard icon={Receipt} label="Total Bills" value="" />
              <StatCard icon={Users} label="Active Members" value="" />
              <StatCard icon={Wallet} label="Total Expenses" value="" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="cursor-pointer transition-all duration-300 hover:scale-102 hover:shadow-lg bg-white/80 backdrop-blur-md rounded-3xl shadow-md border border-white/40 p-6"
            >
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-500" />
                Account Details
              </h3>

              <div className="space-y-3">
                {[
                  { icon: Mail, label: "Email", value: profile?.email },
                  { icon: AtSign, label: "Nickname", value: profile?.nickname },
                  { icon: Shield, label: "Account Type", value: profile?.account_type },
                  {
                    icon: Calendar,
                    label: "Member Since",
                    value: profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "",
                  },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <Icon className="w-4 h-4" />
                      {label}
                    </div>
                    <span className="text-slate-800 text-sm font-medium">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="cursor-pointer transition-all duration-300 hover:scale-102 hover:shadow-lg bg-white/80 backdrop-blur-md rounded-3xl shadow-md border border-white/40 p-6"
            >
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-500" />
                My Bills
              </h3>

              <div className="text-center py-10">
                <span className="text-4xl">🧾</span>
                <p className="text-slate-500 text-sm mt-3">
                  No bills yet. Create one to get started!
                </p>

                <button className="cursor-pointer transition-all duration-300 hover:scale-103 mt-4 px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 shadow-md">
                  + New Bill
                </button>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="cursor-pointer bg-white/80 backdrop-blur-md rounded-3xl shadow-md border border-white/40 p-6 transition-all duration-300 hover:scale-102 hover:shadow-lg hover:border-2 hover:border-emerald-200 hover:rounded-xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <Icon className="w-5 h-5 text-emerald-500" />
      </div>
      <h3 className="text-2xl font-bold text-slate-800 mt-2">{value}</h3>
    </div>
  );
}
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
import { useNavigate } from "react-router-dom";

const accountBadge = {
  guest: { label: "Guest", color: "bg-gray-100 text-gray-600" },
  standard: { label: "Standard", color: "bg-emerald-100 text-emerald-700" },
  premium: { label: "Premium ⭐", color: "bg-amber-100 text-amber-700" },
};
export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showCreateBill, setShowCreateBill] = useState(false);

  const navigate = useNavigate();
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
    const fetchBills = async () => {
      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("host_id", user.id)
        .eq('status', 'active')
        .order("created_at", { ascending: false });

      if (!error) setBills(data);
    };
    fetchBills();
    fetchProfile();
  }, [user.id]);

  const badge = accountBadge[profile?.account_type] || accountBadge.standard;
  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  };
  const [billName, setBillName] = useState("");
  const [billCode, setBillCode] = useState(generateCode());
  const [billLoading, setBillLoading] = useState(false);
  const [bills, setBills] = useState([]);
  const handleCreateBill = async () => {
    if (!billName.trim()) return toast.error("Bill name is required");
    setBillLoading(true);
    try {
      const { data: bill, error: billError } = await supabase
        .from("bills")
        .insert({
          name: billName.trim(),
          code: billCode,
          host_id: profile.id,
          status: "active",
        })
        .select()
        .single();
      if (billError) throw billError;

      const { error: memberError } = await supabase
        .from("bill_members")
        .insert({
          bill_id: bill.id,
          user_id: profile.id,
          role: "host",
          member_type: "registered",
        });
      if (memberError) throw memberError;

      toast.success("Bill created successfully");
      setBills((prevBills) => [bill, ...prevBills]);
      setShowCreateBill(false);
      setBillName("");
      setBillCode(generateCode());
    } catch (error) {
      toast.error("Failed to create bill");
    } finally {
      setBillLoading(false);
    }
  };
  if (!user) return null;

  const handleArchiveBill = async (e, billId) => {
    e.stopPropogation();
    try {
      const { error } = await supabase
        .from("bills")
        .update({ status: "Archived" })
        .eq("id", billId);
      if (error) throw error;
      toast.success("Bill archived successfully");
      setBills(prev => prev.filter(b => b.id !== billId));
    } catch (error) {
      toast.error("Failed to archive bill");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white">
      <Toaster position="top-center" />

      <div className="flex justify-between items-center px-8 py-5">
        <img
          src="public/hlogo.png"
          alt="Logo"
          className="w-50 h-auto object-contain transition-transform duration-300 hover:scale-110 cursor-pointer"
        />

        <div className="flex items-center gap-6">
          <span className="text-lg text-slate-300 font-medium">
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
              className="transition-all duration-300 hover:scale-102 hover:shadow-lg bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-3xl p-8 text-white shadow-xl"
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
              <StatCard
                icon={Receipt}
                label="Total Bills"
                value={bills.length}
              />
              <StatCard icon={Users} label="Active Members" value="" />
              <StatCard icon={Wallet} label="Total Expenses" value="" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="transition-all duration-300 hover:scale-[1.02] bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-6"
            >
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-500" />
                Account Details
              </h3>

              <div className="space-y-3">
                {[
                  { icon: Mail, label: "Email", value: profile?.email },
                  { icon: AtSign, label: "Nickname", value: profile?.nickname },
                  {
                    icon: Shield,
                    label: "Account Type",
                    value: profile?.account_type,
                  },
                  {
                    icon: Calendar,
                    label: "Member Since",
                    value: profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )
                      : "",
                  },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
                  >
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Icon className="w-4 h-4" />
                      {label}
                    </div>
                    <span className="text-white text-sm font-medium">
                      {value
                        ? value.charAt(0).toUpperCase() +
                        value.slice(1).toLowerCase()
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="cursor-pointer bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-emerald-500/40"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-500" />
                  My Bills
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/archive')}
                    className="px-4 py-2 border border-slate-700 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-400 rounded-xl text-sm font-semibold transition"
                  >
                    📦 Archive
                  </button>
                  <button
                    onClick={() => setShowCreateBill(true)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-semibold transition"
                  >
                    + New Bill
                  </button>
                </div>

              </div>

              {bills.length === 0 ? (
                <div className="text-center py-10">
                  <span className="text-4xl">🧾</span>
                  <p className="text-slate-400 text-sm mt-3">
                    No bills yet. Create one to get started!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bills.map((bill) => (
                    <div
                      key={bill.id}
                      onClick={() => navigate(`/bills/${bill.id}`)}
                      className="flex items-center justify-between p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800 transition-all cursor-pointer">

                      <div>
                        <p className="font-semibold text-white text-sm">
                          {bill.name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Code:{" "}
                          <span className="font-mono font-bold tracking-wider">
                            {bill.code}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${bill.status === "Active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                            }`}
                        >
                          {bill.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
      {showCreateBill && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-8 text-white"
          >
            <h2 className="text-xl font-bold text-whitemb-6 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-500" />
              Create New Bill
            </h2>

            <div className="space-y-4">
              {/* Bill Name */}
              {bills.map((bill) => (
                <div
                  key={bill.id}
                  onClick={() => navigate(`/bills/${bill.id}`)}
                  className="flex items-center justify-between p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <div>
                    <p className="font-semibold text-white text-sm">{bill.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Code: <span className="font-mono font-bold tracking-wider">{bill.code}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-emerald-900/40 text-emerald-400">
                      {bill.status}
                    </span>
                    <button
                      onClick={(e) => handleArchiveBill(e, bill.id)}
                      className="p-2 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition text-xs"
                      title="Archive bill"
                    >
                      📦
                    </button>
                  </div>
                </div>
              ))}

              {/* Invite Code */}
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">
                  Invite Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={billCode}
                    readOnly
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-mono font-bold text-sm tracking-widest"
                  />
                  <button
                    onClick={() => setBillCode(generateCode())}
                    className="px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-emerald-600 transition text-sm font-medium whitespace-nowrap"
                  >
                    🔄 New Code
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Share this code with people you want to invite
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowCreateBill(false);
                  setBillName("");
                  setBillCode(generateCode());
                }}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 font-semibold hover:bg-slate-50 transition text-sm"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateBill}
                disabled={billLoading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold hover:from-emerald-700 hover:to-teal-700 transition text-sm shadow-lg disabled:opacity-70"
              >
                {billLoading ? "Creating..." : "Create Bill"}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
function StatCard({ icon: Icon, label, value }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-6 shadow-lg hover:shadow-emerald-500/10 transition"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <Icon className="w-5 h-5 text-emerald-500" />
      </div>

      <h3 className="text-2xl font-bold text-white mt-2">
        {value}
      </h3>
    </motion.div>
  );
}
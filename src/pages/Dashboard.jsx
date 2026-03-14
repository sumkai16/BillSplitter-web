import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import {
  LogOut, User, Mail, AtSign, Shield, Calendar,
  Receipt, Users, Wallet,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const accountBadge = {
  guest: { label: "Guest", color: "bg-gray-800 text-gray-400" },
  standard: { label: "Standard", color: "bg-emerald-900/40 text-emerald-400" },
  premium: { label: "Premium ⭐", color: "bg-amber-900/40 text-amber-400" },
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateBill, setShowCreateBill] = useState(false);
  const [billName, setBillName] = useState("");
  const [billCode, setBillCode] = useState(() => generateCode());
  const [billLoading, setBillLoading] = useState(false);
  const [bills, setBills] = useState([]);
  const [billSearch, setBillSearch] = useState("");
  const [billStatus, setBillStatus] = useState("all");
  const [billSort, setBillSort] = useState("newest");
  const [activeMembers, setActiveMembers] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

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
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (!error) setBills(data);
    };

    fetchBills();
    fetchProfile();
  }, [user.id]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!bills.length) {
        setActiveMembers(0);
        setTotalExpenses(0);
        return;
      }

      const billIds = bills.map((bill) => bill.id);

      const [{ data: membersData, error: membersError }, { data: expenseData, error: expenseError }] =
        await Promise.all([
          supabase.from("bill_members").select("user_id, guest_id").in("bill_id", billIds),
          supabase.from("expenses").select("amount").in("bill_id", billIds),
        ]);

      if (!membersError) {
        const uniqueMembers = new Set(
          (membersData || [])
            .map((member) => (member.user_id ? `u:${member.user_id}` : member.guest_id ? `g:${member.guest_id}` : null))
            .filter(Boolean)
        );
        setActiveMembers(uniqueMembers.size);
      }

      if (!expenseError) {
        const total = (expenseData || []).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
        setTotalExpenses(total);
      }
    };

    fetchStats();
  }, [bills]);

  const badge = accountBadge[profile?.account_type] || accountBadge.standard;

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
      setBills((prev) => [bill, ...prev]);
      setShowCreateBill(false);
      setBillName("");
      setBillCode(generateCode());
    } catch (error) {
      toast.error("Failed to create bill");
    } finally {
      setBillLoading(false);
    }
  };

  const handleArchiveBill = async (e, billId) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("bills")
        .update({ status: "archived" })
        .eq("id", billId);
      if (error) throw error;
      toast.success("Bill archived");
      setBills((prev) => prev.filter((b) => b.id !== billId));
    } catch (error) {
      toast.error("Failed to archive bill");
    }
  };

  const filteredBills = useMemo(() => {
    const search = billSearch.trim().toLowerCase();
    return bills
      .filter((bill) => {
        const matchesName = search ? bill.name?.toLowerCase().includes(search) : true;
        const matchesStatus = billStatus === "all" ? true : bill.status === billStatus;
        return matchesName && matchesStatus;
      })
      .sort((a, b) =>
        billSort === "newest"
          ? new Date(b.created_at) - new Date(a.created_at)
          : new Date(a.created_at) - new Date(b.created_at)
      );
  }, [bills, billSearch, billSort, billStatus]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white">
      <Toaster position="top-center" />

      {/* Navbar */}
      <div className="flex justify-between items-center px-8 py-5">
        <img
          src="public/hlogo.png"
          alt="Logo"
          className="w-40 h-auto object-contain transition-transform duration-300 hover:scale-110 cursor-pointer"
          onClick={() => navigate("/dashboard")}
        />
        <div className="flex items-center gap-6">
          <span className="text-lg text-slate-300 font-medium">
            {profile?.first_name}
          </span>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-red-500 hover:text-red-400 transition text-sm font-semibold"
          >
            <LogOut className="w-5 h-5" />
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
            {/* Welcome Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-3xl p-8 text-white shadow-xl"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-emerald-100 text-sm mb-1">Welcome back, </p>
                  <h2 className="text-2xl font-bold">
                    {profile?.first_name} {profile?.last_name}
                  </h2>
                  <p className="text-emerald-200 text-sm mt-1">@{profile?.username}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
            </motion.div>

            {/* Stat Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <StatCard icon={Receipt} label="Total Bills" value={bills.length} />
              <StatCard icon={Users} label="Active Members" value={activeMembers} />
              <StatCard
                icon={Wallet}
                label="Total Expenses"
                value={`₱${Number(totalExpenses).toFixed(2)}`}
              />
            </motion.div>

            {/* Account Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => navigate("/profile")}
              className="cursor-pointer transition-all duration-300 hover:scale-[1.02] bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 hover:border-emerald-500/40 p-6"
            >
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
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
                        year: "numeric", month: "long", day: "numeric",
                      })
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
                        ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* My Bills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-500" />
                  My Bills
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate("/archive")}
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

              {/* Search + Filters */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
                <input
                  type="text"
                  placeholder="Search by bill name"
                  value={billSearch}
                  onChange={(e) => setBillSearch(e.target.value)}
                  className="w-full md:max-w-xs px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition"
                />
                <div className="flex flex-wrap gap-3">

                  <select
                    value={billSort}
                    onChange={(e) => setBillSort(e.target.value)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  >
                    <option value="newest">Newest to Oldest</option>
                    <option value="oldest">Oldest to Newest</option>
                  </select>
                </div>
              </div>

              {/* Bills List */}
              {filteredBills.length === 0 ? (
                <div className="text-center py-10">
                  <span className="text-4xl">🧾</span>
                  <p className="text-slate-400 text-sm mt-3">
                    No bills yet. Create one to get started!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredBills.map((bill) => (
                    <div
                      key={bill.id}
                      onClick={() => navigate(`/bills/${bill.id}`)}
                      className="flex items-center justify-between p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-white text-sm">{bill.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Code:{" "}
                          <span className="font-mono font-bold tracking-wider">
                            {bill.code}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${bill.status === "active"
                          ? "bg-emerald-900/40 text-emerald-400"
                          : "bg-gray-800 text-gray-400"
                          }`}>
                          {bill.status}
                        </span>
                        <button
                          onClick={(e) => handleArchiveBill(e, bill.id)}
                          className="p-2 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition"
                          title="Archive bill"
                        >
                          📦
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>

      {/* Create Bill Modal */}
      {showCreateBill && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-md p-8 text-white"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-500" />
              Create New Bill
            </h2>

            <div className="space-y-4">
              {/* Bill Name */}
              <div>
                <label className="text-sm font-medium text-slate-400 mb-1 block">
                  Bill Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dinner at Jollibee"
                  value={billName}
                  onChange={(e) => setBillName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition"
                />
              </div>

              {/* Invite Code */}
              <div>
                <label className="text-sm font-medium text-slate-400 mb-1 block">
                  Invite Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={billCode}
                    readOnly
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold text-sm tracking-widest"
                  />
                  <button
                    onClick={() => setBillCode(generateCode())}
                    className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-400 transition text-sm font-medium whitespace-nowrap"
                  >
                    🔄 New Code
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Share this code with people you want to invite
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowCreateBill(false);
                  setBillName("");
                  setBillCode(generateCode());
                }}
                className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 font-semibold hover:bg-slate-800 transition text-sm"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateBill}
                disabled={billLoading}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition text-sm disabled:opacity-70"
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

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
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
      <h3 className="text-2xl font-bold text-white mt-2">{value}</h3>
    </motion.div>
  );
}

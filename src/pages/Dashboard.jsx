import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import {
  Mail,
  AtSign,
  Shield,
  Calendar,
  Receipt,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useLimits } from '../hooks/useLimits';
import UpgradeModal from '../components/UpgradeModal';
//  Constants 

const TOAST_STYLE = {
  style: { background: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: '13px' }
};

const ACCOUNT_BADGE = {
  guest: { label: "Guest", color: "bg-gray-800 text-gray-400" },
  standard: { label: "Standard", color: "bg-emerald-900/40 text-emerald-400" },
  premium: { label: "Premium ⭐", color: "bg-amber-900/40 text-amber-400" },
};

//  Sub-components 

function StatCard({ icon: Icon, label, value, delta, trend = "up" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/40 backdrop-blur-xl transition hover:border-emerald-500/30"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/80 via-cyan-400/60 to-transparent" />
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          {label}
        </p>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900/70 border border-slate-800">
          <Icon className="h-5 w-5 text-emerald-400" />
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <h3 className="text-3xl font-semibold text-white">{value}</h3>
        {delta && (
          <span
            className={`text-xs font-semibold ${
              trend === "up" ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {trend === "up" ? "▲" : "▼"} {delta}
          </span>
        )}
      </div>
      <div className="mt-4 flex gap-1">
        {[6, 10, 7, 14, 9, 12, 8].map((h, idx) => (
          <div
            key={`${label}-${idx}`}
            className="flex-1 rounded-full bg-slate-800/80"
          >
            <div
              className="rounded-full bg-emerald-500/70"
              style={{ height: `${h}px` }}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function SectionCard({ title, subtitle, action, children, className = "" }) {
  return (
    <div
      className={`rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/40 backdrop-blur-xl ${className}`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// Bill usage indicator — only shown to standard users
function BillUsageBar({ billsThisMonth, billLimit }) {
  const percentage = Math.min((billsThisMonth / billLimit) * 100, 100);
  const isAtLimit = billsThisMonth >= billLimit;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isAtLimit ? 'bg-red-500' : 'bg-emerald-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-xs font-medium whitespace-nowrap ${isAtLimit ? 'text-red-400' : 'text-slate-500'}`}>
        {billsThisMonth}/{billLimit} bills this month
      </span>
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

//  Main Component 

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  //  Profile & bills state 
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [activeMembers, setActiveMembers] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  //  Create bill modal state 
  const [showCreateBill, setShowCreateBill] = useState(false);
  const [billName, setBillName] = useState("");
  const [billCode, setBillCode] = useState(() => generateCode());
  const [billLoading, setBillLoading] = useState(false);

  //  Filter/search state 
  const [billSearch, setBillSearch] = useState("");
  const [billSort, setBillSort] = useState("newest");

  //  Limits 
  const { isStandard, billsThisMonth, billLimit, canCreateBill, refetchLimits } = useLimits(user?.id);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  //  Fetch data 

  useEffect(() => {
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) {
        console.error('[Dashboard] profile error:', error);
        toast.error("Failed to load profile");
      } else {
        setProfile(data);
      }
      setLoading(false);
    };

    const fetchBills = async () => {
      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("host_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) console.error('[Dashboard] bills error:', error);
      else setBills(data);
    };

    fetchProfile();
    fetchBills();
  }, [user.id]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!bills.length) {
        setActiveMembers(0);
        setTotalExpenses(0);
        return;
      }

      const billIds = bills.map(b => b.id);

      const [
        { data: membersData, error: membersError },
        { data: expenseData, error: expenseError }
      ] = await Promise.all([
        supabase.from("bill_members").select("user_id, guest_id").in("bill_id", billIds),
        supabase.from("expenses").select("amount").in("bill_id", billIds),
      ]);

      if (membersError) console.error('[Dashboard] members stats error:', membersError);
      else {
        const uniqueMembers = new Set(
          (membersData || [])
            .map(m => m.user_id ? `u:${m.user_id}` : m.guest_id ? `g:${m.guest_id}` : null)
            .filter(Boolean)
        );
        setActiveMembers(uniqueMembers.size);
      }

      if (expenseError) console.error('[Dashboard] expenses stats error:', expenseError);
      else {
        const total = (expenseData || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
        setTotalExpenses(total);
      }
    };

    fetchStats();
  }, [bills]);

  //  Handlers 

  const handleOpenCreateBill = () => {
    if (!canCreateBill) {
      setShowUpgradeModal(true);
      return;
    }
    setShowCreateBill(true);
  };

  const handleCreateBill = async () => {
    if (!billName.trim()) return toast.error("Bill name is required");

    // Double-check limit in case it changed since modal opened
    if (!canCreateBill) {
      setShowCreateBill(false);
      setShowUpgradeModal(true);
      return;
    }

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

      toast.success("Bill created!");
      setBills(prev => [bill, ...prev]);
      setShowCreateBill(false);
      setBillName("");
      setBillCode(generateCode());
      refetchLimits(); // update usage bar
    } catch (err) {
      console.error('[handleCreateBill]', err);
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
      setBills(prev => prev.filter(b => b.id !== billId));
      refetchLimits(); // archived bills still count but refetch for accuracy
    } catch (err) {
      console.error('[handleArchiveBill]', err);
      toast.error("Failed to archive bill");
    }
  };

  //  Derived values 

  const badge = ACCOUNT_BADGE[profile?.account_type] || ACCOUNT_BADGE.standard;
  const fullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();
  const initials = fullName
    ? fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join("")
    : "U";

  const filteredBills = useMemo(() => {
    const search = billSearch.trim().toLowerCase();
    return bills
      .filter(bill => search ? bill.name?.toLowerCase().includes(search) : true)
      .sort((a, b) =>
        billSort === "newest"
          ? new Date(b.created_at) - new Date(a.created_at)
          : new Date(a.created_at) - new Date(b.created_at)
      );
  }, [bills, billSearch, billSort]);

  if (!user) return null;

  // Render 

  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      <Toaster position="top-center" toastOptions={TOAST_STYLE} />

      {/* Ambient Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-32 right-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-slate-900/80 bg-slate-950/60 px-6 py-8 lg:flex">
          <img
            src="public/hlogo.png"
            alt="Logo"
            className="w-36 cursor-pointer object-contain transition-transform duration-300 hover:scale-105"
            onClick={() => navigate("/dashboard")}
          />
          <div className="mt-10 space-y-6 text-sm text-slate-400">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-600">
                Overview
              </p>
              <div className="mt-3 space-y-2">
                <button className="w-full rounded-xl bg-emerald-500/10 px-4 py-2 text-left text-emerald-300">
                  Dashboard
                </button>
                <button
                  onClick={() => navigate("/archive")}
                  className="w-full rounded-xl px-4 py-2 text-left hover:bg-slate-900/60"
                >
                  Archive
                </button>
                <button
                  onClick={() => navigate("/profile")}
                  className="w-full rounded-xl px-4 py-2 text-left hover:bg-slate-900/60"
                >
                  Profile
                </button>
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-600">
                Actions
              </p>
              <div className="mt-3 space-y-2">
                <button
                  onClick={handleOpenCreateBill}
                  className={`w-full rounded-xl px-4 py-2 text-left ${
                    canCreateBill
                      ? "bg-emerald-500 text-black"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  + New Bill
                </button>
                <button
                  onClick={signOut}
                  className="w-full rounded-xl px-4 py-2 text-left text-rose-400 hover:bg-rose-500/10"
                >
                  Sign out
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-900/80 bg-slate-900/40 p-4">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                Quick Stats
              </p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Active bills</span>
                  <span className="font-semibold text-white">{bills.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Members</span>
                  <span className="font-semibold text-white">{activeMembers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Expenses</span>
                  <span className="font-semibold text-white">
                    ₱{Number(totalExpenses).toFixed(0)}
                  </span>
                </div>
              </div>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500/70"
                  style={{
                    width: `${Math.min(
                      (billsThisMonth / (billLimit || 1)) * 100,
                      100,
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {billsThisMonth} / {billLimit} bills this month
              </p>
            </div>
            <div className="rounded-2xl border border-slate-900/80 bg-slate-900/40 p-4">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                Focus Today
              </p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3">
                  <p className="text-xs text-slate-500">Top Priority</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    Settle balances from the last bill
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/50 px-3 py-2">
                  <span className="text-xs text-slate-500">Next review</span>
                  <span className="text-xs font-semibold text-white">
                    Today
                  </span>
                </div>
                <button
                  onClick={handleOpenCreateBill}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    canCreateBill
                      ? "bg-emerald-500 text-black hover:bg-emerald-400"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  Start a new bill
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 px-6 py-8 lg:px-10">
          <div className="flex flex-col gap-6">
            {/* Top Bar */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Dashboard
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-white">
                  Analytics Overview
                </h1>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search bills, members, expenses..."
                    value={billSearch}
                    onChange={e => setBillSearch(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-72"
                  />
                </div>
                <button
                  onClick={handleOpenCreateBill}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                    canCreateBill
                      ? "bg-emerald-500 text-black hover:bg-emerald-400"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  + Create Bill
                </button>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-sm font-semibold text-emerald-200">
                    {initials}
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-white">
                      {fullName || "User"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {profile?.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-400 border-t-transparent" />
              </div>
            ) : (
              <>
                {/* KPI Row */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    icon={Receipt}
                    label="Total Bills"
                    value={bills.length}
                    delta={`${billsThisMonth} this month`}
                  />
                  <StatCard
                    icon={Users}
                    label="Active Members"
                    value={activeMembers}
                    delta="Across bills"
                  />
                  <StatCard
                    icon={Wallet}
                    label="Total Expenses"
                    value={`₱${Number(totalExpenses).toFixed(2)}`}
                    delta="All time"
                  />
                  <StatCard
                    icon={Calendar}
                    label="Bills This Month"
                    value={billsThisMonth}
                    delta={`Limit ${billLimit}`}
                  />
                </div>

                {/* Mid Grid */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                  <SectionCard
                    title="Bills Overview"
                    subtitle="Monthly activity snapshot"
                    className="xl:col-span-2"
                    action={
                      <select
                        value={billSort}
                        onChange={e => setBillSort(e.target.value)}
                        className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="newest">Newest to Oldest</option>
                        <option value="oldest">Oldest to Newest</option>
                      </select>
                    }
                  >
                    <div className="flex items-end justify-between gap-2 rounded-2xl border border-slate-800/60 bg-slate-900/40 px-4 py-6">
                      {[12, 18, 10, 26, 16, 30, 22, 34, 28, 40, 32, 38].map(
                        (height, idx) => (
                          <div
                            key={`bar-${idx}`}
                            className="flex flex-1 flex-col items-center gap-2"
                          >
                            <div
                              className="w-full rounded-full bg-gradient-to-t from-emerald-500/70 via-cyan-400/60 to-emerald-300/70"
                              style={{ height: `${height * 2}px` }}
                            />
                            <span className="text-[10px] text-slate-500">
                              {idx + 1}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-300">
                        Active: {bills.length}
                      </span>
                      <span className="rounded-full bg-slate-800 px-3 py-1">
                        Members: {activeMembers}
                      </span>
                      <span className="rounded-full bg-slate-800 px-3 py-1">
                        Expenses: ₱{Number(totalExpenses).toFixed(2)}
                      </span>
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Account Snapshot"
                    subtitle="Profile and usage details"
                    action={
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.color}`}>
                        {badge.label}
                      </span>
                    }
                  >
                    <div className="space-y-4 text-sm text-slate-300">
                      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Signed in as
                        </p>
                        <p className="mt-2 text-base font-semibold text-white">
                          {fullName || "User"}
                        </p>
                        <p className="text-xs text-slate-500">
                          @{profile?.username || "username"}
                        </p>
                      </div>
                      <div className="space-y-3">
                        {[
                          { icon: Mail, label: "Email", value: profile?.email },
                          { icon: AtSign, label: "Nickname", value: profile?.nickname },
                          { icon: Shield, label: "Account Type", value: profile?.account_type },
                        ].map(({ icon: Icon, label, value }) => (
                          <div key={label} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-500">
                              <Icon className="h-4 w-4" />
                              {label}
                            </div>
                            <span className="font-medium text-white">
                              {value ? value : "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                      {isStandard && (
                        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4">
                          <p className="text-xs text-slate-500">Monthly usage</p>
                          <div className="mt-3">
                            <BillUsageBar
                              billsThisMonth={billsThisMonth}
                              billLimit={billLimit}
                            />
                          </div>
                          <button
                            onClick={() => setShowUpgradeModal(true)}
                            className="mt-4 w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
                          >
                            Upgrade to Premium
                          </button>
                        </div>
                      )}
                    </div>
                  </SectionCard>
                </div>

                {/* Recent Bills */}
                <SectionCard
                  title="Recent Bills"
                  subtitle="Manage and monitor your active bills"
                  action={
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate("/archive")}
                        className="rounded-xl border border-slate-800 px-3 py-2 text-xs text-slate-400 transition hover:border-emerald-500/40 hover:text-emerald-300"
                      >
                        View Archive
                      </button>
                      <button
                        onClick={handleOpenCreateBill}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          canCreateBill
                            ? "bg-emerald-500 text-black hover:bg-emerald-400"
                            : "bg-slate-800 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        + New Bill
                      </button>
                    </div>
                  }
                >
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="text-xs text-slate-500">
                      Showing {filteredBills.length} active bills
                    </div>
                    <select
                      value={billSort}
                      onChange={e => setBillSort(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 focus:outline-none md:w-52"
                    >
                      <option value="newest">Newest to Oldest</option>
                      <option value="oldest">Oldest to Newest</option>
                    </select>
                  </div>

                  {filteredBills.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-800/80 p-10 text-center">
                      <p className="text-sm text-slate-400">
                        No bills yet. Create one to start tracking expenses.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredBills.map(bill => (
                        <div
                          key={bill.id}
                          onClick={() => navigate(`/bills/${bill.id}`)}
                          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/40 p-4 transition hover:border-emerald-500/40 hover:bg-slate-900/70"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {bill.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Code:{" "}
                              <span className="font-mono font-semibold text-slate-300">
                                {bill.code}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                bill.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-300"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {bill.status}
                            </span>
                            <button
                              onClick={e => handleArchiveBill(e, bill.id)}
                              className="rounded-xl border border-slate-800 px-3 py-2 text-xs text-slate-400 transition hover:border-amber-400/40 hover:text-amber-300"
                              title="Archive bill"
                            >
                              Archive
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </>
            )}
          </div>
        </main>
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
              <div>
                <label className="text-sm font-medium text-slate-400 mb-1 block">Bill Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dinner at Jollibee"
                  value={billName}
                  onChange={e => setBillName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateBill()}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-400 mb-1 block">Invite Code</label>
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

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType="bills"
        current={billsThisMonth}
        limit={billLimit}
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  AtSign,
  Calendar,
  Mail,
  Receipt,
  Search,
  Shield,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PageNavbar, { BrandLogo, NavbarButton } from "../components/PageNavbar";
import UpgradeModal from "../components/UpgradeModal";
import { useLimits } from "../hooks/useLimits";
import { supabase } from "../lib/supabase";

const TOAST_STYLE = {
  style: {
    background: "#1e293b",
    color: "#fff",
    border: "1px solid #334155",
    fontSize: "13px",
  },
};

const ACCOUNT_BADGE = {
  guest: { label: "Guest", color: "bg-slate-800 text-slate-300" },
  standard: { label: "Standard", color: "bg-emerald-950/60 text-emerald-300" },
  premium: { label: "Premium", color: "bg-amber-950/60 text-amber-300" },
};

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function StatCard({ icon: Icon, label, value, caption, accent = "emerald" }) {
  const accentClass =
    accent === "cyan"
      ? "from-cyan-400/25 to-slate-950 text-cyan-300"
      : accent === "amber"
        ? "from-amber-400/25 to-slate-950 text-amber-300"
        : "from-emerald-400/25 to-slate-950 text-emerald-300";

  return (
    <div className="rounded-[28px] border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/30 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-gradient-to-br ${accentClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {caption && <p className="mt-3 text-xs leading-5 text-slate-500">{caption}</p>}
    </div>
  );
}

function SectionCard({ title, subtitle, action, children, className = "" }) {
  return (
    <section
      className={`rounded-[30px] border border-slate-800/80 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30 backdrop-blur ${className}`}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function BillUsageBar({ billsThisMonth, billLimit }) {
  const percentage = Math.min((billsThisMonth / Math.max(billLimit, 1)) * 100, 100);
  const isAtLimit = billsThisMonth >= billLimit;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-slate-400">Monthly bill usage</span>
        <span className={isAtLimit ? "font-medium text-rose-300" : "font-medium text-slate-200"}>
          {billsThisMonth} / {billLimit}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isAtLimit ? "bg-rose-400" : "bg-emerald-400"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {isAtLimit
          ? "You have reached your current monthly limit."
          : `${billLimit - billsThisMonth} bill slots remaining this month.`}
      </p>
    </div>
  );
}

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

function formatCurrency(value) {
  return CURRENCY_FORMATTER.format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "No date";
  return DATE_FORMATTER.format(new Date(value));
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [activeMembers, setActiveMembers] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const [showCreateBill, setShowCreateBill] = useState(false);
  const [billName, setBillName] = useState("");
  const [billCode, setBillCode] = useState(() => generateCode());
  const [billLoading, setBillLoading] = useState(false);

  const [billSearch, setBillSearch] = useState("");
  const [billSort, setBillSort] = useState("newest");

  const { isStandard, billsThisMonth, billLimit, canCreateBill, refetchLimits } = useLimits(
    user?.id,
  );
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);

      const [{ data: profileData, error: profileError }, { data: billsData, error: billsError }] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase
            .from("bills")
            .select("*")
            .eq("host_id", user.id)
            .eq("status", "active")
            .order("created_at", { ascending: false }),
        ]);

      if (cancelled) return;

      if (profileError) {
        console.error("[Dashboard] profile error:", profileError);
        toast.error("Failed to load profile");
      } else {
        setProfile(profileData);
      }

      if (billsError) {
        console.error("[Dashboard] bills error:", billsError);
      } else {
        setBills(billsData || []);
      }

      setLoading(false);
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!bills.length) {
      setActiveMembers(0);
      setTotalExpenses(0);
      return;
    }

    let cancelled = false;

    const loadStats = async () => {
      const billIds = bills.map((bill) => bill.id);

      const [
        { data: membersData, error: membersError },
        { data: expenseData, error: expenseError },
      ] = await Promise.all([
        supabase.from("bill_members").select("user_id, guest_id").in("bill_id", billIds),
        supabase.from("expenses").select("amount").in("bill_id", billIds),
      ]);

      if (cancelled) return;

      if (membersError) {
        console.error("[Dashboard] members stats error:", membersError);
      } else {
        const uniqueMembers = new Set(
          (membersData || [])
            .map((member) =>
              member.user_id ? `u:${member.user_id}` : member.guest_id ? `g:${member.guest_id}` : null,
            )
            .filter(Boolean),
        );
        setActiveMembers(uniqueMembers.size);
      }

      if (expenseError) {
        console.error("[Dashboard] expenses stats error:", expenseError);
      } else {
        const total = (expenseData || []).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
        setTotalExpenses(total);
      }
    };

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [bills]);

  const resetCreateBillForm = () => {
    setBillName("");
    setBillCode(generateCode());
  };

  const handleOpenCreateBill = () => {
    if (!canCreateBill) {
      setShowUpgradeModal(true);
      return;
    }

    setShowCreateBill(true);
  };

  const handleCreateBill = async () => {
    if (!billName.trim()) return toast.error("Bill name is required");
    if (!profile?.id) return toast.error("Profile is still loading");

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

      const { error: memberError } = await supabase.from("bill_members").insert({
        bill_id: bill.id,
        user_id: profile.id,
        role: "host",
        member_type: "registered",
      });

      if (memberError) throw memberError;

      toast.success("Bill created");
      setBills((prev) => [bill, ...prev]);
      setShowCreateBill(false);
      resetCreateBillForm();
      refetchLimits();
    } catch (error) {
      console.error("[Dashboard] create bill error:", error);
      toast.error("Failed to create bill");
    } finally {
      setBillLoading(false);
    }
  };

  const handleArchiveBill = async (event, billId) => {
    event.stopPropagation();

    try {
      const { error } = await supabase.from("bills").update({ status: "archived" }).eq("id", billId);
      if (error) throw error;

      toast.success("Bill archived");
      setBills((prev) => prev.filter((bill) => bill.id !== billId));
      refetchLimits();
    } catch (error) {
      console.error("[Dashboard] archive bill error:", error);
      toast.error("Failed to archive bill");
    }
  };

  const badge = ACCOUNT_BADGE[profile?.account_type] || ACCOUNT_BADGE.standard;
  const firstName = profile?.first_name || "there";
  const fullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "User";
  const recentBill = bills[0] || null;
  const usageTone = isStandard && billsThisMonth >= billLimit ? "limit reached" : "on track";
  const filteredBills = useMemo(() => {
    const search = billSearch.trim().toLowerCase();

    return [...bills]
      .filter((bill) => (search ? bill.name?.toLowerCase().includes(search) : true))
      .sort((a, b) =>
        billSort === "newest"
          ? new Date(b.created_at) - new Date(a.created_at)
          : new Date(a.created_at) - new Date(b.created_at),
      );
  }, [bills, billSearch, billSort]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <Toaster position="top-center" toastOptions={TOAST_STYLE} />

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-[28rem] w-[28rem] bg-emerald-500/12 blur-[140px]" />
        <div className="absolute right-0 top-16 h-[24rem] w-[24rem] bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[20rem] w-[20rem] bg-emerald-300/8 blur-[120px]" />
      </div>

      <PageNavbar
        left={<BrandLogo to="/dashboard" />}
        right={
          <>
            <NavbarButton onClick={() => navigate("/archive")}>Archive</NavbarButton>
            <NavbarButton onClick={() => navigate("/profile")}>Profile</NavbarButton>
            <NavbarButton onClick={signOut} tone="danger">
              Sign out
            </NavbarButton>
          </>
        }
      />

      <main className="relative mx-auto max-w-7xl px-6 py-8">
        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-400 border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(340px,1fr)]">
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-[34px] border border-emerald-500/15 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(10,14,31,0.96))] p-7 shadow-2xl shadow-black/35"
              >
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.9fr)]">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                      <Sparkles className="h-3.5 w-3.5" />
                      Personal workspace
                    </div>

                    <p className="mt-6 text-sm text-slate-300">Welcome back</p>
                    <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">Hi, {firstName}</h1>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300/90">
                      You currently have {bills.length} active bill{bills.length !== 1 ? "s" : ""},
                      {" "}with {activeMembers} people involved and {formatCurrency(totalExpenses)} in
                      tracked expenses. Everything you need to manage this month is here.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        onClick={handleOpenCreateBill}
                        className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                          canCreateBill
                            ? "bg-emerald-500 text-black hover:bg-emerald-400"
                            : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                        }`}
                      >
                        Create Bill
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => navigate("/archive")}
                        className="rounded-2xl border border-slate-700/80 bg-slate-950/40 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900/80"
                      >
                        View Archive
                      </button>
                    </div>

                    <div className="mt-7 flex flex-wrap gap-3">
                      <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${badge.color}`}>
                        {badge.label}
                      </span>
                      {profile?.username && (
                        <span className="rounded-full border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-200">
                          @{profile.username}
                        </span>
                      )}
                      {isStandard && (
                        <span className="rounded-full border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-200">
                          Usage: {usageTone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5 backdrop-blur">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">This month</p>
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                          <p className="text-xs text-slate-500">Bills created</p>
                          <p className="mt-2 text-2xl font-semibold text-white">{billsThisMonth}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                          <p className="text-xs text-slate-500">Plan status</p>
                          <p className="mt-2 text-sm font-semibold capitalize text-white">{usageTone}</p>
                        </div>
                      </div>
                      {isStandard && (
                        <div className="mt-5">
                          <BillUsageBar billsThisMonth={billsThisMonth} billLimit={billLimit} />
                        </div>
                      )}
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5 backdrop-blur">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Latest activity</p>
                      {recentBill ? (
                        <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                          <p className="text-sm text-slate-400">Most recent bill</p>
                          <p className="mt-2 text-lg font-semibold text-white">{recentBill.name}</p>
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                            <span>Code: <span className="font-mono text-slate-200">{recentBill.code}</span></span>
                            <span>Created {formatDate(recentBill.created_at)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">
                          No recent bill yet. Create one to start tracking group expenses.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.section>

              <SectionCard
                title="Account"
                subtitle="Your profile, plan, and identity details"
                action={
                  <button
                    onClick={() => navigate("/profile")}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-700 hover:bg-slate-950"
                  >
                    Manage
                  </button>
                }
              >
                <div className="space-y-4">
                  {[
                    { icon: Mail, label: "Email", value: profile?.email || "Not set" },
                    { icon: AtSign, label: "Nickname", value: profile?.nickname || "Not set" },
                    { icon: Shield, label: "Account type", value: profile?.account_type || "standard" },
                    {
                      icon: Calendar,
                      label: "Member since",
                      value: profile?.created_at ? formatDate(profile.created_at) : "No date",
                    },
                  ].map(({ icon: Icon, label, value }) => (
                    <div
                      key={label}
                      className="rounded-[24px] border border-slate-800/80 bg-slate-950/65 px-4 py-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-slate-300">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
                          <p className="mt-1.5 text-sm font-medium text-white">{value}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <StatCard
                icon={Receipt}
                label="Active bills"
                value={bills.length}
                caption={`${filteredBills.length} visible with your current search and sort`}
                accent="emerald"
              />
              <StatCard
                icon={Users}
                label="People involved"
                value={activeMembers}
                caption="Across all active bills in your workspace"
                accent="cyan"
              />
              <StatCard
                icon={Wallet}
                label="Tracked expenses"
                value={formatCurrency(totalExpenses)}
                caption="Running total recorded inside active bills"
                accent="amber"
              />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
              <SectionCard
                title="Active Bills"
                subtitle="A cleaner view of the bills that still need attention"
                action={
                  <button
                    onClick={handleOpenCreateBill}
                    className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                      canCreateBill
                        ? "bg-emerald-500 text-black hover:bg-emerald-400"
                        : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    }`}
                  >
                    New Bill
                  </button>
                }
              >
                <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative w-full max-w-md">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search bills by name"
                      value={billSearch}
                      onChange={(event) => setBillSearch(event.target.value)}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-11 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <select
                    value={billSort}
                    onChange={(event) => setBillSort(event.target.value)}
                    className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300 focus:outline-none"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </div>

                {filteredBills.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed border-slate-800 bg-slate-950/50 px-6 py-14 text-center">
                    <p className="text-lg font-semibold text-white">No bills match this view</p>
                    <p className="mt-2 text-sm text-slate-400">
                      Try a different search or create a new bill to get started.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBills.map((bill) => (
                      <div
                        key={bill.id}
                        onClick={() => navigate(`/bills/${bill.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            navigate(`/bills/${bill.id}`);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className="group rounded-[28px] border border-slate-800/80 bg-slate-950/60 p-5 transition hover:border-emerald-500/35 hover:bg-slate-950"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="truncate text-base font-semibold text-white">{bill.name}</p>
                              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                                {bill.status}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-400">
                              <span>
                                Invite code:{" "}
                                <span className="font-mono font-medium text-slate-200">{bill.code}</span>
                              </span>
                              <span>Created {formatDate(bill.created_at)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="hidden text-sm text-slate-500 transition group-hover:text-slate-300 md:inline">
                              Open bill
                            </span>
                            <button
                              onClick={(event) => handleArchiveBill(event, bill.id)}
                              className="rounded-2xl border border-slate-800 px-4 py-2.5 text-sm text-slate-300 transition hover:border-amber-500/40 hover:text-amber-300"
                              title="Archive bill"
                            >
                              Archive
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <div className="space-y-6">
                <SectionCard title="Plan Usage" subtitle="A clearer view of your current account capacity">
                  {isStandard ? (
                    <div className="space-y-5">
                      <div className="rounded-[24px] border border-slate-800/80 bg-slate-950/65 p-4">
                        <BillUsageBar billsThisMonth={billsThisMonth} billLimit={billLimit} />
                      </div>
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/15"
                      >
                        <Zap className="h-4 w-4" />
                        Upgrade to Premium
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <p className="text-sm font-medium text-emerald-300">Premium active</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Your account is not restricted by the standard monthly bill cap.
                      </p>
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Quick Actions" subtitle="High-value shortcuts without extra noise">
                  <div className="space-y-3">
                    <button
                      onClick={handleOpenCreateBill}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:border-slate-700 hover:bg-slate-900"
                    >
                      Start a new bill
                      <ArrowRight className="h-4 w-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => navigate("/archive")}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:border-slate-700 hover:bg-slate-900"
                    >
                      Review archive
                      <ArrowRight className="h-4 w-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => navigate("/profile")}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:border-slate-700 hover:bg-slate-900"
                    >
                      Update profile
                      <ArrowRight className="h-4 w-4 text-slate-500" />
                    </button>
                  </div>
                </SectionCard>

                <SectionCard title="Signed In As" subtitle="Current session summary">
                  <div className="rounded-[28px] border border-slate-800/80 bg-slate-950/65 p-5">
                    <p className="text-lg font-semibold text-white">{fullName}</p>
                    <p className="mt-1 text-sm text-slate-400">{profile?.email}</p>
                  </div>
                </SectionCard>
              </div>
            </div>
          </>
        )}
      </main>

      {showCreateBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-8 text-white shadow-2xl"
          >
            <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
              <Receipt className="h-5 w-5 text-emerald-400" />
              Create New Bill
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">Bill Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dinner at Jollibee"
                  value={billName}
                  onChange={(event) => setBillName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleCreateBill();
                  }}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">Invite Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={billCode}
                    readOnly
                    className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 font-mono text-sm font-semibold tracking-widest text-white"
                  />
                  <button
                    onClick={() => setBillCode(generateCode())}
                    className="whitespace-nowrap rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-emerald-500/40 hover:text-emerald-300"
                  >
                    Regenerate
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Share this code with the people you want to invite.
                </p>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => {
                  setShowCreateBill(false);
                  resetCreateBillForm();
                }}
                className="flex-1 rounded-2xl border border-slate-700 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateBill}
                disabled={billLoading}
                className="flex-1 rounded-2xl bg-emerald-500 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-70"
              >
                {billLoading ? "Creating..." : "Create Bill"}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

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

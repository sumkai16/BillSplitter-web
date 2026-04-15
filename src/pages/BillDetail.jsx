import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageNavbar, { BrandLogo } from "../components/PageNavbar";
import UpgradeModal from "../components/UpgradeModal";
import { useLimits } from "../hooks/useLimits";
import { resolveBillMemberIdentityByEmail } from "../lib/memberIdentity";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Target,
  User,
  Wallet,
  Users,
  Receipt,
  Copy,
  UserPlus,
  X,
  Search,
  Check,
  UserCircle,
  Archive,

  ChevronRight,
  Plus,
  CreditCard,
  Pencil,
  Trash2,
  UserMinus,
  ArrowRight,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { calculateBalances, calculateSettlements } from "../utils/settlement";

//  Constants

const SPLIT_TOLERANCE = 0.01; // allow ₱0.01 rounding diff in custom splits

const TOAST_STYLE = {
  style: {
    background: "#1e293b",
    color: "#fff",
    border: "1px solid #334155",
    fontSize: "13px",
  },
};

const EXPENSE_FORM_DEFAULT = {
  name: "",
  amount: "",
  paid_by: "",
  split_type: "equal",
  category: "other",
  expense_date: new Date().toISOString().split("T")[0],
  notes: "",
};

const CATEGORIES = {
  food: { label: "Food & Drink", icon: "🍔" },
  transport: { label: "Transport", icon: "🚗" },
  accommodation: { label: "Accommodation", icon: "🏨" },
  activities: { label: "Activities", icon: "🎫" },
  shopping: { label: "Shopping", icon: "🛍️" },
  groceries: { label: "Groceries", icon: "🛒" },
  other: { label: "Other", icon: "📝" },
};
const GUEST_FORM_DEFAULT = { firstName: "", lastName: "", email: "" };
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_STANDARD_MEMBERS = 3;

//  Small reusable UI pieces

function Spinner() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ModalShell({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md p-6"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function ModalHeader({ title, onClose, children }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="font-semibold text-white">{title}</h2>
      <div className="flex items-center gap-2">
        {children}
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 transition text-slate-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex bg-slate-800/60 rounded-xl p-1 border border-slate-700/40">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${value === opt.value
            ? "bg-slate-800 text-white shadow-lg"
            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/20"
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function DashedAddButton({ onClick, icon: Icon, label, disabled = false, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`group flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed py-4.5 text-sm font-bold transition-all duration-300 ${
        disabled
          ? "border-slate-800/60 bg-slate-950/20 text-slate-600 cursor-not-allowed opacity-70"
          : "border-slate-800 bg-slate-950/30 text-slate-500 hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-400"
      }`}
    >
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
          disabled
            ? "bg-slate-900/50 text-slate-600"
            : "bg-slate-900 group-hover:bg-emerald-500 group-hover:text-emerald-950"
        }`}
      >
        {Icon ? <Icon className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </div>
      {label}
    </button>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
  ...rest
}) {
  const base =
    "w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 text-sm";
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`${base} ${className}`}
      {...rest}
    />
  );
}

function AmountInput({ value, onChange, placeholder = "0.00" }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
        ₱
      </span>
      <input
        type="number"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 text-sm"
      />
    </div>
  );
}

// Helper to distribute amount equally and handle remainders cleanly (e.g. 10000 / 3)
function distributeEqually(amount, keys) {
  const result = {};
  if (keys.length === 0 || Number(amount) <= 0) return result;
  
  const totalAmount = Number(amount);
  const equalAmount = Math.floor((totalAmount / keys.length) * 100) / 100;
  
  keys.forEach((k) => { result[k] = equalAmount; });
  
  const sum = equalAmount * keys.length;
  let remainder = totalAmount - sum;
  remainder = Math.round(remainder * 100) / 100; // Drop floating artifacts
  
  if (remainder !== 0) {
    result[keys[0]] = Math.round((result[keys[0]] + remainder) * 100) / 100;
  }
  
  // Format precisely for form inputs
  Object.keys(result).forEach((k) => {
    result[k] = result[k].toFixed(2);
  });
  
  return result;
}

//  Custom Split Rows 

function CustomSplitRows({ members, splits, onChange, expenseAmount }) {
  const total = Object.values(splits).reduce((sum, v) => sum + Number(v || 0), 0);
  const remaining = Number(expenseAmount || 0) - total;
  const isBalanced = Math.abs(remaining) <= SPLIT_TOLERANCE;

  // Track which members are included
  const includedKeys = members
    .map(m => m.user_id || m.guest_id)
    .filter(key => splits[key] !== undefined && splits[key] !== null && splits[key] !== '0' && Number(splits[key]) > 0 || splits[key] === '');

  const isIncluded = (key) => {
    // A member is included if they have any entry in splits (even 0 during editing)
    return Object.prototype.hasOwnProperty.call(splits, key);
  };

  const handleToggle = (key) => {
    const newSplits = { ...splits };
    if (isIncluded(key)) {
      // Exclude — remove from splits
      delete newSplits[key];
    } else {
      // Include — add back with 0, then redistribute
      newSplits[key] = '0';
    }
    // Redistribute among remaining included members
    const includedKeys = Object.keys(newSplits);
    if (includedKeys.length > 0 && Number(expenseAmount) > 0) {
      const dist = distributeEqually(expenseAmount, includedKeys);
      includedKeys.forEach(k => { newSplits[k] = dist[k]; });
    }
    onChange(newSplits);
  };

  const handleAmountChange = (key, value) => {
    onChange({ ...splits, [key]: value });
  };

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Amount per person</p>
        <p className={`text-xs font-semibold ${isBalanced ? 'text-emerald-400' : 'text-amber-400'}`}>
          {isBalanced
            ? '✓ Balanced'
            : remaining > 0
              ? `₱${remaining.toFixed(2)} remaining`
              : `₱${Math.abs(remaining).toFixed(2)} over`
          }
        </p>
      </div>
      {members.map(member => {
        const name = member.member_type === 'guest'
          ? `${member.guests?.first_name} ${member.guests?.last_name}`
          : `${member.profiles?.first_name} ${member.profiles?.last_name}`;
        const key = member.user_id || member.guest_id;
        const included = isIncluded(key);

        return (
          <div key={member.id} className={`flex items-center gap-3 p-2 rounded-lg transition ${!included ? 'opacity-40' : ''}`}>
            {/* Checkbox */}
            <button
              onClick={() => handleToggle(key)}
              className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition ${included
                ? 'bg-emerald-500 border-emerald-500 text-black'
                : 'border-slate-600 hover:border-slate-400'
                }`}
            >
              {included && <Check className="w-3 h-3" />}
            </button>

            <span className={`text-sm flex-1 truncate ${included ? 'text-slate-300' : 'text-slate-600'}`}>
              {name}
            </span>

            {/* Amount input — only shown if included */}
            {included ? (
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">₱</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={splits[key] || ''}
                  onChange={e => handleAmountChange(key, e.target.value)}
                  className="w-28 pl-7 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 text-sm"
                />
              </div>
            ) : (
              <span className="text-xs text-slate-600 w-28 text-right pr-2">excluded</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

//  Expense Form Fields (shared between Add and Edit modals)

function ExpenseFormFields({
  form,
  onChange,
  members,
  customSplits,
  onCustomSplitsChange,
}) {
  const isCustomDisabled = members.length < 3;

  useEffect(() => {
    if (isCustomDisabled && form.split_type === "custom") {
      onChange({ ...form, split_type: "equal" });
      onCustomSplitsChange({});
    }
  }, [isCustomDisabled, form.split_type, form, onChange, onCustomSplitsChange]);

  const SPLIT_OPTIONS = [
    { value: "equal", label: "Split equally" },
    {
      value: "custom",
      label: "Custom split",
      disabled: isCustomDisabled,
      disabledReason: "Custom split needs at least 3 members",
    },
  ];

  return (
    <div className="space-y-3">
      <TextInput
        value={form.name}
        onChange={(e) => onChange({ ...form, name: e.target.value })}
        placeholder="Expense name"
      />
      <div className="grid grid-cols-2 gap-3">
        <AmountInput
          value={form.amount}
          onChange={(e) => onChange({ ...form, amount: e.target.value })}
        />
        <input
          type="date"
          value={form.expense_date}
          onChange={(e) => onChange({ ...form, expense_date: e.target.value })}
          className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500/50 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <select
          value={form.paid_by}
          onChange={(e) => onChange({ ...form, paid_by: e.target.value })}
          className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500/50 text-sm"
        >
          <option value="">Who paid?</option>
          {members.map((member) => {
            const name =
              member.member_type === "guest"
                ? `${member.guests?.first_name} ${member.guests?.last_name} (guest)`
                : `${member.profiles?.first_name} ${member.profiles?.last_name}`;
            const value =
              member.member_type === "guest" ? member.guest_id : member.user_id;
            return (
              <option key={member.id} value={value}>
                {name}
              </option>
            );
          })}
        </select>
        <select
          value={form.category}
          onChange={(e) => onChange({ ...form, category: e.target.value })}
          className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500/50 text-sm appearance-none"
        >
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <option key={key} value={key}>{cat.icon} {cat.label}</option>
          ))}
        </select>
      </div>
      <SegmentedControl
        options={SPLIT_OPTIONS}
        value={form.split_type}
        onChange={val => {
          onChange({ ...form, split_type: val });
          if (val === 'custom' && Number(form.amount) > 0) {
            // Auto-fill equal amounts for all members, perfectly distributed
            const keys = members.map(m => m.user_id || m.guest_id);
            const filled = distributeEqually(form.amount, keys);
            onCustomSplitsChange(filled);
          }
          if (val === 'equal') {
            onCustomSplitsChange({});
          }
        }}
      />
      <textarea
        placeholder="Notes (optional)"
        value={form.notes}
        onChange={(e) => onChange({ ...form, notes: e.target.value })}
        className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 text-sm min-h-[80px] resize-none"
      />
      {isCustomDisabled && (
        <p className="text-[11px] text-slate-500">
          Custom split is available once the bill has at least 3 members.
        </p>
      )}
      {form.split_type === "custom" && (
        <CustomSplitRows
          members={members}
          splits={customSplits}
          onChange={onCustomSplitsChange}
          expenseAmount={form.amount}
        />
      )}
    </div>
  );
}

//  Validation helpers

function validateExpenseForm(form, customSplits) {
  if (!form.name.trim()) return 'Expense name is required';
  if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) return 'Enter a valid amount';
  if (!form.paid_by) return 'Select who paid';
  if (form.split_type === 'custom') {
    const included = Object.keys(customSplits);
    if (included.length === 0) return 'Include at least one member in the split';
    const total = Object.values(customSplits).reduce((sum, v) => sum + Number(v || 0), 0);
    const diff = Math.abs(total - Number(form.amount));
    if (diff > SPLIT_TOLERANCE)
      return `Split total ₱${total.toFixed(2)} must equal ₱${Number(form.amount).toFixed(2)}`;
  }
  return null;
}

//  Main Component

export default function BillDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  //  Bill & member
  const [bill, setBill] = useState(null);
  const [profile, setProfile] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);

  //  UI
  const [activeTab, setActiveTab] = useState("expenses");
  const [archiving, setArchiving] = useState(false);
  const [, setGuestSession] = useState(null);

  //  Inline bill
  const [editingBillName, setEditingBillName] = useState(false);
  const [billNameInput, setBillNameInput] = useState("");
  const [savingBillName, setSavingBillName] = useState(false);

  // Add member modal
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberType, setMemberType] = useState("registered");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [guestForm, setGuestForm] = useState(GUEST_FORM_DEFAULT);

  //  Add expense modal
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState(EXPENSE_FORM_DEFAULT);
  const [customSplits, setCustomSplits] = useState({});
  const [addingExpense, setAddingExpense] = useState(false);

  //  Expense view/edit modal
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseModalMode, setExpenseModalMode] = useState("view"); // 'view' | 'edit'
  const [editExpenseForm, setEditExpenseForm] = useState(EXPENSE_FORM_DEFAULT);
  const [editCustomSplits, setEditCustomSplits] = useState({});
  const [expenseSplits, setExpenseSplits] = useState([]);
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState(false);

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removingMember, setRemovingMember] = useState(false);

  // Limits
  const { canAddMember, memberLimit } = useLimits(user?.id, members.length);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  //  Guest session check
  useEffect(() => {
    const stored = localStorage.getItem("guest_session");
    if (stored) {
      const session = JSON.parse(stored);
      if (session.expiry > Date.now()) {
        setGuestSession(session);
      } else {
        localStorage.removeItem("guest_session");
        navigate("/join");
      }
    } else if (!user) {
      navigate("/login");
    }
  }, [navigate, user]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, account_type")
        .eq("id", user.id)
        .single();
      if (!error) setProfile(data);
    };
    fetchProfile();
  }, [user?.id]);

  //  Fetch bill data

  const fetchBillData = useCallback(async () => {
    const { data: billData, error: billError } = await supabase
      .from("bills")
      .select("*")
      .eq("id", id)
      .single();

    if (billError) {
      console.error("[fetchBillData] bill error:", billError);
      toast.error("Bill not found");
      navigate("/dashboard");
      return;
    }

    const { data: memberData, error: memberError } = await supabase
      .from("bill_members")
      .select(
        `id, role, member_type, user_id, guest_id,
                profiles:user_id (first_name, last_name, email, username),
                guests:guest_id (first_name, last_name, email)`,
      )
      .eq("bill_id", id);

    if (memberError)
      console.error("[fetchBillData] member error:", memberError);

    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .select("*, expense_splits(*)")
      .eq("bill_id", id)
      .order("created_at", { ascending: false });

    if (expenseError)
      console.error("[fetchBillData] expense error:", expenseError);

    setBill(billData);
    setIsHost(billData.host_id === user?.id);
    setMembers(memberData || []);
    setExpenses(expenseData || []);
    setLoading(false);
  }, [id, user, navigate]);

  useEffect(() => {
    fetchBillData();
  }, [fetchBillData]);

  //  Member search

  useEffect(() => {
    if (memberType !== "registered" || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, username")
        .ilike("username", `%${searchQuery}%`)
        .neq("id", user.id)
        .limit(5);

      if (error) console.error("[memberSearch] error:", error);

      const existingIds = members
        .filter((m) => m.member_type === "registered")
        .map((m) => m.user_id);
      setSearchResults((data || []).filter((u) => !existingIds.includes(u.id)));
      setSearching(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery, memberType, members, user]);

  //  Derived values

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const categoryStats = useMemo(() => {
    if (totalExpenses === 0) return [];
    
    const sums = {};
    expenses.forEach(e => {
        const cat = e.category || 'other';
        sums[cat] = (sums[cat] || 0) + Number(e.amount);
    });

    const stats = Object.entries(sums).map(([cat, amount]) => {
        return {
            id: cat,
            ...CATEGORIES[cat],
            amount,
            percentage: (amount / totalExpenses) * 100
        };
    }).sort((a, b) => b.amount - a.amount);

    return stats;
  }, [expenses, totalExpenses]);

  const balances = useMemo(() => calculateBalances(members, expenses), [members, expenses]);
  const settlements = useMemo(() => calculateSettlements(balances), [balances]);

  const getMemberName = (member) => {
    if (!member) return "Unknown";
    return member.member_type === "guest"
      ? `${member.guests?.first_name} ${member.guests?.last_name}`
      : `${member.profiles?.first_name} ${member.profiles?.last_name}`;
  };

  const getPayerName = (paidById) => {
    const member = members.find(
      (m) => m.user_id === paidById || m.guest_id === paidById,
    );
    return getMemberName(member);
  };

  const isStandardAccount =
    (profile?.account_type || "standard") === "standard";
  const hasReachedStandardMemberLimit =
    isHost && isStandardAccount && members.length >= MAX_STANDARD_MEMBERS;
  const memberAddLocked = isHost && bill?.status !== "archived" && !canAddMember;

  //  Handlers

  const handleAddRegistered = async (profile) => {
    setAddingMember(true);
    const { error } = await supabase.from("bill_members").insert({
      bill_id: id,
      user_id: profile.id,
      role: "member",
      member_type: "registered",
    });
    if (error) {
      console.error("[handleAddRegistered]", error);
      toast.error(error.message);
    } else {
      toast.success(`${profile.first_name} added`);
      setSearchQuery("");
      setSearchResults([]);
      fetchBillData();
    }
    setAddingMember(false);
  };

  const handleAddGuest = async () => {
    const { firstName, lastName, email } = guestForm;
    if (!firstName.trim() || !lastName.trim() || !email.trim())
      return toast.error("All fields are required");
    if (!EMAIL_REGEX.test(email)) return toast.error("Invalid email");

    setAddingMember(true);
    try {
      const identity = await resolveBillMemberIdentityByEmail({
        billId: id,
        email,
      });

      if (identity.kind === "profile") {
        const message = identity.isAlreadyMember
          ? "This registered user is already in the bill."
          : "This email belongs to a registered account. Add them as a registered user instead of a guest.";
        toast.error(message);
        return;
      }

      if (identity.existingMember) {
        toast.error("This guest is already in the bill.");
        return;
      }

      let guestId = identity.guest?.id;

      if (!guestId) {
        const { data: newGuest, error: guestError } = await supabase
          .from("guests")
          .insert({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: identity.normalizedEmail,
            invited_by: user.id,
          })
          .select()
          .single();
        if (guestError) throw guestError;
        guestId = newGuest.id;
      }

      const { error: memberError } = await supabase
        .from("bill_members")
        .insert({
          bill_id: id,
          guest_id: guestId,
          role: "member",
          member_type: "guest",
        });
      if (memberError) throw memberError;

      toast.success("Guest added");
      setGuestForm(GUEST_FORM_DEFAULT);
      setShowAddMember(false);
      fetchBillData();
    } catch (err) {
      console.error("[handleAddGuest]", err);
      toast.error(err.message);
    } finally {
      setAddingMember(false);
    }
  };

  const confirmRemoveMember = (member) => {
    setMemberToRemove(member);
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setRemovingMember(true);
    const memberKey = memberToRemove.user_id || memberToRemove.guest_id;
    if (!memberKey) {
      toast.error("Unable to remove this member");
      setRemovingMember(false);
      return;
    }

    const { data: paidExpenses, error: paidError } = await supabase
      .from("expenses")
      .select("id")
      .eq("bill_id", id)
      .eq("paid_by", memberKey)
      .limit(1);
    if (paidError) {
      console.error("[handleRemoveMember] paid check error:", paidError);
      toast.error("Failed to verify member expenses");
      setRemovingMember(false);
      return;
    }

    const { data: splitExpenses, error: splitError } = await supabase
      .from("expense_splits")
      .select("id, expenses!inner(bill_id)")
      .eq("user_id", memberKey)
      .eq("expenses.bill_id", id)
      .limit(1);
    if (splitError) {
      console.error("[handleRemoveMember] split check error:", splitError);
      toast.error("Failed to verify member expenses");
      setRemovingMember(false);
      return;
    }

    if ((paidExpenses || []).length > 0 || (splitExpenses || []).length > 0) {
      toast.error("Cannot remove a member with existing expenses");
      setRemovingMember(false);
      return;
    }

    const { error } = await supabase
      .from("bill_members")
      .delete()
      .eq("id", memberToRemove.id);
    if (error) {
      console.error("[handleRemoveMember]", error);
      toast.error("Failed to remove");
      setRemovingMember(false);
      return;
    }
    toast.success("Member removed");
    setMemberToRemove(null);
    setRemovingMember(false);
    fetchBillData();
  };

  const confirmArchiveBill = () => {
    setShowArchiveConfirm(true);
  };

  const handleArchiveBill = async () => {
    setArchiving(true);
    const { error } = await supabase
      .from("bills")
      .update({ status: "archived" })
      .eq("id", id);
    if (error) {
      console.error("[handleArchiveBill]", error);
      toast.error("Failed to archive");
      setArchiving(false);
    } else {
      toast.success("Bill archived");
      setShowArchiveConfirm(false);
      setTimeout(() => navigate("/dashboard"), 1000);
    }
  };

  const handleSaveBillName = async () => {
    if (!billNameInput.trim()) return toast.error("Bill name is required");
    setSavingBillName(true);
    const { error } = await supabase
      .from("bills")
      .update({ name: billNameInput.trim() })
      .eq("id", id);
    if (error) {
      console.error("[handleSaveBillName]", error);
      toast.error("Failed to rename bill");
    } else {
      setBill((prev) => ({ ...prev, name: billNameInput.trim() }));
      setEditingBillName(false);
      toast.success("Bill renamed");
    }
    setSavingBillName(false);
  };

  //  Shared split insert helper
  const insertSplits = async (expenseId, form, splits) => {
    if (form.split_type === "equal") {
      const keys = members.map((m) => m.user_id || m.guest_id);
      const distributed = distributeEqually(form.amount, keys);

      const rows = members.map((m) => {
        const key = m.user_id || m.guest_id;
        return {
          expense_id: expenseId,
          user_id: key,
          amount: Number(distributed[key]),
        };
      });
      return supabase.from("expense_splits").insert(rows);
    } else {
      const rows = Object.entries(splits).map(([userId, amt]) => ({
        expense_id: expenseId,
        user_id: userId,
        amount: Number(amt),
      }));
      return supabase.from("expense_splits").insert(rows);
    }
  };

  const handleAddExpense = async () => {
    const validationError = validateExpenseForm(
      expenseForm,
      customSplits,
      members.length,
    );
    if (validationError) return toast.error(validationError);

    setAddingExpense(true);
    try {
      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          bill_id: id,
          name: expenseForm.name.trim(),
          amount: Number(expenseForm.amount),
          paid_by: expenseForm.paid_by,
          split_type: expenseForm.split_type,
          category: expenseForm.category,
          expense_date: expenseForm.expense_date,
          notes: expenseForm.notes.trim()
        })
        .select()
        .single();
      if (expenseError) throw expenseError;

      const { error: splitError } = await insertSplits(
        expense.id,
        expenseForm,
        customSplits,
      );
      if (splitError) throw splitError;

      toast.success("Expense added");
      setShowAddExpense(false);
      setExpenseForm(EXPENSE_FORM_DEFAULT);
      setCustomSplits({});
      fetchBillData();
    } catch (err) {
      console.error("[handleAddExpense]", err);
      toast.error(err.message || "Failed to add expense");
    } finally {
      setAddingExpense(false);
    }
  };

  const handleOpenExpense = async (expense) => {
    setSelectedExpense(expense);
    setExpenseModalMode('view');
    setEditExpenseForm({
      name: expense.name,
      amount: String(expense.amount),
      paid_by: expense.paid_by,
      split_type: expense.split_type,
      category: expense.category || "other",
      expense_date: expense.expense_date || new Date(expense.created_at).toISOString().split('T')[0],
      notes: expense.notes || "",
    });

    const { data: splits, error } = await supabase
      .from('expense_splits').select('*').eq('expense_id', expense.id);
    if (error) console.error('[handleOpenExpense] splits error:', error);

    setExpenseSplits(splits || []);

    // Always pre-fill editCustomSplits from DB so edit mode has data ready
    if (splits?.length > 0) {
      const filled = {};
      splits.forEach(s => { filled[s.user_id] = String(s.amount); });
      setEditCustomSplits(filled);
    } else {
      setEditCustomSplits({});
    }
  };
  const handleSaveExpense = async () => {
    const validationError = validateExpenseForm(
      editExpenseForm,
      editCustomSplits,
      members.length,
    );
    if (validationError) return toast.error(validationError);

    setSavingExpense(true);
    try {
      const { error: updateError } = await supabase
        .from("expenses")
        .update({
          name: editExpenseForm.name.trim(),
          amount: Number(editExpenseForm.amount),
          paid_by: editExpenseForm.paid_by,
          split_type: editExpenseForm.split_type,
          category: editExpenseForm.category,
          expense_date: editExpenseForm.expense_date,
          notes: editExpenseForm.notes.trim()
        })
        .eq("id", selectedExpense.id);
      if (updateError) throw updateError;

      const { error: deleteError } = await supabase
        .from("expense_splits")
        .delete()
        .eq("expense_id", selectedExpense.id);
      if (deleteError) throw deleteError;

      const { error: splitError } = await insertSplits(
        selectedExpense.id,
        editExpenseForm,
        editCustomSplits,
      );
      if (splitError) throw splitError;

      toast.success("Expense updated");
      setSelectedExpense(null);
      fetchBillData();
    } catch (err) {
      console.error("[handleSaveExpense]", err);
      toast.error(err.message || "Failed to update expense");
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;
    setDeletingExpense(true);
    try {
      // Delete splits first (foreign key constraint)
      const { error: splitDeleteError } = await supabase
        .from("expense_splits")
        .delete()
        .eq("expense_id", selectedExpense.id);
      if (splitDeleteError) throw splitDeleteError;

      // Delete the expense itself
      const { error: expenseDeleteError } = await supabase
        .from("expenses")
        .delete()
        .eq("id", selectedExpense.id);
      if (expenseDeleteError) throw expenseDeleteError;

      toast.success("Expense deleted");
      setSelectedExpense(null);
      setExpenseModalMode("view");
      fetchBillData();
    } catch (err) {
      console.error("[handleDeleteExpense]", err);
      toast.error("Failed to delete expense");
    } finally {
      setDeletingExpense(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(bill.code);
    toast.success("Copied!");
  };

  const closeAddMember = () => {
    setShowAddMember(false);
    setSearchQuery("");
    setSearchResults([]);
    setGuestForm(GUEST_FORM_DEFAULT);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return <Spinner />;

  const isArchived = bill.status === "archived";
  const averagePerMember =
    members.length > 0 ? totalExpenses / members.length : 0;
  const averagePerExpense =
    expenses.length > 0 ? totalExpenses / expenses.length : 0;

  const MEMBER_TYPE_OPTIONS = [
    { value: "registered", label: "Registered User" },
    { value: "guest", label: "Guest" },
  ];

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
        left={
          <div className="flex items-center gap-4 min-w-0">
            <BrandLogo to="/dashboard" />
            <span className="hidden sm:block w-px h-8 bg-slate-800/80" />
            {/* Bill Info */}
            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                <span>Workspace</span>
                <ChevronRight className="w-3 h-3 text-slate-700" />
                <span className="text-emerald-500/80">Bill {String(id).slice(0, 4)}</span>
              </div>
              
              {/* Bill name — seamless inline edit */}
              {editingBillName ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <input
                    type="text"
                    value={billNameInput}
                    onChange={(e) => setBillNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveBillName();
                      if (e.key === "Escape") setEditingBillName(false);
                    }}
                    autoFocus
                    className="bg-slate-900/80 border border-emerald-500/50 rounded-xl px-3 py-1.5 text-lg font-bold text-white tracking-tight focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-64 shadow-inner"
                  />
                  <button
                    onClick={handleSaveBillName}
                    disabled={savingBillName}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black transition shadow-sm disabled:opacity-50"
                  >
                    {savingBillName ? <Spinner className="w-3 h-3 border-black" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setEditingBillName(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-800 hover:bg-slate-800/50 text-slate-400 hover:text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div 
                  className={`flex items-center gap-2 min-w-0 group mt-0.5 ${isHost && !isArchived ? "cursor-pointer" : ""}`}
                  onClick={() => {
                    if (isHost && !isArchived) {
                      setBillNameInput(bill.name);
                      setEditingBillName(true);
                    }
                  }}
                >
                  <h1 className="text-lg font-black text-white tracking-tight truncate transition-colors group-hover:text-emerald-50">
                    {bill.name}
                  </h1>
                  {isHost && !isArchived && (
                    <span className="w-5 h-5 flex items-center justify-center rounded-md bg-transparent text-slate-500 transition-all opacity-0 group-hover:opacity-100 group-hover:bg-slate-800/80 group-hover:text-emerald-400 flex-shrink-0">
                      <Pencil className="w-3 h-3" />
                    </span>
                  )}
                </div>
              )}
              
              {!editingBillName && (
                <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium">
                  <div className="flex items-center gap-1">
                    <UserCircle className="w-3 h-3 text-slate-600" />
                    <span>{members.length} Member{members.length !== 1 ? "s" : ""}</span>
                  </div>
                  <span className="w-1 h-1 rounded-full bg-slate-700" />
                  <span className="font-mono text-[10px] text-slate-600">ID: {String(id).slice(0, 8)}</span>
                </div>
              )}
            </div>
          </div>
        }
        right={
          <div className="flex flex-wrap items-center gap-3">
            {isHost && !isArchived && (
              <button
                onClick={confirmArchiveBill}
                disabled={archiving}
                className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-400 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-400 text-sm font-semibold transition-all shadow-sm disabled:opacity-40"
              >
                <Archive className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                {archiving ? "..." : "Archive"}
              </button>
            )}
            
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm ${isArchived ? "bg-slate-900/80 border-slate-800 text-slate-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"} text-xs font-bold uppercase tracking-widest`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isArchived ? "bg-slate-600" : "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"}`} />
              {bill.status}
            </div>
          </div>
        }
      />
      {/* Page content */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Hero summary card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[34px] border border-slate-800/80 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_40%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(10,14,31,0.98))] p-8 shadow-2xl shadow-black/40 backdrop-blur-2xl"
        >
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-emerald-500/10 text-emerald-400 shadow-inner">
                <Receipt className="h-8 w-8" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">
                  Total Managed Expenses
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-black tracking-tight text-white">
                    ₱{totalExpenses.toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    inside {expenses.length} record{expenses.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
               <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 py-3 backdrop-blur-sm">
                 <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
                      Invite Code
                    </p>
                    <p className="mt-1 font-mono text-base font-black tracking-[0.2em] text-white">
                      {bill.code}
                    </p>
                 </div>
                 <button
                    onClick={copyCode}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 shadow-lg transition-all hover:bg-emerald-500 hover:text-emerald-950 focus:ring-2 focus:ring-emerald-500/50"
                    title="Copy code"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
               </div>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Main column */}
          <div className="space-y-4">
            <div className="flex flex-col gap-5 rounded-[28px] border border-slate-800/80 bg-slate-900/40 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">
                  Workspace
                </p>
                <p className="mt-1 text-sm font-medium text-slate-300">
                  Control all expenses and participants
                </p>
              </div>
              <div className="flex items-center gap-1 auto-cols-max rounded-2xl bg-slate-950/60 border border-slate-800/60 p-1.5 shadow-inner">
                {["expenses", "members", "balances"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2.5 rounded-[14px] text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab
                      ? "bg-slate-800 text-emerald-400 shadow-[0_0_15px_rgba(0,0,0,0.3)] border border-slate-700/50"
                      : "text-slate-500 hover:text-white hover:bg-slate-800/30"
                      }`}
                  >
                    {tab === "expenses"
                      ? `Expenses (${expenses.length})`
                      : tab === "members"
                        ? `Members (${members.length})`
                        : "Balances"}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {/* Expenses tab */}
              {activeTab === "expenses" && (
                <motion.div
                  key="expenses"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  {isHost && !isArchived && (
                    <DashedAddButton
                      onClick={() => {
                        setExpenseForm({
                          ...EXPENSE_FORM_DEFAULT,
                          paid_by: user?.id || "",
                        });
                        setCustomSplits({});
                        setShowAddExpense(true);
                      }}
                      icon={Plus}
                      label="Add Expense"
                    />
                  )}

                  {expenses.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-800/70 bg-slate-950/40 py-16 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3">
                        <Receipt className="w-5 h-5 text-slate-600" />
                      </div>
                      <p className="text-slate-500 text-sm">No expenses yet</p>
                      <p className="text-slate-600 text-xs mt-1">
                        Add one to get started
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {expenses.map((expense, i) => (
                        <motion.div
                          key={expense.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => handleOpenExpense(expense)}
                          className="group flex items-center gap-4 rounded-[26px] border border-slate-800/80 bg-slate-900/40 p-5 outline-none transition-all duration-300 hover:border-emerald-500/40 hover:bg-slate-900/80 hover:shadow-[0_0_20px_rgba(16,185,129,0.05)] cursor-pointer"
                        >
                          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-950 border border-slate-800 text-2xl group-hover:border-emerald-500/30 transition-colors" title={CATEGORIES[expense.category || 'other']?.label}>
                            {CATEGORIES[expense.category || 'other']?.icon}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base font-bold text-white group-hover:text-emerald-50 transition-colors truncate">
                              {expense.name}
                            </h4>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold uppercase tracking-wider">
                                <span className="flex items-center gap-1.5 text-slate-400">
                                   <Clock className="w-3.5 h-3.5" />
                                   {expense.expense_date ? new Date(expense.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : new Date(expense.created_at).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-500">
                                   <User className="w-3.5 h-3.5" />
                                   {getPayerName(expense.paid_by)}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full ${expense.split_type === "equal" ? "bg-cyan-500/10 text-cyan-400" : "bg-purple-500/10 text-purple-400"}`}>
                                   {expense.split_type === "equal" ? "Equal" : "Custom"}
                                </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0 pl-2">
                            <div className="text-right">
                               <p className="text-lg font-black tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                                 ₱{Number(expense.amount).toFixed(2)}
                               </p>
                            </div>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/50 text-slate-600 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-all">
                               <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Members tab */}
              {activeTab === "members" && (
                <motion.div
                  key="members"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  {isHost && !isArchived && (
                    <DashedAddButton
                      onClick={() => {
                        if (!canAddMember) return;
                        setShowAddMember(true);
                      }}
                      icon={UserPlus}
                      label={`Add Member${!canAddMember ? ` (${memberLimit}/${memberLimit})` : ""}`}
                      disabled={!canAddMember}
                      title={!canAddMember ? "Member limit reached" : "Add a member"}
                    />
                  )}
                  {memberAddLocked && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/30 px-4 py-3">
                      <p className="text-xs text-slate-400">
                        Member limit reached for this plan.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowUpgradeModal(true)}
                        className="text-xs font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition"
                      >
                        Upgrade
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    {members.map((member, i) => {
                      const name = getMemberName(member);
                      const email =
                        member.member_type === "guest"
                          ? member.guests?.email
                          : member.profiles?.email;
                      const initials = name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);

                      return (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 transition hover:border-slate-700"
                        >
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {email}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${member.role === "host"
                                ? "bg-emerald-950 text-emerald-400"
                                : member.member_type === "guest"
                                  ? "bg-slate-800 text-slate-400"
                                  : "bg-teal-950 text-teal-400"
                                }`}
                            >
                              {member.role === "host"
                                ? "host"
                                : member.member_type === "guest"
                                  ? "guest"
                                  : "member"}
                            </span>
                            {isHost && member.role !== "host" && !isArchived && (
                              <button
                                onClick={() => confirmRemoveMember(member)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-950 text-slate-600 hover:text-red-400 transition"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Balances tab */}
              {activeTab === "balances" && (
                <motion.div
                  key="balances"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {/* Summary of member balances */}
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3">Net Balances</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {balances.map(b => (
                        <div key={b.key} className="flex items-center justify-between p-4 rounded-2xl border border-slate-800/80 bg-slate-900/50">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                              <UserCircle className="w-5 h-5 text-slate-400" />
                            </div>
                            <p className="text-sm font-medium text-white truncate max-w-[120px]">
                              {getMemberName(b.member)}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {b.net > 0.01 ? (
                              <p className="text-sm font-bold text-emerald-400">+₱{Math.abs(b.net).toFixed(2)}</p>
                            ) : b.net < -0.01 ? (
                              <p className="text-sm font-bold text-rose-400">-₱{Math.abs(b.net).toFixed(2)}</p>
                            ) : (
                              <p className="text-sm font-bold text-slate-500">Settled</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Settlement Transactions */}
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3">How to Settle Up</h3>
                    {settlements.length === 0 ? (
                      <div className="rounded-2xl border border-slate-800 border-dashed bg-slate-900/30 p-8 text-center text-slate-500 text-sm">
                        All balances are settled!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {settlements.map((s, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/20">
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="text-sm font-medium text-slate-300">{getMemberName(s.from)}</p>
                              <ArrowRight className="w-4 h-4 text-emerald-500/60 hidden sm:block" />
                              <span className="text-xs uppercase tracking-wider text-emerald-500/80 sm:hidden">pays</span>
                              <p className="text-sm font-medium text-emerald-300">{getMemberName(s.to)}</p>
                            </div>
                            <p className="mt-2 sm:mt-0 text-base font-bold text-white">
                              ₱{s.amount.toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Side column */}
          <div className="space-y-4">
            <div className="rounded-[28px] border border-slate-800/80 bg-slate-950/40 p-6 shadow-lg shadow-black/20">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">
                Bill Stats
              </p>
              <div className="mt-6 space-y-4">
                {[
                  { icon: Users, label: "Members", value: members.length, color: "text-blue-400" },
                  { icon: Receipt, label: "Total Records", value: expenses.length, color: "text-emerald-400" },
                  { icon: Wallet, label: "Avg / Member", value: `₱${averagePerMember.toFixed(2)}`, color: "text-amber-400" },
                  { icon: Target, label: "Avg / Record", value: `₱${averagePerExpense.toFixed(2)}`, color: "text-cyan-400" },
                ].map((stat, i) => (
                   <div key={i} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                         <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/80 border border-slate-800 text-slate-500 group-hover:text-white transition-colors">
                            <stat.icon className="w-4 h-4" />
                         </div>
                         <span className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">{stat.label}</span>
                      </div>
                      <span className={`text-sm font-bold tracking-tight text-white`}>
                        {stat.value}
                      </span>
                   </div>
                ))}
                
                <div className="pt-2">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-900/60 border border-slate-800/60 p-3.5 mt-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Status</span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${isArchived
                        ? "bg-slate-800 text-slate-400 border border-slate-700/50"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                    >
                      {isArchived ? "Archived" : "Active"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Analytics */}
            {expenses.length > 0 && categoryStats.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-6 font-semibold">
                  Spending by Category
                </p>
                
                <div className="flex items-center justify-center mb-8 mt-2">
                  <div className="relative w-44 h-44 drop-shadow-2xl">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90 overflow-visible">
                      <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#1e293b" strokeWidth="4.5" />
                      {(() => {
                          let offset = 0;
                          return categoryStats.map((stat, i) => {
                              // Ensure tiny gaps unless it strictly covers 100%
                              const dashArrayLength = categoryStats.length > 1 ? Math.max(0, stat.percentage - 2) : stat.percentage;
                              const dashArray = `${dashArrayLength} ${100 - dashArrayLength}`;
                              const dashOffset = -offset;
                              offset += stat.percentage;
                              
                              return (
                                  <motion.circle
                                      key={stat.id}
                                      cx="18"
                                      cy="18"
                                      r="15.91549430918954"
                                      fill="transparent"
                                      stroke={stat.color}
                                      strokeWidth="4.5"
                                      strokeLinecap="round"
                                      initial={{ strokeDasharray: `0 100`, strokeDashoffset: dashOffset }}
                                      animate={{ strokeDasharray: dashArray, strokeDashoffset: dashOffset }}
                                      transition={{ duration: 1.2, delay: i * 0.15, ease: "easeOut" }}
                                  />
                              );
                          });
                      })()}
                    </svg>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-0.5">Total</span>
                      <span className="text-base font-bold text-white tracking-tight">₱{totalExpenses.toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-3.5 pt-2">
                  {categoryStats.map((stat) => (
                      <div key={stat.id} className="flex items-center justify-between text-sm group">
                          <div className="flex items-center gap-3">
                              <span className="w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-slate-900/50" style={{ backgroundColor: stat.color }} />
                              <span className="text-slate-300 font-medium group-hover:text-white transition">
                                {stat.icon} {stat.label}
                              </span>
                          </div>
                          <div className="flex items-center gap-3">
                              <span className="font-semibold text-white">₱{stat.amount.toFixed(0)}</span>
                              <span className="text-[11px] font-bold text-slate-500 w-8 text-right bg-slate-800/50 px-1 py-0.5 rounded-md">
                                {stat.percentage.toFixed(0)}%
                              </span>
                          </div>
                      </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
      {/* ── Add Member Modal ── */}
      <AnimatePresence>
        {showAddMember && (
          <ModalShell onClose={closeAddMember}>
            <ModalHeader title="Add Member" onClose={closeAddMember} />

            <div className="mb-5">
              <SegmentedControl
                options={MEMBER_TYPE_OPTIONS}
                value={memberType}
                onChange={setMemberType}
              />
            </div>

            {memberType === "registered" && (
              <div className="space-y-3">
                {memberAddLocked && (
                  <p className="text-xs text-amber-400 text-center py-2">
                    Member limit reached for this plan.
                  </p>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={memberAddLocked}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 text-sm"
                  />
                </div>
                {searching && (
                  <p className="text-xs text-slate-500 text-center py-2">
                    Searching...
                  </p>
                )}
                {searchResults.length > 0 && (
                  <div className="space-y-1.5">
                    {searchResults.map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => handleAddRegistered(profile)}
                        disabled={addingMember || memberAddLocked}
                        className="flex items-center justify-between w-full p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">
                            {profile.first_name} {profile.last_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            @{profile.username}
                          </p>
                        </div>
                        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-950 text-emerald-400 transition">
                          <UserPlus className="w-4 h-4" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.length >= 2 &&
                  !searching &&
                  searchResults.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4">
                      No users found
                    </p>
                  )}
              </div>
            )}

            {memberType === "guest" && (
              <div className="space-y-3">
                {memberAddLocked && (
                  <p className="text-xs text-amber-400 text-center py-2">
                    Member limit reached for this plan.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  <TextInput
                    placeholder="First Name"
                    value={guestForm.firstName}
                    onChange={(e) =>
                      setGuestForm({ ...guestForm, firstName: e.target.value })
                    }
                    disabled={memberAddLocked}
                  />
                  <TextInput
                    placeholder="Last Name"
                    value={guestForm.lastName}
                    onChange={(e) =>
                      setGuestForm({ ...guestForm, lastName: e.target.value })
                    }
                    disabled={memberAddLocked}
                  />
                </div>
                <TextInput
                  type="email"
                  placeholder="Email address"
                  value={guestForm.email}
                  onChange={(e) =>
                    setGuestForm({ ...guestForm, email: e.target.value })
                  }
                  disabled={memberAddLocked}
                />
                <button
                  onClick={handleAddGuest}
                  disabled={addingMember || memberAddLocked}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-semibold text-sm transition disabled:opacity-50"
                >
                  {addingMember ? "Adding..." : "Add Guest"}
                </button>
              </div>
            )}
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ── Add Expense Modal ── */}
      <AnimatePresence>
        {showAddExpense && (
          <ModalShell onClose={() => setShowAddExpense(false)}>
            <ModalHeader
              title="Add Expense"
              onClose={() => setShowAddExpense(false)}
            />
            <ExpenseFormFields
              form={expenseForm}
              onChange={setExpenseForm}
              members={members}
              customSplits={customSplits}
              onCustomSplitsChange={setCustomSplits}
            />
            <button
              onClick={handleAddExpense}
              disabled={addingExpense}
              className="w-full mt-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-semibold text-sm transition disabled:opacity-50"
            >
              {addingExpense ? "Adding..." : "Add Expense"}
            </button>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ── Expense View / Edit Modal ── */}
      <AnimatePresence>
        {selectedExpense && (
          <ModalShell
            onClose={() => {
              setSelectedExpense(null);
              setExpenseModalMode("view");
            }}
          >
            <ModalHeader
              title={
                expenseModalMode === "delete"
                  ? "Delete Expense"
                  : expenseModalMode === "edit"
                    ? "Edit Expense"
                    : "Expense Details"
              }
              onClose={() => {
                setSelectedExpense(null);
                setExpenseModalMode("view");
              }}
            >
              {expenseModalMode === "view" && isHost && !isArchived && (
                <>
                  <button
                    onClick={() => setExpenseModalMode('edit')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-emerald-500/50 text-slate-400 hover:text-emerald-400 text-xs font-medium transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => setExpenseModalMode('delete')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 text-xs font-medium transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              {expenseModalMode === "edit" && (
                <button
                  onClick={() => setExpenseModalMode("view")}
                  className="text-xs text-slate-500 hover:text-slate-300 transition px-2"
                >
                  Cancel
                </button>
              )}
            </ModalHeader>

            {/* View mode */}
            {expenseModalMode === "view" && (
              <div className="space-y-4">
                <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg" title={CATEGORIES[selectedExpense.category || 'other']?.label}>
                          {CATEGORIES[selectedExpense.category || 'other']?.icon}
                        </span>
                        <p className="font-semibold text-white">
                          {selectedExpense.name}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {selectedExpense.expense_date ? new Date(selectedExpense.expense_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : new Date(selectedExpense.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Paid by {getPayerName(selectedExpense.paid_by)} •{" "}
                        {selectedExpense.split_type === "equal"
                          ? "Split equally"
                          : "Custom split"}
                      </p>
                    </div>
                    <span className="text-xl font-bold text-emerald-400">
                      ₱{Number(selectedExpense.amount).toFixed(2)}
                    </span>
                  </div>
                  {selectedExpense.notes && (
                    <div className="mt-4 pt-3 border-t border-slate-700/40 text-sm text-slate-300">
                      <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Notes</p>
                      {selectedExpense.notes}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-2">Split breakdown</p>
                  <div className="space-y-2">
                    {expenseSplits.length === 0 ? (
                      <p className="text-xs text-slate-600 text-center py-3">
                        No split data
                      </p>
                    ) : (
                      expenseSplits.map((split, i) => {
                        const memberName = getPayerName(split.user_id);
                        const percentage = Math.round(
                          (split.amount / selectedExpense.amount) * 100,
                        );
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                              {memberName?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-slate-300">
                                  {memberName}
                                </span>
                                <span className="text-xs font-semibold text-white">
                                  ₱{Number(split.amount).toFixed(2)}
                                </span>
                              </div>
                              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Edit mode */}
            {expenseModalMode === "edit" && (
              <>
                <ExpenseFormFields
                  form={editExpenseForm}
                  onChange={setEditExpenseForm}
                  members={members}
                  customSplits={editCustomSplits}
                  onCustomSplitsChange={setEditCustomSplits}
                />
                <button
                  onClick={handleSaveExpense}
                  disabled={savingExpense}
                  className="w-full mt-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-semibold text-sm transition disabled:opacity-50"
                >
                  {savingExpense ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}

            {/* Delete confirmation mode */}
            {expenseModalMode === "delete" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-rose-950/30 border border-rose-500/20 p-5 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-rose-950 border border-rose-500/30 flex items-center justify-center mx-auto mb-3">
                    <Trash2 className="w-5 h-5 text-rose-400" />
                  </div>
                  <p className="text-sm font-semibold text-white">Are you sure?</p>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    <span className="text-white font-medium">{selectedExpense?.name}</span>
                    {" — "}
                    <span className="text-rose-300 font-semibold">₱{Number(selectedExpense?.amount).toFixed(2)}</span>
                    <br />This will permanently remove this expense and all its splits.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setExpenseModalMode("view")}
                    className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteExpense}
                    disabled={deletingExpense}
                    className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deletingExpense ? "Deleting..." : "Yes, Delete"}
                  </button>
                </div>
              </div>
            )}
          </ModalShell>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {memberToRemove && (
          <ModalShell onClose={() => setMemberToRemove(null)}>
            <div className="rounded-xl bg-rose-950/30 border border-rose-500/20 p-5 text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-950 border border-rose-500/30 flex items-center justify-center mx-auto mb-3">
                <UserMinus className="w-5 h-5 text-rose-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Remove Member?</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Are you sure you want to remove <span className="text-white font-medium">{getMemberName(memberToRemove)}</span> from this bill?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setMemberToRemove(null)}
                disabled={removingMember}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveMember}
                disabled={removingMember}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {removingMember ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showArchiveConfirm && (
          <ModalShell onClose={() => setShowArchiveConfirm(false)}>
            <div className="rounded-xl bg-amber-950/30 border border-amber-500/20 p-5 text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-950 border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
                <Archive className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Archive Bill?</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Mark this bill as done and archive it? <br />
                It will be hidden from the active workspace.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowArchiveConfirm(false)}
                disabled={archiving}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveBill}
                disabled={archiving}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {archiving ? "Archiving..." : "Yes, Archive"}
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType="members"
        current={members.length}
        limit={memberLimit}
      />
    </div>
  );
}

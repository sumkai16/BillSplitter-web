import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageNavbar, { BrandLogo, NavbarButton } from "../components/PageNavbar";
import UpgradeModal from "../components/UpgradeModal";
import { useLimits } from "../hooks/useLimits";
import { resolveBillMemberIdentityByEmail } from "../lib/memberIdentity";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Receipt,
  Copy,
  UserPlus,
  X,
  Search,
  Check,
  UserCircle,
  Archive,
  ArrowLeft,
  ChevronRight,
  Plus,
  CreditCard,
  Pencil,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

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
          onClick={() => {
            if (opt.disabled) return;
            onChange(opt.value);
          }}
          disabled={opt.disabled}
          aria-disabled={opt.disabled}
          title={opt.disabled ? opt.disabledReason : undefined}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${value === opt.value
            ? "bg-slate-700 text-white"
            : "text-slate-500 hover:text-slate-300"
            } ${opt.disabled ? "cursor-not-allowed opacity-50 hover:text-slate-500" : ""}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function DashedAddButton({ onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/50 text-slate-500 hover:text-emerald-400 text-sm font-medium transition mb-3"
    >
      <Icon className="w-4 h-4" />
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
      const equal = Number((Number(expenseAmount) / includedKeys.length).toFixed(2));
      includedKeys.forEach(k => { newSplits[k] = String(equal); });
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
      <AmountInput
        value={form.amount}
        onChange={(e) => onChange({ ...form, amount: e.target.value })}
      />
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
      <SegmentedControl
        options={SPLIT_OPTIONS}
        value={form.split_type}
        onChange={val => {
          onChange({ ...form, split_type: val });
          if (val === 'custom' && Number(form.amount) > 0) {
            // Auto-fill equal amounts for all members
            const equal = Number((Number(form.amount) / members.length).toFixed(2));
            const filled = {};
            members.forEach(m => {
              const key = m.user_id || m.guest_id;
              filled[key] = String(equal);
            });
            onCustomSplitsChange(filled);
          }
          if (val === 'equal') {
            onCustomSplitsChange({});
          }
        }}
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
      .select("*")
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

  const handleRemoveMember = async (member) => {
    const memberKey = member.user_id || member.guest_id;
    if (!memberKey) {
      toast.error("Unable to remove this member");
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
      return;
    }

    if ((paidExpenses || []).length > 0 || (splitExpenses || []).length > 0) {
      toast.error("Cannot remove a member with existing expenses");
      return;
    }

    const { error } = await supabase
      .from("bill_members")
      .delete()
      .eq("id", member.id);
    if (error) {
      console.error("[handleRemoveMember]", error);
      return toast.error("Failed to remove");
    }
    toast.success("Member removed");
    fetchBillData();
  };

  const handleArchiveBill = async () => {
    if (!window.confirm("Mark this bill as done and archive it?")) return;
    setArchiving(true);
    const { error } = await supabase
      .from("bills")
      .update({ status: "archived" })
      .eq("id", id);
    if (error) {
      console.error("[handleArchiveBill]", error);
      toast.error("Failed to archive");
    } else {
      toast.success("Bill archived");
      setTimeout(() => navigate("/dashboard"), 1000);
    }
    setArchiving(false);
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
      const splitAmount = Number(
        (Number(form.amount) / members.length).toFixed(2),
      );
      const rows = members.map((m) => ({
        expense_id: expenseId,
        user_id: m.user_id || m.guest_id,
        amount: splitAmount,
      }));
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
      toast.error("Failed to add expense");
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
      toast.error("Failed to update expense");
    } finally {
      setSavingExpense(false);
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
    <div className="min-h-screen bg-black text-white">
      <Toaster position="top-center" toastOptions={TOAST_STYLE} />
      <PageNavbar
        sticky
        maxWidthClass="max-w-6xl"
        left={<BrandLogo to="/dashboard" />}
        right={
          <>
            <NavbarButton onClick={() => navigate("/dashboard")}>Dashboard</NavbarButton>
            {isHost && !isArchived && (
              <NavbarButton onClick={handleArchiveBill} disabled={archiving}>
                {archiving ? "Archiving..." : "Archive"}
              </NavbarButton>
            )}
          </>
        }
      />

      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-slate-900/70 bg-black/75 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/dashboard")}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-800/70 bg-slate-900/60 text-slate-400 hover:text-white hover:border-emerald-500/40 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Bill name — inline edit */}
            <div className="min-w-0">
              {editingBillName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={billNameInput}
                    onChange={(e) => setBillNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveBillName();
                      if (e.key === "Escape") setEditingBillName(false);
                    }}
                    autoFocus
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 w-48"
                  />
                  <button
                    onClick={handleSaveBillName}
                    disabled={savingBillName}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black transition disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingBillName(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-base font-semibold text-white truncate">
                    {bill.name}
                  </h1>
                  {isHost && !isArchived && (
                    <button
                      onClick={() => {
                        setBillNameInput(bill.name);
                        setEditingBillName(true);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-emerald-300 transition flex-shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <span>{members.length} member{members.length !== 1 ? "s" : ""}</span>
                <span className="h-1 w-1 rounded-full bg-slate-700" />
                <span>Bill ID: {String(id).slice(0, 8)}...</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isHost && !isArchived && (
              <button
                onClick={handleArchiveBill}
                disabled={archiving}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 text-slate-300 hover:border-amber-500/50 hover:text-amber-300 text-xs font-medium transition disabled:opacity-40"
              >
                <Archive className="w-4 h-4" />
                {archiving ? "Archiving..." : "Archive"}
              </button>
            )}
            <span
              className={`text-xs px-3 py-1 rounded-full font-semibold ${isArchived ? "bg-slate-800 text-slate-400" : "bg-emerald-950 text-emerald-400"}`}
            >
              {bill.status}
            </span>
          </div>
        </div>
      </div>
      {/* Page content */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Hero summary card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-xl shadow-black/30 backdrop-blur-xl"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                Total Expenses
              </p>
              <p className="mt-2 text-3xl font-semibold text-white tracking-tight">
                ₱{totalExpenses.toFixed(2)}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                across {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/60 px-4 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                  Invite Code
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-white tracking-[0.2em]">
                  {bill.code}
                </p>
              </div>
              <button
                onClick={copyCode}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800/70 bg-slate-900/60 text-slate-400 transition hover:text-emerald-300"
                title="Copy code"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Main column */}
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Bill Workspace
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Track expenses and manage members in one place.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-950/60 p-1">
                {["expenses", "members"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition capitalize ${activeTab === tab
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-300"
                      }`}
                  >
                    {tab === "expenses"
                      ? `Expenses (${expenses.length})`
                      : `Members (${members.length})`}
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
                          className="flex items-center gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 transition hover:border-emerald-500/30 hover:bg-slate-900/80 cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0">
                            <CreditCard className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {expense.name}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {getPayerName(expense.paid_by)} paid ·{" "}
                              {expense.split_type === "equal"
                                ? "split equally"
                                : "custom split"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-semibold text-emerald-400">
                              ₱{Number(expense.amount).toFixed(2)}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-600" />
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
                      onClick={() => setShowAddMember(true)}
                      icon={UserPlus}
                      label={`Add Member${!canAddMember ? ` (${memberLimit}/${memberLimit})` : ""}`}
                    />
                  )}
                  {hasReachedStandardMemberLimit && (
                    <p className="text-xs text-amber-400 mb-3">
                      Standard accounts can have up to {MAX_STANDARD_MEMBERS}{" "}
                      members per bill.
                    </p>
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
                                onClick={() => handleRemoveMember(member)}
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
            </AnimatePresence>
          </div>

          {/* Side column */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Bill Insights
              </p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Members</span>
                  <span className="font-semibold text-white">
                    {members.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Expenses</span>
                  <span className="font-semibold text-white">
                    {expenses.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Avg per member</span>
                  <span className="font-semibold text-white">
                    ₱{averagePerMember.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Avg per expense</span>
                  <span className="font-semibold text-white">
                    ₱{averagePerExpense.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status</span>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${isArchived
                      ? "bg-slate-800 text-slate-400"
                      : "bg-emerald-950 text-emerald-400"
                      }`}
                  >
                    {isArchived ? "Archived" : "Active"}
                  </span>
                </div>
              </div>
            </div>

            {/* <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Quick Actions
              </p>
              <div className="mt-4 space-y-2">
                {isHost && !isArchived && (
                  <button
                    onClick={() => {
                      setExpenseForm({
                        ...EXPENSE_FORM_DEFAULT,
                        paid_by: user?.id || "",
                      });
                      setCustomSplits({});
                      setShowAddExpense(true);
                    }}
                    className="w-full rounded-xl bg-emerald-500 text-black text-sm font-semibold py-2.5 hover:bg-emerald-400 transition"
                  >
                    + Add Expense
                  </button>
                )}
                {isHost && !isArchived && (
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="w-full rounded-xl border border-slate-800 text-slate-300 text-sm font-semibold py-2.5 hover:border-emerald-500/40 hover:text-emerald-300 transition"
                  >
                    + Add Member
                  </button>
                )}
                <button
                  onClick={copyCode}
                  className="w-full rounded-xl border border-slate-800 text-slate-300 text-sm font-semibold py-2.5 hover:border-emerald-500/40 hover:text-emerald-300 transition"
                >
                  Copy Invite Code
                </button>
              </div>
            </div> */}
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
                {hasReachedStandardMemberLimit && (
                  <p className="text-xs text-amber-400 text-center py-2">
                    Member limit reached for Standard accounts.
                  </p>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={hasReachedStandardMemberLimit}
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
                      <div
                        key={profile.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 hover:border-slate-600 transition"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">
                            {profile.first_name} {profile.last_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            @{profile.username}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddRegistered(profile)}
                          disabled={
                            addingMember || hasReachedStandardMemberLimit
                          }
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-950 hover:bg-emerald-500 text-emerald-400 hover:text-black transition"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
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
                {hasReachedStandardMemberLimit && (
                  <p className="text-xs text-amber-400 text-center py-2">
                    Member limit reached for Standard accounts.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  <TextInput
                    placeholder="First Name"
                    value={guestForm.firstName}
                    onChange={(e) =>
                      setGuestForm({ ...guestForm, firstName: e.target.value })
                    }
                    disabled={hasReachedStandardMemberLimit}
                  />
                  <TextInput
                    placeholder="Last Name"
                    value={guestForm.lastName}
                    onChange={(e) =>
                      setGuestForm({ ...guestForm, lastName: e.target.value })
                    }
                    disabled={hasReachedStandardMemberLimit}
                  />
                </div>
                <TextInput
                  type="email"
                  placeholder="Email address"
                  value={guestForm.email}
                  onChange={(e) =>
                    setGuestForm({ ...guestForm, email: e.target.value })
                  }
                  disabled={hasReachedStandardMemberLimit}
                />
                <button
                  onClick={handleAddGuest}
                  disabled={addingMember || hasReachedStandardMemberLimit}
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
                expenseModalMode === "view" ? "Expense Details" : "Edit Expense"
              }
              onClose={() => {
                setSelectedExpense(null);
                setExpenseModalMode("view");
              }}
            >
              {expenseModalMode === "view" && isHost && !isArchived && (
                <button
                  onClick={() => setExpenseModalMode('edit')}  // remove setEditCustomSplits({})
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-emerald-500/50 text-slate-400 hover:text-emerald-400 text-xs font-medium transition"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
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
                      <p className="font-semibold text-white">
                        {selectedExpense.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Paid by {getPayerName(selectedExpense.paid_by)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedExpense.split_type === "equal"
                          ? "Split equally"
                          : "Custom split"}
                      </p>
                    </div>
                    <span className="text-xl font-bold text-emerald-400">
                      ₱{Number(selectedExpense.amount).toFixed(2)}
                    </span>
                  </div>
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

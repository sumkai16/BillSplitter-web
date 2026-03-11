import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft, Users, Receipt, Copy, UserPlus,
    X, Search, Check, UserCircle, Archive,
    ChevronRight, Plus, CreditCard
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function BillDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [bill, setBill] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isHost, setIsHost] = useState(false);
    const [activeTab, setActiveTab] = useState('expenses');

    const [showAddMember, setShowAddMember] = useState(false);
    const [memberType, setMemberType] = useState('registered');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [addingMember, setAddingMember] = useState(false);
    const [archiving, setArchiving] = useState(false);

    const [showAddExpense, setShowAddExpense] = useState(false);
    const [expenses, setExpenses] = useState([]);
    const [expenseForm, setExpenseForm] = useState({
        name: '', amount: '', paid_by: '', split_type: 'equal',
    });
    const [customSplits, setCustomSplits] = useState({});
    const [addingExpense, setAddingExpense] = useState(false);

    const [guestForm, setGuestForm] = useState({
        firstName: '', lastName: '', email: ''
    });
    const [guestSession, setGuestSession] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem('guest_session');
        if (stored) {
            const session = JSON.parse(stored);
            if (session.expiry > Date.now()) {
                setGuestSession(session);
            } else {
                localStorage.removeItem('guest_session');
                navigate('/join');
            }
        } else if (!user) {
            navigate('/login');
        }
    }, []);

    const fetchBillData = async () => {
        const { data: billData, error: billError } = await supabase
            .from('bills').select('*').eq('id', id).single();

        if (billError) {
            toast.error('Bill not found');
            navigate('/dashboard');
            return;
        }

        setBill(billData);
        setIsHost(billData.host_id === user?.id);

        const { data: memberData } = await supabase
            .from('bill_members')
            .select(`id, role, member_type, user_id, guest_id,
                profiles:user_id (first_name, last_name, email, username),
                guests:guest_id (first_name, last_name, email)`)
            .eq('bill_id', id);

        setMembers(memberData || []);

        const { data: expenseData } = await supabase
            .from('expenses').select('*').eq('bill_id', id)
            .order('created_at', { ascending: false });

        setExpenses(expenseData || []);
        setLoading(false);
    };

    useEffect(() => { fetchBillData(); }, [id]);

    useEffect(() => {
        if (memberType !== 'registered' || searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        const timeout = setTimeout(async () => {
            setSearching(true);
            const { data } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email, username')
                .ilike('username', `%${searchQuery}%`)
                .neq('id', user.id)
                .limit(5);

            const existingIds = members.filter(m => m.member_type === 'registered').map(m => m.user_id);
            setSearchResults((data || []).filter(u => !existingIds.includes(u.id)));
            setSearching(false);
        }, 400);
        return () => clearTimeout(timeout);
    }, [searchQuery, memberType]);

    const handleAddRegistered = async (profile) => {
        setAddingMember(true);
        try {
            const { error } = await supabase.from('bill_members').insert({
                bill_id: id, user_id: profile.id, role: 'member', member_type: 'registered',
            });
            if (error) throw error;
            toast.success(`${profile.first_name} added`);
            setSearchQuery('');
            setSearchResults([]);
            fetchBillData();
        } catch (err) { toast.error(err.message); }
        finally { setAddingMember(false); }
    };

    const handleAddGuest = async () => {
        const { firstName, lastName, email } = guestForm;
        if (!firstName.trim() || !lastName.trim() || !email.trim())
            return toast.error('All fields are required');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return toast.error('Invalid email');

        setAddingMember(true);
        try {
            const { data: existingGuest } = await supabase
                .from('guests').select('id').eq('email', email).maybeSingle();

            let guestId;
            if (existingGuest) {
                guestId = existingGuest.id;
            } else {
                const { data: newGuest, error: guestError } = await supabase
                    .from('guests').insert({
                        first_name: firstName.trim(), last_name: lastName.trim(),
                        email: email.trim(), invited_by: user.id,
                    }).select().single();
                if (guestError) throw guestError;
                guestId = newGuest.id;
            }

            const { error: memberError } = await supabase.from('bill_members').insert({
                bill_id: id, guest_id: guestId, role: 'member', member_type: 'guest',
            });
            if (memberError) throw memberError;

            toast.success('Guest added');
            setGuestForm({ firstName: '', lastName: '', email: '' });
            setShowAddMember(false);
            fetchBillData();
        } catch (err) { toast.error(err.message); }
        finally { setAddingMember(false); }
    };

    const handleRemoveMember = async (memberId) => {
        const { error } = await supabase.from('bill_members').delete().eq('id', memberId);
        if (error) return toast.error('Failed to remove');
        toast.success('Member removed');
        fetchBillData();
    };

    const handleArchiveBill = async () => {
        if (!window.confirm('Mark this bill as done and archive it?')) return;
        setArchiving(true);
        try {
            const { error } = await supabase.from('bills').update({ status: 'archived' }).eq('id', id);
            if (error) throw error;
            toast.success('Bill archived');
            setTimeout(() => navigate('/dashboard'), 1000);
        } catch (err) { toast.error('Failed to archive'); }
        finally { setArchiving(false); }
    };

    const handleAddExpense = async () => {
        if (!expenseForm.name.trim()) return toast.error('Expense name is required');
        if (!expenseForm.amount || isNaN(expenseForm.amount) || Number(expenseForm.amount) <= 0)
            return toast.error('Enter a valid amount');
        if (!expenseForm.paid_by) return toast.error('Select who paid');

        setAddingExpense(true);
        try {
            const amount = Number(expenseForm.amount);
            const { data: expense, error: expenseError } = await supabase
                .from('expenses').insert({
                    bill_id: id, name: expenseForm.name.trim(),
                    amount, paid_by: expenseForm.paid_by, split_type: expenseForm.split_type,
                }).select().single();
            if (expenseError) throw expenseError;

            if (expenseForm.split_type === 'equal') {
                const splits = members.map(m => ({
                    expense_id: expense.id,
                    user_id: m.user_id || m.guest_id,
                    amount: Number((amount / members.length).toFixed(2)),
                }));
                const { error: splitError } = await supabase.from('expense_splits').insert(splits);
                if (splitError) throw splitError;
            } else {
                const splits = Object.entries(customSplits).map(([userId, amt]) => ({
                    expense_id: expense.id, user_id: userId, amount: Number(amt),
                }));
                const { error: splitError } = await supabase.from('expense_splits').insert(splits);
                if (splitError) throw splitError;
            }

            toast.success('Expense added');
            setShowAddExpense(false);
            setExpenseForm({ name: '', amount: '', paid_by: '', split_type: 'equal' });
            setCustomSplits({});
            fetchBillData();
        } catch (err) { toast.error('Failed to add expense'); }
        finally { setAddingExpense(false); }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(bill.code);
        toast.success('Copied!');
    };

    const getPayerName = (paidById) => {
        const member = members.find(m => m.user_id === paidById || m.guest_id === paidById);
        if (!member) return 'Unknown';
        return member.member_type === 'guest'
            ? `${member.guests?.first_name} ${member.guests?.last_name}`
            : `${member.profiles?.first_name} ${member.profiles?.last_name}`;
    };

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const isArchived = bill.status === 'archived';

    return (
        <div className="min-h-screen bg-black text-white">
            <Toaster position="top-center" toastOptions={{
                style: { background: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: '13px' }
            }} />

            {/* Top bar */}
            <div className="border-b border-slate-800/60 sticky top-0 z-10 bg-black/80 backdrop-blur-xl">
                <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition text-slate-500 hover:text-white"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-semibold text-white text-sm truncate">{bill.name}</h1>
                        <p className="text-xs text-slate-500">{members.length} member{members.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isHost && !isArchived && (
                            <button
                                onClick={handleArchiveBill}
                                disabled={archiving}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-amber-500/50 text-slate-400 hover:text-amber-400 text-xs font-medium transition disabled:opacity-40"
                            >
                                <Archive className="w-3.5 h-3.5" />
                                {archiving ? 'Archiving...' : 'Done'}
                            </button>
                        )}
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isArchived ? 'bg-slate-800 text-slate-400' : 'bg-emerald-950 text-emerald-400'
                            }`}>
                            {bill.status}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-5 py-6 space-y-4">

                {/* Hero card — bill summary */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900/60 border border-emerald-900/30 p-5"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs text-slate-500 mb-1">Total Expenses</p>
                            <p className="text-3xl font-bold text-white tracking-tight">
                                ₱{totalExpenses.toFixed(2)}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                across {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
                            </p>
                        </div>

                        {/* Invite code */}
                        <div className="text-right">
                            <p className="text-xs text-slate-500 mb-1.5">Invite Code</p>
                            <button
                                onClick={copyCode}
                                className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl px-3 py-2 transition group"
                            >
                                <span className="font-mono font-bold text-sm tracking-widest text-white">
                                    {bill.code}
                                </span>
                                <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition" />
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Tabs */}
                <div className="flex bg-slate-900/50 rounded-xl p-1 border border-slate-800/50">
                    {['expenses', 'members'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition capitalize ${activeTab === tab
                                    ? 'bg-slate-800 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            {tab === 'expenses' ? `Expenses (${expenses.length})` : `Members (${members.length})`}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">

                    {/* Expenses Tab */}
                    {activeTab === 'expenses' && (
                        <motion.div
                            key="expenses"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15 }}
                        >
                            {isHost && !isArchived && (
                                <button
                                    onClick={() => {
                                        setExpenseForm({ name: '', amount: '', paid_by: user?.id || '', split_type: 'equal' });
                                        setShowAddExpense(true);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/50 text-slate-500 hover:text-emerald-400 text-sm font-medium transition mb-3"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Expense
                                </button>
                            )}

                            {expenses.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3">
                                        <Receipt className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <p className="text-slate-500 text-sm">No expenses yet</p>
                                    <p className="text-slate-600 text-xs mt-1">Add one to get started</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {expenses.map((expense, i) => (
                                        <motion.div
                                            key={expense.id}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-slate-700 transition"
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                                                <CreditCard className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{expense.name}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {getPayerName(expense.paid_by)} paid · {expense.split_type === 'equal' ? 'split equally' : 'custom split'}
                                                </p>
                                            </div>
                                            <span className="text-sm font-semibold text-emerald-400 flex-shrink-0">
                                                ₱{Number(expense.amount).toFixed(2)}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Members Tab */}
                    {activeTab === 'members' && (
                        <motion.div
                            key="members"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15 }}
                        >
                            {isHost && !isArchived && (
                                <button
                                    onClick={() => setShowAddMember(true)}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/50 text-slate-500 hover:text-emerald-400 text-sm font-medium transition mb-3"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Add Member
                                </button>
                            )}

                            <div className="space-y-2">
                                {members.map((member, i) => {
                                    const name = member.member_type === 'guest'
                                        ? `${member.guests?.first_name} ${member.guests?.last_name}`
                                        : `${member.profiles?.first_name} ${member.profiles?.last_name}`;
                                    const email = member.member_type === 'guest'
                                        ? member.guests?.email
                                        : member.profiles?.email;
                                    const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                                    return (
                                        <motion.div
                                            key={member.id}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-slate-700 transition"
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                                {initials}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{name}</p>
                                                <p className="text-xs text-slate-500 truncate">{email}</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${member.role === 'host'
                                                        ? 'bg-emerald-950 text-emerald-400'
                                                        : member.member_type === 'guest'
                                                            ? 'bg-slate-800 text-slate-400'
                                                            : 'bg-teal-950 text-teal-400'
                                                    }`}>
                                                    {member.role === 'host' ? 'host' : member.member_type === 'guest' ? 'guest' : 'member'}
                                                </span>
                                                {isHost && member.role !== 'host' && !isArchived && (
                                                    <button
                                                        onClick={() => handleRemoveMember(member.id)}
                                                        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-950 text-slate-600 hover:text-red-400 transition"
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

            {/* Add Member Modal */}
            <AnimatePresence>
                {showAddMember && (
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
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md p-6"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="font-semibold text-white">Add Member</h2>
                                <button
                                    onClick={() => {
                                        setShowAddMember(false);
                                        setSearchQuery('');
                                        setSearchResults([]);
                                        setGuestForm({ firstName: '', lastName: '', email: '' });
                                    }}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 transition text-slate-500"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex bg-slate-800/60 rounded-xl p-1 mb-5 border border-slate-700/40">
                                {['registered', 'guest'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setMemberType(type)}
                                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition capitalize ${memberType === type ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        {type === 'registered' ? 'Registered User' : 'Guest'}
                                    </button>
                                ))}
                            </div>

                            {memberType === 'registered' && (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search by username..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 text-sm"
                                        />
                                    </div>
                                    {searching && (
                                        <p className="text-xs text-slate-500 text-center py-2">Searching...</p>
                                    )}
                                    {searchResults.length > 0 && (
                                        <div className="space-y-1.5">
                                            {searchResults.map(profile => (
                                                <div key={profile.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 hover:border-slate-600 transition">
                                                    <div>
                                                        <p className="text-sm font-medium text-white">
                                                            {profile.first_name} {profile.last_name}
                                                        </p>
                                                        <p className="text-xs text-slate-500">@{profile.username}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleAddRegistered(profile)}
                                                        disabled={addingMember}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-950 hover:bg-emerald-500 text-emerald-400 hover:text-black transition"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                                        <p className="text-xs text-slate-500 text-center py-4">No users found</p>
                                    )}
                                </div>
                            )}

                            {memberType === 'guest' && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <input
                                            type="text"
                                            placeholder="First Name"
                                            value={guestForm.firstName}
                                            onChange={e => setGuestForm({ ...guestForm, firstName: e.target.value })}
                                            className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Last Name"
                                            value={guestForm.lastName}
                                            onChange={e => setGuestForm({ ...guestForm, lastName: e.target.value })}
                                            className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 text-sm"
                                        />
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="Email address"
                                        value={guestForm.email}
                                        onChange={e => setGuestForm({ ...guestForm, email: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 text-sm"
                                    />
                                    <button
                                        onClick={handleAddGuest}
                                        disabled={addingMember}
                                        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-semibold text-sm transition disabled:opacity-50"
                                    >
                                        {addingMember ? 'Adding...' : 'Add Guest'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Expense Modal */}
            <AnimatePresence>
                {showAddExpense && (
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
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md p-6"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="font-semibold text-white">Add Expense</h2>
                                <button
                                    onClick={() => setShowAddExpense(false)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 transition text-slate-500"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Expense name"
                                    value={expenseForm.name}
                                    onChange={e => setExpenseForm({ ...expenseForm, name: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 text-sm"
                                />

                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">₱</span>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={expenseForm.amount}
                                        onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                        className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 text-sm"
                                    />
                                </div>

                                <select
                                    value={expenseForm.paid_by}
                                    onChange={e => setExpenseForm({ ...expenseForm, paid_by: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500/50 text-sm"
                                >
                                    <option value="">Who paid?</option>
                                    {members.map(member => {
                                        const name = member.member_type === 'guest'
                                            ? `${member.guests?.first_name} ${member.guests?.last_name} (guest)`
                                            : `${member.profiles?.first_name} ${member.profiles?.last_name}`;
                                        const value = member.member_type === 'guest' ? member.guest_id : member.user_id;
                                        return <option key={member.id} value={value}>{name}</option>;
                                    })}
                                </select>

                                <div className="flex bg-slate-800/60 rounded-xl p-1 border border-slate-700/40">
                                    {['equal', 'custom'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setExpenseForm({ ...expenseForm, split_type: type })}
                                            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition capitalize ${expenseForm.split_type === type ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
                                                }`}
                                        >
                                            {type === 'equal' ? 'Split equally' : 'Custom split'}
                                        </button>
                                    ))}
                                </div>

                                {expenseForm.split_type === 'custom' && (
                                    <div className="space-y-2 pt-1">
                                        <p className="text-xs text-slate-500">Amount per person</p>
                                        {members.map(member => {
                                            const name = member.member_type === 'guest'
                                                ? `${member.guests?.first_name} ${member.guests?.last_name}`
                                                : `${member.profiles?.first_name} ${member.profiles?.last_name}`;
                                            const key = member.user_id || member.guest_id;
                                            return (
                                                <div key={member.id} className="flex items-center gap-3">
                                                    <span className="text-sm text-slate-400 flex-1 truncate">{name}</span>
                                                    <div className="relative">
                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">₱</span>
                                                        <input
                                                            type="number"
                                                            placeholder="0.00"
                                                            value={customSplits[key] || ''}
                                                            onChange={e => setCustomSplits({ ...customSplits, [key]: e.target.value })}
                                                            className="w-28 pl-7 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleAddExpense}
                                disabled={addingExpense}
                                className="w-full mt-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-semibold text-sm transition disabled:opacity-50"
                            >
                                {addingExpense ? 'Adding...' : 'Add Expense'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
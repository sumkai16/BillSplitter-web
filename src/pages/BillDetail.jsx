import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import {
    ArrowLeft, Users, Receipt, Copy, UserPlus,
    X, Search, Check, UserCircle
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
            .from('bills')
            .select('*')
            .eq('id', id)
            .single();

        if (billError) {
            toast.error('Bill not found');
            navigate('/dashboard');
            return;
        }

        setBill(billData);
        setIsHost(billData.host_id === user?.id);

        const { data: memberData } = await supabase
            .from('bill_members')
            .select(`
                id, role, member_type, user_id, guest_id,
                profiles:user_id (first_name, last_name, email, username),
                guests:guest_id (first_name, last_name, email)
            `)
            .eq('bill_id', id);

        setMembers(memberData || []);

        const { data: expenseData } = await supabase
            .from('expenses')
            .select('*')
            .eq('bill_id', id)
            .order('created_at', { ascending: false });

        setExpenses(expenseData || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchBillData();
    }, [id]);

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
                .or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
                .neq('id', user.id)
                .limit(5);

            const existingIds = members
                .filter(m => m.member_type === 'registered')
                .map(m => m.user_id);

            setSearchResults((data || []).filter(u => !existingIds.includes(u.id)));
            setSearching(false);
        }, 400);
        return () => clearTimeout(timeout);
    }, [searchQuery, memberType]);

    const handleAddRegistered = async (profile) => {
        setAddingMember(true);
        try {
            const { error } = await supabase
                .from('bill_members')
                .insert({
                    bill_id: id,
                    user_id: profile.id,
                    role: 'member',
                    member_type: 'registered',
                });
            if (error) throw error;
            toast.success(`${profile.first_name} added to bill`);
            setSearchQuery('');
            setSearchResults([]);
            fetchBillData();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setAddingMember(false);
        }
    };

    const handleAddGuest = async () => {
        const { firstName, lastName, email } = guestForm;
        if (!firstName.trim() || !lastName.trim() || !email.trim())
            return toast.error('All guest fields are required');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return toast.error('Please enter a valid email');

        setAddingMember(true);
        try {
            const { data: existingGuest } = await supabase
                .from('guests')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            let guestId;
            if (existingGuest) {
                guestId = existingGuest.id;
            } else {
                const { data: newGuest, error: guestError } = await supabase
                    .from('guests')
                    .insert({
                        first_name: firstName.trim(),
                        last_name: lastName.trim(),
                        email: email.trim(),
                        invited_by: user.id,
                    })
                    .select()
                    .single();
                if (guestError) throw guestError;
                guestId = newGuest.id;
            }

            const { error: memberError } = await supabase
                .from('bill_members')
                .insert({
                    bill_id: id,
                    guest_id: guestId,
                    role: 'member',
                    member_type: 'guest',
                });
            if (memberError) throw memberError;

            toast.success('Guest added to bill');
            setGuestForm({ firstName: '', lastName: '', email: '' });
            setShowAddMember(false);
            fetchBillData();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setAddingMember(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        const { error } = await supabase
            .from('bill_members')
            .delete()
            .eq('id', memberId);
        if (error) return toast.error('Failed to remove member');
        toast.success('Member removed');
        fetchBillData();
    };

    const handleArchiveBill = async () => {
        if (!window.confirm('Mark this bill as done and archive it?')) return;
        setArchiving(true);
        try {
            const { error } = await supabase
                .from('bills')
                .update({ status: 'archived' })
                .eq('id', id);
            if (error) throw error;
            toast.success('Bill archived!');
            setTimeout(() => navigate('/dashboard'), 1000);
        } catch (err) {
            toast.error('Failed to archive bill');
        } finally {
            setArchiving(false);
        }
    };

    const handleAddExpense = async () => {
        if (!expenseForm.name.trim()) return toast.error('Expense name is required');
        if (!expenseForm.amount || isNaN(expenseForm.amount) || Number(expenseForm.amount) <= 0)
            return toast.error('Please enter a valid amount');
        if (!expenseForm.paid_by) return toast.error('Please select who paid');

        setAddingExpense(true);
        try {
            const amount = Number(expenseForm.amount);
            const { data: expense, error: expenseError } = await supabase
                .from('expenses')
                .insert({
                    bill_id: id,
                    name: expenseForm.name.trim(),
                    amount,
                    paid_by: expenseForm.paid_by,
                    split_type: expenseForm.split_type,
                })
                .select()
                .single();
            if (expenseError) throw expenseError;

            if (expenseForm.split_type === 'equal') {
                const splitAmount = amount / members.length;
                const splits = members.map(m => ({
                    expense_id: expense.id,
                    user_id: m.user_id || m.guest_id,
                    amount: Number(splitAmount.toFixed(2)),
                }));
                const { error: splitError } = await supabase.from('expense_splits').insert(splits);
                if (splitError) throw splitError;
            } else {
                const splits = Object.entries(customSplits).map(([userId, amt]) => ({
                    expense_id: expense.id,
                    user_id: userId,
                    amount: Number(amt),
                }));
                const { error: splitError } = await supabase.from('expense_splits').insert(splits);
                if (splitError) throw splitError;
            }

            toast.success('Expense added!');
            setShowAddExpense(false);
            setExpenseForm({ name: '', amount: '', paid_by: '', split_type: 'equal' });
            setCustomSplits({});
            fetchBillData();
        } catch (err) {
            toast.error('Failed to add expense');
        } finally {
            setAddingExpense(false);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(bill.code);
        toast.success('Code copied!');
    };

    const getPayerName = (paidById) => {
        const member = members.find(m => m.user_id === paidById || m.guest_id === paidById);
        if (!member) return 'Unknown';
        return member.member_type === 'guest'
            ? `${member.guests?.first_name} ${member.guests?.last_name}`
            : `${member.profiles?.first_name} ${member.profiles?.last_name}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white">
            <Toaster position="top-center" />

            {/* Header */}
            <div className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 rounded-xl hover:bg-slate-800 transition text-slate-400"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="font-bold text-white">{bill.name}</h1>
                        <p className="text-xs text-slate-400">
                            {members.length} member{members.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    {isHost && bill.status !== 'archived' && (
                        <button
                            onClick={handleArchiveBill}
                            disabled={archiving}
                            className="px-4 py-2 rounded-xl border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs font-semibold transition disabled:opacity-50"
                        >
                            {archiving ? 'Archiving...' : '📦 Mark as Done'}
                        </button>
                    )}
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${bill.status === 'active'
                            ? 'bg-emerald-900/40 text-emerald-400'
                            : 'bg-gray-800 text-gray-400'
                        }`}>
                        {bill.status}
                    </span>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">

                {/* Invite Code */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-6"
                >
                    <h3 className="font-bold text-white flex items-center gap-2 mb-1">
                        <Receipt className="w-4 h-4 text-emerald-400" />
                        Invite Code
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">Share this code to invite people</p>
                    <div className="flex gap-3">
                        <div className="flex-1 bg-slate-800 rounded-2xl px-6 py-4 font-mono font-bold text-2xl tracking-widest text-white text-center border border-slate-700">
                            {bill.code}
                        </div>
                        <button
                            onClick={copyCode}
                            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-400 transition"
                        >
                            <Copy className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>

                {/* Members */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Users className="w-4 h-4 text-emerald-400" />
                            Members ({members.length})
                        </h3>
                        {isHost && bill.status !== 'archived' && (
                            <button
                                onClick={() => setShowAddMember(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-semibold transition"
                            >
                                <UserPlus className="w-4 h-4" />
                                Add Member
                            </button>
                        )}
                    </div>
                    <div className="space-y-3">
                        {members.map(member => {
                            const name = member.member_type === 'guest'
                                ? `${member.guests?.first_name} ${member.guests?.last_name}`
                                : `${member.profiles?.first_name} ${member.profiles?.last_name}`;
                            const email = member.member_type === 'guest'
                                ? member.guests?.email
                                : member.profiles?.email;

                            return (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800 transition"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                                            {name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{name}</p>
                                            <p className="text-xs text-slate-400">{email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${member.role === 'host'
                                                ? 'bg-emerald-900/40 text-emerald-400'
                                                : member.member_type === 'guest'
                                                    ? 'bg-slate-700 text-slate-400'
                                                    : 'bg-teal-900/40 text-teal-400'
                                            }`}>
                                            {member.role === 'host' ? 'Host' : member.member_type === 'guest' ? 'Guest' : 'Member'}
                                        </span>
                                        {isHost && member.role !== 'host' && bill.status !== 'archived' && (
                                            <button
                                                onClick={() => handleRemoveMember(member.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-900/30 text-slate-600 hover:text-red-400 transition"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Expenses */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-emerald-400" />
                            Expenses
                        </h3>
                        {isHost && bill.status !== 'archived' && (
                            <button
                                onClick={() => {
                                    setExpenseForm({ name: '', amount: '', paid_by: user?.id || '', split_type: 'equal' });
                                    setShowAddExpense(true);
                                }}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-semibold transition"
                            >
                                + Add Expense
                            </button>
                        )}
                    </div>
                    {expenses.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <span className="text-4xl">📋</span>
                            <p className="text-sm mt-3">No details</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {expenses.map(expense => (
                                <div key={expense.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition">
                                    <div>
                                        <p className="text-sm font-semibold text-white">{expense.name}</p>
                                        <p className="text-xs text-slate-400">
                                            Paid by {getPayerName(expense.paid_by)} · {expense.split_type === 'equal' ? 'Split equally' : 'Custom split'}
                                        </p>
                                    </div>
                                    <span className="text-emerald-400 font-bold text-sm">
                                        ₱{Number(expense.amount).toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

            </div>

            {/* Add Member Modal */}
            {showAddMember && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-md p-8"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Add Member</h2>
                            <button
                                onClick={() => {
                                    setShowAddMember(false);
                                    setSearchQuery('');
                                    setSearchResults([]);
                                    setGuestForm({ firstName: '', lastName: '', email: '' });
                                }}
                                className="p-2 rounded-xl hover:bg-slate-800 transition text-slate-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Toggle */}
                        <div className="flex bg-slate-800 rounded-2xl p-1 mb-6">
                            <button
                                onClick={() => setMemberType('registered')}
                                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${memberType === 'registered'
                                        ? 'bg-emerald-500 text-black'
                                        : 'text-slate-400'
                                    }`}
                            >
                                <UserCircle className="w-4 h-4 inline mr-1.5" />
                                Registered User
                            </button>
                            <button
                                onClick={() => setMemberType('guest')}
                                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${memberType === 'guest'
                                        ? 'bg-emerald-500 text-black'
                                        : 'text-slate-400'
                                    }`}
                            >
                                <Users className="w-4 h-4 inline mr-1.5" />
                                Guest
                            </button>
                        </div>

                        {/* Registered User Search */}
                        {memberType === 'registered' && (
                            <div className="space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search by username or email..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                </div>
                                {searching && <p className="text-xs text-slate-400 text-center">Searching...</p>}
                                {searchResults.length > 0 && (
                                    <div className="space-y-2">
                                        {searchResults.map(profile => (
                                            <div
                                                key={profile.id}
                                                className="flex items-center justify-between p-3 rounded-2xl border border-slate-700 hover:border-emerald-500/40 hover:bg-slate-800 transition"
                                            >
                                                <div>
                                                    <p className="text-sm font-semibold text-white">
                                                        {profile.first_name} {profile.last_name}
                                                    </p>
                                                    <p className="text-xs text-slate-400">@{profile.username}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleAddRegistered(profile)}
                                                    disabled={addingMember}
                                                    className="p-2 rounded-xl bg-emerald-900/40 hover:bg-emerald-500 text-emerald-400 hover:text-black transition"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                                    <p className="text-xs text-slate-400 text-center py-4">No users found</p>
                                )}
                            </div>
                        )}

                        {/* Guest Form */}
                        {memberType === 'guest' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="First Name"
                                        value={guestForm.firstName}
                                        onChange={e => setGuestForm({ ...guestForm, firstName: e.target.value })}
                                        className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        value={guestForm.lastName}
                                        onChange={e => setGuestForm({ ...guestForm, lastName: e.target.value })}
                                        className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                </div>
                                <input
                                    type="email"
                                    placeholder="Email address"
                                    value={guestForm.email}
                                    onChange={e => setGuestForm({ ...guestForm, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                />
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleAddGuest}
                                    disabled={addingMember}
                                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-semibold text-sm transition disabled:opacity-70"
                                >
                                    {addingMember ? 'Adding...' : 'Add Guest'}
                                </motion.button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}

            {/* Add Expense Modal */}
            {showAddExpense && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-md p-8"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Add Expense</h2>
                            <button
                                onClick={() => setShowAddExpense(false)}
                                className="p-2 rounded-xl hover:bg-slate-800 transition text-slate-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-400 mb-1 block">Expense Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Dinner, Taxi, Hotel"
                                    value={expenseForm.name}
                                    onChange={e => setExpenseForm({ ...expenseForm, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-400 mb-1 block">Amount (₱)</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={expenseForm.amount}
                                    onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-400 mb-1 block">Paid By</label>
                                <select
                                    value={expenseForm.paid_by}
                                    onChange={e => setExpenseForm({ ...expenseForm, paid_by: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                >
                                    <option value="">Select member</option>
                                    {members.map(member => {
                                        const name = member.member_type === 'guest'
                                            ? `${member.guests?.first_name} ${member.guests?.last_name} (Guest)`
                                            : `${member.profiles?.first_name} ${member.profiles?.last_name}`;
                                        const value = member.member_type === 'guest' ? member.guest_id : member.user_id;
                                        return <option key={member.id} value={value}>{name}</option>;
                                    })}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-400 mb-1 block">Split</label>
                                <div className="flex bg-slate-800 rounded-2xl p-1">
                                    <button
                                        onClick={() => setExpenseForm({ ...expenseForm, split_type: 'equal' })}
                                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${expenseForm.split_type === 'equal' ? 'bg-emerald-500 text-black' : 'text-slate-400'
                                            }`}
                                    >Equally</button>
                                    <button
                                        onClick={() => setExpenseForm({ ...expenseForm, split_type: 'custom' })}
                                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${expenseForm.split_type === 'custom' ? 'bg-emerald-500 text-black' : 'text-slate-400'
                                            }`}
                                    >Custom</button>
                                </div>
                            </div>
                            {expenseForm.split_type === 'custom' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-400 block">Amount per person</label>
                                    {members.map(member => {
                                        const name = member.member_type === 'guest'
                                            ? `${member.guests?.first_name} ${member.guests?.last_name}`
                                            : `${member.profiles?.first_name} ${member.profiles?.last_name}`;
                                        const key = member.user_id || member.guest_id;
                                        return (
                                            <div key={member.id} className="flex items-center gap-3">
                                                <span className="text-sm text-slate-300 flex-1">{name}</span>
                                                <input
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={customSplits[key] || ''}
                                                    onChange={e => setCustomSplits({ ...customSplits, [key]: e.target.value })}
                                                    className="w-28 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={handleAddExpense}
                            disabled={addingExpense}
                            className="w-full mt-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-bold text-sm transition disabled:opacity-70"
                        >
                            {addingExpense ? 'Adding...' : 'Add Expense'}
                        </motion.button>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
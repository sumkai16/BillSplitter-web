import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft, Users, Receipt, Copy, UserPlus,
    X, Search, Check, UserCircle, Archive,
    ChevronRight, Plus, CreditCard, Pencil
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function BillDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    //  Bill & member 
    const [bill, setBill] = useState(null);
    const [members, setMembers] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isHost, setIsHost] = useState(false);

    // Add member modal state
    const [showAddMember, setShowAddMember] = useState(false);
    const [memberType, setMemberType] = useState('registered'); // 'registered' or 'guest'
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [addingMember, setAddingMember] = useState(false);
    const [guestForm, setGuestForm] = useState(GUEST_FORM_DEFAULT);

    // Guest form state
    const [guestForm, setGuestForm] = useState({
        firstName: '', lastName: '', email: ''
    });

    const [guestSession, setGuestSession] = useState(null);
    useEffect(() => {
        // Check for guest session
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
            // No user, no guest session — redirect
            navigate('/login');
        }
    }, []);
    // ── Fetch bill + members ───────────────────────────────────────
    const fetchBillData = async () => {
        // Fetch bill
        const { data: billData, error: billError } = await supabase
            .from('bills').select('*').eq('id', id).single();

        if (billError) {
            toast.error('Bill not found');
            navigate('/dashboard');
            return;
        }

        const { data: memberData, error: memberError } = await supabase
            .from('bill_members')
            .select(`id, role, member_type, user_id, guest_id,
                profiles:user_id (first_name, last_name, email, username),
                guests:guest_id (first_name, last_name, email)`)
            .eq('bill_id', id);

        if (memberError) console.error('[fetchBillData] member error:', memberError);

        const { data: expenseData, error: expenseError } = await supabase
            .from('expenses').select('*').eq('bill_id', id)
            .order('created_at', { ascending: false });

        if (expenseError) console.error('[fetchBillData] expense error:', expenseError);

        setBill(billData);
        setIsHost(billData.host_id === user?.id);
        // Fetch members with profile info
        const { data: memberData } = await supabase
            .from('bill_members')
            .select(`
                id,
                role,
                member_type,
                user_id,
                guest_id,
                profiles:user_id (
                    first_name,
                    last_name,
                    email,
                    username
                ),
                guests:guest_id (
                    first_name,
                    last_name,
                    email
                )
            `)
            .eq('bill_id', id);

        setMembers(memberData || []);
        setExpenses(expenseData || []);
        setLoading(false);
    };

    useEffect(() => {
        if (memberType !== 'registered' || searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        const timeout = setTimeout(async () => {
            setSearching(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email, username')
                .ilike('username', `%${searchQuery}%`)
                .neq('id', user.id)
                .limit(5);

            if (error) console.error('[memberSearch] error:', error);

            const existingIds = members
                .filter(m => m.member_type === 'registered')
                .map(m => m.user_id);
            setSearchResults((data || []).filter(u => !existingIds.includes(u.id)));
            setSearching(false);
        }, 400);
        return () => clearTimeout(timeout);
    }, [searchQuery, memberType, members, user]);

    //  Derived values 

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const getMemberName = (member) => {
        if (!member) return 'Unknown';
        return member.member_type === 'guest'
            ? `${member.guests?.first_name} ${member.guests?.last_name}`
            : `${member.profiles?.first_name} ${member.profiles?.last_name}`;
    };

    const getPayerName = (paidById) => {
        const member = members.find(m => m.user_id === paidById || m.guest_id === paidById);
        return getMemberName(member);
    };

    //  Handlers 

    const handleAddRegistered = async (profile) => {
        setAddingMember(true);
        const { error } = await supabase.from('bill_members').insert({
            bill_id: id, user_id: profile.id, role: 'member', member_type: 'registered',
        });
        if (error) {
            console.error('[handleAddRegistered]', error);
            toast.error(error.message);
        } else {
            toast.success(`${profile.first_name} added`);
            setSearchQuery('');
            setSearchResults([]);
            fetchBillData();
        }
        setAddingMember(false);
    };

    const handleAddGuest = async () => {
        const { firstName, lastName, email } = guestForm;
        if (!firstName.trim() || !lastName.trim() || !email.trim())
            return toast.error('All fields are required');
        if (!EMAIL_REGEX.test(email))
            return toast.error('Invalid email');

        setAddingMember(true);
        try {
            const { data: existingGuest } = await supabase
                .from('guests').select('id').eq('email', email.trim()).maybeSingle();

            let guestId = existingGuest?.id;

            if (!guestId) {
                const { data: newGuest, error: guestError } = await supabase
                    .from('guests').insert({
                        first_name: firstName.trim(),
                        last_name: lastName.trim(),
                        email: email.trim(),
                        invited_by: user.id,
                    }).select().single();
                if (guestError) throw guestError;
                guestId = newGuest.id;
            }

            const { error: memberError } = await supabase.from('bill_members').insert({
                bill_id: id, guest_id: guestId, role: 'member', member_type: 'guest',
            });
            if (memberError) throw memberError;

            toast.success('Guest added');
            setGuestForm(GUEST_FORM_DEFAULT);
            setShowAddMember(false);
            fetchBillData();
        } catch (err) {
            console.error('[handleAddGuest]', err);
            toast.error(err.message);
        } finally {
            setAddingMember(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        const { error } = await supabase.from('bill_members').delete().eq('id', memberId);
        if (error) {
            console.error('[handleRemoveMember]', error);
            return toast.error('Failed to remove');
        }
        toast.success('Member removed');
        fetchBillData();
    };

    const handleArchiveBill = async () => {
        if (!window.confirm('Mark this bill as done and archive it?')) return;
        setArchiving(true);
        const { error } = await supabase.from('bills').update({ status: 'archived' }).eq('id', id);
        if (error) {
            console.error('[handleArchiveBill]', error);
            toast.error('Failed to archive');
        } else {
            toast.success('Bill archived');
            setTimeout(() => navigate('/dashboard'), 1000);
        }
        setArchiving(false);
    };

    const handleSaveBillName = async () => {
        if (!billNameInput.trim()) return toast.error('Bill name is required');
        setSavingBillName(true);
        const { error } = await supabase.from('bills')
            .update({ name: billNameInput.trim() }).eq('id', id);
        if (error) {
            console.error('[handleSaveBillName]', error);
            toast.error('Failed to rename bill');
        } else {
            setBill(prev => ({ ...prev, name: billNameInput.trim() }));
            setEditingBillName(false);
            toast.success('Bill renamed');
        }
        setSavingBillName(false);
    };

    //  Shared split insert helper 
    const insertSplits = async (expenseId, form, splits) => {
        if (form.split_type === 'equal') {
            const splitAmount = Number((Number(form.amount) / members.length).toFixed(2));
            const rows = members.map(m => ({
                expense_id: expenseId,
                user_id: m.user_id || m.guest_id,
                amount: splitAmount,
            }));
            return supabase.from('expense_splits').insert(rows);
        } else {
            const rows = Object.entries(splits).map(([userId, amt]) => ({
                expense_id: expenseId,
                user_id: userId,
                amount: Number(amt),
            }));
            return supabase.from('expense_splits').insert(rows);
        }
    };

    const handleAddExpense = async () => {
        const validationError = validateExpenseForm(expenseForm, customSplits);
        if (validationError) return toast.error(validationError);

        setAddingExpense(true);
        try {
            const { data: expense, error: expenseError } = await supabase
                .from('expenses').insert({
                    bill_id: id,
                    name: expenseForm.name.trim(),
                    amount: Number(expenseForm.amount),
                    paid_by: expenseForm.paid_by,
                    split_type: expenseForm.split_type,
                }).select().single();
            if (expenseError) throw expenseError;

            const { error: splitError } = await insertSplits(expense.id, expenseForm, customSplits);
            if (splitError) throw splitError;

            toast.success('Expense added');
            setShowAddExpense(false);
            setExpenseForm(EXPENSE_FORM_DEFAULT);
            setCustomSplits({});
            fetchBillData();
        } catch (err) {
            console.error('[handleAddExpense]', err);
            toast.error('Failed to add expense');
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
        setEditCustomSplits({});

        const { data: splits, error } = await supabase
            .from('expense_splits').select('*').eq('expense_id', expense.id);
        if (error) console.error('[handleOpenExpense] splits error:', error);
        setExpenseSplits(splits || []);
    };

    const handleSaveExpense = async () => {
        const validationError = validateExpenseForm(editExpenseForm, editCustomSplits);
        if (validationError) return toast.error(validationError);

        setSavingExpense(true);
        try {
            const { error: updateError } = await supabase.from('expenses')
                .update({
                    name: editExpenseForm.name.trim(),
                    amount: Number(editExpenseForm.amount),
                    paid_by: editExpenseForm.paid_by,
                    split_type: editExpenseForm.split_type,
                }).eq('id', selectedExpense.id);
            if (updateError) throw updateError;

            const { error: deleteError } = await supabase
                .from('expense_splits').delete().eq('expense_id', selectedExpense.id);
            if (deleteError) throw deleteError;

            const { error: splitError } = await insertSplits(selectedExpense.id, editExpenseForm, editCustomSplits);
            if (splitError) throw splitError;

            toast.success('Expense updated');
            setSelectedExpense(null);
            fetchBillData();
        } catch (err) {
            console.error('[handleSaveExpense]', err);
            toast.error('Failed to update expense');
        } finally {
            setSavingExpense(false);
        }
    };

    // ── Search registered users ────────────────────────────────────
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

            // Filter out already added members
            const existingIds = members
                .filter(m => m.member_type === 'registered')
                .map(m => m.user_id);

            setSearchResults((data || []).filter(u => !existingIds.includes(u.id)));
            setSearching(false);
        }, 400);

        return () => clearTimeout(timeout);
    }, [searchQuery, memberType]);

    // ── Add registered user ────────────────────────────────────────
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

    // ── Add guest ──────────────────────────────────────────────────
    const handleAddGuest = async () => {
        const { firstName, lastName, email } = guestForm;
        if (!firstName.trim() || !lastName.trim() || !email.trim()) {
            return toast.error('All guest fields are required');
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return toast.error('Please enter a valid email');
        }

        setAddingMember(true);
        try {
            // Check if guest email already exists
            const { data: existingGuest } = await supabase
                .from('guests')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            let guestId;

            if (existingGuest) {
                guestId = existingGuest.id;
            } else {
                // Create new guest
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

            // Add to bill_members
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

    // ── Remove member ──────────────────────────────────────────────
    const handleRemoveMember = async (memberId) => {
        const { error } = await supabase
            .from('bill_members')
            .delete()
            .eq('id', memberId);

        if (error) return toast.error('Failed to remove member');
        toast.success('Member removed');
        fetchBillData();
    };

    // ── Copy invite code ───────────────────────────────────────────
    const copyCode = () => {
        navigator.clipboard.writeText(bill.code);
        toast.success('Copied!');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100">
            <Toaster position="top-center" />

            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-white/40 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-500"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="font-bold text-slate-800">{bill.name}</h1>
                        <p className="text-xs text-slate-400">
                            {members.length} member{members.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            Track who paid what and split fairly.
                        </p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${bill.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                        }`}>
                        {bill.status}
                    </span>
                </div>
            </div>

            <div className="relative max-w-6xl mx-auto px-6 py-10 space-y-8">
                <div className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full bg-gradient-to-br from-emerald-200/40 to-teal-200/40 blur-3xl" />
                <div className="pointer-events-none absolute top-40 -left-10 h-56 w-56 rounded-full bg-gradient-to-br from-emerald-100/50 to-slate-200/40 blur-3xl" />

                {/* Top Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Invite Code Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-2 bg-white/80 backdrop-blur-md rounded-3xl shadow-lg border border-white/60 p-6 hover:shadow-xl transition"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                                    <Receipt className="w-4 h-4 text-emerald-500" />
                                    Invite Code
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Share this code to invite people to this bill
                                </p>
                            </div>
                            {isHost && (
                                <button
                                    onClick={() => setShowAddMember(true)}
                                    className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-semibold hover:from-emerald-700 hover:to-teal-700 transition shadow-md"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Add Member
                                </button>
                            )}
                        </div>
                        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1 bg-slate-50 rounded-2xl px-6 py-4 font-mono font-bold text-2xl tracking-[0.35em] text-slate-800 text-center border border-slate-200">
                                {bill.code}
                            </div>
                            <button
                                onClick={copyCode}
                                className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition shadow-sm"
                            >
                                <Copy className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>

                    {/* Quick Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl shadow-xl p-6 text-white"
                    >
                        <p className="text-emerald-100 text-xs uppercase tracking-widest">
                            Bill Overview
                        </p>
                        <h3 className="text-2xl font-bold mt-2">{bill.name}</h3>
                        <div className="mt-5 grid grid-cols-2 gap-4">
                            <div className="bg-white/15 rounded-2xl p-4">
                                <p className="text-xs text-emerald-50">Members</p>
                                <p className="text-2xl font-bold">{members.length}</p>
                            </div>
                            <div className="bg-white/15 rounded-2xl p-4">
                                <p className="text-xs text-emerald-50">Status</p>
                                <p className="text-lg font-semibold capitalize">{bill.status}</p>
                            </div>
                        </div>
                        {isHost && (
                            <button
                                onClick={() => setShowAddMember(true)}
                                className="mt-5 w-full flex items-center justify-center gap-2 rounded-2xl bg-white/20 hover:bg-white/30 text-white py-3 text-sm font-semibold transition"
                            >
                                <UserPlus className="w-4 h-4" />
                                Invite a Member
                            </button>
                        )}
                    </motion.div>
                </div>

                {/* Members Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/80 backdrop-blur-md rounded-3xl shadow-lg border border-white/60 p-6 hover:shadow-xl transition"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Users className="w-4 h-4 text-emerald-500" />
                            Members ({members.length})
                        </h3>
                        {isHost && (
                            <button
                                onClick={() => setShowAddMember(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 transition shadow-md"
                            >
                                <UserPlus className="w-4 h-4" />
                                Add Member
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {members.map((member) => {
                            const name = member.member_type === 'guest'
                                ? `${member.guests?.first_name} ${member.guests?.last_name}`
                                : `${member.profiles?.first_name} ${member.profiles?.last_name}`;
                            const email = member.member_type === 'guest'
                                ? member.guests?.email
                                : member.profiles?.email;

                            return (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white font-bold text-sm">
                                            {name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">{name}</p>
                                            <p className="text-xs text-slate-400">{email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${member.role === 'host'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : member.member_type === 'guest'
                                                ? 'bg-gray-100 text-gray-500'
                                                : 'bg-teal-100 text-teal-700'
                                            }`}>
                                            {member.role === 'host' ? 'Host' : member.member_type === 'guest' ? 'Guest' : 'Member'}
                                        </span>
                                        {isHost && member.role !== 'host' && (
                                            <button
                                                onClick={() => handleRemoveMember(member.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition"
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

                {/* Expenses Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/80 backdrop-blur-md rounded-3xl shadow-lg border border-white/60 p-6 hover:shadow-xl transition"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-emerald-500" />
                            Expenses
                        </h3>
                        <button className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition">
                            + Add Expense
                        </button>
                    </div>
                    <div className="text-center py-12 rounded-3xl border border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-teal-50/50">
                        <span className="text-4xl">📋</span>
                        <p className="text-slate-500 text-sm mt-3">
                            No details yet. Add an expense to get started.
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Add Member Modal */}
            {showAddMember && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-800">Add Member</h2>
                            <button
                                onClick={() => {
                                    setShowAddMember(false);
                                    setSearchQuery('');
                                    setSearchResults([]);
                                    setGuestForm({ firstName: '', lastName: '', email: '' });
                                }}
                                className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Toggle */}
                        <div className="flex bg-slate-100 rounded-2xl p-1 mb-6">
                            <button
                                onClick={() => setMemberType('registered')}
                                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${memberType === 'registered'
                                    ? 'bg-white shadow text-slate-800'
                                    : 'text-slate-500'
                                    }`}
                            >
                                <UserCircle className="w-4 h-4 inline mr-1.5" />
                                Registered User
                            </button>
                            <button
                                onClick={() => setMemberType('guest')}
                                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${memberType === 'guest'
                                    ? 'bg-white shadow text-slate-800'
                                    : 'text-slate-500'
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
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm transition"
                                    />
                                </div>

                                {searching && (
                                    <p className="text-xs text-slate-400 text-center">Searching...</p>
                                )}

                                {searchResults.length > 0 && (
                                    <div className="space-y-2">
                                        {searchResults.map((profile) => (
                                            <div
                                                key={profile.id}
                                                className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition"
                                            >
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">
                                                        {profile.first_name} {profile.last_name}
                                                    </p>
                                                    <p className="text-xs text-slate-400">@{profile.username}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleAddRegistered(profile)}
                                                    disabled={addingMember}
                                                    className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition"
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
                                        onChange={(e) => setGuestForm({ ...guestForm, firstName: e.target.value })}
                                        className="px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm transition"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        value={guestForm.lastName}
                                        onChange={(e) => setGuestForm({ ...guestForm, lastName: e.target.value })}
                                        className="px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm transition"
                                    />
                                </div>
                                <input
                                    type="email"
                                    placeholder="Email address"
                                    value={guestForm.email}
                                    onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm transition"
                                />
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleAddGuest}
                                    disabled={addingMember}
                                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold text-sm hover:from-emerald-700 hover:to-teal-700 transition shadow-lg disabled:opacity-70"
                                >
                                    {addingMember ? 'Adding...' : 'Add Guest'}
                                </motion.button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </div>
    );
}
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { ArrowRight, Hash } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
<<<<<<< HEAD
import LandingPage from "./LandingPage";
=======

//  Constants

const GUEST_SESSION_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TOAST_STYLE = {
    style: { background: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: '13px' }
};

const FORM_DEFAULT = { firstName: '', lastName: '', email: '' };

//  Helpers

function buildGuestSession(guestId, billId, firstName, lastName, email) {
    return {
        guestId,
        billId,
        expiry: Date.now() + GUEST_SESSION_DURATION_MS,
        name: `${firstName} ${lastName}`,
        email,
    };
}

function getStoredGuestSession() {
    try {
        const stored = localStorage.getItem('guest_session');
        if (!stored) return null;
        const session = JSON.parse(stored);
        if (session.expiry > Date.now()) return session;
        localStorage.removeItem('guest_session');
        return null;
    } catch {
        localStorage.removeItem('guest_session');
        return null;
    }
}

//  Sub-components

function PageShell({ children }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black flex items-center justify-center p-6 text-white">
            <Toaster position="top-center" toastOptions={TOAST_STYLE} />
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 w-full max-w-md p-10"
            >
                <div className="flex justify-center mb-6">
                    <img
                        src="public/hlogo.png"
                        alt="Logo"
                        className="w-40 h-auto object-contain hover:scale-105 transition"
                    />
                </div>
                {children}
            </motion.div>
        </div>
    );
}

function SubmitButton({ onClick, loading, loadingLabel, label }) {
    return (
        <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition disabled:opacity-70"
        >
            {loading ? loadingLabel : <>{label} <ArrowRight className="w-4 h-4" /></>}
        </motion.button>
    );
}

//  Main Component

>>>>>>> 642aa246967318b0c7128ea7f8c6cc78c6038ba5
export default function JoinBill() {
    const navigate = useNavigate();
    const [step, setStep] = useState('code'); // 'code' | 'info'
    const [code, setCode] = useState('');
    const [bill, setBill] = useState(null);
    const [form, setForm] = useState(FORM_DEFAULT);
    const [loading, setLoading] = useState(false);
<<<<<<< HEAD
    const [form, setForm] = useState({
        firstName: '', lastName: '', email: ''
    });
=======

    //  Validate invite code
>>>>>>> 642aa246967318b0c7128ea7f8c6cc78c6038ba5

    // ── Step 1: Validate code ──────────────────────────────────────
    const handleCodeSubmit = async () => {
        if (!code.trim()) return toast.error('Please enter an invite code');
        setLoading(true);
        try {
<<<<<<< HEAD
            const { data, error } = await supabase
=======
            const { data: billData, error } = await supabase
>>>>>>> 642aa246967318b0c7128ea7f8c6cc78c6038ba5
                .from('bills')
                .select('id, name, status, host_id')
                .eq('code', code.trim().toUpperCase())
                .maybeSingle();

            if (error) {
                console.error('[handleCodeSubmit] supabase error:', error);
                return toast.error('Something went wrong');
            }

            if (!billData) return toast.error('Invalid invite code');
            if (billData.status !== 'active') return toast.error('This bill is no longer active');

            setBill(billData);

<<<<<<< HEAD
            // Check if guest already exists with stored session
            const stored = localStorage.getItem('guest_session');
            if (stored) {
                const session = JSON.parse(stored);
                if (session.expiry > Date.now()) {
                    // Valid session — go straight to bill
                    navigate(`/bills/${data.id}?guest=${session.guestId}`);
                    return;
                } else {
                    // Expired session — clear it
                    localStorage.removeItem('guest_session');
=======
            // If guest already has a valid session, skip the info step
            const existingSession = getStoredGuestSession();
            if (existingSession) {
                // Verify the DB row is still valid too
                const { data: memberRow } = await supabase
                    .from('bill_members')
                    .select('expires_at')
                    .eq('guest_id', existingSession.guestId)
                    .eq('bill_id', billData.id)
                    .maybeSingle();

                const isDbValid = memberRow && (
                    !memberRow.expires_at ||
                    new Date(memberRow.expires_at) > new Date()
                );

                if (isDbValid) {
                    navigate(`/bills/${billData.id}?guest=${existingSession.guestId}`);
                    return;
                } else {
                    // DB says expired — clear localStorage too
                    localStorage.removeItem('guest_session');
                    console.warn('[handleCodeSubmit] guest session expired in DB, clearing localStorage');
>>>>>>> 642aa246967318b0c7128ea7f8c6cc78c6038ba5
                }
            }

            setStep('info');
        } catch (err) {
<<<<<<< HEAD
=======
            console.error('[handleCodeSubmit] unexpected error:', err);
>>>>>>> 642aa246967318b0c7128ea7f8c6cc78c6038ba5
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

<<<<<<< HEAD
    // ── Step 2: Submit guest info ──────────────────────────────────
    const handleInfoSubmit = async () => {
        const { firstName, lastName, email } = form;
        if (!firstName.trim() || !lastName.trim() || !email.trim()) {
            return toast.error('All fields are required');
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
=======
    // Submit guest info & join bill

    const handleInfoSubmit = async () => {
        const { firstName, lastName, email } = form;

        if (!firstName.trim() || !lastName.trim() || !email.trim())
            return toast.error('All fields are required');
        if (!EMAIL_REGEX.test(email))
>>>>>>> 642aa246967318b0c7128ea7f8c6cc78c6038ba5
            return toast.error('Please enter a valid email');

            setLoading(true);
            try {
<<<<<<< HEAD
                // Check if guest already exists
                let guestId;
=======
            // Get or create guest record
>>>>>>> 642aa246967318b0c7128ea7f8c6cc78c6038ba5
                const { data: existingGuest } = await supabase
                    .from('guests')
                    .select('id')
                    .eq('email', email.trim())
                    .maybeSingle();

<<<<<<< HEAD
                if (existingGuest) {
                    guestId = existingGuest.id;
                } else {
                    // Create new guest
=======
            let guestId = existingGuest?.id;

            if (!guestId) {
>>>>>>> 642aa246967318b0c7128ea7f8c6cc78c6038ba5
                    const { data: newGuest, error: guestError } = await supabase
                        .from('guests')
                        .insert({
                            first_name: firstName.trim(),
                            last_name: lastName.trim(),
                            email: email.trim(),
                        })
                        .select()
                        .single();

<<<<<<< HEAD
                    if (guestError) throw guestError;
                    guestId = newGuest.id;
                }

                // Check if already a member of this bill
=======
                if (guestError) {
                    console.error('[handleInfoSubmit] create guest error:', guestError);
                    throw guestError;
                }

                guestId = newGuest.id;
            }

            // Check if guest is already a member of this bill
>>>>>>> 642aa246967318b0c7128ea7f8c6cc78c6038ba5
                const { data: existingMember } = await supabase
                    .from('bill_members')
                    .select('id, expires_at')
                    .eq('bill_id', bill.id)
                    .eq('guest_id', guestId)
                    .maybeSingle();

<<<<<<< HEAD
                if (!existingMember) {
                    // Add to bill_members
=======
            const expiresAt = new Date(Date.now() + GUEST_SESSION_DURATION_MS).toISOString();

            if (existingMember) {
                // Refresh their expiry in DB
                const { error: updateError } = await supabase
                    .from('bill_members')
                    .update({ expires_at: expiresAt })
                    .eq('id', existingMember.id);

                if (updateError) {
                    console.error('[handleInfoSubmit] update expires_at error:', updateError);
                    throw updateError;
                }
            } else {
                // Insert new member row with expiry
>>>>>>> 642aa246967318b0c7128ea7f8c6cc78c6038ba5
                    const { error: memberError } = await supabase
                        .from('bill_members')
                        .insert({
                            bill_id: bill.id,
                            guest_id: guestId,
                            role: 'member',
                            member_type: 'guest',
                            expires_at: expiresAt,
                        });

<<<<<<< HEAD
                    if (memberError) throw memberError;
                }

                // Store guest session — 6 hours
                const session = {
                    guestId,
                    billId: bill.id,
                    expiry: Date.now() + 6 * 60 * 60 * 1000,
                    name: `${firstName} ${lastName}`,
                    email: email.trim(),
                };
=======
                if (memberError) {
                    console.error('[handleInfoSubmit] insert member error:', memberError);
                    throw memberError;
                }
            }

            // Save session to localStorage (for client-side context like name/email)
            const session = buildGuestSession(guestId, bill.id, firstName, lastName, email.trim());
>>>>>>> 642aa246967318b0c7128ea7f8c6cc78c6038ba5
                localStorage.setItem('guest_session', JSON.stringify(session));

                toast.success('Joined successfully!');
                navigate(`/bills/${bill.id}?guest=${guestId}`);
            } catch (err) {
<<<<<<< HEAD
                toast.error(err.message);
=======
            console.error('[handleInfoSubmit] unexpected error:', err);
            toast.error(err.message || 'Something went wrong');
>>>>>>> 642aa246967318b0c7128ea7f8c6cc78c6038ba5
            } finally {
                setLoading(false);
            }
        };

        //  Render 

        return (
<<<<<<< HEAD
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100 flex items-center justify-center p-6">
                <Toaster position="top-center" />

                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 w-full max-w-md p-10"
                >
                    <div className="flex justify-center mb-6">
                        <img src="public/hlogo.png" alt="Logo" className="w-40 h-auto object-contain" />
                    </div>

                    {step === 'code' ? (
                        <>
                            <div className="text-center mb-8">
                                <h1 className="text-2xl font-bold text-slate-800">Join a Bill</h1>
                                <p className="text-slate-500 mt-1 text-sm">
                                    Enter the invite code shared with you
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="relative">
                                    <Hash className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Enter invite code"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm font-mono tracking-widest uppercase transition"
                                        maxLength={8}
                                    />
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleCodeSubmit}
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-70"
                                >
                                    {loading ? 'Checking...' : <>Continue <ArrowRight className="w-4 h-4" /></>}
                                </motion.button>
                            </div>

                            <p className="text-center text-sm text-slate-500 mt-8">
                                Have an account?{" "}
                                <Link to="/login" className="text-emerald-600 font-semibold hover:text-emerald-800">
                                    Sign In
                                </Link>
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm font-semibold px-4 py-2 rounded-full mb-4">
                                    📋 {bill?.name}
                                </div>
                                <h1 className="text-2xl font-bold text-slate-800">Who are you?</h1>
                                <p className="text-slate-500 mt-1 text-sm">
                                    Fill in your details to join this bill
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="First Name"
                                        value={form.firstName}
                                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                                        className="px-4 py-3 rounded-xl border border-slate-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm transition"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        value={form.lastName}
                                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                        className="px-4 py-3 rounded-xl border border-slate-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm transition"
                                    />
                                </div>

                                <input
                                    type="email"
                                    placeholder="Email address"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm transition"
                                />

                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleInfoSubmit}
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-70"
                                >
                                    {loading ? 'Joining...' : <>Join Bill <ArrowRight className="w-4 h-4" /></>}
                                </motion.button>
=======
        <PageShell>
                                    {step === 'code' ? (
                                        <>
                                            <div className="text-center mb-8">
                                                <h1 className="text-2xl font-bold">Join a Bill</h1>
                                                <p className="text-slate-400 mt-1 text-sm">Enter the invite code shared with you</p>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="relative">
                                                    <Hash className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                                                    <input
                                                        type="text"
                                                        placeholder="Enter invite code"
                                                        value={code}
                                                        onChange={e => setCode(e.target.value.toUpperCase())}
                                                        onKeyDown={e => e.key === 'Enter' && handleCodeSubmit()}
                                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono tracking-widest uppercase transition"
                                                        maxLength={8}
                                                    />
>>>>>>> 642aa246967318b0c7128ea7f8c6cc78c6038ba5
                                                </div>
                                                <SubmitButton
                                                    onClick={handleCodeSubmit}
                                                    loading={loading}
                                                    loadingLabel="Checking..."
                                                    label="Continue"
                                                />
                                            </div>

<<<<<<< HEAD
        <button
            onClick={() => navigate('/landing')}
            className="w-full text-center text-sm text-slate-400 hover:text-slate-600 mt-4 transition"
        >
            ← Back
        </button>
                    </>
                )
}
            </motion.div >
        </div >
=======
                    <p className="text-center text-sm text-slate-400 mt-8">
                        Have an account?{" "}
                        <Link to="/login" className="text-emerald-400 font-semibold hover:text-emerald-300 transition">
                            Sign In
                        </Link>
                    </p>
                </>
            ) : (
                <>
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 bg-emerald-900/40 text-emerald-400 text-sm font-semibold px-4 py-2 rounded-full mb-4">
                            📋 {bill?.name}
                        </div>
                        <h1 className="text-2xl font-bold">Who are you?</h1>
                        <p className="text-slate-400 mt-1 text-sm">Fill in your details to join this bill</p>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                placeholder="First Name"
                                value={form.firstName}
                                onChange={e => setForm({ ...form, firstName: e.target.value })}
                                className="px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition"
                            />
                            <input
                                type="text"
                                placeholder="Last Name"
                                value={form.lastName}
                                onChange={e => setForm({ ...form, lastName: e.target.value })}
                                className="px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition"
                            />
                        </div>
                        <input
                            type="email"
                            placeholder="Email address"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleInfoSubmit()}
                            className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition"
                        />
                        <SubmitButton
                            onClick={handleInfoSubmit}
                            loading={loading}
                            loadingLabel="Joining..."
                            label="Join Bill"
                        />
                    </div>

                    <button
                        onClick={() => setStep('code')}
                        className="w-full text-center text-sm text-slate-400 hover:text-white mt-4 transition"
                    >
                        ← Back
                    </button>
                </>
            )}
        </PageShell>
>>>>>>> 642aa246967318b0c7128ea7f8c6cc78c6038ba5
    );
}
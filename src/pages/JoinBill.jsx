import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { ArrowRight, Hash } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import LandingPage from "./LandingPage";
export default function JoinBill() {
    const navigate = useNavigate();
    const [step, setStep] = useState('code'); // 'code' | 'info'
    const [code, setCode] = useState('');
    const [bill, setBill] = useState(null);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        firstName: '', lastName: '', email: ''
    });

    // ── Step 1: Validate code ──────────────────────────────────────
    const handleCodeSubmit = async () => {
        if (!code.trim()) return toast.error('Please enter an invite code');
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bills')
                .select('id, name, status, host_id')
                .eq('code', code.trim().toUpperCase())
                .maybeSingle();

            if (error || !data) {
                toast.error('Invalid invite code');
                setLoading(false);
                return;
            }

            if (data.status !== 'active') {
                toast.error('This bill is no longer active');
                setLoading(false);
                return;
            }

            setBill(data);

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
                }
            }

            setStep('info');
        } catch (err) {
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: Submit guest info ──────────────────────────────────
    const handleInfoSubmit = async () => {
        const { firstName, lastName, email } = form;
        if (!firstName.trim() || !lastName.trim() || !email.trim()) {
            return toast.error('All fields are required');
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return toast.error('Please enter a valid email');
        }

        setLoading(true);
        try {
            // Check if guest already exists
            let guestId;
            const { data: existingGuest } = await supabase
                .from('guests')
                .select('id')
                .eq('email', email.trim())
                .maybeSingle();

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
                    })
                    .select()
                    .single();

                if (guestError) throw guestError;
                guestId = newGuest.id;
            }

            // Check if already a member of this bill
            const { data: existingMember } = await supabase
                .from('bill_members')
                .select('id')
                .eq('bill_id', bill.id)
                .eq('guest_id', guestId)
                .maybeSingle();

            if (!existingMember) {
                // Add to bill_members
                const { error: memberError } = await supabase
                    .from('bill_members')
                    .insert({
                        bill_id: bill.id,
                        guest_id: guestId,
                        role: 'member',
                        member_type: 'guest',
                    });

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
            localStorage.setItem('guest_session', JSON.stringify(session));

            toast.success('Joined successfully!');
            navigate(`/bills/${bill.id}?guest=${guestId}`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
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
                        </div>

                        <button
                            onClick={() => navigate('/landing')}
                            className="w-full text-center text-sm text-slate-400 hover:text-slate-600 mt-4 transition"
                        >
                            ← Back
                        </button>
                    </>
                )}
            </motion.div>
        </div>
    );
}
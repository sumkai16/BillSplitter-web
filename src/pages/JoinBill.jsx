import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { resolveEmailIdentity } from "../lib/memberIdentity";
import { ArrowRight, Hash, Mail, User, LogIn, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import PageNavbar, { BrandLogo, NavbarLink } from "../components/PageNavbar";

//  Constants 

const GUEST_SESSION_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TOAST_STYLE = {
    style: { background: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: '13px' }
};

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
            <PageNavbar
                fixed
                maxWidthClass="max-w-6xl"
                className="border-transparent bg-transparent backdrop-blur-0"
                left={<BrandLogo to="/landing" />}
                right={
                    <>
                        <NavbarLink to="/landing" tone="subtle">Home</NavbarLink>
                        <NavbarLink to="/login" tone="subtle">Sign In</NavbarLink>
                    </>
                }
            />
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 w-full max-w-md p-10"
            >
                {children}
            </motion.div>
        </div>
    );
}

function SubmitButton({ onClick, loading, loadingLabel, label, icon: Icon = ArrowRight }) {
    return (
        <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition disabled:opacity-70"
        >
            {loading ? loadingLabel : <>{label} <Icon className="w-4 h-4" /></>}
        </motion.button>
    );
}

function BackButton({ onClick, label = "← Back" }) {
    return (
        <button
            onClick={onClick}
            className="w-full text-center text-sm text-slate-400 hover:text-white mt-4 transition flex items-center justify-center gap-1"
        >
            <ArrowLeft className="w-3.5 h-3.5" />
            {label}
        </button>
    );
}

function StepIndicator({ current, total }) {
    return (
        <div className="flex items-center justify-center gap-2 mb-6">
            {Array.from({ length: total }, (_, i) => (
                <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                        i < current
                            ? 'w-8 bg-emerald-500'
                            : i === current
                            ? 'w-8 bg-emerald-400/60 animate-pulse'
                            : 'w-4 bg-slate-700'
                    }`}
                />
            ))}
        </div>
    );
}

/** Inline banner shown when the email belongs to a registered account */
function RegisteredEmailBanner() {
    return (
        <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center space-y-3"
        >
            <div className="flex items-center justify-center gap-2 text-amber-400">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold text-sm">Account Found</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
                This email is linked to a registered account. Please sign in to join this bill.
            </p>
            <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-5 py-2 rounded-lg text-sm font-semibold transition"
            >
                <LogIn className="w-4 h-4" />
                Go to Sign In
            </Link>
        </motion.div>
    );
}

//  Step animation wrapper 

const stepVariants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
};

//  Main Component 

export default function JoinBill() {
    const navigate = useNavigate();

    // Steps: 'code' → 'email' → 'name' (optional) → join
    const [step, setStep] = useState('code');
    const [code, setCode] = useState('');
    const [bill, setBill] = useState(null);
    const [email, setEmail] = useState('');
    const [emailIdentity, setEmailIdentity] = useState(null); // result from resolveEmailIdentity
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [loading, setLoading] = useState(false);

    const stepIndex = step === 'code' ? 0 : step === 'email' ? 1 : 2;

    //  Step 1 – Validate invite code 

    const handleCodeSubmit = async () => {
        if (!code.trim()) return toast.error('Please enter an invite code');

        setLoading(true);
        try {
            const { data: billData, error } = await supabase
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

            // If guest already has a valid session, skip the remaining steps
            const existingSession = getStoredGuestSession();
            if (existingSession) {
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
                    localStorage.removeItem('guest_session');
                    console.warn('[handleCodeSubmit] guest session expired in DB, clearing localStorage');
                }
            }

            setStep('email');
        } catch (err) {
            console.error('[handleCodeSubmit] unexpected error:', err);
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    //  Step 2 – Verify email 

    const handleEmailSubmit = async () => {
        if (!email.trim()) return toast.error('Please enter your email');
        if (!EMAIL_REGEX.test(email)) return toast.error('Please enter a valid email');

        setLoading(true);
        try {
            const identity = await resolveEmailIdentity(email);
            setEmailIdentity(identity);

            if (identity.kind === 'profile') {
                // Registered user → show inline banner (handled in render)
                // We don't navigate away; the banner + "Go to Sign In" link appear in-place
                return;
            }

            if (identity.kind === 'guest') {
                // Known guest → auto-join using existing guest record
                toast.success(`Welcome back, ${identity.guest.first_name}!`);
                await joinBill({
                    guestId: identity.guest.id,
                    firstName: identity.guest.first_name,
                    lastName: identity.guest.last_name,
                    normalizedEmail: identity.normalizedEmail,
                });
                return;
            }

            // Brand-new email → ask for name
            setStep('name');
        } catch (err) {
            console.error('[handleEmailSubmit] unexpected error:', err);
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    //  Step 3 – Collect name for new guest 

    const handleNameSubmit = async () => {
        if (!firstName.trim() || !lastName.trim())
            return toast.error('Please enter your first and last name');

        setLoading(true);
        try {
            // Create the guest record
            const { data: newGuest, error: guestError } = await supabase
                .from('guests')
                .insert({
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    email: emailIdentity.normalizedEmail,
                })
                .select()
                .single();

            if (guestError) {
                console.error('[handleNameSubmit] create guest error:', guestError);
                throw guestError;
            }

            await joinBill({
                guestId: newGuest.id,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                normalizedEmail: emailIdentity.normalizedEmail,
            });
        } catch (err) {
            console.error('[handleNameSubmit] unexpected error:', err);
            toast.error(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    //  Shared – add guest to bill & navigate 

    const joinBill = async ({ guestId, firstName, lastName, normalizedEmail }) => {
        const expiresAt = new Date(Date.now() + GUEST_SESSION_DURATION_MS).toISOString();

        // Check if already a member of this bill
        const { data: existingMember, error: lookupError } = await supabase
            .from('bill_members')
            .select('id, expires_at')
            .eq('bill_id', bill.id)
            .eq('guest_id', guestId)
            .maybeSingle();

        if (lookupError) throw lookupError;

        if (existingMember) {
            // Refresh expiry
            const { error: updateError } = await supabase
                .from('bill_members')
                .update({ expires_at: expiresAt })
                .eq('id', existingMember.id);

            if (updateError) {
                console.error('[joinBill] update expires_at error:', updateError);
                throw updateError;
            }
        } else {
            // Insert new member row
            const { error: memberError } = await supabase
                .from('bill_members')
                .insert({
                    bill_id: bill.id,
                    guest_id: guestId,
                    role: 'member',
                    member_type: 'guest',
                    expires_at: expiresAt,
                });

            if (memberError) {
                console.error('[joinBill] insert member error:', memberError);
                throw memberError;
            }
        }

        // Save local session
        const session = buildGuestSession(guestId, bill.id, firstName, lastName, normalizedEmail);
        localStorage.setItem('guest_session', JSON.stringify(session));

        toast.success('Joined successfully!');
        navigate(`/bills/${bill.id}?guest=${guestId}`);
    };

    //  Render 

    return (
        <PageShell>
            <StepIndicator current={stepIndex} total={3} />

            <AnimatePresence mode="wait">
                {/* ── Step 1 : Invite Code ── */}
                {step === 'code' && (
                    <motion.div key="code" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
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
                            </div>
                            <SubmitButton
                                onClick={handleCodeSubmit}
                                loading={loading}
                                loadingLabel="Checking..."
                                label="Continue"
                            />
                        </div>

                        <p className="text-center text-sm text-slate-400 mt-8">
                            Have an account?{" "}
                            <Link to="/login" className="text-emerald-400 font-semibold hover:text-emerald-300 transition">
                                Sign In
                            </Link>
                        </p>
                    </motion.div>
                )}

                {/* ── Step 2 : Email Verification ── */}
                {step === 'email' && (
                    <motion.div key="email" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 bg-emerald-900/40 text-emerald-400 text-sm font-semibold px-4 py-2 rounded-full mb-4">
                                📋 {bill?.name}
                            </div>
                            <h1 className="text-2xl font-bold">Verify your email</h1>
                            <p className="text-slate-400 mt-1 text-sm">
                                We'll check if you've joined before
                            </p>
                        </div>

                        <div className="space-y-4">
                            {/* Show registered-account banner if email belongs to a profile */}
                            {emailIdentity?.kind === 'profile' ? (
                                <RegisteredEmailBanner />
                            ) : (
                                <>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                                        <input
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={e => {
                                                setEmail(e.target.value);
                                                // Reset identity if user changes email after a "profile" hit
                                                if (emailIdentity) setEmailIdentity(null);
                                            }}
                                            onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition"
                                        />
                                    </div>
                                    <SubmitButton
                                        onClick={handleEmailSubmit}
                                        loading={loading}
                                        loadingLabel="Verifying..."
                                        label="Continue"
                                        icon={CheckCircle2}
                                    />
                                </>
                            )}
                        </div>

                        <BackButton
                            onClick={() => {
                                setStep('code');
                                setEmailIdentity(null);
                                setEmail('');
                            }}
                        />
                    </motion.div>
                )}

                {/* ── Step 3 : Name (new guest only) ── */}
                {step === 'name' && (
                    <motion.div key="name" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 bg-emerald-900/40 text-emerald-400 text-sm font-semibold px-4 py-2 rounded-full mb-4">
                                📋 {bill?.name}
                            </div>
                            <h1 className="text-2xl font-bold">What's your name?</h1>
                            <p className="text-slate-400 mt-1 text-sm">We'll use this to identify you on the bill</p>
                            <div className="mt-3 inline-flex items-center gap-1.5 bg-slate-800/80 text-slate-300 text-xs px-3 py-1.5 rounded-lg">
                                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                                {email}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="relative">
                                    <User className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="First Name"
                                        value={firstName}
                                        onChange={e => setFirstName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition"
                                    />
                                </div>
                                <div className="relative">
                                    <User className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        value={lastName}
                                        onChange={e => setLastName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition"
                                    />
                                </div>
                            </div>
                            <SubmitButton
                                onClick={handleNameSubmit}
                                loading={loading}
                                loadingLabel="Joining..."
                                label="Join Bill"
                            />
                        </div>

                        <BackButton
                            onClick={() => {
                                setStep('email');
                                setFirstName('');
                                setLastName('');
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </PageShell>
    );
}

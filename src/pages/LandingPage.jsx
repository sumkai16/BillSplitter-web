import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
    Receipt, Users, Wallet, Zap, Shield, Star,
    ArrowRight, Check, ChevronDown, Menu, X
} from "lucide-react";

// ── Fade-in on scroll ──────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = "" }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// ── Nav ────────────────────────────────────────────────────────────
function Navbar() {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-md shadow-sm" : "bg-transparent"}`}>
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                <img src="public/hlogo.png" alt="BillSplitter" className="h-10 w-auto" />

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                    <a href="#features" className="hover:text-emerald-600 transition">Features</a>
                    <a href="#pricing" className="hover:text-emerald-600 transition">Pricing</a>
                    <a href="#faq" className="hover:text-emerald-600 transition">FAQ</a>

                </nav>

                <div className="hidden md:flex items-center gap-3">
                    <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition px-4 py-2">
                        Sign In
                    </Link>
                    <Link to="/register" className="text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-2.5 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition shadow-md shadow-emerald-200">
                        Get Started Free
                    </Link>

                </div>

                {/* Mobile menu toggle */}
                <button onClick={() => setOpen(!open)} className="md:hidden text-slate-600">
                    {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile menu */}
            {open && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-3"
                >
                    <a href="#features" onClick={() => setOpen(false)} className="block text-sm font-medium text-slate-600 py-2">Features</a>
                    <a href="#pricing" onClick={() => setOpen(false)} className="block text-sm font-medium text-slate-600 py-2">Pricing</a>
                    <a href="#faq" onClick={() => setOpen(false)} className="block text-sm font-medium text-slate-600 py-2">FAQ</a>
                    <Link to="/login" className="block text-sm font-semibold text-slate-600 py-2">Sign In</Link>
                    <Link to="/register" className="block text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-3 rounded-xl text-center">
                        Get Started Free
                    </Link>
                </motion.div>
            )}
        </header>
    );
}

// ── Hero ───────────────────────────────────────────────────────────
function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100 pt-20">
            {/* Background blobs */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-100/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative max-w-5xl mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-emerald-200 text-emerald-700 text-xs font-semibold px-4 py-2 rounded-full mb-8 shadow-sm"
                >
                    <Zap className="w-3.5 h-3.5" />
                    No more awkward money conversations
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-5xl md:text-7xl font-extrabold text-slate-900 leading-tight tracking-tight mb-6"
                >
                    Split bills.{" "}
                    <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                        Not friendships.
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed"
                >
                    The easiest way to track shared expenses with friends, family, or teammates.
                    Create a bill, invite people, and let us handle the math.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <Link
                        to="/register"
                        className="group flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-2xl font-bold text-base hover:from-emerald-700 hover:to-teal-700 transition-all shadow-xl shadow-emerald-200 hover:shadow-emerald-300 hover:scale-105"
                    >
                        Start for Free
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link
                        to="/login"
                        className="flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200 text-slate-700 px-8 py-4 rounded-2xl font-bold text-base hover:bg-white transition-all shadow-md hover:scale-105"
                    >
                        Sign In
                    </Link>
                    <Link to='/join' className="flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200 text-slate-700 px-8 py-4 rounded-2xl font-bold text-base hover:bg-white transition-all shadow-md hover:scale-105">
                        Join a Bill
                    </Link>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-xs text-slate-400 mt-6"
                >
                    Free forever · No credit card required · Setup in 2 minutes
                </motion.p>

                {/* Scroll indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2"
                >
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                        <ChevronDown className="w-6 h-6 text-slate-400" />
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

// ── Features ───────────────────────────────────────────────────────

// ── Pricing ────────────────────────────────────────────────────────


// ── FAQ ────────────────────────────────────────────────────────────


// ── CTA Banner ─────────────────────────────────────────────────────

// ── Footer ─────────────────────────────────────────────────────────
function Footer() {
    return (
        <footer className="bg-slate-900 text-slate-400 py-12">
            <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                    <img src="public/hlogo.png" alt="BillSplitter" className="h-8 w-auto brightness-0 invert opacity-80" />
                </div>

                <nav className="flex items-center gap-6 text-sm">
                    <a href="#features" className="hover:text-white transition">Features</a>
                    <a href="#pricing" className="hover:text-white transition">Pricing</a>
                    <a href="#faq" className="hover:text-white transition">FAQ</a>
                    <Link to="/login" className="hover:text-white transition">Sign In</Link>
                    <Link to="/register" className="hover:text-white transition">Register</Link>
                </nav>

                <p className="text-xs text-slate-600">
                    © {new Date().getFullYear()} BillSplitter. All rights reserved.
                </p>
            </div>
        </footer>
    );
}

// ── Main Export ────────────────────────────────────────────────────
export default function LandingPage() {
    return (
        <div className="font-sans antialiased">
            <Navbar />
            <Hero />

            <Footer />
        </div>
    );
}
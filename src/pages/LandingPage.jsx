import { Activity, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import PageNavbar, { BrandLogo, NavbarLink } from "../components/PageNavbar";
import {
    Receipt, Users, Wallet,
    ArrowRight, ChevronDown, Menu, X,
    ActivityIcon,
    HandCoinsIcon
} from "lucide-react";

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

function Navbar({ isAuthenticated }) {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <PageNavbar
            fixed
            maxWidthClass="max-w-6xl"
            className={scrolled ? "" : "border-transparent bg-transparent backdrop-blur-0"}
            left={<BrandLogo to={isAuthenticated ? "/dashboard" : "/landing"} />}
            center={
                <>
                    <a href="#about" className="text-sm font-medium text-slate-300 transition hover:text-emerald-400">About</a>
                    <a href="#how" className="text-sm font-medium text-slate-300 transition hover:text-emerald-400">How It Works</a>
                    <a href="#features" className="text-sm font-medium text-slate-300 transition hover:text-emerald-400">Features</a>
                </>
            }
            right={
                <>
                    <div className="hidden md:flex items-center gap-2">
                        {isAuthenticated ? (
                            <>
                                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300">
                                    Session active
                                </span>
                                <NavbarLink to="/dashboard" tone="primary">Open Dashboard</NavbarLink>
                            </>
                        ) : (
                            <>
                                <NavbarLink to="/login" tone="subtle">Sign In</NavbarLink>
                                <NavbarLink to="/register" tone="primary">Get Started</NavbarLink>
                            </>
                        )}
                    </div>
                    <button onClick={() => setOpen(!open)} className="md:hidden text-slate-300">
                        {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </>
            }
        />
    );
}

function Hero({ isAuthenticated }) {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-black via-slate-900 to-black pt-20 text-white">

            <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />

            <div className="relative max-w-5xl mx-auto px-6 text-center">

                <motion.h1
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl md:text-7xl font-extrabold mb-6"
                >
                    Split expenses.
                    <span className="text-emerald-400"> Stay organized.</span>
                </motion.h1>

                <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
                    Easily manage shared bills with friends, roommates, or teammates.
                </p>

                {isAuthenticated && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 mb-6">
                        Your session is active
                    </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">

                    <Link
                        to={isAuthenticated ? "/dashboard" : "/register"}
                        className="group flex items-center gap-2 bg-emerald-500 text-black px-8 py-4 rounded-full font-bold hover:bg-emerald-400"
                    >
                        {isAuthenticated ? "Continue to Dashboard" : "Start for Free"}
                        <ArrowRight className="w-4 h-4" />
                    </Link>

                    {!isAuthenticated && (
                        <Link
                            to="/login"
                            className="bg-slate-900 border border-slate-700 text-white px-8 py-4 rounded-full font-bold"
                        >
                            Sign In
                        </Link>
                    )}

                    <Link
                        to="/join"
                        className="bg-slate-900 border border-slate-700 text-white px-8 py-4 rounded-full font-bold"
                    >
                        Join a Bill
                    </Link>

                </div>

                <motion.div
                    className="absolute bottom-[-100px] left-1/2 -translate-x-1/2 cursor-pointer"
                    onClick={() => {
                        const section = document.getElementById("about");
                        if (section) section.scrollIntoView({ behavior: "smooth" });
                    }}
                >
                    <ChevronDown className="w-6 h-6 text-slate-500 hover:text-emerald-400" />
                </motion.div>

            </div>
        </section>
    );
}

function About() {
    return (
        <section id="about" className="bg-black text-white py-24">

            <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">

                <FadeIn>
                    <h2 className="text-4xl font-bold mb-6">
                        What is Bill Splitting?
                    </h2>

                    <p className="text-slate-400 text-lg leading-relaxed mb-6">
                        Bill splitting is the process of dividing shared expenses among multiple people.
                        It commonly happens when friends share meals, roommates share utilities,
                        or teams manage group expenses.
                    </p>

                    <p className="text-slate-400 text-lg leading-relaxed">
                        Splitify simplifies this process by automatically calculating who owes what,
                        allowing groups to manage expenses transparently and efficiently.
                    </p>
                </FadeIn>

                <FadeIn delay={0.2}>
                    <div className="bg-slate-900 p-10 rounded-2xl border border-slate-800">
                        <p className="text-slate-400">
                            Instead of manually computing expenses or sending multiple messages,
                            Splitify organizes everything into a single shared bill system.
                        </p>
                    </div>
                </FadeIn>

            </div>
        </section>
    );
}

function HowItWorks() {

    const steps = [
        {
            icon: <Receipt className="w-8 h-8 text-emerald-400" />,
            title: "Create a Bill",
            desc: "Add the expense and define the total amount."
        },
        {
            icon: <Users className="w-8 h-8 text-emerald-400" />,
            title: "Invite Participants",
            desc: "Add friends or teammates to share the bill."
        },
        {
            icon: <Wallet className="w-8 h-8 text-emerald-400" />,
            title: "Track Balances",
            desc: "Instantly see who owes what and settle payments."
        }
    ];

    return (
        <section id="how" className="bg-slate-950 text-white py-24">

            <div className="max-w-6xl mx-auto px-6">

                <FadeIn className="text-center mb-16">
                    <h2 className="text-4xl font-bold">
                        How Splitify Works
                    </h2>
                </FadeIn>

                <div className="grid md:grid-cols-3 gap-10">

                    {steps.map((step, i) => (

                        <FadeIn key={i} delay={i * 0.2}>

                            <div className="bg-black border border-slate-800 p-8 rounded-2xl">

                                <div className="mb-4">
                                    {step.icon}
                                </div>

                                <h3 className="text-xl font-semibold mb-2">
                                    {step.title}
                                </h3>

                                <p className="text-slate-400">
                                    {step.desc}
                                </p>

                            </div>

                        </FadeIn>

                    ))}

                </div>

            </div>

        </section>
    );
}

function Features() {

    const features = [
        { icon: <HandCoinsIcon className="w-8 h-8 text-emerald-400" />, text: "Automatic expense calculation" },
        { icon: <Wallet className="w-8 h-8 text-emerald-400" />, text: "Real-time balance tracking" },
        { icon: <Users className="w-8 h-8 text-emerald-400" />, text: "Simple group expense management" },
        { icon: <ActivityIcon className="w-8 h-8 text-emerald-400" />, text: "Clear payment summaries" }
    ];

    return (
        <section id="features" className="bg-black text-white py-24">

            <div className="max-w-6xl mx-auto px-6">

                <FadeIn className="text-center mb-16">
                    <h2 className="text-4xl font-bold">
                        Key Features
                    </h2>
                </FadeIn>

                <div className="grid md:grid-cols-2 gap-8">

                    {features.map((feature, i) => (

                        <FadeIn key={i} delay={i * 0.15}>

                            <div className="flex items-center gap-4 bg-slate-900 p-6 rounded-xl border border-slate-800">

                                <div className="bg-emerald-500/10 p-3 rounded-lg">
                                    {feature.icon}
                                </div>

                                <p className="text-slate-300">
                                    {feature.text}
                                </p>

                            </div>

                        </FadeIn>

                    ))}

                </div>

            </div>

        </section>
    );
}

function Footer() {
    return (
        <footer className="bg-black border-t border-slate-800 text-slate-400 py-12">

            <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">

                <img src="/hlogo.png" alt="BillSplitter" className="h-8 w-auto" />

                <nav className="flex items-center gap-6 text-sm">

                    <a href="#about" className="hover:text-white">About</a>
                    <a href="#how" className="hover:text-white">How it Works</a>
                    <a href="#features" className="hover:text-white">Features</a>

                </nav>

                <p className="text-xs text-slate-600">
                    © {new Date().getFullYear()} BillSplitter. All rights reserved.
                </p>

            </div>

        </footer>
    );
}

export default function LandingPage() {
    const { user } = useAuth();
    const isAuthenticated = Boolean(user);

    return (
        <div className="font-sans antialiased bg-black text-white">

            <Navbar isAuthenticated={isAuthenticated} />
            <Hero isAuthenticated={isAuthenticated} />
            <About />
            <HowItWorks />
            <Features />
            <Footer />

        </div>
    );
}

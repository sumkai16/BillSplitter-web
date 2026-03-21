import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Check, Lock } from 'lucide-react';

//  Upgrade Modal 
// Shown when a standard user hits a plan limit.
// limitType: 'bills' | 'members'

const LIMIT_COPY = {
    bills: {
        icon: '📋',
        title: "You've reached your bill limit",
        description: "Standard accounts can create up to 5 bills per month. Upgrade to Premium for unlimited bills.",
    },
    members: {
        icon: '👥',
        title: "You've reached your member limit",
        description: "Standard accounts can add up to 3 members per bill (including you). Upgrade to Premium for unlimited members.",
    },
};

const PREMIUM_FEATURES = [
    'Unlimited bills per month',
    'Unlimited members per bill',
    'Priority support',
    'Advanced expense analytics',
];

export default function UpgradeModal({ open, onClose, limitType = 'bills' }) {
    const copy = LIMIT_COPY[limitType] || LIMIT_COPY.bills;

    return (
        <AnimatePresence>
            {open && (
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
                        className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md overflow-hidden"
                    >
                        {/* Header */}
                        <div className="relative bg-gradient-to-br from-amber-950/60 to-slate-900 border-b border-slate-800 p-6">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 transition text-slate-500"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="text-3xl mb-3">{copy.icon}</div>
                            <h2 className="font-bold text-white text-lg leading-snug">{copy.title}</h2>
                            <p className="text-slate-400 text-sm mt-2 leading-relaxed">{copy.description}</p>
                        </div>

                        {/* Premium features */}
                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Zap className="w-4 h-4 text-amber-400" />
                                <p className="text-sm font-semibold text-white">Premium includes</p>
                            </div>

                            <div className="space-y-2 mb-6">
                                {PREMIUM_FEATURES.map((feature, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-emerald-950 flex items-center justify-center flex-shrink-0">
                                            <Check className="w-3 h-3 text-emerald-400" />
                                        </div>
                                        <span className="text-sm text-slate-300">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            {/* CTA */}
                            <button
                                onClick={() => {
                                    // Placeholder — wire up real payment flow here
                                    alert('Payment flow coming soon!');
                                }}
                                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
                            >
                                <Zap className="w-4 h-4" />
                                Upgrade to Premium
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full mt-3 py-2 text-sm text-slate-500 hover:text-slate-300 transition"
                            >
                                Maybe later
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
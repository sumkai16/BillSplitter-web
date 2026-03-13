import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import { ArrowLeft, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

export default function Archive() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [archivedBills, setArchivedBills] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchArchived = async () => {
            const { data, error } = await supabase
                .from('bills')
                .select('*')
                .eq('host_id', user.id)
                .eq('status', 'archived')
                .order('created_at', { ascending: false });

            if (!error) setArchivedBills(data);
            setLoading(false);
        };
        fetchArchived();
    }, [user.id]);

    const handleUnarchive = async (billId) => {
        const { error } = await supabase
            .from('bills')
            .update({ status: 'active' })
            .eq('id', billId);

        if (error) return toast.error('Failed to unarchive');
        toast.success('Bill restored to active');
        setArchivedBills(prev => prev.filter(b => b.id !== billId));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white">
            <Toaster position="top-center" />

            <div className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 rounded-xl hover:bg-slate-800 transition text-slate-400"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="font-bold text-white">Archived Bills</h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : archivedBills.length === 0 ? (
                    <div className="text-center py-20">
                        <span className="text-4xl">📦</span>
                        <p className="text-slate-400 text-sm mt-3">No archived bills yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {archivedBills.map((bill, i) => (
                            <motion.div
                                key={bill.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center justify-between p-4 rounded-2xl border border-slate-800 hover:border-slate-700 transition cursor-pointer"
                                onClick={() => navigate(`/bills/${bill.id}`)}
                            >
                                <div>
                                    <p className="font-semibold text-white text-sm">{bill.name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Code: <span className="font-mono font-bold">{bill.code}</span>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {new Date(bill.created_at).toLocaleDateString('en-US', {
                                            year: 'numeric', month: 'long', day: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400 font-medium">
                                        archived
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleUnarchive(bill.id);
                                        }}
                                        className="px-3 py-1.5 rounded-xl border border-slate-700 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-400 text-xs font-medium transition"
                                    >
                                        Restore
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
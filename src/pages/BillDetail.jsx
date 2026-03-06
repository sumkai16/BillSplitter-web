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
        setLoading(false);

    };

    useEffect(() => {
        fetchBillData();
    }, [id]);

    const copyCode = () => {
        navigator.clipboard.writeText(bill.code);
        toast.success('Code copied!');
    };

    if (loading) {

        return (

            <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black flex items-center justify-center">

                <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"/>

            </div>

        );

    }

    return (

        <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white">

            <Toaster position="top-center"/>

            {/* Header */}

            <div className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-10">

                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 rounded-xl hover:bg-slate-800 transition text-slate-400"
                    >
                        <ArrowLeft className="w-5 h-5"/>
                    </button>

                    <div className="flex-1">

                        <h1 className="font-bold text-white">
                            {bill.name}
                        </h1>

                        <p className="text-xs text-slate-400">
                            {members.length} member{members.length !== 1 ? 's' : ''}
                        </p>

                    </div>

                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        bill.status === 'Active'
                            ? 'bg-emerald-900/40 text-emerald-400'
                            : 'bg-gray-800 text-gray-400'
                    }`}>
                        {bill.status}
                    </span>

                </div>

            </div>

            <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">

                {/* Invite Code Card */}

                <motion.div
                    initial={{ opacity:0,y:20 }}
                    animate={{ opacity:1,y:0 }}
                    className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-6"
                >

                    <div className="flex items-start justify-between gap-4">

                        <div>

                            <h3 className="font-bold text-white flex items-center gap-2">

                                <Receipt className="w-4 h-4 text-emerald-400"/>

                                Invite Code

                            </h3>

                            <p className="text-xs text-slate-400">
                                Share this code to invite people
                            </p>

                        </div>

                    </div>

                    <div className="mt-4 flex gap-3">

                        <div className="flex-1 bg-slate-800 rounded-2xl px-6 py-4 font-mono font-bold text-2xl tracking-widest text-white text-center border border-slate-700">

                            {bill.code}

                        </div>

                        <button
                            onClick={copyCode}
                            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-400 transition"
                        >
                            <Copy className="w-5 h-5"/>
                        </button>

                    </div>

                </motion.div>

                {/* Members */}

                <motion.div
                    initial={{ opacity:0,y:20 }}
                    animate={{ opacity:1,y:0 }}
                    className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-6"
                >

                    <h3 className="font-bold text-white flex items-center gap-2 mb-4">

                        <Users className="w-4 h-4 text-emerald-400"/>

                        Members ({members.length})

                    </h3>

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

                                    <div>

                                        <p className="text-sm font-semibold text-white">
                                            {name}
                                        </p>

                                        <p className="text-xs text-slate-400">
                                            {email}
                                        </p>

                                    </div>

                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                        member.role === 'host'
                                            ? 'bg-emerald-900/40 text-emerald-400'
                                            : 'bg-gray-800 text-gray-400'
                                    }`}>

                                        {member.role === 'host' ? 'Host' : 'Member'}

                                    </span>

                                </div>

                            );

                        })}

                    </div>

                </motion.div>

                {/* Expenses */}

                <motion.div
                    initial={{ opacity:0,y:20 }}
                    animate={{ opacity:1,y:0 }}
                    className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-6"
                >

                    <div className="flex items-center justify-between mb-4">

                        <h3 className="font-bold text-white flex items-center gap-2">

                            <Receipt className="w-4 h-4 text-emerald-400"/>

                            Expenses

                        </h3>

                        <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-semibold transition">

                            + Add Expense

                        </button>

                    </div>

                    <div className="text-center py-12 text-slate-400">

                        No expenses yet.

                    </div>

                </motion.div>

            </div>

        </div>

    );

}
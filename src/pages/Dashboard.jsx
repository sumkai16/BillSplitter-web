import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import {
  LogOut,
  User,
  Mail,
  AtSign,
  Shield,
  Calendar,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const accountBadge = {
  guest: { label: "Guest", color: "bg-gray-700 text-gray-300" },
  standard: { label: "Standard", color: "bg-gray-600/40 text-white-400" },
  premium: { label: "Premium ⭐", color: "bg-amber-500/20 text-white-400" },
};

export default function Dashboard() {

  const { user, signOut } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showCreateBill, setShowCreateBill] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {

    const fetchProfile = async () => {

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) toast.error("Failed to load profile");
      else setProfile(data);

      setLoading(false);

    };

    const fetchBills = async () => {

      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("host_id", user.id)
        .order("created_at", { ascending: false });

      if (!error) setBills(data);

    };

    fetchBills();
    fetchProfile();

  }, [user.id]);

  const badge = accountBadge[profile?.account_type] || accountBadge.standard;

  const generateCode = () => {

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    return Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");

  };

  const [billName, setBillName] = useState("");
  const [billCode, setBillCode] = useState(generateCode());
  const [billLoading, setBillLoading] = useState(false);
  const [bills, setBills] = useState([]);

  const handleCreateBill = async () => {

    if (!billName.trim()) return toast.error("Bill name is required");

    setBillLoading(true);

    try {

      const { data: bill, error: billError } = await supabase
        .from("bills")
        .insert({
          name: billName.trim(),
          code: billCode,
          host_id: profile.id,
          status: "active",
        })
        .select()
        .single();

      if (billError) throw billError;

      const { error: memberError } = await supabase
        .from("bill_members")
        .insert({
          bill_id: bill.id,
          user_id: profile.id,
          role: "host",
          member_type: "registered",
        });

      if (memberError) throw memberError;

      toast.success("Bill created successfully");

      setBills((prevBills) => [bill, ...prevBills]);
      setShowCreateBill(false);
      setBillName("");
      setBillCode(generateCode());

    } catch {

      toast.error("Failed to create bill");

    } finally {

      setBillLoading(false);

    }

  };

  if (!user) return null;

  return (

    <div className="relative min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white">

      {/* Background Glow */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl"/>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl"/>

      <Toaster position="top-center"/>

      {/* Navbar */}
      <div className="flex justify-between items-center px-8 py-6 border-b border-slate-800">

        <img
          src="public/hlogo.png"
          alt="Logo"
          className="w-40 hover:scale-105 transition"
        />

        <div className="flex items-center gap-6">

          <span className="text-slate-300 font-medium text-lg">
            {profile?.first_name}
          </span>

          <button
            onClick={signOut}
            className="flex items-center gap-2 text-red-400 hover:text-red-500 transition"
          >
            <LogOut className="w-5 h-5"/>
            Logout
          </button>

        </div>

      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 relative">

        {loading ? (

          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"/>
          </div>

        ) : (

          <>

            {/* Welcome */}
            <motion.div
              initial={{ opacity:0,y:20 }}
              animate={{ opacity:1,y:0 }}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-3xl p-8 shadow-xl"
            >

              <div className="flex justify-between items-start">

                <div>

                  <p className="text-emerald-100 text-sm mb-1">
                    Welcome back
                  </p>

                  <h2 className="text-3xl font-bold">
                    {profile?.first_name} {profile?.last_name}
                  </h2>

                  <p className="text-emerald-100 text-sm">
                    @{profile?.username}
                  </p>

                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
                  {badge.label}
                </span>

              </div>

            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity:0,y:20 }}
              animate={{ opacity:1,y:0 }}
              transition={{ delay:0.1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >

              <StatCard icon={Receipt} label="Total Bills" value={bills.length}/>
              <StatCard icon={Users} label="Active Members" value=""/>
              <StatCard icon={Wallet} label="Total Expenses" value=""/>

            </motion.div>

            {/* Account Details */}
            <motion.div
              initial={{ opacity:0,y:20 }}
              animate={{ opacity:1,y:0 }}
              transition={{ delay:0.2 }}
              className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-6"
            >

              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400"/>
                Account Details
              </h3>

              <div className="space-y-3">

                {[
                  { icon:Mail,label:"Email",value:profile?.email },
                  { icon:AtSign,label:"Nickname",value:profile?.nickname },
                  { icon:Shield,label:"Account Type",value:profile?.account_type },
                  {
                    icon:Calendar,
                    label:"Member Since",
                    value:profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString()
                      : ""
                  },
                ].map(({icon:Icon,label,value}) => (

                  <div
                    key={label}
                    className="flex justify-between py-2 border-b border-slate-800 last:border-0"
                  >

                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Icon className="w-4 h-4"/>
                      {label}
                    </div>

                    <span className="text-sm text-white">
                      {value
                        ? value.charAt(0).toUpperCase()+value.slice(1)
                        : "—"}
                    </span>

                  </div>

                ))}

              </div>

            </motion.div>

            {/* Bills */}
            <motion.div
              initial={{ opacity:0,y:20 }}
              animate={{ opacity:1,y:0 }}
              transition={{ delay:0.3 }}
              className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-6"
            >

              <div className="flex justify-between mb-4">

                <h3 className="flex items-center gap-2 font-semibold">
                  <Receipt className="w-4 h-4 text-emerald-400"/>
                  My Bills
                </h3>

                <button
                  onClick={()=>setShowCreateBill(true)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-semibold transition"
                >
                  + New Bill
                </button>

              </div>

              {bills.length === 0 ? (

                <div className="text-center py-10 text-slate-400">
                  No bills yet. Create one to get started!
                </div>

              ) : (

                <div className="space-y-3">

                  {bills.map((bill)=>(
                    <div
                      key={bill.id}
                      onClick={()=>navigate(`/bills/${bill.id}`)}
                      className="flex justify-between p-4 rounded-xl border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800 transition cursor-pointer"
                    >

                      <div>

                        <p className="font-semibold text-sm">
                          {bill.name}
                        </p>

                        <p className="text-xs text-slate-400">
                          Code: {bill.code}
                        </p>

                      </div>

                      <span className={`text-xs px-2 py-1 rounded-full ${
                        bill.status === "active"
                          ? "bg-emerald-900/40 text-emerald-400"
                          : "bg-gray-800 text-gray-400"
                      }`}>
                        {bill.status}
                      </span>

                    </div>
                  ))}

                </div>

              )}

            </motion.div>

          </>
        )}

      </div>

    </div>
  );

}

function StatCard({ icon:Icon,label,value }) {

  return (

    <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-6 hover:border-emerald-500/40 transition">

      <div className="flex justify-between items-center">

        <p className="text-sm text-slate-400">
          {label}
        </p>

        <Icon className="w-5 h-5 text-emerald-400"/>

      </div>

      <h3 className="text-2xl font-bold mt-2">
        {value}
      </h3>

    </div>

  );

}
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const LIMITS = {
    standard: { billsPerMonth: 5, membersPerBill: 3 },
};

export function useLimits(userId, currentMemberCount = 0) {
    const [accountType, setAccountType] = useState('standard');
    const [billsThisMonth, setBillsThisMonth] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchLimits = useCallback(async () => {
        if (!userId) return;
        setLoading(true);

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('account_type')
            .eq('id', userId)
            .single();

        if (profileError) console.error('[useLimits] profile error:', profileError);

        const type = profile?.account_type || 'standard';
        setAccountType(type);

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { count, error: countError } = await supabase
            .from('bills')
            .select('id', { count: 'exact', head: true })
            .eq('host_id', userId)
            .gte('created_at', monthStart);

        if (countError) console.error('[useLimits] bill count error:', countError);

        setBillsThisMonth(count || 0);
        setLoading(false);
    }, [userId]);

    useEffect(() => { fetchLimits(); }, [fetchLimits]);

    const isPremium = accountType === 'premium';
    const isStandard = accountType === 'standard';
    const billLimit = LIMITS.standard.billsPerMonth;
    const memberLimit = LIMITS.standard.membersPerBill;

    const canCreateBill = isPremium || billsThisMonth < billLimit;
    const canAddMember = isPremium || currentMemberCount < memberLimit;

    return {
        accountType, isStandard, isPremium,
        billsThisMonth, billLimit, memberLimit,
        canCreateBill, canAddMember,
        loading, refetchLimits: fetchLimits,
    };
}
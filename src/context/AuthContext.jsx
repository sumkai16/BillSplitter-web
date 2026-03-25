import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null)
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then((response) => {
            const nextSession = response?.data?.session ?? null
            setSession(nextSession)
            setUser(nextSession?.user ?? null)
            setLoading(false)
        })
        const result = supabase.auth.onAuthStateChange((_event, session) => {
            if (_event === 'PASSWORD_RECOVERY') {
                setSession(null)
                setUser(null)
                window.location.href = '/reset-password'
                return
            }
            setSession(session ?? null)
            setUser(session?.user ?? null)
            setLoading(false)
        })
        return () => result.data.subscription.unsubscribe()
    }, [])

    const signUp = async (email, password, profile) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${import.meta.env.VITE_APP_URL}/login`,
                data: {
                    first_name: profile.firstName,
                    last_name: profile.lastName,
                    nickname: profile.nickname,
                    username: profile.username,
                }
            }
        })
        if (error) throw error
    }

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Block login if email not confirmed
        if (!data.user.email_confirmed_at) {
            await supabase.auth.signOut();
            throw new Error('Please confirm your email before logging in. Check your inbox.');
        }

        return data;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
    }

    const resetPassword = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${import.meta.env.VITE_APP_URL}/reset-password`,
        })
        if (error) throw error
    }
    const resendConfirmation = async (email) => {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
            options: {
                emailRedirectTo: `${import.meta.env.VITE_APP_URL}/login`,
            }
        });
        if (error) throw error;
    };
    return (
        <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut, resetPassword, resendConfirmation }}>
            {children}
        </AuthContext.Provider>
    )

}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used inside AuthProvider')
    return context
}

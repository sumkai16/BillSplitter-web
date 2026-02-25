import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then((response) => {
            setUser(response?.data?.session?.user ?? null)
            setLoading(false)
        })

        const result = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })

        return () => result.data.subscription.unsubscribe()
    }, [])

    const signUp = async (email, password, profile) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
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
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
    }
    const signOut = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
    }
    return (
        <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    )

}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used inside AuthProvider')
    return context
}


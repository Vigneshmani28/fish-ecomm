import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Profile } from '@/types/database';

interface AuthContextType {
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    isNewUser: boolean;
    signInWithOtp: (phone: string) => Promise<{ error: string | null }>;
    verifyOtp: (phone: string, token: string) => Promise<{ error: string | null; isNew?: boolean }>;
    signOut: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
    refreshProfile: () => Promise<void>;
    setIsNewUser: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isNewUser, setIsNewUser] = useState(false);

    const fetchProfile = useCallback(async (userId: string, userPhone?: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code === 'PGRST116') {
                // Profile doesn't exist yet — new user
                const phone = userPhone || '';
                const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        phone: phone,
                        role: 'customer',
                    })
                    .select()
                    .single();

                if (!createError && newProfile) {
                    setProfile(newProfile as Profile);
                    setIsNewUser(true);
                }
            } else if (!error && data) {
                setProfile(data as Profile);
                // If profile exists but has no name, treat as new user needing name
                if (!data.name) {
                    setIsNewUser(true);
                }
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                fetchProfile(session.user.id, session.user.phone || '');
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                if (session?.user) {
                    await fetchProfile(session.user.id, session.user.phone || '');
                } else {
                    setProfile(null);
                    setIsNewUser(false);
                    setLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [fetchProfile]);

    const signInWithOtp = async (phone: string): Promise<{ error: string | null }> => {
        try {
            const { error } = await supabase.auth.signInWithOtp({ phone });
            if (error) return { error: error.message };
            return { error: null };
        } catch (err: any) {
            return { error: err.message || 'Something went wrong' };
        }
    };

    const verifyOtp = async (phone: string, token: string): Promise<{ error: string | null; isNew?: boolean }> => {
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                phone,
                token,
                type: 'sms',
            });
            if (error) return { error: error.message };

            // Check if profile exists and has a name
            if (data.user) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('name')
                    .eq('id', data.user.id)
                    .single();

                const needsName = !profileData?.name;
                return { error: null, isNew: needsName };
            }

            return { error: null };
        } catch (err: any) {
            return { error: err.message || 'Something went wrong' };
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        setIsNewUser(false);
    };

    const updateProfile = async (updates: Partial<Profile>): Promise<{ error: string | null }> => {
        if (!session?.user) return { error: 'Not authenticated' };
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', session.user.id);
            if (error) return { error: error.message };

            // Refresh profile
            await fetchProfile(session.user.id, session.user.phone || '');
            return { error: null };
        } catch (err: any) {
            return { error: err.message };
        }
    };

    const refreshProfile = useCallback(async () => {
        if (session?.user) {
            await fetchProfile(session.user.id, session.user.phone || '');
        }
    }, [session, fetchProfile]);

    return (
        <AuthContext.Provider
            value={{
                session,
                profile,
                loading,
                isNewUser,
                signInWithOtp,
                verifyOtp,
                signOut,
                updateProfile,
                refreshProfile,
                setIsNewUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { env } from '../../config/env';
import { supabase } from '../../services/supabaseClient';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [verifiedAdminId, setVerifiedAdminId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(env.isDemo);
  const [loading, setLoading] = useState(!env.isDemo);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = env.isDemo || Boolean(user && verifiedAdminId === user.id);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return;
      setUser(data.session?.user ?? null);
      if (sessionError) setError(sessionError.message);
      setSessionReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      setUser(session?.user ?? null);
      setSessionReady(true);
      if (event === 'SIGNED_OUT') {
        setVerifiedAdminId(null);
        queryClient.clear();
      }
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  useEffect(() => {
    if (!supabase) return;
    if (!sessionReady) return;
    if (!user) {
      setVerifiedAdminId(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    void supabase
      .from('maintenance_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error: membershipError }) => {
        if (!alive) return;
        setVerifiedAdminId(data ? user.id : null);
        if (!data) queryClient.clear();
        setError(membershipError?.message ?? null);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user?.id, sessionReady, queryClient]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAdmin,
      loading,
      error,
      async signIn(email, password) {
        if (!supabase) return;
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      },
      async signOut() {
        if (!supabase) return;
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw signOutError;
        setVerifiedAdminId(null);
        queryClient.clear();
      },
    }),
    [user, isAdmin, loading, error, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

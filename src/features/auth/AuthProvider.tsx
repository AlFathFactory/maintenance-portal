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
  const [isAdmin, setIsAdmin] = useState(env.isDemo);
  const [loading, setLoading] = useState(!env.isDemo);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return;
      setUser(data.session?.user ?? null);
      if (sessionError) setError(sessionError.message);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setUser(session?.user ?? null);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    if (!user) {
      setIsAdmin(false);
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
        setIsAdmin(Boolean(data));
        setError(membershipError?.message ?? null);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

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
        queryClient.removeQueries({ queryKey: ['maintenance'] });
        setIsAdmin(false);
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

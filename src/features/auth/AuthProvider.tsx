import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { env } from '../../config/env';
import { supabase } from '../../services/supabaseClient';
import { getHSEMembership, type HSERole } from './hseMembership';
import { createAuthSession, type AuthSnapshot, type Authorization } from './authSession';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  hseRole: HSERole | null;
  isHSEMember: boolean;
  isHSEEngineer: boolean;
  isHSESupervisor: boolean;
  hseInactive: boolean;
  hseError: string | null;
  loading: boolean;
  error: string | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [snapshot, setSnapshot] = useState<AuthSnapshot>({
    user: null,
    sessionReady: env.isDemo,
    authorization: null,
    sessionError: null,
  });
  const sessionRef = useRef<ReturnType<typeof createAuthSession> | null>(null);
  const { user, sessionReady, authorization, sessionError } = snapshot;
  const loading = !env.isDemo && (!sessionReady || (Boolean(user) && !authorization));
  const isAdmin = env.isDemo || (!loading && Boolean(authorization?.isAdmin));
  const hseRole = loading ? null : (authorization?.hseRole ?? null);
  const hseError = loading ? null : (authorization?.hseError ?? null);
  const error = sessionError ?? (loading ? null : (authorization?.adminError ?? hseError));

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let receivedAuthEvent = false;
    const session = createAuthSession(
      async (userId): Promise<Authorization> => {
        const [admin, hse] = await Promise.all([
          client.from('maintenance_admins').select('user_id').eq('user_id', userId).maybeSingle(),
          getHSEMembership(userId),
        ]);
        return {
          isAdmin: !admin.error && Boolean(admin.data),
          hseRole: hse.error || !hse.membership?.is_active ? null : hse.membership.role,
          hseInactive: !hse.error && hse.membership?.is_active === false,
          adminError: admin.error?.message ?? null,
          hseError: hse.error,
        };
      },
      () => queryClient.clear(),
      setSnapshot,
      (check) => setTimeout(check, 0),
    );
    sessionRef.current = session;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      receivedAuthEvent = true;
      session.handleSession(nextSession?.user ?? null, event);
    });
    void client.auth.getSession().then(({ data, error: getSessionError }) => {
      if (receivedAuthEvent) return;
      session.handleSession(data.session?.user ?? null, 'INITIAL_SESSION');
      session.setSessionError(getSessionError?.message ?? null);
    });
    const revalidateOnFocus = () => session.revalidate();
    const revalidateWhenVisible = () => {
      if (document.visibilityState === 'visible') session.revalidate();
    };
    window.addEventListener('focus', revalidateOnFocus);
    document.addEventListener('visibilitychange', revalidateWhenVisible);
    const revalidationInterval = window.setInterval(revalidateWhenVisible, 5 * 60_000);
    return () => {
      session.dispose();
      if (sessionRef.current === session) sessionRef.current = null;
      subscription.unsubscribe();
      window.removeEventListener('focus', revalidateOnFocus);
      document.removeEventListener('visibilitychange', revalidateWhenVisible);
      window.clearInterval(revalidationInterval);
    };
  }, [queryClient]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAdmin,
      hseRole,
      isHSEMember: hseRole !== null,
      isHSEEngineer: hseRole === 'hse_engineer',
      isHSESupervisor: hseRole === 'hse_supervisor',
      hseInactive: !loading && Boolean(authorization?.hseInactive),
      hseError,
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
        sessionRef.current?.handleSession(null, 'SIGNED_OUT');
      },
    }),
    [user, isAdmin, hseRole, hseError, loading, authorization, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

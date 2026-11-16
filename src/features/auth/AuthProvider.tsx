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

interface Authorization {
  revision: number;
  isAdmin: boolean;
  hseRole: HSERole | null;
  hseInactive: boolean;
  adminError: string | null;
  hseError: string | null;
}

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
  const [user, setUser] = useState<User | null>(null);
  const [sessionReady, setSessionReady] = useState(env.isDemo);
  const [revision, setRevision] = useState(0);
  const [authorization, setAuthorization] = useState<Authorization | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const currentUserId = useRef<string | null>(null);
  const loading =
    !env.isDemo && (!sessionReady || (Boolean(user) && authorization?.revision !== revision));
  const isAdmin = env.isDemo || (!loading && Boolean(authorization?.isAdmin));
  const hseRole = loading ? null : (authorization?.hseRole ?? null);
  const hseError = loading ? null : (authorization?.hseError ?? null);
  const error = sessionError ?? (loading ? null : (authorization?.adminError ?? hseError));

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    let receivedAuthEvent = false;
    const updateSession = (nextUser: User | null) => {
      if (!alive) return;
      const nextId = nextUser?.id ?? null;
      if (currentUserId.current !== nextId) {
        if (currentUserId.current) queryClient.clear();
        currentUserId.current = nextId;
      }
      setAuthorization(null);
      setUser(nextUser);
      setRevision((value) => value + 1);
      setSessionReady(true);
      setSessionError(null);
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      receivedAuthEvent = true;
      if (event !== 'INITIAL_SESSION') queryClient.clear();
      updateSession(session?.user ?? null);
    });
    void supabase.auth.getSession().then(({ data, error: getSessionError }) => {
      if (!alive || receivedAuthEvent) return;
      updateSession(data.session?.user ?? null);
      setSessionError(getSessionError?.message ?? null);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  useEffect(() => {
    if (!supabase || !sessionReady || !user) return;
    let alive = true;
    const userId = user.id;
    const checkRevision = revision;
    void Promise.all([
      supabase.from('maintenance_admins').select('user_id').eq('user_id', userId).maybeSingle(),
      getHSEMembership(userId),
    ])
      .then(([admin, hse]) => {
        if (!alive) return;
        setAuthorization({
          revision: checkRevision,
          isAdmin: !admin.error && Boolean(admin.data),
          hseRole: hse.error || !hse.membership?.is_active ? null : hse.membership.role,
          hseInactive: !hse.error && hse.membership?.is_active === false,
          adminError: admin.error?.message ?? null,
          hseError: hse.error,
        });
      })
      .catch((cause: unknown) => {
        if (!alive) return;
        const message =
          cause instanceof Error ? cause.message : 'Authorization verification failed';
        setAuthorization({
          revision: checkRevision,
          isAdmin: false,
          hseRole: null,
          hseInactive: false,
          adminError: message,
          hseError: message,
        });
      });
    return () => {
      alive = false;
    };
  }, [user?.id, sessionReady, revision]);

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
        queryClient.clear();
      },
    }),
    [user, isAdmin, hseRole, hseError, loading, authorization, error, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

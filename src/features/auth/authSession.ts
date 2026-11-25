import type { AuthChangeEvent, User } from '@supabase/supabase-js';
import type { HSERole } from './hseMembership';

export interface Authorization {
  isAdmin: boolean;
  hseRole: HSERole | null;
  hseInactive: boolean;
  adminError: string | null;
  hseError: string | null;
}

export interface AuthSnapshot {
  user: User | null;
  sessionReady: boolean;
  authorization: Authorization | null;
  sessionError: string | null;
}

export function createAuthSession(
  loadAuthorization: (userId: string) => Promise<Authorization>,
  clearQueries: () => void,
  onChange: (snapshot: AuthSnapshot) => void,
  scheduleRevalidation: (check: () => void) => void = (check) => check(),
) {
  let snapshot: AuthSnapshot = {
    user: null,
    sessionReady: false,
    authorization: null,
    sessionError: null,
  };
  let requestId = 0;
  let disposed = false;

  function publish(next: AuthSnapshot) {
    snapshot = next;
    if (!disposed) onChange(next);
  }

  function revalidate() {
    const userId = snapshot.user?.id;
    if (!userId || disposed) return;
    const currentRequest = ++requestId;
    void loadAuthorization(userId)
      .catch((cause: unknown): Authorization => {
        const message =
          cause instanceof Error ? cause.message : 'Authorization verification failed';
        return {
          isAdmin: false,
          hseRole: null,
          hseInactive: false,
          adminError: message,
          hseError: message,
        };
      })
      .then((authorization) => {
        if (disposed || currentRequest !== requestId || snapshot.user?.id !== userId) return;
        const previous = snapshot.authorization;
        if (
          previous &&
          (previous.isAdmin !== authorization.isAdmin ||
            previous.hseRole !== authorization.hseRole ||
            previous.hseInactive !== authorization.hseInactive ||
            previous.adminError !== authorization.adminError ||
            previous.hseError !== authorization.hseError)
        ) {
          clearQueries();
        }
        publish({ ...snapshot, authorization });
      });
  }

  function handleSession(user: User | null, event: AuthChangeEvent) {
    if (disposed) return;
    const identityChanged = snapshot.user?.id !== user?.id;
    if (identityChanged) {
      ++requestId;
      clearQueries();
      publish({ user, sessionReady: true, authorization: null, sessionError: null });
      if (user)
        scheduleRevalidation(() => {
          if (snapshot.user?.id === user.id) revalidate();
        });
      return;
    }
    publish({ ...snapshot, user, sessionReady: true, sessionError: null });
    if (user && event !== 'INITIAL_SESSION' && event !== 'TOKEN_REFRESHED')
      scheduleRevalidation(() => {
        if (snapshot.user?.id === user.id) revalidate();
      });
  }

  return {
    handleSession,
    revalidate,
    setSessionError(message: string | null) {
      if (!disposed) publish({ ...snapshot, sessionError: message });
    },
    dispose() {
      disposed = true;
      ++requestId;
    },
  };
}

/**
 * authStore.ts — Persisted authentication state.
 *
 * Stores the logged-in user and JWT token in localStorage under the key
 * 'danii_auth'. The token is injected into every API call via the Axios
 * request interceptor in src/services/api.ts (reads localStorage directly
 * to avoid a circular import).
 *
 * Usage:
 *   const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  /** The currently logged-in user, or null if unauthenticated. */
  user: User | null;
  /** JWT token returned by POST /api/auth/login. */
  token: string | null;
  /** Derived from token !== null. Used by route guards. */
  isAuthenticated: boolean;
}

interface AuthActions {
  /**
   * Store user + token after a successful login or register-verify flow.
   * Sets isAuthenticated = true.
   */
  setAuth: (user: User, token: string) => void;

  /**
   * Remove all auth state (logout, or forced on 401 by the Axios interceptor).
   * Sets isAuthenticated = false.
   */
  clearAuth: () => void;

  /**
   * Partially update the user object in place.
   * Useful when profile data changes without requiring re-login.
   */
  updateUser: (partial: Partial<User>) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // ── Initial state ────────────────────────────────────────────────────
      user: null,
      token: null,
      isAuthenticated: false,

      // ── Actions ──────────────────────────────────────────────────────────
      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true }),

      clearAuth: () =>
        set({ user: null, token: null, isAuthenticated: false }),

      updateUser: (partial) => {
        const current = get().user;
        if (current) {
          set({ user: { ...current, ...partial } });
        }
      },
    }),
    {
      /**
       * localStorage key.
       * The Axios interceptor in api.ts reads this key directly to inject
       * the Bearer token, so changing it here requires updating api.ts too.
       */
      name: 'danii_auth',
    }
  )
);

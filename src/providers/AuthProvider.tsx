"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { api } from "@/lib/api";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  recoveryMode: boolean;
  profile: {
    id: string | null;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
  };
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: (nextPath?: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ requiresEmailConfirmation: boolean }>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (payload: { fullName?: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  recoveryMode: false,
  profile: {
    id: null,
    email: null,
    name: null,
    avatarUrl: null,
  },
  signInWithGoogle: async () => {},
  signInWithGitHub: async () => {},
  signInWithPassword: async () => {},
  signUpWithPassword: async () => ({ requiresEmailConfirmation: false }),
  sendPasswordResetEmail: async () => {},
  updatePassword: async () => {},
  updateProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  const syncGitHubProviderSession = useCallback(
    async (session: Session | null) => {
      const providerToken = (session as Session & { provider_token?: string | null })
        ?.provider_token;

      if (!session?.access_token || !providerToken) {
        return;
      }

      const cacheKey = `github-session-synced:${session.user.id}:${providerToken.slice(0, 12)}`;
      if (typeof window !== "undefined" && window.sessionStorage.getItem(cacheKey)) {
        return;
      }

      await api.auth.syncGitHubSession(session.access_token, {
        providerToken,
      });

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(cacheKey, "1");
      }
    },
    []
  );

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setRecoveryMode(event === "PASSWORD_RECOVERY");
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      void syncGitHubProviderSession(session).catch(() => null);
    });

    async function bootstrapAuth() {
      try {
        const url = new URL(window.location.href);
        const authCode = url.searchParams.get("code");
        const hashParams = new URLSearchParams(
          window.location.hash.startsWith("#")
            ? window.location.hash.slice(1)
            : window.location.hash
        );
        const hashType = hashParams.get("type");

        if (authCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(authCode);
          if (error) {
            throw error;
          }

          url.searchParams.delete("code");
          url.searchParams.delete("next");
          url.searchParams.delete("state");
          window.history.replaceState({}, "", url.toString());
        }

        if (hashType === "recovery") {
          setRecoveryMode(true);
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;

        setSession(session);
        setUser(session?.user ?? null);
        await syncGitHubProviderSession(session);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void bootstrapAuth();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw error;
  }, [supabase]);

  const signInWithGitHub = useCallback(async (nextPath?: string) => {
    const redirectPath =
      typeof nextPath === "string" && nextPath.trim()
        ? nextPath.trim()
        : "/dashboard/github";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}${redirectPath}`,
        scopes: "repo read:user user:email",
      },
    });
    if (error) throw error;
  }, [supabase]);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    },
    [supabase]
  );

  const sendPasswordResetEmail = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?mode=reset`,
      });

      if (error) throw error;
    },
    [supabase]
  );

  const updatePassword = useCallback(
    async (password: string) => {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setUser(data.user);
      setRecoveryMode(false);
    },
    [supabase]
  );

  const updateProfile = useCallback(
    async ({ fullName }: { fullName?: string }) => {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName ?? "",
        },
      });
      if (error) throw error;
      setUser(data.user);
    },
    [supabase]
  );

  const signUpWithPassword = useCallback(
    async (email: string, password: string, fullName?: string) => {
      await api.auth.register({
        email,
        password,
        fullName,
      });

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { requiresEmailConfirmation: false };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, [supabase]);

  const profile = useMemo(
    () => ({
      id: user?.id ?? null,
      email: user?.email ?? null,
      name:
        user?.user_metadata?.full_name ??
        user?.user_metadata?.name ??
        user?.email?.split("@")[0] ??
        null,
      avatarUrl: user?.user_metadata?.avatar_url ?? null,
    }),
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        recoveryMode,
        profile,
        signInWithGoogle,
        signInWithGitHub,
        signInWithPassword,
        signUpWithPassword,
        sendPasswordResetEmail,
        updatePassword,
        updateProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);


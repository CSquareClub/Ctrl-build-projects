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


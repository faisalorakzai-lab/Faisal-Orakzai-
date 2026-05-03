import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AdminAuthContextValue {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminRole = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!supabase) return false;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();
        return data?.role === "admin";
      } catch {
        return false;
      }
    },
    [],
  );

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const admin = await checkAdminRole(session.user.id);
        if (admin) {
          setSession(session);
          setUser(session.user);
          setIsAdmin(true);
        } else {
          await supabase!.auth.signOut();
        }
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        const admin = await checkAdminRole(session.user.id);
        if (admin) {
          setSession(session);
          setUser(session.user);
          setIsAdmin(true);
        }
      } else if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAdminRole]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      if (!supabase) return { error: "Auth service unavailable" };
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setIsLoading(false);
          return { error: "Invalid credentials — access denied" };
        }
        const admin = await checkAdminRole(data.user.id);
        if (!admin) {
          await supabase.auth.signOut();
          setIsLoading(false);
          return {
            error: "Restricted Access — Admin credentials required",
          };
        }
        setSession(data.session);
        setUser(data.user);
        setIsAdmin(true);
        setIsLoading(false);
        return { error: null };
      } catch {
        setIsLoading(false);
        return { error: "Authentication failed" };
      }
    },
    [checkAdminRole],
  );

  const logout = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setIsAdmin(false);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{ user, session, isAdmin, isLoading, login, logout }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}

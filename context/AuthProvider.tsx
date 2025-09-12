import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type User = { id: string; email: string; name?: string } | null;

type AuthContextType = {
  user: User;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    // Simple mock persistence
    const raw = globalThis.localStorage?.getItem('db_user');
    if (raw) setUser(JSON.parse(raw));
  }, []);

  async function signIn(email: string, _password: string) {
    // Mock sign in; swap with Supabase/Oracle later
    const u = { id: 'mock-user', email };
    try { globalThis.localStorage?.setItem('db_user', JSON.stringify(u)); } catch {}
    setUser(u);
  }

  function signOut() {
    try { globalThis.localStorage?.removeItem('db_user'); } catch {}
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

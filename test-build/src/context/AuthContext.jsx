import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);       // full profile from users table
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(async (authUser) => {
    if (!authUser) { setUser(null); return; }
    try {
      const { data } = await authAPI.me();
      setUser(data);
    } catch (err) {
      console.error('[AuthContext] Failed to load profile:', err.message);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      loadUserProfile(session?.user).finally(() => setLoading(false));
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await loadUserProfile(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadUserProfile]);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isExecutive = user?.role === 'executive';
  const canManageTeam = isAdmin || isManager;
  const canViewAllLeads = isAdmin || isManager;

  return (
    <AuthContext.Provider value={{
      session, user, loading,
      signIn, signOut,
      isAdmin, isManager, isExecutive, canManageTeam, canViewAllLeads,
      refreshProfile: () => loadUserProfile(session?.user),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

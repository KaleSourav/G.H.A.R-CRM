import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { authAPI, leadsAPI } from '../services/api';

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

  // ── Role & Permission Definitions ──────────────────────────────────────────
  const email = (user?.email || '').toLowerCase();
  const role = (user?.role || '').toLowerCase();
  const FOUNDER_EMAILS = ['vinaykarir@ghar.in', 'asif@ghar.in'];

  // Super Admin: Founders or users with super_admin role / is_super_admin flag
  const isSuperAdmin = role === 'super_admin' || role === 'superadmin' || user?.is_super_admin === true || FOUNDER_EMAILS.includes(email);
  // Standard Admin (or Super Admin)
  const isAdmin = isSuperAdmin || role === 'admin';
  const isManager = role === 'manager';
  const isExecutive = role === 'executive';

  // Strict user-requested RBAC constraints:
  // 1. Super Admins can download Excel sheet of leads; standard Admin CANNOT download it
  const canDownloadExcel = isSuperAdmin;
  // 2. Both Super Admin and Admin can create/manage users; standard Admin CANNOT download Excel
  const canCreateUsers = isSuperAdmin || isAdmin;
  // 3. Team visibility and lead overview
  const canManageTeam = isSuperAdmin || isAdmin || isManager;
  const canViewAllLeads = isSuperAdmin || isAdmin || isManager;

  // ── Assignment Notification Stats (for red dot & badge indicators) ──────────
  const [assignedStats, setAssignedStats] = useState({
    assignedToMeCount: 0,
    unreadAssignmentNotifs: 0,
    newAssignedCount: 0,
    unassignedCount: 0,
    hasPendingAlert: false,
    teamMembers: [],
  });

  const refreshAssignedStats = useCallback(async () => {
    if (!session?.user) return;
    try {
      const { data } = await leadsAPI.getAssignedStats();
      if (data) setAssignedStats(data);
    } catch {}
  }, [session]);

  useEffect(() => {
    if (session?.user) {
      refreshAssignedStats();
      const interval = setInterval(refreshAssignedStats, 30000);
      return () => clearInterval(interval);
    }
  }, [session, refreshAssignedStats]);

  return (
    <AuthContext.Provider value={{
      session, user, loading,
      signIn, signOut,
      isSuperAdmin, isAdmin, isManager, isExecutive,
      canDownloadExcel, canCreateUsers, canManageTeam, canViewAllLeads,
      assignedStats, refreshAssignedStats,
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


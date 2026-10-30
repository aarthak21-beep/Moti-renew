import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginDemo: (name?: string, email?: string) => void;
  loginWithEmail: (userId: string, password?: string) => Promise<boolean>;
  signupWithEmail: (name: string, userId: string, company?: string, password?: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  isSupabaseConnected: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authEmailForId = (userId: string) => `${userId.trim().toLowerCase()}@motirenew.invalid`;

async function profileForUser(authUser: any): Promise<UserProfile> {
  const fallback: UserProfile = {
    uid: authUser.id,
    email: authUser.user_metadata?.username || authUser.email || '',
    displayName: authUser.user_metadata?.display_name || authUser.user_metadata?.username || 'Subscriber',
    companyName: authUser.user_metadata?.company_name || 'My Business',
    defaultCurrency: 'INR',
    language: 'en',
    theme: 'light',
    createdAt: authUser.created_at || new Date().toISOString(),
  };
  if (!supabase) return fallback;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
  if (error) throw error;
  if (data) {
    return {
      uid: data.id,
      email: data.email || fallback.email,
      displayName: data.display_name || fallback.displayName,
      companyName: data.company_name || fallback.companyName,
      defaultCurrency: data.default_currency || 'INR',
      language: data.language || 'en',
      theme: data.theme || 'light',
      createdAt: data.created_at || fallback.createdAt,
    };
  }
  const { error: saveError } = await supabase.from('profiles').upsert({
    id: authUser.id, email: fallback.email, display_name: fallback.displayName,
    company_name: fallback.companyName, default_currency: fallback.defaultCurrency,
    language: fallback.language, theme: fallback.theme,
  });
  if (saveError) throw saveError;
  return fallback;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (user) {
      localStorage.setItem('moti_renew_user', JSON.stringify(user));
      document.documentElement.classList.toggle('dark', user.theme === 'dark');
    } else {
      localStorage.removeItem('moti_renew_user');
    }
  }, [user]);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) console.error('Supabase session error:', error.message);
      if (data.session?.user) {
        try {
          const profile = await profileForUser(data.session.user);
          if (active) setUser(profile);
        } catch (profileError) {
          console.error('Could not load profile:', profileError);
        }
      } else if (active) {
        setUser(null);
      }
      if (active) setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }
      // Defer profile queries until after the auth callback returns.
      window.setTimeout(async () => {
        try {
          const profile = await profileForUser(session.user);
          if (active) setUser(profile);
        } catch (profileError) {
          console.error('Could not load profile:', profileError);
        } finally {
          if (active) setLoading(false);
        }
      }, 0);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const loginDemo = (_name?: string, _email?: string) => {
    // Demo sign-in is disabled; users must authenticate with Supabase.
  };

  const loginWithEmail = async (userId: string, password = ''): Promise<boolean> => {
    if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
    if (!password) throw new Error('Please enter your password.');
    setLoading(true);
    try {
      const normalizedId = userId.trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,30}$/.test(normalizedId)) throw new Error('User ID must be 3–30 characters (letters, numbers, dot, underscore or hyphen).');
      const { data, error } = await supabase.auth.signInWithPassword({ email: authEmailForId(normalizedId), password });
      if (error) throw error;
      if (data.user) setUser(await profileForUser(data.user));
      return Boolean(data.user);
    } finally { setLoading(false); }
  };

  const signupWithEmail = async (name: string, userId: string, company = '', password = ''): Promise<boolean> => {
    if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
    if (!password) throw new Error('Please enter a password.');
    setLoading(true);
    try {
      const normalizedId = userId.trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,30}$/.test(normalizedId)) throw new Error('User ID must be 3–30 characters (letters, numbers, dot, underscore or hyphen).');
      const { data, error } = await supabase.auth.signUp({
        email: authEmailForId(normalizedId), password,
        options: { data: { username: normalizedId, display_name: name, company_name: company || 'My Company' } },
      });
      if (error) throw error;
      if (data.user && !data.session) throw new Error('Email confirmation is still enabled in Supabase. Turn OFF Authentication → Providers → Email → Confirm email, then create the account again.');
      if (data.user && data.session) setUser(await profileForUser(data.user));
      return Boolean(data.user && data.session);
    } finally { setLoading(false); }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return true;
  };

  const logout = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    setUser(null);
    localStorage.removeItem('moti_renew_user');
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    if (supabase && !user.uid.startsWith('usr_')) {
      const { error } = await supabase.from('profiles').upsert({
        id: user.uid, email: updated.email, display_name: updated.displayName,
        company_name: updated.companyName, default_currency: updated.defaultCurrency,
        language: updated.language, theme: updated.theme,
      });
      if (error) throw error;
      const { error: authError } = await supabase.auth.updateUser({
        data: { display_name: updated.displayName, company_name: updated.companyName },
      });
      if (authError) throw authError;
    }
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{
      user, loading, loginDemo, loginWithEmail, signupWithEmail,
      loginWithGoogle, logout, updateProfile,
      isSupabaseConnected: Boolean(supabase),
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

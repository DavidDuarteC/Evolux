import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../../shared/services/supabase';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (u) => {
    if (!u) {
      setProfile(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .maybeSingle();

      if (!data) {
        const newProfile = {
          id: u.id,
          name: u.user_metadata?.name || u.email || 'Guest',
          plan: 'free',
          theme: 'dark',
          accent_color: '#3b82f6'
        };

        await supabase
          .from('profiles')
          .insert([newProfile]);

        setProfile(newProfile);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth init timeout - forcing loading to false');
        setLoading(false);
      }
    }, 10000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      const u = session?.user ?? null;
      setUser(u);
      try {
        await fetchProfile(u);
      } catch (err) {
        console.error('Error fetching profile on init:', err);
      }
      clearTimeout(timeoutId);
      setLoading(false);
    }).catch((err) => {
      console.error('Auth session error:', err);
      if (isMounted) {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      const u = session?.user ?? null;
      setUser(u);
      await fetchProfile(u);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { success: true, user_id: data.user.id };
  };

  const register = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) throw error;
    return { success: true, user_id: data.user.id };
  };

  const googleLogin = async (accessToken) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        accessToken,
      },
    });

    if (error) throw error;
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates) => {
    if (!user) return { success: false };
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;
    setProfile(prev => prev ? { ...prev, ...updates } : null);
    return { success: true };
  };

  const value = {
    userId: user?.id,
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    googleLogin,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

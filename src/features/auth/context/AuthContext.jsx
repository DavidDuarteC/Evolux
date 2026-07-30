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
      return null;
    }
    const defaultName = u.user_metadata?.name || u.email?.split('@')[0] || 'Usuario';
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .maybeSingle();

      if (!data) {
        const newProfile = {
          id: u.id,
          name: defaultName,
          plan: 'free',
          theme: 'dark',
          accent_color: '#3b82f6'
        };

        await supabase
          .from('profiles')
          .insert([newProfile]);

        setProfile(newProfile);
        return newProfile;
      } else {
        const profileObj = {
          ...data,
          name: data.name || defaultName
        };
        setProfile(profileObj);
        return profileObj;
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      const fallback = {
        id: u.id,
        name: defaultName,
        plan: 'free',
        theme: 'dark',
        accent_color: '#3b82f6'
      };
      setProfile(fallback);
      return fallback;
    }
  };

  // Separate effect to load profile when user changes
  useEffect(() => {
    if (user) {
      fetchProfile(user).catch((err) => console.error('Error fetching profile:', err));
    } else {
      setProfile(null);
    }
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;

    // Synchronous auth state listener (no blocking db calls inside event)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((err) => {
      console.error('Auth session error:', err);
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    setUser(data.user);
    try {
      await fetchProfile(data.user);
    } catch (err) {
      console.error('Error fetching profile on login:', err);
    }
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
    if (data.user) {
      setUser(data.user);
      try {
        await fetchProfile(data.user);
      } catch (err) {
        console.error('Error fetching profile on register:', err);
      }
    }
    return { success: true, user_id: data?.user?.id };
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

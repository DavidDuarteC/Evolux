import React, { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';

const UserContext = createContext({
    user: { name: 'Guest', email: '', avatar: null, plan: 'Free', useWise: true, useUsd: false, savingsTarget: 5000000, cushionTarget: 3000000, language: 'es' },
    updateName: () => { },
    updateAvatar: () => { },
    updateUseWise: () => { },
    updateUseUsd: () => { },
    updateTargets: () => { },
    updateLanguage: () => { }
});

export function useUser() {
    return useContext(UserContext);
}

export function UserProvider({ children }) {
    const { profile, user: authUser, updateProfile } = useAuth();
    
    const user = profile ? {
        name: profile.name || authUser?.user_metadata?.name || 'Guest',
        email: authUser?.email || '',
        avatar: profile.avatar || null,
        plan: profile.plan || 'Free',
        useWise: profile.use_wise !== false,
        useUsd: profile.use_usd === true,
        savingsTarget: parseFloat(profile.savings_target) || 5000000,
        cushionTarget: parseFloat(profile.cushion_target) || 3000000,
        language: profile.language || 'es',
    } : {
        name: 'Guest',
        email: '',
        avatar: null,
        plan: 'Free',
        useWise: true,
        useUsd: false,
        savingsTarget: 5000000,
        cushionTarget: 3000000,
        language: 'es',
    };

    const updateName = async (newName) => {
        try {
            await updateProfile({ name: newName });
        } catch (err) {
            console.error('Error updating name:', err);
        }
    };

    const updateAvatar = async (newAvatar) => {
        try {
            await updateProfile({ avatar: newAvatar });
        } catch (err) {
            console.error('Error updating avatar:', err);
        }
    };

    const updateUseWise = async (useWise) => {
        try {
            await updateProfile({ use_wise: useWise });
        } catch (err) {
            console.error('Error updating use_wise:', err);
        }
    };

    const updateUseUsd = async (useUsd) => {
        try {
            await updateProfile({ use_usd: useUsd });
        } catch (err) {
            console.error('Error updating use_usd:', err);
        }
    };

    const updateTargets = async (savingsTarget, cushionTarget) => {
        try {
            await updateProfile({ savings_target: savingsTarget, cushion_target: cushionTarget });
        } catch (err) {
            console.error('Error updating targets:', err);
        }
    };

    const updateLanguage = async (language) => {
        try {
            await updateProfile({ language });
        } catch (err) {
            console.error('Error updating language:', err);
        }
    };

    return (
        <UserContext.Provider value={{ user, updateName, updateAvatar, updateUseWise, updateUseUsd, updateTargets, updateLanguage }}>
            {children}
        </UserContext.Provider>
    );
}

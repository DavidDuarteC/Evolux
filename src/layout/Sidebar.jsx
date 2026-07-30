import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Wallet, Target, Dumbbell, CheckSquare,
    ChevronLeft, ChevronRight, Sun, Moon, LogOut, X,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';

export default function Sidebar({ mobileOpen, onMobileClose }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { accentColor, isDark, toggleMode } = useTheme();
    const { user } = useUser();
    const { logout } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();

    const MENU_ITEMS = [
        { path: '/', label: t('sidebar.dashboard'), icon: LayoutDashboard },
        { path: '/finanzas', label: t('sidebar.finanzas'), icon: Wallet },
        { path: '/metas', label: t('sidebar.metas'), icon: Target },
        { path: '/habitos', label: t('sidebar.habitos'), icon: Dumbbell },
        { path: '/tareas', label: t('sidebar.tareas'), icon: CheckSquare },
    ];

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/auth');
        } catch (err) {
            console.error('Error closing session:', err);
        }
    };

    const handleNav = (path) => {
        navigate(path);
        onMobileClose?.();
    };

    const sidebarContent = (
        <div
            className="h-full w-full glass-card flex flex-col relative rounded-2xl md:rounded-2xl transition-all duration-300 pl-2 pr-1.5 pt-2"
            style={{ backgroundColor: isDark ? 'rgba(18,18,18,0.5)' : 'rgba(255,255,255,0.7)' }}
        >
            {/* Mobile close button */}
            <div className="md:hidden flex justify-end pr-1 pb-1">
                <button onClick={onMobileClose} className="p-1 text-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                    <X size={18} />
                </button>
            </div>

            {/* Profile Section */}
            <button
                onClick={() => handleNav('/perfil')}
                className={`flex items-center mb-1.5 shrink-0 h-[48px] text-left transition-colors hover:bg-white/5 relative group rounded-xl mx-auto
                    ${isCollapsed ? 'justify-center w-8 p-0' : 'w-full px-1.5'}
                `}
            >
                <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shrink-0 transition-all duration-300 z-20 relative overflow-hidden"
                    style={{ backgroundColor: isCollapsed && !user.avatar ? '#333' : (user.avatar ? 'transparent' : accentColor.value) }}
                >
                    {user.avatar ? (
                        <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        isCollapsed ? user.name.charAt(0) : <div className="w-full h-full bg-gradient-to-br from-acid to-forest flex items-center justify-center rounded-full">{user.name.charAt(0)}</div>
                    )}
                </div>
                <AnimatePresence mode="wait">
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden whitespace-nowrap ml-2"
                        >
                            <h3 className="font-medium text-xs transition-colors" style={{ color: 'var(--text-primary)' }}>{user.name}</h3>
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('sidebar.verPerfil')}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </button>

            {/* Navigation */}
            <div className="flex-1 w-full flex flex-col gap-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                {MENU_ITEMS.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.path}
                            onClick={() => handleNav(item.path)}
                            className={`flex items-center h-10 rounded-xl transition-all relative group shrink-0
                                ${isActive ? 'bg-white/5' : 'hover:bg-white/5'}
                                ${isCollapsed ? 'justify-center w-10 mx-auto' : 'w-full px-1.5'}
                            `}
                        >
                            <div className="w-8 h-8 flex items-center justify-center shrink-0 z-10 relative">
                                <Icon
                                    size={20}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className={`transition-all duration-300 ${isActive ? 'text-acid drop-shadow-[0_0_8px_var(--primary-glow)]' : 'text-text-muted group-hover:text-white'}`}
                                />
                            </div>
                            <AnimatePresence mode="wait">
                                {!isCollapsed && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className={`text-xs font-medium whitespace-nowrap z-10 ml-2 ${isActive ? '' : 'text-text-muted group-hover:text-white'}`}
                                        style={{ color: isActive ? 'var(--text-primary)' : undefined }}
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </button>
                    );
                })}
            </div>

            {/* Theme Toggle */}
            <div className="py-1 shrink-0 w-full">
                <button
                    onClick={toggleMode}
                    className={`flex items-center h-10 rounded-xl transition-all relative group shrink-0 hover:bg-white/5 text-text-muted hover:text-white
                        ${isCollapsed ? 'justify-center w-10 mx-auto' : 'w-full px-1.5'}
                    `}
                    title={isDark ? t('sidebar.modoClaro') : t('sidebar.modoOscuro')}
                >
                    <div className="w-8 h-8 flex items-center justify-center shrink-0 z-10 relative">
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </div>
                    <AnimatePresence mode="wait">
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="text-xs font-medium whitespace-nowrap z-10 ml-2 text-text-muted group-hover:text-white"
                            >
                                {isDark ? t('sidebar.modoClaro') : t('sidebar.modoOscuro')}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>

            {/* Logout Button */}
            <div className="py-1 shrink-0 w-full">
                <button
                    onClick={handleLogout}
                    className={`flex items-center h-10 rounded-xl transition-all relative group shrink-0 hover:bg-white/5 text-red-400 hover:text-red-300
                        ${isCollapsed ? 'justify-center w-10 mx-auto' : 'w-full px-1.5'}
                    `}
                    title={t('sidebar.cerrarSesion')}
                >
                    <div className="w-8 h-8 flex items-center justify-center shrink-0 z-10 relative">
                        <LogOut size={18} />
                    </div>
                    <AnimatePresence mode="wait">
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="text-xs font-medium whitespace-nowrap z-10 ml-2"
                            >
                                {t('sidebar.cerrarSesion')}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>

            {/* Collapse Button — only on desktop */}
            <div className="hidden md:block py-1 border-t shrink-0 w-full" style={{ borderColor: 'var(--border-card)' }}>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`flex items-center h-10 rounded-xl transition-all relative group shrink-0 hover:bg-white/5 text-text-muted hover:text-white
                        ${isCollapsed ? 'justify-center w-10 mx-auto' : 'w-full px-1.5'}
                    `}
                >
                    <div className="w-8 h-8 flex items-center justify-center shrink-0 z-10 relative">
                        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </div>
                    <AnimatePresence mode="wait">
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="text-xs font-medium whitespace-nowrap z-10 ml-2 text-text-muted group-hover:text-white"
                            >
                                {t('sidebar.colapsar')}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile overlay backdrop */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                        onClick={onMobileClose}
                    />
                )}
            </AnimatePresence>

            {/* Mobile drawer — slides in from left */}
            <div
                className={`fixed top-0 left-0 z-50 h-screen md:hidden transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="h-full py-4 pl-2 pr-1.5" style={{ width: 140 }}>
                    {sidebarContent}
                </div>
            </div>

            {/* Desktop sidebar — sticky, collapsible width */}
            <motion.div
                animate={{ width: isCollapsed ? 56 : 140 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="hidden md:flex h-screen py-4 flex-col shrink-0 sticky top-0 z-50 pl-2 pr-1.5"
            >
                <div className="h-full" style={{ width: isCollapsed ? 56 : 140 }}>
                    {sidebarContent}
                </div>
            </motion.div>
        </>
    );
}

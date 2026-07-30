import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import NotificationBell from '../shared/components/NotificationBell';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';

export default function MainLayout({ children }) {
    const { user } = useUser();
    const { isDark, accentColor } = useTheme();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="flex min-h-screen transition-colors duration-500 overflow-hidden relative"
            style={{ backgroundColor: 'var(--bg-body)', color: 'var(--text-primary)' }}
        >
            {/* Global SVG Gradients */}
            <svg width="0" height="0" className="absolute">
                <defs>
                    <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={accentColor.value} />
                        <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Background - Static */}
            {isDark ? (
                <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0a0a] to-[#111111]" />
                    <div className="absolute top-[20%] right-[10%] w-[600px] h-[600px] bg-white/[0.03] rounded-full blur-[150px]" />
                    <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-zinc-500/[0.05] rounded-full blur-[150px]" />
                    <div className="absolute inset-0 bg-noise opacity-20 mix-blend-overlay" />
                </div>
            ) : (
                <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#f5f5f7] via-[#eeeef0] to-[#e8e8ec]" />
                    <div className="absolute top-[15%] right-[5%] w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-purple-200/15 rounded-full blur-[120px]" />
                    <div className="absolute inset-0 bg-noise mix-blend-overlay" style={{ opacity: 'var(--noise-opacity)' }} />
                </div>
            )}

            <Sidebar
                mobileOpen={mobileMenuOpen}
                onMobileClose={() => setMobileMenuOpen(false)}
            />

            <main className="flex-1 min-w-0 relative z-10 h-screen overflow-y-auto p-4 md:p-8 pt-14 md:pt-16 custom-scrollbar">
                {/* Mobile hamburger */}
                <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="md:hidden fixed top-4 left-4 z-30 w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--bg-card-solid)] border border-[var(--border-card)] text-[var(--text-primary)] hover:bg-white/10 transition-colors"
                    aria-label="Abrir menú"
                >
                    <Menu size={18} />
                </button>

                {/* Notification Bell */}
                <div className="fixed top-4 right-6 z-30">
                    <NotificationBell />
                </div>

                {/* Content */}
                <div className="w-full max-w-7xl mx-auto pb-20">
                    <div className="grid gap-6">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}

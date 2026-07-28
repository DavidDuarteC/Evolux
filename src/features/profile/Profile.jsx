import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { User, Settings, Bell, Palette, Pencil, X, Plus, ArrowRightLeft, DollarSign, Globe, Sun, Moon, Shield, Info } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import ColorPicker from '../../shared/components/ColorPicker';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// Placeholder avatars - User should add images to public/assets/avatars/
const AVAILABLE_AVATARS = [
    '/assets/avatars/avatar1.png',
    '/assets/avatars/avatar2.jpg',
    '/assets/avatars/avatar3.jpg',
    '/assets/avatars/avatar4.jpg',
    '/assets/avatars/avatar5.jpg',
];

export default function Profile() {
    const { user, updateName, updateAvatar, updateUseWise, updateUseUsd, updateLanguage } = useUser();
    const { accentColor, setAccentColor, isDark, toggleMode } = useTheme();
    const { t } = useLanguage();
    const [isEditingAvatar, setIsEditingAvatar] = useState(false);
    const [nameInput, setNameInput] = useState(user.name);

    const handleNameChange = (e) => {
        setNameInput(e.target.value);
        updateName(e.target.value);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 256;
                const MAX_HEIGHT = 256;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                // Enable high-quality image scaling
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                ctx.drawImage(img, 0, 0, width, height);

                // Use PNG for lossless quality and transparency support
                const dataUrl = canvas.toDataURL('image/png');
                updateAvatar(dataUrl);
                setIsEditingAvatar(false);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center gap-6 mb-8">
                {/* Avatar with Hover Effect */}
                <div
                    className="relative group cursor-pointer"
                    onClick={() => setIsEditingAvatar(true)}
                >
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-acid to-forest flex items-center justify-center shadow-lg shadow-acid/20 overflow-hidden transition-all duration-300 group-hover:grayscale">
                        {user.avatar ? (
                            <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover transition-all duration-300 group-hover:grayscale" />
                        ) : (
                            <span className="text-5xl font-bold text-black font-display">{user.name.charAt(0)}</span>
                        )}
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                        {/* Pencil Icon with Gradient - Cleaned up */}
                        <svg width="0" height="0">
                            <linearGradient id="pencilGradient" x1="100%" y1="100%" x2="0%" y2="0%">
                                <stop stopColor="#bef264" offset="0%" />
                                <stop stopColor="#10b981" offset="100%" />
                            </linearGradient>
                        </svg>
                        <Pencil size={32} style={{ stroke: 'url(#pencilGradient)' }} strokeWidth={2.5} />
                    </div>
                </div>

                <div>
                    <h1 className="text-3xl font-bold text-white font-display">{t('profile.title')}</h1>
                    <p className="text-text-muted">{t('profile.subtitle')}</p>
                </div>
            </div>

            {/* Avatar Selection Modal */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isEditingAvatar && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsEditingAvatar(false)}
                            style={{ marginTop: 0 }}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="bg-zinc-900 border border-white/10 rounded-2xl p-5 w-full max-w-sm shadow-2xl"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-white">{t('profile.eligeAvatar')}</h3>
                                    <button onClick={() => setIsEditingAvatar(false)} className="text-text-muted hover:text-white"><X size={24} /></button>
                                </div>

                                 <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
                                    {AVAILABLE_AVATARS.map((src, index) => (
                                        <button
                                            key={index}
                                            onClick={() => { updateAvatar(src); setIsEditingAvatar(false); }}
                                            className={`aspect-square rounded-full overflow-hidden hover:scale-105 transition-transform bg-neutral-800 ${user.avatar === src ? 'ring-4 ring-acid' : ''}`}
                                        >
                                            <img src={src} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                        </button>
                                    ))}
                                </div>

                                <div className="mb-4">
                                    <label className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/15 text-text-muted hover:text-white hover:border-white/30 hover:bg-white/[0.03] cursor-pointer transition-colors text-sm font-semibold">
                                        <Plus size={16} /> {t('profile.subirFoto')}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                        />
                                    </label>
                                </div>

                                <p className="text-xs text-center text-text-muted opacity-65">
                                    {t('profile.avataresRapidos')}
                                </p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Content Grid */}
            <div className="grid gap-6">

                {/* Personal Info */}
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <User className="text-acid" size={24} />
                        <h2 className="text-xl font-bold text-white">{t('profile.infoPersonal')}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-text-muted">{t('profile.nombreCompleto')}</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={nameInput}
                                    onChange={handleNameChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-acid/50 transition-colors"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-acid pointer-events-none opacity-50">
                                    <Pencil size={14} />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-text-muted">{t('profile.correoElectronico')}</label>
                            <input type="email" value={user.email} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-text-muted focus:outline-none focus:border-white/20 transition-colors cursor-not-allowed" readOnly />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-text-muted">{t('profile.planActual')}</label>
                            <div className="w-full bg-gradient-to-r from-acid/10 to-transparent border border-acid/20 rounded-xl px-4 py-3 text-acid font-bold flex items-center justify-between">
                                <span>{user.plan}</span>
                                <span className="text-xs bg-acid text-black px-2 py-1 rounded-lg">{t('profile.activo')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Accent Color Picker */}
                <div className="glass-card p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 rounded-full bg-acid/10 text-acid">
                            <Palette size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">{t('profile.colorAcento')}</h3>
                            <p className="text-sm text-text-muted">{t('profile.colorAcentoSub')}</p>
                        </div>
                    </div>
                    <ColorPicker
                        selectedColor={accentColor.value}
                        onChange={(hex) => setAccentColor({ value: hex, name: 'Custom' })}
                    />
                </div>

                {/* Wise Toggle */}
                {/* MOVED into Configuración General below */}

                {/* Configuración General (expandida) */}
                <div className="glass-card p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 rounded-full bg-acid/10 text-acid">
                            <Settings size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">{t('profile.configGeneral')}</h3>
                            <p className="text-sm text-text-muted">{t('profile.configGeneralSub')}</p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        {/* Idioma */}
                        <div className="flex items-center justify-between py-3 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <Globe size={18} className="text-text-muted" />
                                <span className="text-sm text-white">{t('profile.idioma')}</span>
                            </div>
                            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                                {[
                                    { code: 'es', label: 'Español' },
                                    { code: 'en', label: 'English' },
                                ].map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => { updateLanguage(lang.code); toast.success(t('profile.idiomaActualizado')); }}
                                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                            (user.language || 'es') === lang.code
                                                ? 'bg-acid text-black'
                                                : 'text-text-muted hover:text-white'
                                        }`}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Región */}
                        <div className="flex items-center justify-between py-3 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <Globe size={18} className="text-text-muted" />
                                <span className="text-sm text-white">{t('profile.region')}</span>
                            </div>
                            <span className="text-sm text-text-muted">{t('profile.colombia')}</span>
                        </div>

                        {/* Moneda */}
                        <div className="flex items-center justify-between py-3 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <Settings size={18} className="text-text-muted" />
                                <span className="text-sm text-white">{t('profile.moneda')}</span>
                            </div>
                            <span className="text-sm text-text-muted">{t('profile.copPeso')}</span>
                        </div>

                        {/* Wise */}
                        <div className="flex items-center justify-between py-3 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <ArrowRightLeft size={18} className="text-blue-400" />
                                <div>
                                    <span className="text-sm text-white">{t('profile.wiseEurCop')}</span>
                                    <p className="text-[11px] text-text-muted">{t('profile.wiseGestion')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    updateUseWise(!user.useWise);
                                    toast.success(user.useWise ? t('profile.wiseDesactivado') : t('profile.wiseActivado'));
                                }}
                                className={`relative w-14 h-7 rounded-full transition-colors ${user.useWise ? 'bg-acid' : 'bg-white/10'}`}
                            >
                                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-lg transition-transform ${user.useWise ? 'translate-x-7' : 'translate-x-0.5'}`} />
                            </button>
                        </div>

                        {/* USD → COP */}
                        <div className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                                <DollarSign size={18} className="text-green-400" />
                                <div>
                                    <span className="text-sm text-white">USD → COP</span>
                                    <p className="text-[11px] text-text-muted">Gestiona ingresos en dólares americanos</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    updateUseUsd(!user.useUsd);
                                    toast.success(user.useUsd ? 'USD → COP desactivado' : 'USD → COP activado');
                                }}
                                className={`relative w-14 h-7 rounded-full transition-colors ${user.useUsd ? 'bg-acid' : 'bg-white/10'}`}
                            >
                                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-lg transition-transform ${user.useUsd ? 'translate-x-7' : 'translate-x-0.5'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tema */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-amber-500/10 text-amber-400">
                                {isDark ? <Moon size={24} /> : <Sun size={24} />}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Tema</h3>
                                <p className="text-sm text-text-muted">{isDark ? 'Modo oscuro activado' : 'Modo claro activado'}</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleMode}
                            className={`relative w-14 h-7 rounded-full transition-colors ${isDark ? 'bg-acid' : 'bg-zinc-600'}`}
                        >
                            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-lg transition-transform ${isDark ? 'translate-x-7' : 'translate-x-0.5'}`} />
                        </button>
                    </div>
                </div>

                {/* Notificaciones */}
                <div className="glass-card p-6 hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-white/5 group-hover:bg-acid/20 text-white group-hover:text-acid transition-colors">
                            <Bell size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">{t('profile.notificaciones')}</h3>
                            <p className="text-sm text-text-muted">{t('profile.notificacionesSub')}</p>
                        </div>
                    </div>
                </div>

                {/* Seguridad */}
                <div className="glass-card p-6 hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-white/5 group-hover:bg-acid/20 text-white group-hover:text-acid transition-colors">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Seguridad</h3>
                            <p className="text-sm text-text-muted">Cambiar contraseña y gestionar sesiones.</p>
                        </div>
                    </div>
                </div>

                {/* Acerca de */}
                <div className="glass-card p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-white/5 text-white">
                            <Info size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Acerca de Evolux</h3>
                            <p className="text-sm text-text-muted">v1.0 · React 19 + Supabase</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

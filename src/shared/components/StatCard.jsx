import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Molde reutilizable de tarjeta (Opción 3 · Sólido Premium, franja compacta).
// Cada uso pasa su propio color (colorTheme) y sus propios datos (amount, trend, subtitle),
// por lo que las cards del Dashboard y las de Billetera son independientes entre sí.
const THEMES = {
    green:  { from: '#22c55e', to: '#15803d', shadow: '34,197,94' },
    red:    { from: '#ef4444', to: '#991b1b', shadow: '239,68,68' },
    orange: { from: '#f97316', to: '#9a3412', shadow: '249,115,22' },
    blue:   { from: '#3b82f6', to: '#1e40af', shadow: '59,130,246' },
    purple: { from: '#8b5cf6', to: '#5b21b6', shadow: '139,92,246' },
};

const StatCard = ({ title, amount, trend = 0, icon: Icon, colorTheme = 'green', subtitle }) => {
    const t = THEMES[colorTheme] || THEMES.green;
    const showPct = subtitle == null; // si hay subtitle, es una card sin % (ej. Disponible / Total)
    const up = trend >= 0;

    return (
        <div
            className="keep-white relative overflow-hidden rounded-2xl p-4 sm:p-5 transition-transform duration-300 hover:-translate-y-1"
            style={{
                background: `linear-gradient(135deg, ${t.to} 0%, ${t.from} 100%)`,
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: `0 14px 38px -10px rgba(${t.shadow},0.5), inset 0 1px 0 rgba(255,255,255,0.22)`,
            }}
        >
            {/* Ícono marca de agua */}
            {Icon && (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white pointer-events-none" style={{ opacity: 0.16 }}>
                    <Icon size={32} className="sm:w-10 sm:h-10" />
                </div>
            )}

            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/90">{title}</h3>
            <div className="text-2xl sm:text-[28px] lg:text-[34px] leading-none font-extrabold text-white mt-2 tabular-nums truncate">{amount}</div>

            {/* Franja compacta (al tamaño del texto) */}
            <div
                className="inline-flex items-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 px-2 sm:px-3 py-1.5 rounded-xl text-white text-[11px] sm:text-[13px] whitespace-nowrap max-w-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.13)' }}
            >
                {up ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                {showPct && <span className="font-bold">{trend > 0 ? '+' : ''}{trend}%</span>}
                <span className="opacity-80">{subtitle || 'vs mes anterior'}</span>
            </div>
        </div>
    );
};

export default StatCard;

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const parseDateString = (dateStr) => {
    if (!dateStr) return null;
    if (typeof dateStr !== 'string') return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
        const [y, m, d] = dateStr.trim().split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length !== 2) return null;
    const monthIndex = MONTHS.findIndex(m => m.toUpperCase() === parts[0].toUpperCase());
    if (monthIndex === -1) return null;
    const day = parseInt(parts[1], 10);
    if (isNaN(day)) return null;
    const year = new Date().getFullYear();
    return new Date(year, monthIndex, day);
};

const formatDateForStorage = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export default function CalendarInput({ value, onChange, placeholder = 'Ene 15' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(() => {
        const parsed = parseDateString(value);
        return parsed || new Date();
    });
    const containerRef = useRef(null);
    const popupRef = useRef(null);
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event) => {
            if (
                containerRef.current && !containerRef.current.contains(event.target) &&
                popupRef.current && !popupRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        if (value && typeof value === 'string') {
            const parsed = parseDateString(value);
            if (parsed) {
                setViewDate(parsed);
            }
        }
    }, [value]);

    useEffect(() => {
        if (!isOpen) return;

        const updatePosition = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const popupWidth = 256;
            const popupHeight = 270;
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;

            const showAbove = spaceBelow < popupHeight && spaceAbove > popupHeight;
            const top = showAbove ? (rect.top - popupHeight - 6) : (rect.bottom + 6);
            const left = Math.max(12, Math.min(rect.right - popupWidth, window.innerWidth - popupWidth - 12));

            setPopupPosition({ top, left });
        };

        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
        return { days, firstDay: adjustedFirstDay };
    };

    const { days, firstDay } = getDaysInMonth(viewDate);

    const selectedParsed = parseDateString(value);

    const handleDayClick = (day) => {
        const newDate = new Date(viewDate);
        newDate.setDate(day);
        onChange(formatDateForStorage(newDate, value));
        setIsOpen(false);
    };

    const navigate = (direction) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(viewDate.getMonth() + direction);
        setViewDate(newDate);
    };

    const calendarContent = (
        <div
            ref={popupRef}
            className="fixed z-[99999] bg-[var(--bg-card-solid)] border border-[var(--border-card)] rounded-xl shadow-2xl p-4 w-64"
            style={{
                top: popupPosition.top,
                left: popupPosition.left
            }}
        >
            <div className="flex items-center justify-between mb-4">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="p-1 hover:bg-[var(--bg-input)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold text-[var(--text-primary)]">
                    {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                </span>
                <button
                    type="button"
                    onClick={() => navigate(1)}
                    className="p-1 hover:bg-[var(--bg-input)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
                {DAYS.map(d => (
                    <div key={d} className="text-[10px] font-bold text-[var(--text-muted)] opacity-60 py-1">{d}</div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: days }).map((_, i) => {
                    const day = i + 1;
                    const isSelected = selectedParsed &&
                        day === selectedParsed.getDate() &&
                        viewDate.getMonth() === selectedParsed.getMonth() &&
                        viewDate.getFullYear() === selectedParsed.getFullYear();

                    return (
                        <button
                            key={day}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleDayClick(day)}
                            className={`
                                h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-all cursor-pointer
                                ${isSelected
                                    ? 'bg-acid text-black font-bold shadow-[0_0_10px_rgba(190,242,100,0.4)]'
                                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-input)] hover:text-acid'
                                }
                            `}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div ref={containerRef} className="relative inline-block">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-28 flex items-center justify-center gap-1.5 px-1.5 py-1 bg-[var(--bg-input)] border rounded transition-all cursor-pointer text-center shrink-0 focus:outline-none ${
                    isOpen
                        ? 'border-acid text-acid shadow-[0_0_10px_rgba(190,242,100,0.2)]'
                        : 'border-[var(--border-card)] hover:border-[var(--border-hover)]'
                }`}
            >
                <Calendar size={12} className={isOpen ? 'text-acid' : 'text-white/40'} />
                <span className="text-[11px] text-[var(--text-primary)] truncate font-medium">{value || placeholder}</span>
            </button>

            {isOpen && createPortal(calendarContent, document.body)}
        </div>
    );
}

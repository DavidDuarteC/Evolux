import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Flame, ChevronLeft, ChevronRight, X, Trash2, Trophy, AlertTriangle, Check, ChevronDown, Circle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DatePicker from '../../shared/components/DatePicker';
import HabitStatCard from '../../shared/components/HabitStatCard';
import PageHeader from '../../shared/components/PageHeader';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import { getHabits, saveHabits, createHabit, updateHabit as dbUpdateHabit, deleteHabit as dbDeleteHabit } from './services/habits';

// Helper: Get Current Month Days
const getMonthDays = (date = new Date()) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }
    return days;
};

const FREQUENCY_OPTIONS = {
    1: 'Todos los días',
    2: 'Entre semana',
    3: 'Fines de semana'
};

export default function Fitness() {
    const { isDark } = useTheme();
    const { t } = useLanguage();
    const { userId, isAuthenticated } = useAuth();
    const [habits, setHabits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const monthDays = getMonthDays(currentDate);

    const loadHabits = useCallback(async () => {
        if (!userId || !isAuthenticated) {
            setHabits([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const data = await getHabits(userId);
            setHabits(data || []);
        } catch (error) {
            console.error('Error loading habits:', error);
            // Fallback to localStorage
            const saved = localStorage.getItem('app_fitness_habits');
            if (saved) {
                setHabits(JSON.parse(saved));
            }
        } finally {
            setLoading(false);
        }
    }, [userId, isAuthenticated]);

    useEffect(() => {
        loadHabits();
    }, [loadHabits]);

    useEffect(() => {
        if (habits.length > 0) {
            localStorage.setItem('app_fitness_habits', JSON.stringify(habits));
        }
    }, [habits]);

    const syncHabits = async (updatedHabits) => {
        setHabits(updatedHabits);
        if (userId && isAuthenticated) {
            try {
                await saveHabits(userId, updatedHabits);
            } catch (error) {
                console.error('Error syncing habits:', error);
            }
        }
    };

    const [isEditMode, setIsEditMode] = useState(false);
    const [isUnifiedColor, setIsUnifiedColor] = useState(false);

    // Slider horizontal de la cuadrícula de días
    const gridScrollRef = useRef(null);
    const scrollGrid = (delta) => gridScrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
    const [globalColor, setGlobalColor] = useState('#3b82f6'); // Azure blue default

    const tableNameColumnWidth = isEditMode ? 220 : 120;
    const dayCellWidth = 28;
    const dayGapWidth = 8;
    const rowSpacerWidth = 16;
    const tableMinWidth = `${tableNameColumnWidth + rowSpacerWidth + monthDays.length * dayCellWidth + Math.max(0, monthDays.length - 1) * dayGapWidth}px`;

    // Helpers Formatting
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const isDayApplicable = (day, freq) => {
        const d = day.getDay(); // 0 is Sunday, 6 is Saturday
        if (freq === 1) return true;
        if (freq === 2) return d >= 1 && d <= 5;
        if (freq === 3) return d === 0 || d === 6;
        return true;
    };

    const getCompletionRate = (habit) => {
        let totalApplicable = 0;
        let completed = 0;
        monthDays.forEach(day => {
            if (isDayApplicable(day, habit.frequency)) {
                totalApplicable++;
                const dateStr = formatDate(day);
                if (habit.history[dateStr]) {
                    completed++;
                }
            }
        });
        if (totalApplicable === 0) return 0;
        return Math.round((completed / totalApplicable) * 100);
    };

    // Racha real = mayor cantidad de DÍAS CONSECUTIVOS completados en el mes
    // (no el total de días). Un día sin completar corta la racha.
    const getLongestStreak = (habit) => {
        let longest = 0;
        let run = 0;
        monthDays.forEach(day => {
            if (habit.history[formatDate(day)]) {
                run++;
                if (run > longest) longest = run;
            } else {
                run = 0;
            }
        });
        return longest;
    };

    // Stats
    const currentStreak = habits.length > 0 ? Math.max(...habits.map(getLongestStreak), 0) : 0;
    const bestHabit = habits.length > 0 ? habits.reduce((prev, current) => (getCompletionRate(prev) > getCompletionRate(current)) ? prev : current, habits[0]) : null;
    const worstHabit = habits.length > 0 ? habits.reduce((prev, current) => (getCompletionRate(prev) < getCompletionRate(current)) ? prev : current, habits[0]) : null;
    const bestCompletion = bestHabit ? getCompletionRate(bestHabit) : 0;
    const worstCompletion = worstHabit ? getCompletionRate(worstHabit) : 0;

    // Handlers
    const toggleHabit = (habitId, dateStr, dayObj, freq) => {
        if (isEditMode) return;
        if (!isDayApplicable(dayObj, freq)) return;

        const updatedHabits = habits.map(h => {
            if (h.id === habitId) {
                const currentIntensity = h.history[dateStr] || 0;
                const nextIntensity = currentIntensity === 0 ? 1 : 0;

                const newHistory = { ...h.history };
                if (nextIntensity === 0) {
                    delete newHistory[dateStr];
                } else {
                    newHistory[dateStr] = nextIntensity;
                }
                const newStreak = nextIntensity > 0 ? h.streak + 1 : Math.max(0, h.streak - 1);
                return { ...h, history: newHistory, streak: newStreak };
            }
            return h;
        });
        syncHabits(updatedHabits);
    };

    const addInlineHabit = async () => {
        if (!userId || !isAuthenticated) return;
        try {
            const newHabit = await createHabit(userId, {
                name: 'Nuevo Hábito',
                color: '#a855f7',
                frequency: 1,
                history: {},
                streak: 0
            });
            if (newHabit) {
                syncHabits([...habits, newHabit]);
            }
        } catch (error) {
            console.error('Error adding habit:', error);
        }
    };

    const updateHabitHandler = async (id, field, value) => {
        const updatedHabits = habits.map(h => h.id === id ? { ...h, [field]: value } : h);
        syncHabits(updatedHabits);

        if (userId && isAuthenticated) {
            try {
                await dbUpdateHabit(id, userId, { [field]: value });
            } catch (error) {
                console.error('Error updating habit:', error);
            }
        }
    };

    const removeHabitHandler = async (id) => {
        const updatedHabits = habits.filter(h => h.id !== id);
        syncHabits(updatedHabits);

        if (userId && isAuthenticated) {
            try {
                await dbDeleteHabit(id, userId);
            } catch (error) {
                console.error('Error deleting habit:', error);
            }
        }
    };

    // Custom Tooltip para el gráfico Recharts
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#0b0c10]/95 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-2xl">
                    <p className="text-white/60 text-xs font-bold mb-2 uppercase tracking-wider">Día {label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-6 mb-1 last:mb-0">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color, boxShadow: `0 0 6px ${entry.color}` }}></div>
                                <span className="text-white text-sm font-medium">{entry.name}</span>
                            </div>
                            <span className="text-white font-bold">{entry.value}%</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Componente interno para generar el gráfico unificado de estadísticas con Recharts
    const UnifiedTrendChart = ({ isEditMode }) => {
        const realToday = new Date();
        realToday.setHours(23, 59, 59, 999);

        // Measure total target days for each habit once (monthly goal)
        const habitTargets = {};
        habits.forEach(habit => {
            let total = 0;
            monthDays.forEach(dayObj => {
                if (isDayApplicable(dayObj, habit.frequency)) {
                    total++;
                }
            });
            habitTargets[habit.id] = total;
        });

        // First, find the very last day in the month where the habit has an actual recorded history
        const habitLastLoggedDay = {};
        habits.forEach(habit => {
            let lastDay = 1; // Default at least day 1
            monthDays.forEach(dayObj => {
                const dateStr = formatDate(dayObj);
                if (habit.history[dateStr] > 0) {
                    if (dayObj.getDate() > lastDay) {
                        lastDay = dayObj.getDate();
                    }
                }
            });
            // Removed limitation so user can log future/end of month days (like day 28) and the line will reach it
            habitLastLoggedDay[habit.id] = lastDay;
        });

        // Prepare Data for Recharts
        const chartData = monthDays.map((dayObj, index) => {
            const dayNumber = dayObj.getDate();

            const dataPoint = { day: dayNumber };
            const dataPointFull = { day: dayNumber }; // For the background trailing line

            habits.forEach(habit => {
                const lastLogged = habitLastLoggedDay[habit.id];
                const target = habitTargets[habit.id];

                // Calculamos el valor acumulado exacto hasta ESTE dia (sea futuro o pasado)
                // Pero si estamos calculando para un día futuro (dayNumber > lastLogged), 
                // congelamos el cálculo en el lastLogged para que la proyección sea plana.
                let completed = 0;

                const dayIndexToCalculateTo = (dayNumber > lastLogged)
                    ? monthDays.findIndex(d => d.getDate() === lastLogged)
                    : index;

                const maxIndex = dayIndexToCalculateTo >= 0 ? dayIndexToCalculateTo : 0;

                for (let i = 0; i <= maxIndex; i++) {
                    const pastDayObj = monthDays[i];
                    if (isDayApplicable(pastDayObj, habit.frequency)) {
                        const dateStr = formatDate(pastDayObj);
                        if (habit.history[dateStr] > 0) {
                            completed++;
                        }
                    }
                }

                const progressFull = target > 0 ? Math.round((completed / target) * 100) : 0;

                // El trailing line de fondo SIEMPRE tiene el valor, asumiendo que no se completará más del futuro
                // Esto forma la línea plana y tenue que se EXTIENDE hasta el final del mes SIEMPRE
                dataPoint[`${habit.id}_full`] = progressFull;

                // Si es después del último día logueado, cortamos la línea principal glow
                if (dayNumber > lastLogged) {
                    dataPoint[habit.id] = null;
                } else if (index === 0) {
                    dataPoint[habit.id] = 0;
                } else {
                    dataPoint[habit.id] = progressFull;
                }
            });

            return dataPoint;
        });

        // Configuración de visualización de cada hábito
        const activeHabitsConfig = habits.map(habit => {
            return {
                id: habit.id,
                name: habit.name,
                color: isUnifiedColor ? globalColor : habit.color
            };
        });

        // Curren actual day para resaltar el último punto válido (hoy) si está en el mismo mes
        const isCurrentMonth = realToday.getMonth() === monthDays[0].getMonth() && realToday.getFullYear() === monthDays[0].getFullYear();
        const isInPastMonth = realToday.getTime() > monthDays[monthDays.length - 1].getTime();
        const finalActiveDay = isCurrentMonth ? realToday.getDate() : (isInPastMonth ? monthDays[monthDays.length - 1].getDate() : -1);

        // Ultimo dia en que cada habito se realizo
        const getLastActionDay = (habitId) => {
            return habitLastLoggedDay[habitId];
        };

        // ── Alignment math ──
        // Grid name column: w-[120px] or w-[220px] (edit mode) + mr-4 (16px)
        const nameColWidth = isEditMode ? 236 : 136;

        // Each grid cell is w-7 (28px) with gap-2 (8px) = 36px stride.
        // Total grid inner width = N * 36 - 8  (last cell has no trailing gap)
        const daysCount = monthDays.length;
        const gridWidth = daysCount * 36 - 8;

        // The YAxis labels (0, 25, 50, 75, 100) take up ~40px inside the chart.
        // We set YAxis width=0 and render labels with a negative dx so they don't
        // eat into the plot area. This means margin.left IS the plot-area left edge.
        const yAxisRenderedWidth = 0;

        // Chart margin.left must equal the grid's nameColWidth so the plot area
        // starts exactly where the grid cells start.
        const chartMarginLeft = nameColWidth;

        // XAxis padding={left:14} centers each tick in the 28px cell (14px offset).
        // Chart total width = marginLeft + gridWidth + marginRight
        const chartMarginRight = 20;
        const chartWidth = chartMarginLeft + gridWidth + chartMarginRight;

        // Custom Cursor for Tooltip to extend vertical line up into the table
        const CustomCursor = ({ points, height }) => {
            if (!points || points.length === 0) return null;
            const { x } = points[0];
            return (
                <line
                    x1={x}
                    y1={height}
                    x2={x}
                    y2={-800} // extends way up past the chart boundaries through the table rows
                    stroke={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                />
            );
        };

        // Renderizado SVG Filters Customizados para el dot
        return (
            <div className="w-full relative z-10 flex flex-col pt-8">
                <style>
                    {`
                    /* Asegurar que las líneas superpuestas del gráfico destaquen */
                    .recharts-line .recharts-line-curve {
                        transition: all 0.3s ease;
                    }
                    /* Overlay para permitir overflow del SVG y Tooltip */
                    .custom-chart-overflow .recharts-wrapper {
                        overflow: visible !important;
                    }
                    .custom-chart-overflow svg {
                        overflow: visible !important;
                    }
                    `}
                </style>

                {/* Contenedor principal de la gráfica */}
                <div className="w-full relative z-10 h-[200px]">
                    <div className="custom-chart-overflow" style={{ width: chartWidth, height: '100%', minWidth: 'max-content' }}>
                        <LineChart
                            width={chartWidth}
                            height={200}
                            data={chartData}
                            margin={{ top: 10, right: chartMarginRight, left: chartMarginLeft, bottom: 0 }}
                            style={{ overflow: 'visible' }}
                        >
                            <defs>
                                {activeHabitsConfig.map(habit => (
                                    <filter key={`glow-${habit.id}`} id={`glow-${habit.id}`} x="-100%" y="-100%" width="300%" height="300%">
                                        <feGaussianBlur stdDeviation="3" result="blur" />
                                        <feMerge>
                                            <feMergeNode in="blur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                ))}
                            </defs>

                            {/* Grid súper sutil casi invisible */}
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.06)"} />

                            <XAxis
                                dataKey="day"
                                stroke="#52525b" /* Zinc 600 */
                                tick={{ fill: '#71717a', fontSize: 11 }} /* Zinc 500 */
                                tickLine={false}
                                axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                                padding={{ left: 14, right: 14 }}
                                interval={0}
                            />

                            <YAxis
                                width={yAxisRenderedWidth}
                                stroke="#52525b"
                                tick={{ fill: '#71717a', fontSize: 11, dx: -10 }}
                                tickLine={false}
                                axisLine={false}
                                ticks={[0, 25, 50, 75, 100]}
                                domain={[0, 100]}
                                mirror={true}
                            />

                            <Tooltip content={<CustomTooltip />} cursor={<CustomCursor />} />

                            {/* Líneas tenues de proyección hasta fin de mes temporalmente sin glow fuerte */}
                            {activeHabitsConfig.map(habit => (
                                <Line
                                    key={`full-${habit.id}`}
                                    type="stepAfter"
                                    dataKey={`${habit.id}_full`}
                                    name={`${habit.name} (Proyección)`}
                                    stroke={habit.color}
                                    strokeWidth={1.5}
                                    strokeOpacity={0.25}
                                    activeDot={false}
                                    dot={false}
                                    isAnimationActive={false}
                                />
                            ))}

                            {activeHabitsConfig.map(habit => {
                                const lastDay = getLastActionDay(habit.id);
                                return (
                                    <Line
                                        key={habit.id}
                                        type="monotone"
                                        dataKey={habit.id}
                                        name={habit.name}
                                        stroke={habit.color}
                                        strokeWidth={2.5}
                                        animationDuration={400}
                                        style={{ filter: `drop-shadow(0px 0px 4px ${habit.color})` }}
                                        activeDot={{ r: 5, fill: habit.color, stroke: '#fff', strokeWidth: 2, style: { filter: `drop-shadow(0px 0px 6px ${habit.color})` } }}
                                        connectNulls={false}
                                        dot={(props) => {
                                            const { cx, cy, payload } = props;
                                            // Dibujar el punto final expandido en filter para evitar que se vea cuadrado "boxy"
                                            if (payload.day === lastDay && payload[habit.id] !== null) {
                                                return (
                                                    <g key={`dot-${habit.id}-${payload.day}`}>
                                                        <circle cx={cx} cy={cy} r={4.5} fill={habit.color} filter={`url(#glow-${habit.id})`} />
                                                        <circle cx={cx} cy={cy} r={2} fill="#ffffff" />
                                                    </g>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                )
                            })}
                        </LineChart>
                    </div>
                </div>

                {/* Leyenda minimalista */}
                <div className="flex flex-wrap items-center justify-center gap-6 mt-6 px-4">
                    {activeHabitsConfig.map(habit => (
                        <div key={`legend-${habit.id}`} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: habit.color, boxShadow: `0 0 8px ${habit.color}` }}></div>
                            <span className="text-white/80 text-xs font-semibold tracking-wide">{habit.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20 min-w-0">
            {/* Header con selector de mes alineado (consistente con las otras páginas) */}
            <PageHeader
                title={t('app.habitos')}
                subtitle="Construye tus rachas, día a día."
                right={<DatePicker selectedDate={currentDate} onChange={setCurrentDate} monthOnly={true} />}
            />

            {/* Overview Cards (reutilizables) — 1 columna en angosto, 3 en fila en ancho */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 relative z-10">
                <HabitStatCard label="Mejor Racha" value={currentStreak} suffix={currentStreak === 1 ? 'Día' : 'Días'} color="blue" icon={Flame} />
                <HabitStatCard label="Hábito Top" value={`${bestCompletion}%`} suffix={bestHabit?.name || '---'} color="green" icon={Trophy} />
                <HabitStatCard label="Menor Racha" value={`${worstCompletion}%`} suffix={worstHabit?.name || '---'} color="red" icon={AlertTriangle} />
            </div>

            {/* Month Tracker Section */}
            <div className="space-y-6 min-w-0">

                {/* Controles: Editar Hábitos (izq) + Slider del mes (der), alineados horizontalmente */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-2">
                    <div className="flex flex-wrap gap-3 items-center">
                        {isEditMode && (
                            <div className="flex items-center gap-3 bg-black/20 px-4 py-1.5 rounded-xl border border-white/5">
                                <span className="text-[10px] font-bold text-white/50 tracking-widest uppercase">Unificar Color</span>
                                <button
                                    onClick={() => setIsUnifiedColor(!isUnifiedColor)}
                                    className={`w-9 h-5 flex items-center rounded-full px-1 transition-colors ${isUnifiedColor ? 'bg-blue-500' : 'bg-white/10 border border-white/10'}`}
                                >
                                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${isUnifiedColor ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                                {isUnifiedColor && (
                                    <div className="w-5 h-5 rounded-full border border-white/20 overflow-hidden relative cursor-pointer" style={{ backgroundColor: globalColor }}>
                                        <input
                                            type="color"
                                            value={globalColor}
                                            onChange={(e) => setGlobalColor(e.target.value)}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-[200%] h-[200%] -left-1/2 -top-1/2"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        <button onClick={() => setIsEditMode(!isEditMode)} className="btn-primary">
                            {isEditMode ? 'GUARDAR HÁBITOS' : 'EDITAR HÁBITOS'}
                        </button>
                    </div>

                    {/* Slider del mes (flechas funcionales) */}
                    {habits.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-text-muted/60 text-[11px] font-semibold tracking-wide mr-1">Desliza para ver todo el mes</span>
                            <button onClick={() => scrollGrid(-260)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-colors" title="Días anteriores">
                                <ChevronLeft size={15} />
                            </button>
                            <button onClick={() => scrollGrid(260)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-colors" title="Días siguientes">
                                <ChevronRight size={15} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Monthly Grid Table */}
                <div ref={gridScrollRef} className="overflow-x-auto pb-2 custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                    {habits.length === 0 ? (
                        <div className="min-w-full mx-auto pt-2">
                            <div className="glass-card border border-white/10 bg-[#101118]/80 p-10 text-center max-w-3xl mx-auto">
                                <p className="text-white text-lg font-semibold mb-2">No hay hábitos aún</p>
                                <p className="text-text-muted mb-6">Agrega tu primer hábito para comenzar a ver la tabla y el progreso mensual.</p>
                                <button
                                    onClick={() => {
                                        setIsEditMode(true);
                                        addInlineHabit();
                                    }}
                                    className="btn-primary"
                                >
                                    CREAR PRIMER HÁBITO
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mx-auto pt-2" style={{ minWidth: tableMinWidth, width: tableMinWidth }}>
                            {/* Days Header */}
                            <div className="flex items-center border-b border-white/10 pb-3">
                                <div className={`shrink-0 mr-4 transition-all duration-300 ${isEditMode ? 'w-[220px]' : 'w-[120px]'}`}></div> {/* Spacer for names */}
                                <div className="flex gap-2">
                                    {monthDays.map(day => (
                                        <div key={day.getDate()} className="w-7 shrink-0 text-center">
                                            <span className="text-[10px] font-bold text-white/40 tracking-tighter">{day.getDate()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Habits Rows */}
                            <div className="space-y-0">
                                {habits.map((habit) => {
                                    const activeColor = isUnifiedColor ? globalColor : habit.color;
                                    return (
                                        <div key={habit.id} className="flex items-center relative py-3 border-b border-white/5 hover:bg-white/[0.01] transition-colors">

                                        {/* Name Column */}
                                        <div className={`shrink-0 mr-4 flex justify-end items-center gap-3 relative z-10 h-full transition-all duration-300 ${isEditMode ? 'w-[220px]' : 'w-[120px]'}`}>
                                            {isEditMode ? (
                                                <>
                                                    <button
                                                        onClick={() => removeHabitHandler(habit.id)}
                                                        className="p-1 text-red-500/50 hover:text-red-500 transition-colors shrink-0"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>

                                                    {!isUnifiedColor && (
                                                        <div className="relative group/color shrink-0">
                                                            <div className="w-4 h-4 rounded-full border border-white/20 overflow-hidden relative cursor-pointer" style={{ backgroundColor: habit.color }}>
                                                                <input
                                                                    type="color"
                                                                    value={habit.color}
                                                                    onChange={(e) => updateHabitHandler(habit.id, 'color', e.target.value)}
                                                                    className="absolute inset-0 opacity-0 cursor-pointer w-[200%] h-[200%] -left-1/2 -top-1/2"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={() => {
                                                            const nextFreq = habit.frequency === 1 ? 2 : habit.frequency === 2 ? 3 : 1;
                                                            updateHabitHandler(habit.id, 'frequency', nextFreq);
                                                        }}
                                                        className="px-2 py-1 bg-black/40 border border-white/10 rounded-lg text-[9px] font-bold text-white hover:bg-white/10 transition-colors shadow-lg min-w-[3.5rem] shrink-0"
                                                        title={FREQUENCY_OPTIONS[habit.frequency]}
                                                    >
                                                        {habit.frequency === 1 ? 'DIARIO' : habit.frequency === 2 ? 'LUN-VIE' : 'SAB-DOM'}
                                                    </button>

                                                    <input
                                                        type="text"
                                                        value={habit.name}
                                                        onChange={(e) => updateHabitHandler(habit.id, 'name', e.target.value)}
                                                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm font-bold text-white w-full outline-none focus:border-acid transition-all min-w-[3rem]"
                                                    />
                                                </>
                                            ) : (
                                                <span className="font-bold text-white text-sm tracking-wide flex items-center gap-2 truncate">
                                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: activeColor }}></span>
                                                    <span className="truncate">{habit.name}</span>
                                                </span>
                                            )}
                                        </div>

                                        {/* Grid Cells */}
                                        <div className="flex gap-2 relative z-10">
                                            {monthDays.map(day => {
                                                const dateStr = formatDate(day);
                                                const isApplicable = isDayApplicable(day, habit.frequency);
                                                const isDone = habit.history[dateStr] > 0;

                                                // Render blocked grid
                                                if (!isApplicable) {
                                                    return (
                                                        <div key={dateStr} className="w-7 h-7 rounded-lg transition-all shrink-0 bg-transparent flex items-center justify-center">
                                                            <div className="w-1 h-1 rounded-full bg-white/[0.05]" />
                                                        </div>
                                                    )
                                                }

                                                // Render normal grid
                                                return (
                                                    <button
                                                        key={dateStr}
                                                        onClick={() => toggleHabit(habit.id, dateStr, day, habit.frequency)}
                                                        className={`w-7 h-7 rounded-[7px] transition-all flex items-center justify-center shrink-0
                                                        ${!isEditMode && !isDone && (isDark ? 'hover:border-white/30 hover:bg-white/[0.04]' : 'hover:border-black/40 hover:bg-black/[0.04]')}
                                                        ${isEditMode && 'cursor-default opacity-50'}
                                                    `}
                                                        style={{
                                                            backgroundColor: isDone ? 'transparent' : (isDark ? 'transparent' : 'rgba(0,0,0,0.02)'),
                                                            backgroundImage: isDone ? `linear-gradient(to top, ${activeColor}dd 0%, ${activeColor}22 100%)` : 'none',
                                                            border: isDone ? `1px solid ${activeColor}` : (isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.18)'),
                                                            boxShadow: isDone ? `0 0 10px ${activeColor}40, inset 0 0 5px ${activeColor}30` : 'none',
                                                        }}
                                                    />
                                                )
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Inline Add Button inside Grid */}
                        {isEditMode && (
                            <div className="mt-6 flex items-center justify-start border-t border-white/5 pt-6">
                                <button
                                    onClick={addInlineHabit}
                                    className="flex items-center gap-2 text-acid font-bold tracking-widest text-xs px-4 py-2 hover:bg-acid/10 rounded-xl transition-colors"
                                >
                                    <Plus size={16} /> AGREGAR HÁBITO
                                </button>
                            </div>
                        )}

                        {/* --- Analisis de Rendimiento / Graphical Stats --- */}
                        {/* Se renderiza DENTRO del mismo div.w-max de la grilla para asegurar pixel-perfect scroll y stroke alineado */}
                        <div className="mt-6 space-y-6 relative z-10 pb-2 w-full border-t border-white/5 pt-6">
                            <UnifiedTrendChart isEditMode={isEditMode} />
                        </div>

                    </div>
                    )}
                </div>

            </div>
        </div>
    );
}

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Calendar, CheckSquare, CreditCard, AlertCircle } from 'lucide-react';
import { useTasks } from '../../features/tasks/context/TaskContext';
import { useMonthlyTracker } from '../../features/monthlyTracker/context/MonthlyTrackerContext';

export default function NotificationBell() {
    const { tasks, spaces, categories } = useTasks();
    const { currentBudget, fixedExpenses, MONTHS_SHORT } = useMonthlyTracker();
    const [isOpen, setIsOpen] = useState(false);
    const [dismissed, setDismissed] = useState(() => {
        const saved = localStorage.getItem('app_dismissed_notifications');
        return saved ? JSON.parse(saved) : [];
    });
    const ref = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Persist dismissed
    useEffect(() => {
        localStorage.setItem('app_dismissed_notifications', JSON.stringify(dismissed));
    }, [dismissed]);

    // Build notifications
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const notifications = [];

    // 1. Task notifications (with due dates)
    tasks.forEach(task => {
        if (!task.date) return;
        const dueDate = new Date(task.date);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));
        const cat = categories.find(c => c.id === task.category_id);
        const space = cat ? spaces.find(s => s.id === cat.space_id) : null;

        if (diffDays < 0) {
            // Overdue
            notifications.push({
                id: `task_overdue_${task.id}`,
                type: 'danger',
                icon: AlertCircle,
                title: task.title,
                subtitle: `Venció hace ${Math.abs(diffDays)} día${Math.abs(diffDays) !== 1 ? 's' : ''}`,
                badge: space?.name,
                badgeColor: space?.color || '#666',
                date: dueDate,
                priority: 0
            });
        } else if (diffDays === 0) {
            // Due today
            notifications.push({
                id: `task_today_${task.id}`,
                type: 'warning',
                icon: CheckSquare,
                title: task.title,
                subtitle: 'Vence hoy',
                badge: space?.name,
                badgeColor: space?.color || '#666',
                date: dueDate,
                priority: 1
            });
        } else if (diffDays <= 3) {
            // Due soon (within 3 days)
            notifications.push({
                id: `task_soon_${task.id}`,
                type: 'info',
                icon: Calendar,
                title: task.title,
                subtitle: `Vence en ${diffDays} día${diffDays !== 1 ? 's' : ''}`,
                badge: space?.name,
                badgeColor: space?.color || '#666',
                date: dueDate,
                priority: 2
            });
        }
    });

    // 2. Payment notifications (pending expenses from monthly tracker)
    if (currentBudget) {
        const monthLabel = MONTHS_SHORT?.[currentBudget.month] || '';

        // Fixed expenses
        (fixedExpenses || []).forEach((item) => {
            if ((item.status || 0) === 0) {
                notifications.push({
                    id: `payment_fixed_${item.id}`,
                    type: 'payment',
                    icon: CreditCard,
                    title: item.label,
                    subtitle: `Pago pendiente — ${monthLabel}`,
                    badge: 'Gasto Fijo',
                    badgeColor: '#f87171',
                    date: today,
                    priority: 3
                });
            }
        });

        // Variable expenses
        (currentBudget.gastosVar || []).forEach((item) => {
            if ((item.status || 0) === 0) {
                notifications.push({
                    id: `payment_var_${item.id}`,
                    type: 'payment',
                    icon: CreditCard,
                    title: item.label,
                    subtitle: `Pago pendiente — ${monthLabel}`,
                    badge: 'Gasto Variable',
                    badgeColor: '#fb923c',
                    date: today,
                    priority: 3
                });
            }
        });
    }

    // Filter dismissed and sort by priority
    const activeNotifications = notifications
        .filter(n => !dismissed.includes(n.id))
        .sort((a, b) => a.priority - b.priority);

    const count = activeNotifications.length;

    const dismiss = (id) => {
        setDismissed(prev => [...prev, id]);
    };

    const dismissAll = () => {
        setDismissed(prev => [...prev, ...activeNotifications.map(n => n.id)]);
    };

    const typeStyles = {
        danger: { bg: 'bg-red-500/10', border: 'border-red-500/20', iconColor: 'text-red-400' },
        warning: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', iconColor: 'text-yellow-400' },
        info: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', iconColor: 'text-blue-400' },
        payment: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', iconColor: 'text-orange-400' },
    };

    return (
        <div ref={ref} className="relative">
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
            >
                <Bell size={20} />
                {count > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-acid rounded-full flex items-center justify-center text-[10px] font-bold text-black animate-pulse"
                         style={{ boxShadow: '0 0 10px var(--primary-glow)' }}>
                        {count > 9 ? '9+' : count}
                    </div>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-[380px] max-h-[480px] bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
                    style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
                        <div className="flex items-center gap-2">
                            <Bell size={16} className="text-white/50" />
                            <span className="text-sm font-bold text-white">Notificaciones</span>
                            {count > 0 && (
                                <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-lg">{count}</span>
                            )}
                        </div>
                        {count > 0 && (
                            <button 
                                onClick={dismissAll}
                                className="text-[10px] font-bold text-white/30 hover:text-white/60 uppercase tracking-wider transition-colors"
                            >
                                Limpiar todo
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {activeNotifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-white/20">
                                <Bell size={32} className="mb-3 opacity-50" />
                                <span className="text-sm font-bold">Sin notificaciones</span>
                                <span className="text-xs mt-1">Todo está al día</span>
                            </div>
                        ) : (
                            <div className="p-2 space-y-1">
                                {activeNotifications.map(n => {
                                    const styles = typeStyles[n.type];
                                    const Icon = n.icon;
                                    return (
                                        <div 
                                            key={n.id} 
                                            className={`flex items-start gap-3 p-3 rounded-xl ${styles.bg} border ${styles.border} group transition-all hover:scale-[1.01]`}
                                        >
                                            <div className={`p-1.5 rounded-lg ${styles.bg} ${styles.iconColor} shrink-0 mt-0.5`}>
                                                <Icon size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{n.title}</p>
                                                <p className="text-xs text-white/40 mt-0.5">{n.subtitle}</p>
                                                {n.badge && (
                                                    <span 
                                                        className="inline-block text-[9px] font-bold uppercase tracking-wider mt-1.5 px-2 py-0.5 rounded-md"
                                                        style={{ backgroundColor: `${n.badgeColor}20`, color: n.badgeColor }}
                                                    >
                                                        {n.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <button 
                                                onClick={() => dismiss(n.id)}
                                                className="p-1 text-white/0 group-hover:text-white/30 hover:!text-white/60 transition-all rounded shrink-0"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

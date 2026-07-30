import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Pencil, Trophy, X, ChevronDown, Check, Trash2 } from 'lucide-react';
import ColorPicker from '../../shared/components/ColorPicker';
import PageHeader from '../../shared/components/PageHeader';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { getGoals, createGoal, updateGoal, deleteGoal, addGoalHistory, deleteGoalHistory } from './services/goals';

const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Formatea la fecha de un movimiento (acepta ISO string o Date) -> "23 jun 2026".
const formatHistoryDate = (d) => {
    const date = typeof d === 'string' ? new Date(d) : d;
    if (!date || isNaN(date.getTime())) return '';
    return `${date.getDate()} ${MESES[date.getMonth()]} ${date.getFullYear()}`;
};

export default function Goals() {
    const { userId, isAuthenticated } = useAuth();
    const { t } = useLanguage();
    const [goals, setGoals] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [modalTitle, setModalTitle] = useState('');
    const [modalTarget, setModalTarget] = useState('');
    const [modalAmount, setModalAmount] = useState('');
    const [modalColor, setModalColor] = useState('#4ade80');
    const [modalNoLimit, setModalNoLimit] = useState(false);

    const loadGoals = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const data = await getGoals(userId);
            // La nube (Supabase) es la única fuente de verdad. Siempre reflejamos
            // lo que hay en la BD, incluso si quedó vacío tras borrar todo.
            const formattedGoals = (data || []).map(g => ({
                id: g.id,
                title: g.title,
                target: g.target,
                current: g.current,
                color: g.color,
                history: (g.goal_history || [])
                    .slice()
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(h => ({
                        id: h.id,
                        date: h.date,
                        amount: h.amount,
                        type: h.type,
                        note: h.note || ''
                    }))
            }));
            setGoals(formattedGoals);
        } catch (error) {
            console.error('Error loading goals:', error);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (isAuthenticated && userId) {
            loadGoals();
        }
    }, [isAuthenticated, userId, loadGoals]);

    const openModal = (goal = null) => {
        if (!goal && goals.length >= 6) {
            toast.error('¡Máximo 6 metas permitidas!');
            return;
        }

        setEditingGoal(goal);
        if (goal) {
            setModalTitle(goal.title);
            setModalTarget(goal.target.toString());
            setModalAmount(goal.current.toString());
            setModalColor(goal.color);
            setModalNoLimit(goal.target === 0);
        } else {
            setModalTitle('');
            setModalTarget('');
            setModalAmount('');
            setModalColor('#4ade80');
            setModalNoLimit(false);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingGoal(null);
    };

    const handleSaveGoal = async () => {
        if (!modalTitle) {
            toast.error('Por favor completa los campos requeridos');
            return;
        }

        const targetVal = modalNoLimit ? 0 : (parseInt(modalTarget.replace(/\D/g, '')) || 0);

        if (!modalNoLimit && targetVal <= 0) {
            toast.error('La meta debe ser mayor a 0');
            return;
        }

        const currentVal = parseInt(modalAmount.replace(/\D/g, '')) || 0;

        try {
            if (editingGoal) {
                // Al editar SOLO se cambian nombre/objetivo/color. El ahorrado NO se
                // toca aquí: viene de los movimientos del historial (modelo coherente).
                const updatedGoal = {
                    title: modalTitle,
                    target: targetVal,
                    color: modalColor
                };
                await updateGoal(editingGoal.id, userId, updatedGoal);

                setGoals(goals.map(g => g.id === editingGoal.id ? {
                    ...g,
                    ...updatedGoal
                } : g));
                toast.success('Meta actualizada');
            } else {
                const newGoalData = {
                    title: modalTitle,
                    target: targetVal,
                    current: currentVal,
                    color: modalColor
                };
                const createdGoal = await createGoal(userId, newGoalData);

                let initialHistory = [];
                if (currentVal > 0) {
                    const createdHist = await addGoalHistory(userId, {
                        goal_id: createdGoal.id,
                        amount: currentVal,
                        type: 'add',
                        date: new Date().toISOString()
                    });
                    initialHistory = [{
                        id: createdHist?.id || Date.now(),
                        date: createdHist?.date || new Date().toISOString(),
                        amount: currentVal,
                        type: 'add'
                    }];
                }

                setGoals([{ id: createdGoal.id, ...newGoalData, history: initialHistory }, ...goals]);
                toast.success(t('goals.metaCreada'));
            }
            closeModal();
        } catch (error) {
            console.error('Error saving goal:', error);
            toast.error('Error al guardar la meta');
        }
    };

    const handleTransaction = async (id, amount, type, note = '') => {
        const val = Math.abs(parseInt(String(amount).replace(/\D/g, ''))) || 0;
        if (val <= 0) {
            toast.error('Ingresa un monto válido');
            return;
        }

        const goal = goals.find(g => g.id === id);
        if (!goal) return;

        const newCurrent = Math.max(0, type === 'add' ? goal.current + val : goal.current - val);

        try {
            await updateGoal(id, userId, { current: newCurrent });
            const createdHist = await addGoalHistory(userId, {
                goal_id: id,
                amount: val,
                type,
                note: note || null,
                date: new Date().toISOString()
            });

            const newHistory = [{
                id: createdHist?.id || Date.now(),
                date: createdHist?.date || new Date().toISOString(),
                amount: val,
                type,
                note: note || ''
            }, ...goal.history];

            setGoals(goals.map(g => g.id === id ? { ...g, current: newCurrent, history: newHistory } : g));
            toast.success(type === 'add' ? 'Monto agregado' : 'Monto restado');
        } catch (error) {
            console.error('Error in transaction:', error);
            toast.error('Error al procesar la transacción');
        }
    };

    // Borra un movimiento del historial y recalcula el ahorrado desde los movimientos restantes.
    const handleDeleteMovement = async (goalId, hist) => {
        const goal = goals.find(g => g.id === goalId);
        if (!goal) return;
        try {
            await deleteGoalHistory(hist.id, userId);
            const remaining = goal.history.filter(h => h.id !== hist.id);
            const newCurrent = Math.max(0, remaining.reduce((acc, h) => acc + (h.type === 'add' ? h.amount : -h.amount), 0));
            await updateGoal(goalId, userId, { current: newCurrent });
            setGoals(goals.map(g => g.id === goalId ? { ...g, current: newCurrent, history: remaining } : g));
            toast.success('Movimiento eliminado');
        } catch (error) {
            console.error('Error deleting movement:', error);
            toast.error('Error al eliminar el movimiento');
        }
    };

    const handleDeleteGoal = async (id) => {
        try {
            await deleteGoal(id, userId);
            setGoals(goals.filter(g => g.id !== id));
            toast.success(t('goals.metaEliminada'));
        } catch (error) {
            console.error('Error deleting goal:', error);
            toast.error('Error al eliminar la meta');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20 relative">

            <PageHeader
                title={t('goals.title')}
                subtitle="Sigue tu progreso para lograrlo."
                right={
                    <button onClick={() => openModal()} className="btn-primary" disabled={isLoading}>
                        <Plus size={18} /> {t('goals.nuevaMeta')}
                    </button>
                }
            />

            {isLoading && (
                <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-2 border-acid border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                {goals.map(goal => (
                    <GoalCard
                        key={goal.id}
                        goal={goal}
                        onEdit={() => openModal(goal)}
                        onTransaction={handleTransaction}
                        onDelete={() => handleDeleteGoal(goal.id)}
                        onDeleteMovement={handleDeleteMovement}
                    />
                ))}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="border rounded-3xl w-full max-w-md p-6 shadow-[0_25px_60px_rgba(0,0,0,0.3)] relative overflow-hidden backdrop-blur-xl"
                            style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-card)' }}
                        >
                            <button onClick={closeModal} className="absolute top-4 right-4 p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                                <X size={20} />
                            </button>

                            <h3 className="text-2xl font-bold text-white mb-6">{editingGoal ? 'Editar Meta' : t('goals.nuevaMeta')}</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs uppercase font-bold text-text-muted mb-1 block">Nombre de la Meta</label>
                                    <input
                                        type="text"
                                        value={modalTitle}
                                        onChange={(e) => setModalTitle(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-acid focus:outline-none placeholder-white/20"
                                        placeholder="Ej. Viaje a Bali"
                                    />
                                </div>

                                <div className={editingGoal ? '' : 'grid grid-cols-2 gap-4'}>
                                    <div>
                                        <label className="text-xs uppercase font-bold text-text-muted mb-1 block">
                                            Meta Total
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={modalNoLimit ? '' : Number(modalTarget).toLocaleString('es-CO')}
                                                onChange={(e) => setModalTarget(e.target.value.replace(/\D/g, ''))}
                                                disabled={modalNoLimit}
                                                className={`w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-acid focus:outline-none text-right font-mono transition-opacity ${modalNoLimit ? 'opacity-40 cursor-not-allowed' : ''}`}
                                                placeholder={modalNoLimit ? 'Sin límite' : '$0'}
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                            <input type="checkbox" checked={modalNoLimit} onChange={() => setModalNoLimit(!modalNoLimit)}
                                                className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-acid focus:ring-acid/30 cursor-pointer" />
                                            <span className="text-[11px] text-text-muted select-none">Sin meta límite</span>
                                        </label>
                                    </div>
                                    {!editingGoal && (
                                        <div>
                                            <label className="text-xs uppercase font-bold text-text-muted mb-1 block">Monto Inicial</label>
                                            <input
                                                type="text"
                                                value={Number(modalAmount).toLocaleString('es-CO')}
                                                onChange={(e) => setModalAmount(e.target.value.replace(/\D/g, ''))}
                                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-acid focus:outline-none text-right font-mono"
                                                placeholder="$0"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs uppercase font-bold text-text-muted mb-2 block">Color Identificativo</label>
                                    <div className="p-4 bg-black/50 border border-white/5 rounded-xl flex justify-center">
                                        <ColorPicker selectedColor={modalColor} onChange={setModalColor} />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button onClick={closeModal} className="flex-1 py-3 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-colors">
                                    {t('common.cancelar')}
                                </button>
                                <button onClick={handleSaveGoal} className="flex-1 py-3 rounded-xl bg-acid text-black font-bold hover:bg-white transition-colors shadow-[0_0_15px_rgba(190,242,100,0.2)]">
                                    {editingGoal ? 'Actualizar' : t('goals.nuevaMeta')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const GoalCard = ({ goal, onEdit, onTransaction, onDelete, onDeleteMovement }) => {
    const { t } = useLanguage();
    const [amountInput, setAmountInput] = useState('');
    const [noteInput, setNoteInput] = useState('');
    const [showHistory, setShowHistory] = useState(false);

    const noLimit = goal.target === 0;
    const progress = noLimit ? 0 : Math.min(100, (goal.current / goal.target) * 100);

    const customStyle = {
        '--goal-color': goal.color,
        borderColor: `${goal.color}33`,
    };

    const handleAction = (type) => {
        const val = parseInt(amountInput.replace(/\D/g, '')) || 0;
        if (val <= 0) return;
        onTransaction(goal.id, val, type, noteInput.trim());
        setAmountInput('');
        setNoteInput('');
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative group w-full"
        >
            <div className="glass-card p-5 border transition-all hover:bg-white/[0.02]" style={customStyle}>

                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                     <button onClick={onEdit} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors" title={t('common.editar')}>
                        <Pencil size={14} />
                    </button>
                    <button
                        onClick={() => {
                            if (window.confirm(t('goals.eliminarConfirm'))) {
                                onDelete();
                            }
                        }}
                        className="p-2 bg-white/10 hover:bg-red-500/20 text-white hover:text-red-400 rounded-lg transition-colors"
                        title="Eliminar meta"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>

                <div className="flex items-start gap-4 mb-2">
                    <div
                        className="p-3 rounded-2xl shadow-lg"
                        style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
                    >
                        <Trophy size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white leading-tight">{goal.title}</h3>
                        {noLimit ? (
                            <p className="text-sm text-text-muted/50 mt-1 italic">Sin límite</p>
                        ) : (
                            <p className="text-sm text-text-muted mt-1 font-mono">{formatMoney(goal.target)}</p>
                        )}
                    </div>
                </div>

                {noLimit ? (
                    <div className="flex justify-between items-center mb-3 mt-3 px-1">
                        <span className="text-white font-mono font-bold text-lg">{formatMoney(goal.current)}</span>
                        <span className="text-xs text-text-muted/50 italic">Acumulado</span>
                    </div>
                ) : (
                    <>
                        <div className="mt-3 mb-2 h-2.5 w-full bg-white/10 rounded-full relative overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full relative overflow-hidden rounded-full"
                                style={{
                                    background: `linear-gradient(90deg, ${goal.color}55 0%, ${goal.color} 100%)`,
                                    boxShadow: progress > 0 ? `0 0 12px 0 ${goal.color}70` : 'none'
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full -skew-x-12 opacity-50" />
                            </motion.div>
                        </div>

                        <div className="flex justify-between items-center mb-3 px-1">
                            <span className="text-white font-mono font-bold text-lg">{formatMoney(goal.current)}</span>
                            <span className="text-2xl font-bold" style={{ color: goal.color }}>{Math.round(progress)}%</span>
                        </div>
                    </>
                )}

                <div className="flex bg-white/5 rounded-xl p-1 border border-white/5 relative z-20">
                    <button onClick={() => handleAction('subtract')} className="p-2.5 hover:bg-red-500/20 text-text-muted hover:text-red-400 rounded-lg transition-colors">
                        <Minus size={18} />
                    </button>
                    <input
                        type="text"
                        placeholder="Monto..."
                        value={amountInput}
                        onChange={(e) => setAmountInput(e.target.value)}
                        className="flex-1 bg-transparent text-center text-white font-mono focus:outline-none placeholder-white/20 text-sm min-w-0"
                    />
                    <button onClick={() => handleAction('add')} className="p-2.5 hover:bg-green-500/20 text-text-muted hover:text-green-400 rounded-lg transition-colors">
                        <Plus size={18} />
                    </button>
                </div>

                <input
                    type="text"
                    placeholder="Nota (opcional): quincena, freelance…"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="mt-2 w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-acid transition-colors"
                />

                <div className="mt-3 border-t border-white/5 pt-2">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full flex justify-between items-center text-xs text-text-muted hover:text-white py-1 uppercase font-bold tracking-wider group/hist"
                    >
                        <span>Historial</span>
                        <ChevronDown size={14} className={`transition-transform duration-300 ${showHistory ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {showHistory && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-1 mt-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                    {goal.history && goal.history.length > 0 ? (
                                        goal.history.map((h) => (
                                            <div key={h.id} className="flex justify-between items-center gap-2 text-[11px] font-mono p-1.5 rounded hover:bg-white/5 transition-colors group/h">
                                                <div className="min-w-0">
                                                    <span className="text-text-muted">{formatHistoryDate(h.date)}</span>
                                                    {h.note && <span className="block text-white/40 text-[10px] truncate not-italic">{h.note}</span>}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={h.type === 'add' ? 'text-green-400' : 'text-red-400'}>
                                                        {h.type === 'add' ? '+' : '-'}{formatMoney(h.amount)}
                                                    </span>
                                                    <button
                                                        onClick={() => onDeleteMovement(goal.id, h)}
                                                        className="p-0.5 text-red-500/40 hover:text-red-500 opacity-0 group-hover/h:opacity-100 transition-all"
                                                        title="Eliminar movimiento"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-xs text-text-muted italic py-2">Sin movimientos</p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </div>
        </motion.div>
    );
};

import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet, Plus, Trash2, Pencil, Check, X,
  Database, DollarSign, TrendingDown, RotateCcw, Eraser, AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../hooks/useAuth';
import { useUser } from '../../../context/UserContext';
import { useMonthlyTracker } from '../../monthlyTracker/context/MonthlyTrackerContext';
import { supabase } from '../../../shared/services/supabase';
import * as annualExpensesDb from '../services/annualExpenses';
import StatCard from '../../../shared/components/StatCard';
import CalendarInput from '../../../shared/components/CalendarInput';
import { toast } from 'sonner';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, description, itemsPreview, confirmText, isDanger, selectable }) => {
  const [checked, setChecked] = useState({});
  const allChecked = itemsPreview && itemsPreview.length > 0 && Object.keys(checked).length === itemsPreview.length && itemsPreview.every(item => checked[item.id]);
  const noneChecked = itemsPreview && itemsPreview.length > 0 && Object.keys(checked).length === 0;

  useEffect(() => {
    if (isOpen && itemsPreview) {
      const init = {};
      for (const item of itemsPreview) init[item.id] = true;
      setChecked(init);
    }
  }, [isOpen, itemsPreview]);

  if (!isOpen) return null;

  const toggleAll = () => {
    if (allChecked) {
      setChecked({});
    } else {
      const all = {};
      for (const item of itemsPreview) all[item.id] = true;
      setChecked(all);
    }
  };

  const toggleItem = (id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[var(--bg-card-solid)] border border-[var(--border-card)] rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4 animate-scale-in">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${isDanger ? 'bg-red-500/10 text-red-500' : 'bg-acid/10 text-acid'}`}>
            {isDanger ? <AlertTriangle size={22} /> : <RotateCcw size={22} />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-base text-[var(--text-primary)]">{title}</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        {itemsPreview !== undefined && (
          <div className="bg-[var(--bg-input)] border border-[var(--border-card)] rounded-xl p-3 max-h-48 overflow-y-auto space-y-1">
            {itemsPreview.length > 0 ? (
              <>
                {selectable && (
                  <label className="flex items-center gap-2 py-1 border-b border-[var(--border-card)]/50 mb-1 cursor-pointer">
                    <input type="checkbox" checked={allChecked}
                      onChange={toggleAll}
                      className={`w-3.5 h-3.5 rounded-full appearance-none cursor-pointer border-2 transition-all duration-150 ${
                        isDanger
                          ? allChecked ? 'bg-red-500 border-red-500' : 'bg-transparent border-red-500/50'
                          : allChecked ? 'bg-acid border-acid' : 'bg-transparent border-acid/50'
                      }`} />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] select-none">All</span>
                  </label>
                )}
                {itemsPreview.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 py-0.5 cursor-pointer group">
                    {selectable && (
                      <input type="checkbox" checked={checked[item.id] ?? true} onChange={() => toggleItem(item.id)}
                        className={`w-3.5 h-3.5 rounded-full appearance-none cursor-pointer shrink-0 border-2 transition-all duration-150 ${
                          isDanger
                            ? checked[item.id] ? 'bg-red-500 border-red-500' : 'bg-transparent border-red-500/40'
                            : checked[item.id] ? 'bg-acid border-acid' : 'bg-transparent border-acid/40'
                        }`} />
                    )}
                    <span className={`text-xs font-medium truncate mr-2 flex-1 ${selectable ? 'text-[var(--text-primary)] group-hover:text-white transition-colors' : 'text-[var(--text-primary)]'}`}>
                      {item.label || item.name || 'Sin concepto'}
                    </span>
                    <span className="text-[var(--text-muted)] text-xs font-semibold shrink-0">
                      {item.amountDisplay || `$${Number(item.amount || 0).toLocaleString('es-CO')}`}
                    </span>
                  </label>
                ))}
              </>
            ) : (
              <span className="text-xs text-[var(--text-muted)] italic block text-center py-1">
                {isDanger ? 'No hay elementos para limpiar.' : 'No hay elementos en el mes anterior para copiar.'}
              </span>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-card)]/50">
          <button
            onClick={onClose}
            type="button"
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              const selected = itemsPreview ? itemsPreview.filter((item) => checked[item.id]).map((item) => item.id) : [];
              onConfirm(selected);
              onClose();
            }}
            type="button"
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              isDanger
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                : 'bg-acid text-black font-bold hover:bg-acid/90 shadow-lg shadow-acid/20'
            }`}
          >
            {isDanger ? <X size={12} /> : <Check size={12} />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const COLORS = {
  savings: '#1D9E75',
  cushion: '#378ADD',
  expenses: '#BA7517',
  free: '#D3D1C7',
  danger: '#E24B4A',
};

// ── Status Bulb ──
const StatusBulb = ({ status, onClick, readOnly = false }) => (
  <button
    onClick={readOnly ? undefined : onClick}
    disabled={readOnly}
    className={`w-4 h-4 rounded-full transition-all duration-300 ${status === 1 ? 'bg-[#22c55e]' : status === 2 ? 'bg-red-500' : 'bg-zinc-700 shadow-none'} ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
    style={status === 1 ? { boxShadow: '0 0 15px rgba(34,197,94,0.6)' } : status === 2 ? { boxShadow: '0 0 15px rgba(239,68,68,0.6)' } : {}}
  />
);

const DashboardSection = ({ title, children, onEdit, isEditing, onAdd, isComplete = false, onCopyPrev, onClear }) => {
  return (
    <div className="relative group">
      <div
        className={`glass-card p-6 transition-all duration-500 
        ${isComplete
            ? 'border-[#22c55e]/30 shadow-[0_0_15px_rgba(34,197,94,0.05)]'
            : 'hover:border-white/20'
          }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 
            className={`font-display font-bold text-sm tracking-wide uppercase transition-colors duration-300 ${isComplete ? 'text-[#22c55e]' : 'text-[var(--text-primary)]'}`}
            style={isComplete ? { filter: 'drop-shadow(0 0 8px rgba(34,197,94,0.4))' } : {}}
          >
            {title}
          </h3>
          <div className="flex items-center gap-2">
            {isEditing && (onCopyPrev || onClear) && (
              <div className="flex items-center gap-1.5">
                {onCopyPrev && (
                  <button
                    onClick={onCopyPrev}
                    type="button"
                    className="px-2 py-1 text-[10px] font-medium bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border-card)] rounded hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-all flex items-center gap-1 cursor-pointer"
                    title="Copiar del mes anterior"
                  >
                    <RotateCcw size={11} />
                    Copiar mes anterior
                  </button>
                )}
                {onClear && (
                  <button
                    onClick={onClear}
                    type="button"
                    className="px-2 py-1 text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded hover:bg-red-500/20 transition-all flex items-center gap-1 cursor-pointer"
                    title="Limpiar sección"
                  >
                    <Eraser size={11} />
                    Limpiar
                  </button>
                )}
              </div>
            )}
            {isEditing && onAdd && (
              <button
                onClick={onAdd}
                className="p-1 rounded-full bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20 transition-colors cursor-pointer"
                title="Agregar Item"
              >
                <Plus size={18} />
              </button>
            )}
          </div>
        </div>
        <div className="space-y-0">
          {children}
        </div>
      </div>
      {onEdit && (
        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button
            onClick={onEdit}
            className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-all ${isEditing ? 'bg-[#22c55e] text-black' : 'bg-[var(--bg-card-solid)] text-[var(--text-primary)] border border-[var(--border-card)] hover:bg-[var(--bg-input)]'}`}
          >
            {isEditing ? <Check size={12} /> : <Pencil size={10} />}
          </button>
        </div>
      )}
    </div>
  );
};

const ListHeader = ({ showDate = false }) => (
  <div className="flex items-center gap-1.5 sm:gap-2 px-1 mb-1">
    <div className="w-4 shrink-0" />
    <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider flex-1">Concepto</span>
    {showDate && <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider w-28 text-center shrink-0">Fecha</span>}
    <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider w-24 text-right shrink-0">Valor</span>
  </div>
);

const TransactionRow = ({ item, isEditing, onChange, onDelete, onStatusToggle, canDelete, showDate = false }) => {
  const displayLabel = item.name !== undefined ? item.name : (item.label || '');
  const rawDate = item.date || item.payment_date || (item.created_at ? String(item.created_at).slice(0, 10) : '');
  const dateFieldName = item.payment_date !== undefined ? 'payment_date' : 'date';
  const fmtAmount = (val) => {
    const n = typeof val === 'string' ? parseFloat(val.replace(/\./g, '')) : (parseFloat(val) || 0);
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 py-2 border-b border-[var(--border-card)] last:border-b-0">
      <StatusBulb status={item.status || 0} onClick={onStatusToggle} readOnly={!isEditing} />

      {isEditing ? (
        <>
          <input type="text" value={displayLabel} onChange={(e) => onChange(item.id, item.name !== undefined ? 'name' : 'label', e.target.value)}
            placeholder="Concepto" className="min-w-0 flex-1 bg-[var(--bg-input)] border border-[var(--border-card)] rounded px-1.5 py-1 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)]" />
          {showDate && (
            <CalendarInput
              value={rawDate}
              onChange={(val) => onChange(item.id, dateFieldName, val)}
              placeholder="Fecha"
            />
          )}
          <input type="text" value={item.amount || ''} onChange={(e) => {
            const rawValue = e.target.value.replace(/\./g, '').replace(/,/g, '');
            if (!/^\d*$/.test(rawValue)) return;
            onChange(item.id, 'amount', rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
          }} placeholder="0" className="w-24 bg-[var(--bg-input)] border border-[var(--border-card)] rounded px-1.5 py-1 text-[11px] text-[var(--text-primary)] text-right focus:outline-none focus:border-[var(--border-hover)]" />
          <button onClick={() => canDelete && onDelete(item.id)} disabled={!canDelete}
            className={`p-1.5 rounded transition-colors shrink-0 ${canDelete ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' : 'text-zinc-700 cursor-not-allowed'}`}>
            <Trash2 size={13} />
          </button>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-between min-w-0">
          <span className="text-[11px] text-[var(--text-primary)] font-medium truncate flex-1">{displayLabel}</span>
          {showDate && (
            <span className="text-[10px] text-[var(--text-muted)] w-28 text-center shrink-0">
              {rawDate}
            </span>
          )}
          <span className="text-[11px] font-bold text-[var(--text-primary)] w-24 text-right shrink-0">{fmtAmount(item.amount)}</span>
        </div>
      )}
    </div>
  );
};

export default function IncomeExpensesTab({ budgets: allBudgets, pickerDate }) {
  const { t } = useLanguage();
  const [annualExpenses, setAnnualExpenses] = useState([]);
  const {
    currentBudget, calculations, updateBudgetField, formatCurrency, formatCurrencyDec, formatEur, formatUsd,
    deposits, wiseBalance,
    addDeposit, deleteDeposit,
    addIncome, updateIncome, deleteIncome, toggleIncomeStatus,
    fixedExpenses, updateFixedExpense, addFixedExpense, deleteFixedExpense, toggleFixedExpenseStatus,
    updateVariableExpense, addVariableExpense, deleteVariableExpense, toggleVariableExpenseStatus,
    copyFromPreviousMonth,
    copyIncomesFromPreviousMonth, clearIncomes,
    copyFixedExpensesFromPreviousMonth, clearFixedExpenses,
    copyVariableExpensesFromPreviousMonth, clearVariableExpenses,
    setCurrentIndex, MONTHS_LONG,
    budgets: contextBudgets,
  } = useMonthlyTracker();

  const activeBudgets = contextBudgets || allBudgets || [];

  // Selected budget based on the shared picker (independent of currentBudget)
  const selectedBudget = useMemo(() => {
    if (!pickerDate) return currentBudget;
    const y = pickerDate.getFullYear();
    const m = pickerDate.getMonth();
    return activeBudgets.find(b => Number(b.year) === y && Number(b.month) === m) || null;
  }, [activeBudgets, pickerDate, currentBudget]);

  const { user } = useUser();
  const useWise = user.useWise !== false;
  const useUsd = user.useUsd === true;
  const { fixedTotal } = calculations;

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    confirmText: '',
    isDanger: false,
    onConfirm: () => {},
  });

  const closeConfirmModal = () => setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  // Previous month budget calculation for modal preview
  const prevBudget = useMemo(() => {
    if (!selectedBudget || !activeBudgets.length) return null;
    const curMonth = Number(selectedBudget.month);
    const curYear = Number(selectedBudget.year);
    let prevMonth = curMonth - 1;
    let prevYear = curYear;
    if (prevMonth < 0) { prevMonth = 11; prevYear = curYear - 1; }
    return activeBudgets.find((b) => Number(b.year) === prevYear && Number(b.month) === prevMonth) || null;
  }, [selectedBudget, activeBudgets]);

  const promptCopyIncomes = () => {
    const prevItems = prevBudget?.incomes || [];
    const preview = prevItems.map((inc) => ({
      id: inc.id,
      label: inc.label,
      amountDisplay: inc.currency === 'COP'
        ? `$${Number(inc.amount || 0).toLocaleString('es-CO')}`
        : `${inc.amount} ${inc.currency}`,
    }));
    const prevMonthName = prevBudget ? MONTHS_LONG[prevBudget.month] : 'mes anterior';
    const curMonthName = selectedBudget ? MONTHS_LONG[selectedBudget.month] : 'este mes';

    setConfirmModal({
      isOpen: true,
      title: 'Copiar Ingresos Fijos',
      description: `Selecciona los ingresos a copiar de ${prevMonthName} a ${curMonthName} en estado neutro:`,
      itemsPreview: preview,
      confirmText: 'Copiar seleccionados',
      isDanger: false,
      selectable: true,
      onConfirm: (ids) => copyIncomesFromPreviousMonth(ids),
    });
  };

  const promptClearIncomes = () => {
    const items = selectedBudget?.incomes || [];
    const preview = items.map((inc) => ({
      id: inc.id,
      label: inc.label,
      amountDisplay: inc.currency === 'COP'
        ? `$${Number(inc.amount || 0).toLocaleString('es-CO')}`
        : `${inc.amount} ${inc.currency}`,
    }));
    setConfirmModal({
      isOpen: true,
      title: 'Limpiar Ingresos Fijos',
      description: 'Selecciona los ingresos a limpiar del mes actual:',
      itemsPreview: preview,
      confirmText: 'Limpiar seleccionados',
      isDanger: true,
      selectable: true,
      onConfirm: (ids) => clearIncomes(ids),
    });
  };

  const promptCopyFixed = () => {
    const prevItems = prevBudget?.fixedExpenses || [];
    const preview = prevItems.map((fe) => ({
      id: fe.id,
      label: fe.label,
      amountDisplay: `$${Number(fe.amount || 0).toLocaleString('es-CO')}`,
    }));
    const prevMonthName = prevBudget ? MONTHS_LONG[prevBudget.month] : 'mes anterior';
    const curMonthName = selectedBudget ? MONTHS_LONG[selectedBudget.month] : 'este mes';

    setConfirmModal({
      isOpen: true,
      title: 'Copiar Gastos Fijos',
      description: `Selecciona los gastos fijos a copiar de ${prevMonthName} a ${curMonthName} en estado neutro:`,
      itemsPreview: preview,
      confirmText: 'Copiar seleccionados',
      isDanger: false,
      selectable: true,
      onConfirm: (ids) => copyFixedExpensesFromPreviousMonth(ids),
    });
  };

  const promptClearFixed = () => {
    const items = selectedBudget?.fixedExpenses || [];
    const preview = items.map((fe) => ({
      id: fe.id,
      label: fe.label,
      amountDisplay: `$${Number(fe.amount || 0).toLocaleString('es-CO')}`,
    }));
    setConfirmModal({
      isOpen: true,
      title: 'Limpiar Gastos Fijos',
      description: 'Selecciona los gastos fijos a limpiar del mes actual:',
      itemsPreview: preview,
      confirmText: 'Limpiar seleccionados',
      isDanger: true,
      selectable: true,
      onConfirm: (ids) => clearFixedExpenses(ids),
    });
  };

  const promptCopyVariables = () => {
    const prevItems = prevBudget?.gastosVar || [];
    const preview = prevItems.map((g) => ({
      id: g.id,
      label: g.label,
      amountDisplay: `$${Number(g.amount || 0).toLocaleString('es-CO')}`,
    }));
    const prevMonthName = prevBudget ? MONTHS_LONG[prevBudget.month] : 'mes anterior';
    const curMonthName = selectedBudget ? MONTHS_LONG[selectedBudget.month] : 'este mes';

    setConfirmModal({
      isOpen: true,
      title: 'Copiar Gastos Variables',
      description: `Selecciona los gastos variables a copiar de ${prevMonthName} a ${curMonthName} en estado neutro:`,
      itemsPreview: preview,
      confirmText: 'Copiar seleccionados',
      isDanger: false,
      selectable: true,
      onConfirm: (ids) => copyVariableExpensesFromPreviousMonth(ids),
    });
  };

  const promptClearVariables = () => {
    const items = selectedBudget?.gastosVar || [];
    const preview = items.map((g) => ({
      id: g.id,
      label: g.label,
      amountDisplay: `$${Number(g.amount || 0).toLocaleString('es-CO')}`,
    }));
    setConfirmModal({
      isOpen: true,
      title: 'Limpiar Gastos Variables',
      description: 'Selecciona los gastos variables a limpiar del mes actual:',
      itemsPreview: preview,
      confirmText: 'Limpiar seleccionados',
      isDanger: true,
      selectable: true,
      onConfirm: (ids) => clearVariableExpenses(ids),
    });
  };

  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  // Income pending edits (local state for instant typing)
  const [editingIncomes, setEditingIncomes] = useState({});

  useEffect(() => {
    if (!selectedBudget?.incomes) return;
    const init = {};
    for (const inc of selectedBudget.incomes) {
      init[inc.id] = {
        label: inc.label || '',
        currency: inc.currency || 'COP',
        amount: inc.amount || '0',
        fee: inc.fee || '0',
        rate: inc.rate || '0',
      };
    }
    setEditingIncomes(init);
  }, [selectedBudget?.incomes]);

  const setIncField = (id, field, value) => {
    setEditingIncomes((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  };

  const getInc = (inc) => editingIncomes[inc.id] || inc;

  const saveInc = async (id) => {
    const data = editingIncomes[id];
    if (data) {
      await updateIncome(id, data);
    }
  };

  // Section edit toggles
  const [uiState, setUiState] = useState({
    annual: false,
    fixedIncome: false,
    monthlyExpenses: false,
    variableExpenses: false,
  });

  const toggleEdit = (key) => setUiState((prev) => ({ ...prev, [key]: !prev[key] }));

  // Auto-fetch rate when currency changes to EUR/USD
  const handleCurrencyChange = async (inc, newCurrency) => {
    updateIncome(inc.id, { currency: newCurrency });
    if (newCurrency === 'EUR') {
      try {
        const { data, error } = await supabase.functions.invoke('get-wise-rate', {
          body: { amount: parseFloat(inc.amount) || 300 },
        });
        if (!error && data?.rate) {
          updateIncome(inc.id, { rate: data.rate.toString() });
        }
      } catch (err) {
        console.error('Error fetching EUR rate:', err);
      }
    } else if (newCurrency === 'USD') {
      try {
        const { data, error } = await supabase.functions.invoke('get-exchange-rate', {
          body: { source: 'USD' },
        });
        if (!error && data?.rate) {
          updateIncome(inc.id, { rate: data.rate.toString() });
        }
      } catch (err) {
        console.error('Error fetching USD rate:', err);
      }
    }
  };

  // ── Annual Expenses ──
  const { userId } = useAuth();
  useEffect(() => {
    if (!userId) return;
    annualExpensesDb.getAnnualExpenses(userId).then(setAnnualExpenses).catch(() => {});
  }, [userId]);

  const addAnnualExpense = async () => {
    if (!userId) return;
    const d = new Date();
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const m = months[d.getMonth()];
    const day = String(d.getDate()).padStart(2, '0');
    try {
      const newItem = await annualExpensesDb.createAnnualExpense(userId, {
        label: 'Nuevo Item', amount: '0', payment_date: `${m} ${day}`, status: 0,
      });
      setAnnualExpenses((prev) => [...prev, newItem]);
    } catch (err) { console.error(err); }
  };

  const updateAnnualExpense = async (id, field, value) => {
    if (!userId) return;
    setAnnualExpenses((prev) => prev.map((a) => a.id === id ? { ...a, [field]: value } : a));
    await annualExpensesDb.updateAnnualExpense(id, userId, { [field]: value });
  };

  const deleteAnnualExpense = async (id) => {
    if (!userId) return;
    setAnnualExpenses((prev) => prev.filter((a) => a.id !== id));
    await annualExpensesDb.deleteAnnualExpense(id, userId);
  };

  const toggleAnnualStatus = async (id) => {
    if (!userId) return;
    const item = annualExpenses.find((a) => a.id === id);
    if (!item) return;
    const nextStatus = ((item.status || 0) + 1) % 3;
    setAnnualExpenses((prev) => prev.map((a) => a.id === id ? { ...a, status: nextStatus } : a));
    await annualExpensesDb.updateAnnualExpense(id, userId, { status: nextStatus });
  };

  const handleAddDeposit = () => {
    const val = parseFloat(depositAmount) || 0;
    if (val <= 0) return;
    addDeposit(val);
    setDepositAmount('');
    setShowDepositForm(false);
  };

  // Display calculations for selected month
  const displayCalc = useMemo(() => {
    if (!selectedBudget) {
      return { cop: 0, fixedTotal: 0, varTotal: 0, disponible: 0 };
    }
    const incomes = selectedBudget.incomes || [];
    const paidIncomes = incomes.filter(i => i.status === 1);
    const activeIncomes = paidIncomes.length > 0 ? paidIncomes : incomes;

    const totalCop = activeIncomes.reduce((s, i) => {
      const amt = parseFloat(i.amount) || 0;
      if (i.currency === 'COP') return s + amt;
      const net = amt - (parseFloat(i.fee) || 0);
      return s + Math.round(net * (parseFloat(i.rate) || 0));
    }, 0);

    return { cop: totalCop };
  }, [selectedBudget]);

  const displayVarTotal = (selectedBudget?.gastosVar || []).reduce((s, v) => s + (parseFloat(v.amount) || 0), 0);
  const fixedTotalAll = (selectedBudget?.fixedExpenses || []).reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* === STAT CARDS === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title={t('Ingresos Totales')}
          amount={displayCalc.cop ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(displayCalc.cop) : '$0'}
          icon={DollarSign}
          colorTheme="green"
          trend={0}
        />
        <StatCard
          title={t('finance.gastosFijos') || 'Gastos Fijos'}
          amount={fixedTotal ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(fixedTotal) : '$0'}
          icon={TrendingDown}
          colorTheme="red"
          trend={0}
        />
        <StatCard
          title={t('finance.gastosVariables') || 'Gastos Variables'}
          amount={displayVarTotal ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(displayVarTotal) : '$0'}
          icon={TrendingDown}
          colorTheme="orange"
          trend={0}
        />
        <StatCard
          title="Disponible"
          amount={(displayCalc.cop - fixedTotal - displayVarTotal) ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(displayCalc.cop - fixedTotal - displayVarTotal) : '$0'}
          icon={Wallet}
          colorTheme="blue"
          subtitle="Saldo del mes"
        />
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* === LEFT COLUMN === */}
        <div className="space-y-6">
          <DashboardSection
            title="Gastos Anuales"
            isEditing={uiState.annual}
            onEdit={() => toggleEdit('annual')}
            onAdd={addAnnualExpense}
            isComplete={annualExpenses.length > 0 && annualExpenses.every(item => item.status === 1)}
          >
            <ListHeader showDate={true} />
            {annualExpenses.map((item) => (
              <TransactionRow
                key={item.id}
                item={{ ...item, name: item.label, date: item.payment_date }}
                isEditing={uiState.annual}
                onChange={(id, field, val) => updateAnnualExpense(id, field, val)}
                onDelete={(id) => deleteAnnualExpense(id)}
                onStatusToggle={() => toggleAnnualStatus(item.id)}
                canDelete={true}
                showDate={true}
              />
            ))}
            <div className="mt-4 pt-4 border-t border-[var(--border-card)]/50 flex justify-between items-center px-1">
              <span className="text-xs font-medium text-[var(--text-muted)]">Total Anuales</span>
              <span className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(annualExpenses.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0))}</span>
            </div>
          </DashboardSection>
          
          {/* === INGRESOS === */}
          <DashboardSection title="Ingresos Fijos" isEditing={uiState.fixedIncome} onEdit={() => toggleEdit('fixedIncome')} onAdd={() => addIncome({ label: 'Nuevo ingreso', currency: 'COP', amount: '0', status: 0 })} onCopyPrev={promptCopyIncomes} onClear={promptClearIncomes} isComplete={(selectedBudget?.incomes || []).length > 0 && (selectedBudget?.incomes || []).every(i => i.status === 1)}>
            {uiState.fixedIncome ? (
              <div className="flex items-center gap-1.5 sm:gap-2 px-1 mb-1 -mt-2">
                <div className="w-4 shrink-0" />
                <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider flex-1">Concepto</span>
                <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider w-28 shrink-0 text-center">Fecha</span>
                {useWise || useUsd ? (
                  <>
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider shrink-0">Moneda</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider w-24 shrink-0 text-right">Monto</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider w-[70px] shrink-0 text-right">Comisión</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider w-[70px] shrink-0 text-right">Tasa</span>
                  </>
                ) : (
                  <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider w-24 text-right">Valor</span>
                )}
                <div className="w-9 shrink-0" />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 px-1 mb-1 -mt-2">
                <div className="w-4 shrink-0" />
                <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider flex-1">Concepto</span>
                <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider w-28 text-center shrink-0">Fecha</span>
                <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider w-24 text-right">Valor</span>
              </div>
            )}
            <div className="space-y-1">
              {(selectedBudget?.incomes || []).map((inc) => {
                const local = uiState.fixedIncome ? getInc(inc) : inc;
                const copPreview = local.currency === 'COP'
                  ? parseFloat(local.amount) || 0
                  : Math.round(((parseFloat(local.amount) || 0) - (parseFloat(local.fee) || 0)) * (parseFloat(local.rate) || 0));
                const incDate = local.date || local.payment_date || (local.created_at ? String(local.created_at).slice(0, 10) : '');
                return (
                  <div key={inc.id} className="flex items-center gap-1.5 sm:gap-2 py-2 border-b border-[var(--border-card)] last:border-b-0">
                    <StatusBulb status={inc.status || 0} onClick={() => toggleIncomeStatus(inc.id)} />
                    {uiState.fixedIncome ? (
                      <div className="flex flex-wrap items-center gap-2 w-full">
                        <input type="text" value={local.label} onChange={(e) => setIncField(inc.id, 'label', e.target.value)} onBlur={() => saveInc(inc.id)} placeholder="Concepto" className="min-w-0 flex-1 bg-[var(--bg-input)] border border-[var(--border-card)] rounded px-2 py-1.5 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)]" />
                        <CalendarInput value={incDate} onChange={(val) => setIncField(inc.id, 'date', val)} placeholder="Fecha" />
                        <div className="flex gap-0.5 bg-[var(--bg-input)] rounded overflow-hidden shrink-0">
                          {[
                            { label: 'COP', value: 'COP' },
                            ...(useWise ? [{ label: 'EUR', value: 'EUR' }] : []),
                            ...(useUsd ? [{ label: 'USD', value: 'USD' }] : []),
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleCurrencyChange(inc, opt.value)}
                              className={`px-2 py-1.5 text-[11px] font-medium transition-colors ${
                                local.currency === opt.value
                                  ? 'bg-acid text-black'
                                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <input type="text" inputMode="decimal" value={local.amount} onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                          setIncField(inc.id, 'amount', v);
                        }} onBlur={() => saveInc(inc.id)} placeholder="Monto" className="w-24 bg-[var(--bg-input)] border border-[var(--border-card)] rounded px-2 py-1.5 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)] text-right" />
                        {local.currency !== 'COP' ? (
                          <>
                            <input type="text" inputMode="decimal" value={local.fee} onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                              setIncField(inc.id, 'fee', v);
                            }} onBlur={() => saveInc(inc.id)} placeholder="Comisión" className="w-[70px] bg-[var(--bg-input)] border border-[var(--border-card)] rounded px-2 py-1.5 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)] text-right" />
                            <input type="text" inputMode="decimal" value={local.rate} onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                              setIncField(inc.id, 'rate', v);
                            }} onBlur={() => saveInc(inc.id)} placeholder="Tasa" className="w-[70px] bg-[var(--bg-input)] border border-[var(--border-card)] rounded px-2 py-1.5 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)] text-right" />
                          </>
                        ) : (useWise || useUsd) ? (
                          <>
                            <div className="w-[70px] shrink-0" />
                            <div className="w-[70px] shrink-0" />
                          </>
                        ) : null}
                        <button onClick={() => deleteIncome(inc.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors shrink-0"><Trash2 size={13} /></button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center min-w-0 gap-2">
                        <span className="text-[11px] text-[var(--text-primary)] font-medium truncate flex-[2]">{local.label}</span>
                        <span className="text-[10px] text-[var(--text-muted)] w-28 text-center shrink-0">{incDate}</span>
                        <span className="text-[11px] font-bold text-right w-24 shrink-0" style={{ color: local.currency !== 'COP' ? COLORS.savings : 'var(--text-primary)' }}>
                          {local.currency === 'COP' ? formatCurrency(local.amount) : `≈ ${formatCurrencyDec(copPreview)}`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--border-card)]/50 flex justify-between items-center px-1">
              <span className="text-xs font-medium text-[var(--text-muted)]">Total Ingresos</span>
              <span className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency((selectedBudget?.incomes || []).reduce((s, i) => {
                const amt = parseFloat(i.amount) || 0;
                if (i.currency === 'COP') return s + amt;
                const net = amt - (parseFloat(i.fee) || 0);
                return s + Math.round(net * (parseFloat(i.rate) || 0));
              }, 0))}</span>
            </div>

            {/* Wise deposits (global) */}
            {useWise && (
              <div className="mt-6 pt-4 border-t border-[var(--border-card)]">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{t('finance.wiseSection')}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">Saldo</span>
                    <span className="text-sm font-medium" style={{ color: wiseBalance > 0 ? '#378ADD' : 'var(--text-muted)' }}>{formatEur(wiseBalance)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {deposits.length === 0 && !showDepositForm && (
                    <p className="text-sm text-[var(--text-muted)] py-2">{t('finance.sinDepositos')}</p>
                  )}
                  {deposits.map((d) => (
                    <div key={d.id} className="flex items-center justify-between py-1.5 group">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-muted)]">⇄</span>
                        <span className="text-sm font-medium text-[var(--text-primary)]">{formatEur(d.amount_eur)}</span>
                        <span className="text-xs text-[var(--text-muted)]">{d.deposit_date}</span>
                      </div>
                      <button onClick={() => deleteDeposit(d.id)} className="p-1 text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10} /></button>
                    </div>
                  ))}
                </div>
                {showDepositForm ? (
                  <div className="flex gap-2 mt-2">
                    <input type="number" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="€0.00" className="flex-1 bg-[var(--bg-card-solid)] border border-[var(--border-card)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)]" autoFocus />
                    <button onClick={handleAddDeposit} className="px-4 py-2 bg-acid text-black rounded-lg text-sm font-medium">{t('finance.ok')}</button>
                    <button onClick={() => setShowDepositForm(false)} className="px-3 py-2 bg-[var(--bg-input)] text-[var(--text-muted)] rounded-lg text-sm">{t('finance.cancelar')}</button>
                  </div>
                ) : (
                  <button onClick={() => setShowDepositForm(true)} className="w-full py-2 text-sm font-medium bg-[var(--bg-input)] text-[var(--text-primary)] border border-dashed border-[var(--border-card)] rounded-lg hover:bg-[var(--bg-card-solid)] transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer">
                    <Plus size={14} /> {t('finance.agregarDeposito')}
                  </button>
                )}
              </div>
            )}
          </DashboardSection>
        </div>

        {/* === RIGHT COLUMN === */}
        <div className="space-y-6">
          <DashboardSection
            title="Gastos Fijos Mensuales"
            isEditing={uiState.monthlyExpenses}
            onEdit={() => toggleEdit('monthlyExpenses')}
            onAdd={addFixedExpense}
            onCopyPrev={promptCopyFixed}
            onClear={promptClearFixed}
            isComplete={(selectedBudget?.fixedExpenses || []).length > 0 && (selectedBudget?.fixedExpenses || []).every(item => item.status === 1)}
          >
            <ListHeader showDate={true} />
            <div className="space-y-0">
              {(selectedBudget?.fixedExpenses || []).map((item, idx) => {
                const fixedItems = selectedBudget?.fixedExpenses || [];
                return (
                <TransactionRow
                  key={item.id}
                  item={item}
                  isEditing={uiState.monthlyExpenses}
                  onChange={(id, field, val) => updateFixedExpense(id, field, val)}
                  onDelete={deleteFixedExpense}
                  onStatusToggle={() => toggleFixedExpenseStatus(item.id)}
                  canDelete={true}
                  onMove={(fromIdx, toIdx) => moveFixedExpense(fromIdx, toIdx)}
                  index={idx}
                  showDate={true}
                />);})}
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--border-card)]/50 flex justify-between items-center px-1">
              <span className="text-xs font-medium text-[var(--text-muted)]">Total Fijos <span className="text-[var(--text-primary)]">(Mes anterior: $0)</span></span>
              <span className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(fixedTotalAll)}</span>
            </div>
          </DashboardSection>

          <DashboardSection
            title="Gastos Variables Mensuales"
            isEditing={uiState.variableExpenses}
            onEdit={() => toggleEdit('variableExpenses')}
            onAdd={addVariableExpense}
            onCopyPrev={promptCopyVariables}
            onClear={promptClearVariables}
            isComplete={(selectedBudget?.gastosVar || []).length > 0 && (selectedBudget?.gastosVar || []).every(item => item.status === 1)}
          >
            <ListHeader showDate={true} />
            <div className="space-y-0">
              {(selectedBudget?.gastosVar || []).map((item, idx) => {
                const varItems = selectedBudget?.gastosVar || [];
                return (
                <TransactionRow
                  key={item.id}
                  item={item}
                  isEditing={uiState.variableExpenses}
                  onChange={(id, field, val) => updateVariableExpense(id, field, val)}
                  onDelete={deleteVariableExpense}
                  onStatusToggle={() => toggleVariableExpenseStatus(item.id)}
                  canDelete={true}
                  onMove={(fromIdx, toIdx) => moveVariableExpense(fromIdx, toIdx)}
                  index={idx}
                  showDate={true}
                />);})}
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--border-card)]/50 flex justify-between items-center px-1">
              <span className="text-xs font-medium text-[var(--text-muted)]">Total Variables <span className="text-[var(--text-primary)]">(Mes anterior: $0)</span></span>
              <span className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(displayVarTotal)}</span>
            </div>
          </DashboardSection>
        </div>
      </div>

      <ConfirmModal {...confirmModal} onClose={closeConfirmModal} />
    </div>
  );
}

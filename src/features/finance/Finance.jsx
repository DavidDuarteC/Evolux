import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Clock, CreditCard, Scale, Plus, Trash2, Pencil, Check,
  ChevronUp, ChevronDown, Calendar, ArrowRightLeft, BarChart3,
  TrendingUp, TrendingDown, Shield, ShoppingCart, Bell, Lock, ArrowLeftRight,
  AlertTriangle, Save, ChevronRight, Database, RefreshCw, Loader2,
  DollarSign, Euro,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import { useUser } from '../../context/UserContext';
import { useMonthlyTracker } from '../monthlyTracker/context/MonthlyTrackerContext';
import { supabase } from '../../shared/services/supabase';
import * as annualExpensesDb from '../finance/services/annualExpenses';
import StatCard from '../../shared/components/StatCard';
import DatePicker from '../../shared/components/DatePicker';
import PageHeader from '../../shared/components/PageHeader';

import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  getWalletMonth, addWalletItem, updateWalletItem,
  deleteWalletItem, emptyMonth,
} from '../finance/services/wallet';

const COLORS = {
  savings: '#1D9E75',
  cushion: '#378ADD',
  expenses: '#BA7517',
  free: '#D3D1C7',
  danger: '#E24B4A',
};

const COLUMNS = [
  { key: 'actual', title: 'Dinero Actual', color: 'green', icon: Wallet, placeholder: 'Ej. Davibank' },
  { key: 'pending', title: 'Pendiente por Recibir', color: 'orange', icon: Clock, placeholder: 'Ej. Kapital Sushi' },
  { key: 'debt', title: 'Deudas', color: 'red', icon: CreditCard, placeholder: 'Ej. Tarjeta de crédito' },
];
const ACCENTS = { green: '#22c55e', orange: '#f97316', red: '#ef4444' };

const fmt = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(n || 0).toLocaleString('es-CO');
const fmtInput = (n) => (n ? Number(n).toLocaleString('es-CO') : '');
const monthKeyOf = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const Finance = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('resumen');
  const { loading, currentBudget, calculations, MONTHS_LONG } = useMonthlyTracker();

  const TABS = [
    { id: 'resumen', label: 'Ingresos y Gastos', icon: ArrowRightLeft },
    { id: 'liquidez', label: t('finance.liquidez'), icon: Scale },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-acid animate-spin" />
      </div>
    );
  }

  if (!currentBudget) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md text-center space-y-4">
          <Database size={40} className="mx-auto text-[var(--text-muted)]" />
          <h3 className="text-lg font-medium text-[var(--text-primary)]">{t('common.sinDatos')}</h3>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            {t('common.verificarTablas')}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-input)] hover:bg-[var(--bg-card-solid)] text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors border border-[var(--border-card)]"
          >
            <RefreshCw size={14} />
            {t('common.reintentar')}
          </button>
        </div>
      </div>
    );
  }

  const label = `${MONTHS_LONG[currentBudget.month]} ${currentBudget.year}`;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <PageHeader
        title={t('finance.title')}
        subtitle={label}
      />

      {/* === STAT CARDS === */}
      <div className="flex gap-1 bg-[var(--bg-input)] rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                ${isActive
                  ? 'bg-[var(--bg-card-solid)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'resumen' && <TrackerTab />}
          {activeTab === 'liquidez' && <LiquidityTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Finance;

function SummaryTab({ onGoIngreso, onGoGastos }) {
  const { currentBudget, calculations, MONTHS_LONG, formatCurrency, formatEur, saveCurrentMonth, createNextMonth, updateBudgetField } = useMonthlyTracker();
  const label = `${MONTHS_LONG[currentBudget.month]} ${currentBudget.year}`;
  const { cop, ahorro, colchon, fixedTotal, varTotal, gastos, disponible, netEur, pctComision, wiseCop, manualCop } = calculations;

  const total = Math.max(ahorro + colchon + gastos + Math.max(disponible, 0), 1);
  const segments = [
    { color: COLORS.savings, value: ahorro },
    { color: COLORS.cushion, value: colchon },
    { color: COLORS.expenses, value: gastos },
    { color: COLORS.free, value: Math.max(disponible, 0) },
  ];
  const LEGEND = [
    { color: COLORS.savings, label: 'CDT' },
    { color: COLORS.cushion, label: 'Colchón' },
    { color: COLORS.expenses, label: 'Gastos' },
    { color: COLORS.free, label: 'Libre' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="glass-card p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-1">Mes activo</p>
            <h3 className="text-lg font-medium text-[var(--text-primary)]">{label}</h3>
          </div>
          <span className={`text-xs px-2 py-1 rounded-md ${
            currentBudget.saved ? 'bg-[rgba(29,158,117,0.15)] text-[#1D9E75]' : 'bg-[rgba(186,117,23,0.15)] text-[#BA7517]'
          }`}>
            {currentBudget.saved ? 'Guardado' : 'En progreso'}
          </span>
        </div>

        <div className="flex justify-between items-center mb-2">
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-1">Recibes este mes</p>
            <div className="text-2xl font-medium" style={{ color: COLORS.savings }}>{formatCurrency(cop)}</div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              {wiseCop > 0 && manualCop > 0
                ? `Wise ${formatCurrencyDec(wiseCop)} + Manual ${formatCurrency(manualCop)}`
                : wiseCop > 0
                  ? `Wise → COP`
                  : manualCop > 0
                    ? 'Ingreso manual COP'
                    : 'Sin ingresos configurados'
              }
            </p>
          </div>
          <button onClick={onGoIngreso} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-[var(--border-card)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <Pencil size={12} /> Editar
          </button>
        </div>

        <div className="h-2 rounded-full overflow-hidden flex my-4">
          {segments.map((seg, idx) => (
            <div key={idx} className="h-full transition-all duration-300" style={{ flex: seg.value, backgroundColor: seg.color, minWidth: seg.value > 0 ? '4px' : '0px' }} />
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-5">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">Ahorro</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--bg-input)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">CDT — {currentBudget.savings_pct}%</p>
            <SavingsInput
              value={ahorro}
              color={COLORS.savings}
              cop={cop}
              onCommit={(pct) => updateBudgetField('savings_pct', pct)}
            />
            <input type="range" min="0" max="80" step="1" value={currentBudget.savings_pct} onChange={(e) => updateBudgetField('savings_pct', parseInt(e.target.value))} className="w-full accent-[#1D9E75] mt-3" />
          </div>
          <div className="bg-[var(--bg-input)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Colchón emergencias — {currentBudget.cushion_pct}%</p>
            <SavingsInput
              value={colchon}
              color={COLORS.cushion}
              cop={cop}
              onCommit={(pct) => updateBudgetField('cushion_pct', pct)}
            />
            <input type="range" min="0" max="60" step="1" value={currentBudget.cushion_pct} onChange={(e) => updateBudgetField('cushion_pct', parseInt(e.target.value))} className="w-full accent-[#378ADD] mt-3" />
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">Resumen del mes</p>
        <div className="space-y-3">
          <Row label="Ingresas" value={formatCurrency(cop)} />
          <Row label="CDT / Ahorro" value={formatCurrency(ahorro)} color={COLORS.savings} />
          <Row label="Colchón (Nu)" value={formatCurrency(colchon)} color={COLORS.cushion} />
          <button onClick={onGoGastos} className="w-full flex justify-between items-center py-1 border-b border-[var(--border-card)] group">
            <span className="text-sm text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">Gastos fijos <ChevronRight size={12} className="inline" /></span>
            <span className="text-sm font-medium" style={{ color: COLORS.expenses }}>{formatCurrency(fixedTotal)}</span>
          </button>
          <button onClick={onGoGastos} className="w-full flex justify-between items-center py-1 border-b border-[var(--border-card)] group">
            <span className="text-sm text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">Gastos variables <ChevronRight size={12} className="inline" /></span>
            <span className="text-sm font-medium" style={{ color: COLORS.expenses }}>{formatCurrency(varTotal)}</span>
          </button>
          <div className="flex justify-between items-center pt-1">
            <span className="text-sm font-medium text-[var(--text-primary)]">Queda libre</span>
            <span className="text-base font-medium" style={{ color: disponible < 0 ? COLORS.danger : COLORS.savings }}>{formatCurrency(disponible)}</span>
          </div>
        </div>
      </div>

      {disponible < 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400 flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Gastos superan el ingreso en {formatCurrency(Math.abs(disponible))}.</span>
        </div>
      )}

      <button onClick={saveCurrentMonth} className="w-full py-3 text-sm font-medium rounded-xl bg-[rgba(29,158,117,0.15)] text-[#1D9E75] border border-[rgba(29,158,117,0.3)] hover:bg-[rgba(29,158,117,0.25)] transition-colors flex items-center justify-center gap-2">
        <Save size={16} /> Guardar {label}
      </button>
      <button onClick={createNextMonth} className="w-full py-3 text-sm font-medium rounded-xl bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-card)] hover:bg-[var(--bg-card-solid)] transition-colors flex items-center justify-center gap-2">
        <Plus size={16} /> Crear mes siguiente
      </button>
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[var(--border-card)] last:border-b-0">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <span className="text-sm font-medium" style={{ color: color || 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function SavingsInput({ value, color, cop, onCommit }) {
  const [local, setLocal] = useState(null);

  const display = local !== null ? local : Math.round(value || 0);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d]/g, '');
        setLocal(raw === '' ? '' : parseInt(raw));
      }}
      onBlur={() => {
        const val = typeof local === 'number' ? local : 0;
        const pct = cop > 0 ? Math.min(100, Math.round((val / cop) * 100)) : 0;
        onCommit(pct);
        setLocal(null);
      }}
      onFocus={() => setLocal(Math.round(value || 0))}
      className="w-full bg-[var(--bg-card-solid)] border border-[var(--border-card)] rounded-lg px-3 py-2 text-xl font-medium mb-1 text-right focus:outline-none focus:border-[var(--border-hover)]"
      style={{ color }}
    />
  );
}

// ── Status Bulb ──
const StatusBulb = ({ status, onClick, readOnly = false }) => (
  <button
    onClick={readOnly ? undefined : onClick}
    disabled={readOnly}
    className={`w-4 h-4 rounded-full transition-all duration-300 ${status === 1 ? 'bg-[#22c55e]' : status === 2 ? 'bg-red-500' : 'bg-zinc-700 shadow-none'} ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
    style={status === 1 ? { boxShadow: '0 0 15px rgba(34,197,94,0.6)' } : status === 2 ? { boxShadow: '0 0 15px rgba(239,68,68,0.6)' } : {}}
  />
);

const DashboardSection = ({ title, children, onEdit, isEditing, onAdd, isComplete = false }) => {
  return (
    <div className="relative group">
      <div
        className={`glass-card p-5 lg:p-6 transition-all duration-500 
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
          {isEditing && onAdd && (
            <button
              onClick={onAdd}
              className="p-1 rounded-full bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20 transition-colors"
              title="Agregar Item"
            >
              <Plus size={18} />
            </button>
          )}
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

const ListHeader = ({ showCategory = false }) => (
  <div className="flex items-center gap-1.5 sm:gap-2 px-2 -mx-2 mb-2">
    <div className="w-[16px]"></div>
    <div className="flex-1 grid grid-cols-12 gap-1 items-center">
      <div className={`${showCategory ? "col-span-5" : "col-span-7"} text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider pl-1`}>Concepto</div>
      {showCategory && <div className="col-span-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider text-center">Categoría</div>}
      <div className="col-span-3 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider text-center">Fecha</div>
      <div className="col-span-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider text-right pr-1">Valor</div>
    </div>
  </div>
);

const TransactionRow = ({ item, isEditing, onChange, onDelete, onStatusToggle, canDelete, showCategory = false }) => {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 py-1 border-b border-[var(--border-card)]/50 last:border-b-0 hover:bg-white/5 px-2 -mx-2 rounded-lg transition-colors min-h-[32px]">
      <div className="shrink-0 flex items-center justify-center h-full">
        <StatusBulb status={item.status || 0} onClick={onStatusToggle} readOnly={!isEditing} />
      </div>
      <div className="flex-1 grid grid-cols-12 gap-1 items-center">
        <div className={showCategory ? "col-span-5" : "col-span-7"}>
          {isEditing ? (
            <input
              type="text"
              value={item.name !== undefined ? item.name : item.label || ''}
              onChange={(e) => onChange(item.id, item.name !== undefined ? 'name' : 'label', e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] rounded px-1.5 py-1 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[#22c55e]"
            />
          ) : (
            <span className="font-medium text-[var(--text-primary)] text-[11px] truncate block pl-1">{item.name !== undefined ? item.name : item.label || '-'}</span>
          )}
        </div>
        {showCategory && (
          <div className="col-span-2 text-center flex justify-center">
            <span className="text-[10px] text-[var(--text-muted)]">—</span>
          </div>
        )}
        <div className="col-span-3 text-center flex justify-center">
          <span className="text-[10px] text-[var(--text-muted)]">{item.date || 'Jul 01'}</span>
        </div>
        <div className="col-span-2 text-right">
          {isEditing ? (
            <input
              type="text"
              value={item.amount || ''}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/\./g, '').replace(/,/g, '');
                if (!/^\d*$/.test(rawValue)) return;
                const formatted = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                onChange(item.id, 'amount', formatted);
              }}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] rounded px-1.5 py-1 text-[11px] font-medium text-[var(--text-primary)] focus:outline-none focus:border-[#22c55e] text-right"
            />
          ) : (
            <span className="font-bold text-[var(--text-primary)] text-[12px]">{item.amount || '0'}</span>
          )}
        </div>
      </div>
      {isEditing && (
        <button
          onClick={() => canDelete && onDelete(item.id)}
          disabled={!canDelete}
          className={`w-6 h-6 flex items-center justify-center shrink-0 rounded transition-colors ml-1 ${canDelete ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' : 'text-zinc-700 cursor-not-allowed'}`}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
};



function TrackerTab() {
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
    budgets, currentIndex, setCurrentIndex, MONTHS_LONG,
  } = useMonthlyTracker();
  const { user } = useUser();
  const useWise = user.useWise !== false;
  const useUsd = user.useUsd === true;
  const { fixedTotal } = calculations;

  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  // USD state
  const [fetchingUsdRate, setFetchingUsdRate] = useState(false);
  
  // Income pending edits (local state for instant typing)
  const [incomeEdits, setIncomeEdits] = useState({});

  const getInc = (inc) => {
    const edit = incomeEdits[inc.id];
    return {
      label: edit?.label ?? inc.label,
      currency: edit?.currency ?? inc.currency,
      amount: edit?.amount ?? inc.amount,
      fee: edit?.fee ?? inc.fee,
      rate: edit?.rate ?? inc.rate,
    };
  };

  const setIncField = (id, field, value) => {
    setIncomeEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const saveInc = (id) => {
    const edit = incomeEdits[id];
    if (!edit) return;
    updateIncome(id, edit);
    setIncomeEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const saveAllIncEdits = () => {
    Object.entries(incomeEdits).forEach(([id]) => saveInc(id));
  };
  
  // Dashboard UI State
  const [uiState, setUiState] = useState({ annual: false, fixedIncome: false, monthlyExpenses: false, variableExpenses: false });
  const toggleEdit = (section) => {
    setUiState(prev => ({ ...prev, [section]: !prev[section] }));
    if (section === 'fixedIncome' && uiState.fixedIncome) {
      saveAllIncEdits();
    }
  };

  const [pickerDate, setPickerDate] = useState(() =>
    currentBudget ? new Date(currentBudget.year, currentBudget.month) : new Date()
  );

  const handleMonthChange = (newDate) => {
    setPickerDate(newDate);
    const y = newDate.getFullYear();
    const m = newDate.getMonth();
    const idx = budgets.findIndex(b => b.year === y && b.month === m);
    if (idx >= 0) setCurrentIndex(idx);
  };

  const selectedBudget = useMemo(() => {
    const y = pickerDate.getFullYear();
    const m = pickerDate.getMonth();
    return budgets.find(b => Number(b.year) === y && Number(b.month) === m) || null;
  }, [budgets, pickerDate]);

  const displayVarTotal = useMemo(() => {
    if (!selectedBudget) return 0;
    return (selectedBudget.gastosVar || []).filter(g => (g.status || 0) === 1).reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);
  }, [selectedBudget]);

  const fixedTotalAll = useMemo(() =>
    fixedExpenses.reduce((s, g) => s + (parseFloat(g.amount) || 0), 0), [fixedExpenses]);

  const varTotalAll = useMemo(() => {
    if (!selectedBudget) return 0;
    return (selectedBudget.gastosVar || []).reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);
  }, [selectedBudget]);

  const displayCalc = useMemo(() => {
    if (!selectedBudget) return { cop: 0 };
    const b = selectedBudget;
    const budgetIncomes = b.incomes || [];
    const totalCOP = budgetIncomes
      .filter((i) => (i.status || 0) === 1)
      .reduce((sum, i) => {
        const amt = parseFloat(i.amount) || 0;
        if (i.currency === 'COP') return sum + amt;
        const net = amt - (parseFloat(i.fee) || 0);
        return sum + Math.round(net * (parseFloat(i.rate) || 0));
      }, 0);
    return { cop: totalCOP, hasWithdrawals: false };
  }, [selectedBudget]);

  // ── Total deposited EUR (global, for wiseBalance) ──
  const totalDeposited = deposits.reduce((s, d) => s + (parseFloat(d.amount_eur) || 0), 0);

  // USD rate auto-fetch
  const fetchUsdRate = async () => {
    setFetchingUsdRate(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-exchange-rate', {
        body: { source: 'USD' },
      });
      if (error) throw error;
      if (data?.rate) {
        updateBudgetField('usd_rate', data.rate);
      }
    } catch (err) {
      console.error('Error fetching USD rate:', err);
      toast.error('No se pudo obtener la tasa USD → COP');
    } finally {
      setFetchingUsdRate(false);
    }
  };

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


  useEffect(() => {
    if (currentBudget) {
      setPickerDate(new Date(currentBudget.year, currentBudget.month));
    }
  }, [currentBudget]);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
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

      {/* === MONTH PICKER === */}
      <div className="flex justify-center">
        <DatePicker selectedDate={pickerDate} onChange={handleMonthChange} monthOnly={true} />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => copyFromPreviousMonth()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border-card)] rounded-lg hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-all"
        >
          <Database size={12} />
          Copiar del mes anterior · neutro
        </button>
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
            <ListHeader />
            {annualExpenses.map((item) => (
              <TransactionRow
                key={item.id}
                item={{ ...item, name: item.label, date: item.payment_date }}
                isEditing={uiState.annual}
                onChange={(id, field, val) => updateAnnualExpense(id, field, val)}
                onDelete={(id) => deleteAnnualExpense(id)}
                onStatusToggle={() => toggleAnnualStatus(item.id)}
                canDelete={true}
              />
            ))}
          </DashboardSection>
          
          
          {/* === INGRESOS === */}
          {/* === INGRESOS === */}
          <DashboardSection title="Ingresos Fijos" isEditing={uiState.fixedIncome} onEdit={() => toggleEdit('fixedIncome')} onAdd={() => addIncome({ label: 'Nuevo ingreso', currency: 'COP', amount: '0', status: 0 })} isComplete={(currentBudget?.incomes || []).length > 0 && (currentBudget?.incomes || []).every(i => i.status === 1)}>
            {uiState.fixedIncome && (
              <div className="flex items-center gap-1.5 sm:gap-2 px-1 mb-1 -mt-2">
                <div className="w-4 shrink-0" />
                <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider flex-1">Concepto</span>
                <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider shrink-0">Moneda</span>
                <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider w-20 shrink-0 text-right">Monto</span>
                <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider w-[60px] shrink-0 text-right">Comisión</span>
                <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider w-20 shrink-0 text-right">Tasa</span>
                <div className="w-9 shrink-0" />
              </div>
            )}
            <div className="space-y-1">
              {(currentBudget?.incomes || []).map((inc) => {
                const local = uiState.fixedIncome ? getInc(inc) : inc;
                const copPreview = local.currency === 'COP'
                  ? parseFloat(local.amount) || 0
                  : Math.round(((parseFloat(local.amount) || 0) - (parseFloat(local.fee) || 0)) * (parseFloat(local.rate) || 0));
                return (
                  <div key={inc.id} className="flex items-center gap-1.5 sm:gap-2 py-2 border-b border-[var(--border-card)] last:border-b-0">
                    <StatusBulb status={inc.status || 0} onClick={() => toggleIncomeStatus(inc.id)} />
                    {uiState.fixedIncome ? (
                      <>
                        <input type="text" value={local.label} onChange={(e) => setIncField(inc.id, 'label', e.target.value)} onBlur={() => saveInc(inc.id)} placeholder="Concepto" className="min-w-0 bg-[var(--bg-input)] border border-[var(--border-card)] rounded px-1.5 py-1 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)] flex-1" />
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
                              className={`px-2 py-1 text-[11px] font-medium transition-colors ${
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
                        }} onBlur={() => saveInc(inc.id)} placeholder="0" className="w-20 bg-[var(--bg-input)] border border-[var(--border-card)] rounded px-1.5 py-1 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)] text-right" />
                        {local.currency !== 'COP' && (
                          <>
                            <input type="text" inputMode="decimal" value={local.fee} onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                              setIncField(inc.id, 'fee', v);
                            }} onBlur={() => saveInc(inc.id)} placeholder="Fee" className="w-[60px] bg-[var(--bg-input)] border border-[var(--border-card)] rounded px-1.5 py-1 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)] text-right" />
                            <input type="text" inputMode="decimal" value={local.rate} onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                              setIncField(inc.id, 'rate', v);
                            }} onBlur={() => saveInc(inc.id)} placeholder="Tasa" className="w-20 bg-[var(--bg-input)] border border-[var(--border-card)] rounded px-1.5 py-1 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)] text-right" />
                          </>
                        )}
                        <button onClick={() => deleteIncome(inc.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors shrink-0"><Trash2 size={13} /></button>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] text-[var(--text-primary)] font-medium truncate">{local.label}</span>
                          <span className="text-[10px] text-[var(--text-muted)] shrink-0">{local.currency}</span>
                          {copPreview > 0 && (
                            <span className="text-[11px] font-medium shrink-0" style={{ color: COLORS.savings }}>
                              {formatCurrencyDec(copPreview)}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {local.currency === 'COP' ? formatCurrency(local.amount) : `${local.amount} ${local.currency}`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
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
                    <div key={d.id} className="flex justify-between items-center py-1.5 group">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft size={12} className="text-blue-400" />
                        <span className="text-sm text-[var(--text-primary)]">{formatEur(d.amount_eur)}</span>
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
                  <button onClick={() => setShowDepositForm(true)} className="w-full py-2 text-sm font-medium bg-[var(--bg-input)] text-[var(--text-primary)] border border-dashed border-[var(--border-card)] rounded-lg hover:bg-[var(--bg-card-solid)] transition-colors flex items-center justify-center gap-2 mt-2">
                    <Plus size={14} /> {t('finance.agregarDeposito')}
                  </button>
                )}
              </div>
            )}

            {/* Total summary */}
            <div className="mt-6 pt-4 border-t border-[var(--border-card)]">
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">{t('finance.resumenIngresos')}</p>
              <div className="space-y-2">
                {(currentBudget?.incomes || []).filter((i) => (i.status || 0) === 1).map((inc) => {
                  const copValue = inc.currency === 'COP'
                    ? parseFloat(inc.amount) || 0
                    : Math.round(((parseFloat(inc.amount) || 0) - (parseFloat(inc.fee) || 0)) * (parseFloat(inc.rate) || 0));
                  if (copValue <= 0) return null;
                  return <Row key={inc.id} label={`${inc.label} (${inc.currency})`} value={formatCurrencyDec(copValue)} color={COLORS.savings} />;
                })}
                <div className="flex justify-between items-center pt-4 border-t border-[var(--border-card)]/50 mt-4">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Total Ingresos <span className="text-[var(--text-primary)]">(Mes anterior: $0)</span></span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(displayCalc.cop)}</span>
                </div>
              </div>
            </div>
          </DashboardSection>
          </div>
  {/* === RIGHT COLUMN === */}
        <div className="space-y-6">
          <DashboardSection
            title="Gastos Fijos Mensuales"
            isEditing={uiState.monthlyExpenses}
            onEdit={() => toggleEdit('monthlyExpenses')}
            onAdd={addFixedExpense}
            isComplete={fixedExpenses?.length > 0 && fixedExpenses.every(item => item.status === 1)}
          >
            <ListHeader showCategory={true} />
            <div className="space-y-0">
              {fixedExpenses.map((item) => (
                <TransactionRow
                  key={item.id}
                  item={item}
                  isEditing={uiState.monthlyExpenses}
                  onChange={(id, field, val) => updateFixedExpense(id, field, val)}
                  onDelete={deleteFixedExpense}
                  onStatusToggle={() => toggleFixedExpenseStatus(item.id)}
                  canDelete={true}
                  showCategory={true}
                />
              ))}
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
            isComplete={(selectedBudget?.gastosVar || []).length > 0 && (selectedBudget?.gastosVar || []).every(item => item.status === 1)}
          >
            <ListHeader />
            <div className="space-y-0">
              {(selectedBudget?.gastosVar || []).map((item) => (
                <TransactionRow
                  key={item.id}
                  item={item}
                  isEditing={uiState.variableExpenses}
                  onChange={(id, field, val) => updateVariableExpense(id, field, val)}
                  onDelete={deleteVariableExpense}
                  onStatusToggle={() => toggleVariableExpenseStatus(item.id)}
                  canDelete={true}
                />
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--border-card)]/50 flex justify-between items-center px-1">
              <span className="text-xs font-medium text-[var(--text-muted)]">Total Variables <span className="text-[var(--text-primary)]">(Mes anterior: $0)</span></span>
              <span className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(varTotalAll)}</span>
            </div>
          </DashboardSection>
          
          <div className="bg-[var(--bg-input)] rounded-xl p-5 flex justify-between items-center">
            <span className="text-sm font-medium text-[var(--text-primary)]">Total gastos del mes</span>
            <span className="text-xl font-bold" style={{ color: COLORS.expenses }}>{formatCurrency(fixedTotal + displayVarTotal)}</span>
          </div>
        
        </div>
      </div>
</div>
  );
}

function PocketsTab() {
  const { currentBudget, calculations, formatCurrency } = useMonthlyTracker();
  const { ahorro, colchon, fixedTotal } = calculations;
  const POCKETS = [
    { icon: TrendingUp, key: 'ahorro', label: 'CDT / Ahorro', sub: 'Transfiere a CDT Bancolombia o Lulo Bank', color: COLORS.savings },
    { icon: Shield, key: 'colchon', label: 'Colchón emergencias', sub: 'Transfiere a cuenta Nu (~10% EA)', color: COLORS.cushion },
    { icon: CreditCard, key: 'fixedTotal', label: 'Pago tarjeta de crédito', sub: `Fijos: ${formatCurrency(fixedTotal)}`, color: COLORS.expenses },
  ];
  const values = { ahorro, colchon, fixedTotal };
  const variableItems = (currentBudget.gastosVar || []).map((g) => ({ icon: ShoppingCart, key: g.id, label: g.label, sub: 'Gasto variable del mes', color: '#888780', value: parseFloat(g.amount) || 0 }));

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="glass-card p-5">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Bolsillos Bancolombia</p>
        <p className="text-sm text-[var(--text-muted)] mb-4">Separa la plata el mismo día que llega el salario.</p>
        <div className="space-y-1">
          {POCKETS.map((pocket) => {
            const Icon = pocket.icon;
            return (
              <div key={pocket.key} className="flex justify-between items-center py-3 border-b border-[var(--border-card)] last:border-b-0">
                <div className="flex items-center gap-3">
                  <Icon size={20} style={{ color: pocket.color }} />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{pocket.label}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{pocket.sub}</p>
                  </div>
                </div>
                <span className="text-sm font-medium" style={{ color: pocket.color }}>{formatCurrency(values[pocket.key])}</span>
              </div>
            );
          })}
          {variableItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="flex justify-between items-center py-3 border-b border-[var(--border-card)] last:border-b-0">
                <div className="flex items-center gap-3">
                  <Icon size={20} style={{ color: item.color }} />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{item.sub}</p>
                  </div>
                </div>
                <span className="text-sm font-medium" style={{ color: item.color }}>{formatCurrency(item.value)}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="glass-card p-5">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">Flujo el día de pago</p>
        <div className="space-y-2">
          {['Wise transfiere a Bancolombia', 'Mueves al bolsillo CDT → abres CDT', 'Mueves al bolsillo Colchón → transfieres a Nu', 'Dejas el pago TC en la cuenta principal', 'El resto para tus gastos variables'].map((step, idx) => (
            <div key={idx} className="flex gap-3 py-1.5 text-sm text-[var(--text-muted)]">
              <span className="font-medium" style={{ color: COLORS.savings, minWidth: '20px' }}>{idx + 1}.</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LiquidityTab() {
  const { userId } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState(emptyMonth());
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({ actual: false, pending: false, debt: false });
  const monthKey = monthKeyOf(currentDate);

  useEffect(() => {
    let active = true;
    if (!userId) return;
    setLoading(true);
    getWalletMonth(userId, monthKey)
      .then((d) => { if (active) setData(d); })
      .catch((e) => { console.error(e); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, monthKey]);

  const toggleEdit = (colKey) => setEditing((prev) => ({ ...prev, [colKey]: !prev[colKey] }));
  const updateLocal = (colKey, id, field, value) => setData((prev) => ({ ...prev, [colKey]: prev[colKey].map((it) => (it.id === id ? { ...it, [field]: value } : it)) }));
  const persistItem = async (colKey, id) => { const item = data[colKey].find((it) => it.id === id); if (!item || !userId) return; try { await updateWalletItem(id, userId, { name: item.name, value: item.value }); } catch (e) { console.error(e); } };
  const addItem = async (colKey) => { if (!userId) return; try { const created = await addWalletItem(userId, monthKey, colKey, data[colKey].length); setData((prev) => ({ ...prev, [colKey]: [...prev[colKey], created] })); } catch (e) { console.error(e); } };
  const removeItem = async (colKey, id) => { if (!userId) return; setData((prev) => ({ ...prev, [colKey]: prev[colKey].filter((it) => it.id !== id) })); try { await deleteWalletItem(id, userId); } catch (e) { console.error(e); } };
  const moveItem = (colKey, id, direction) => { const arr = [...data[colKey]]; const idx = arr.findIndex((i) => i.id === id); const swap = direction === 'up' ? idx - 1 : idx + 1; if (idx === -1 || swap < 0 || swap >= arr.length) return; [arr[idx], arr[swap]] = [arr[swap], arr[idx]]; setData((prev) => ({ ...prev, [colKey]: arr })); if (userId) arr.forEach((it, i) => updateWalletItem(it.id, userId, { sort_order: i }).catch(() => {})); };

  const totals = useMemo(() => {
    const sum = (arr) => arr.reduce((acc, it) => acc + (Number(it.value) || 0), 0);
    const actual = sum(data.actual); const pending = sum(data.pending); const debt = sum(data.debt);
    return { actual, pending, debt, liquidez: actual + pending - debt };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <DatePicker selectedDate={currentDate} onChange={setCurrentDate} monthOnly={true} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard title="Dinero Actual" amount={fmt(totals.actual)} icon={Wallet} colorTheme="green" subtitle="Este mes" />
        <StatCard title="Pendiente" amount={fmt(totals.pending)} icon={Clock} colorTheme="orange" subtitle="Por cobrar" />
        <StatCard title="Deudas" amount={fmt(totals.debt)} icon={CreditCard} colorTheme="red" subtitle="Por pagar" />
        <StatCard title="Total" amount={fmt(totals.liquidez)} icon={Scale} colorTheme="blue" subtitle="Liquidez real" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {COLUMNS.map((col) => {
          const accent = ACCENTS[col.color]; const items = data[col.key]; const isEditingCol = editing[col.key];
          const colTotal = items.reduce((acc, it) => acc + (Number(it.value) || 0), 0); const ColIcon = col.icon;
          return (
            <div key={col.key} className="glass-card p-6" style={{ overflow: 'visible' }}>
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: `${accent}1a`, color: accent }}><ColIcon size={18} /></div>
                  <h3 className="font-bold text-white text-base truncate">{col.title}</h3>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-sm font-number" style={{ color: accent }}>{fmt(colTotal)}</span>
                  <button onClick={() => toggleEdit(col.key)} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isEditingCol ? 'bg-acid text-black' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'}`} title={isEditingCol ? 'Listo' : 'Editar'}>{isEditingCol ? <Check size={14} /> : <Pencil size={12} />}</button>
                </div>
              </div>
              <div className="space-y-1.5">
                {items.length === 0 && <p className="text-center text-text-muted/50 text-xs italic py-1.5">{loading ? 'Cargando…' : 'Sin items aún'}</p>}
                <AnimatePresence initial={false}>
                  {items.map((it, idx) => (
                    <motion.div key={it.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      {isEditingCol ? (
                        <div className="flex items-center gap-2 group">
                          <div className="flex flex-col items-center -my-1 shrink-0">
                            <button onClick={() => moveItem(col.key, it.id, 'up')} disabled={idx === 0} className="text-text-muted/50 hover:text-white disabled:opacity-20 transition-colors leading-none" title="Subir"><ChevronUp size={13} /></button>
                            <button onClick={() => moveItem(col.key, it.id, 'down')} disabled={idx === items.length - 1} className="text-text-muted/50 hover:text-white disabled:opacity-20 transition-colors leading-none" title="Bajar"><ChevronDown size={13} /></button>
                          </div>
                          <input type="text" value={it.name} onChange={(e) => updateLocal(col.key, it.id, 'name', e.target.value)} onBlur={() => persistItem(col.key, it.id)} placeholder={col.placeholder} className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-acid transition-colors" />
                          <input type="text" inputMode="numeric" value={fmtInput(it.value)} onChange={(e) => updateLocal(col.key, it.id, 'value', Number(e.target.value.replace(/\D/g, '')) || 0)} onBlur={() => persistItem(col.key, it.id)} placeholder="$0" className="w-24 shrink-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-right font-number placeholder:text-white/25 focus:outline-none focus:border-acid transition-colors" />
                          <button onClick={() => removeItem(col.key, it.id)} className="p-2 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0" title="Eliminar"><Trash2 size={15} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3 py-1.5 border-b border-white/5 last:border-0">
                          <span className="text-sm text-white truncate">{it.name || <span className="text-white/30 italic">Sin nombre</span>}</span>
                          <span className="text-sm text-white font-number shrink-0">{fmt(it.value)}</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {isEditingCol && (
                <button onClick={() => addItem(col.key)} className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/15 text-text-muted hover:text-white hover:border-white/30 hover:bg-white/[0.03] transition-colors text-sm font-semibold">
                  <Plus size={16} /> Agregar
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

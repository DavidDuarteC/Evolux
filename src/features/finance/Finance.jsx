import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Clock, CreditCard, Scale, Plus, Trash2, Pencil, Check,
  ChevronUp, ChevronDown, Calendar, ArrowRightLeft, BarChart3,
  TrendingUp, Shield, ShoppingCart, Bell, Lock, ArrowLeftRight,
  AlertTriangle, Save, ChevronRight, Database, RefreshCw, Loader2,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import { useUser } from '../../context/UserContext';
import { useFinance } from '../finance/context/FinanceContext';
import { useMonthlyTracker } from '../monthlyTracker/context/MonthlyTrackerContext';
import { supabase } from '../../shared/services/supabase';
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
  const [activeTab, setActiveTab] = useState('ingreso');
  const { loading, currentBudget, MONTHS_LONG } = useMonthlyTracker();

  const TABS = [
    { id: 'ingreso', label: t('finance.ingreso'), icon: ArrowRightLeft },
    { id: 'gastos', label: t('finance.gastos'), icon: ArrowLeftRight },
    { id: 'historial', label: t('finance.historial'), icon: BarChart3 },
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
          {activeTab === 'ingreso' && <IncomeTab />}
          {activeTab === 'gastos' && <ExpensesTab />}
          {activeTab === 'historial' && <HistoryTab />}
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
    className={`w-4 h-4 rounded-full transition-all duration-300 ${status === 1 ? 'bg-green-500' : status === 2 ? 'bg-red-500' : 'bg-zinc-700 shadow-none'} ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
    style={status === 1 ? { boxShadow: '0 0 15px rgba(34,197,94,0.6)' } : status === 2 ? { boxShadow: '0 0 15px rgba(239,68,68,0.6)' } : {}}
  />
);


function IncomeTab() {
  const { t } = useLanguage();
  const {
    currentBudget, calculations, updateBudgetField, formatCurrency, formatCurrencyDec, formatEur,
    deposits, wiseBalance, currentWithdrawals,
    addDeposit, deleteDeposit,
    addWithdrawal, updateWithdrawal, deleteWithdrawal,
    copyFromPreviousMonth,
    budgets, currentIndex, setCurrentIndex, MONTHS_LONG,
  } = useMonthlyTracker();
  const { user } = useUser();
  const useWise = user.useWise !== false;
  const { /* display uses displayCalc below */ } = calculations;

  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const [wAmount, setWAmount] = useState('');
  const [wRate, setWRate] = useState('');
  const [wFee, setWFee] = useState('');
  const [fetchingRate, setFetchingRate] = useState(false);
  const [editingWithdrawalId, setEditingWithdrawalId] = useState(null);

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

  const displayCalc = useMemo(() => {
    if (!selectedBudget) return { wiseCop: 0, manualCop: 0, cop: 0 };
    const b = selectedBudget;
    const wd = b.withdrawals || [];
    const wCop = wd.reduce((s, w) => s + (parseFloat(w.cop_received) || 0), 0);
    const leg = Math.round((parseFloat(b.salary_eur) - parseFloat(b.wise_fee_eur)) * parseFloat(b.exchange_rate));
    const wiseCop = wd.length > 0 ? wCop : (parseFloat(b.salary_eur) > 0 ? leg : 0);
    const manualCop = Math.round(parseFloat(b.manual_income_cop) || 0);
    return { wiseCop, manualCop, cop: wiseCop + manualCop, hasWithdrawals: wd.length > 0 };
  }, [selectedBudget]);

  // ── Wise rate auto-fetch ──
  const fetchWiseRate = async (amount) => {
    if (!amount || parseFloat(amount) <= 0) return;
    setFetchingRate(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-wise-rate', {
        body: { amount: parseFloat(amount) },
      });
      if (error) throw error;
      if (data?.rate) setWRate(data.rate.toString());
    } catch (err) {
      console.error('Error fetching Wise rate:', err);
      toast.error(t('finance.tasaNoDisponible'));
    } finally {
      setFetchingRate(false);
    }
  };

  useEffect(() => {
    if (showWithdrawalForm && !wRate && !wFee) {
      fetchWiseRate(wAmount || '300');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWithdrawalForm]);

  // ── Total deposited EUR (global, for wiseBalance) ──
  const totalDeposited = deposits.reduce((s, d) => s + (parseFloat(d.amount_eur) || 0), 0);
  const totalWithdrawnEur = currentWithdrawals.reduce((s, w) => s + (parseFloat(w.amount_eur) || 0), 0);
  const totalFees = currentWithdrawals.reduce((s, w) => s + (parseFloat(w.fee_eur) || 0), 0);

  const handleAddDeposit = () => {
    const val = parseFloat(depositAmount) || 0;
    if (val <= 0) return;
    addDeposit(val);
    setDepositAmount('');
    setShowDepositForm(false);
  };

  const handleAddWithdrawal = () => {
    const amount = parseFloat(wAmount) || 0;
    const rate = parseFloat(wRate) || 0;
    const fee = parseFloat(wFee) || 0;
    if (amount <= 0 || rate <= 0) return;
    if (editingWithdrawalId) {
      updateWithdrawal(editingWithdrawalId, { amount_eur: amount, exchange_rate: rate, fee_eur: fee });
    } else {
      if (amount > wiseBalance) return;
      addWithdrawal(amount, rate, fee);
    }
    setWAmount('');
    setWRate('');
    setWFee('');
    setShowWithdrawalForm(false);
    setEditingWithdrawalId(null);
  };

  const handleEditWithdrawal = (w) => {
    setEditingWithdrawalId(w.id);
    setWAmount(String(w.amount_eur));
    setWRate(String(w.exchange_rate));
    setWFee(String(w.fee_eur));
    setShowWithdrawalForm(true);
  };

  useEffect(() => {
    if (currentBudget) {
      setPickerDate(new Date(currentBudget.year, currentBudget.month));
    }
  }, [currentBudget]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* === MONTH PICKER === */}
      <div className="flex justify-center">
        <DatePicker selectedDate={pickerDate} onChange={handleMonthChange} monthOnly={true} />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => copyFromPreviousMonth()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border-card)] rounded-lg hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-all"
        >
          <Database size={12} />
          Copiar del mes anterior · neutro
        </button>
      </div>

      {/* === WISE === */}
      {useWise && (
      <div className="glass-card p-5">
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{t('finance.wiseSection')}</p>
          {displayCalc.wiseCop > 0 && <span className="text-sm font-medium" style={{ color: COLORS.savings }}>{formatCurrencyDec(displayCalc.wiseCop)}</span>}
        </div>

        {/* Saldo Wise */}
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-[var(--border-card)]">
          <span className="text-sm text-[var(--text-muted)]">{t('finance.saldoWise')}</span>
          <span className="text-base font-medium" style={{ color: wiseBalance > 0 ? '#378ADD' : 'var(--text-muted)' }}>
            {formatEur(wiseBalance)}
          </span>
        </div>

        {/* Depósitos */}
        <div className="space-y-1 mb-3">
          {deposits.length === 0 && !showDepositForm && (
            <p className="text-sm text-[var(--text-muted)] py-2">{t('finance.sinDepositos')}</p>
          )}
          {deposits.map((d) => (
            <div key={d.id} className="flex justify-between items-center py-2 border-b border-[var(--border-card)] last:border-b-0 group">
              <div className="flex items-center gap-2">
                <ArrowRightLeft size={14} className="text-blue-400" />
                <div>
                  <span className="text-sm text-[var(--text-primary)]">{formatEur(d.amount_eur)}</span>
                  <span className="text-xs text-[var(--text-muted)] ml-2">{d.deposit_date}</span>
                </div>
              </div>
              <button onClick={() => deleteDeposit(d.id)} className="p-1.5 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {showDepositForm ? (
          <div className="flex gap-2 mb-3">
            <input type="number" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="€0.00" className="flex-1 bg-[var(--bg-card-solid)] border border-[var(--border-card)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)]" autoFocus />
            <button onClick={handleAddDeposit} className="px-4 py-2 bg-acid text-black rounded-lg text-sm font-medium">{t('finance.ok')}</button>
            <button onClick={() => setShowDepositForm(false)} className="px-3 py-2 bg-[var(--bg-input)] text-[var(--text-muted)] rounded-lg text-sm">{t('finance.cancelar')}</button>
          </div>
        ) : (
          <button onClick={() => setShowDepositForm(true)} className="w-full py-2 text-sm font-medium bg-[var(--bg-input)] text-[var(--text-primary)] border border-dashed border-[var(--border-card)] rounded-lg hover:bg-[var(--bg-card-solid)] transition-colors flex items-center justify-center gap-2">
            <Plus size={14} /> {t('finance.agregarDeposito')}
          </button>
        )}
      </div>
      )}

      {/* Retiros */}
      {useWise && (
      <div className="glass-card p-5">
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{t('finance.retiros')}</p>
          {displayCalc.wiseCop > 0 && <span className="text-sm font-medium" style={{ color: COLORS.savings }}>{formatCurrencyDec(displayCalc.wiseCop)}</span>}
        </div>

        {displayCalc.hasWithdrawals ? (
          <div className="space-y-2 mb-3">
            {(selectedBudget?.withdrawals || []).map((w) => {
              const copVal = parseFloat(w.cop_received) || 0;
              const rate = parseFloat(w.exchange_rate) || 0;
              const fee = parseFloat(w.fee_eur) || 0;
              const amount = parseFloat(w.amount_eur) || 0;
              return (
                <div key={w.id} className="bg-[var(--bg-input)] rounded-lg p-3 group">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="text-sm text-[var(--text-primary)] font-medium">{formatEur(amount)}</span>
                      <span className="text-xs text-[var(--text-muted)] ml-2">× {rate.toFixed(2)}</span>
                      {fee > 0 && <span className="text-xs text-red-400 ml-2">−{formatEur(fee)}</span>}
                    </div>
                    <span className="text-sm font-medium" style={{ color: COLORS.savings }}>{formatCurrencyDec(copVal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-[var(--text-muted)]">{w.withdrawal_date}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditWithdrawal(w)} className="p-1 text-text-muted/50 hover:text-blue-400 transition-colors">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => deleteWithdrawal(w.id)} className="p-1 text-red-400/50 hover:text-red-400 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)] py-2 mb-3">{t('finance.sinRetiros')}</p>
        )}

        {showWithdrawalForm ? (
          <div className="space-y-3 mb-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[11px] text-[var(--text-muted)] block mb-1">{t('finance.eurAConvertir')}</label>
                <input type="number" step="0.01" value={wAmount} onChange={(e) => setWAmount(e.target.value)} placeholder={`${t('finance.max')} ${formatEur(wiseBalance)}`} className="w-full bg-[var(--bg-card-solid)] border border-[var(--border-card)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)]" autoFocus />
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-[var(--text-muted)] block mb-1 flex items-center justify-between">
                  <span>{t('finance.tasaCop')}</span>
                  <button onClick={() => fetchWiseRate(wAmount)} disabled={fetchingRate} className="text-[10px] text-blue-400 hover:text-blue-300 disabled:opacity-40 flex items-center gap-1">
                    {fetchingRate ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />} {t('finance.auto')}
                  </button>
                </label>
                <input type="number" step="0.01" value={wRate} onChange={(e) => setWRate(e.target.value)} placeholder="3706.00" className="w-full bg-[var(--bg-card-solid)] border border-[var(--border-card)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)]" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[11px] text-[var(--text-muted)] block mb-1 flex items-center justify-between">
                  <span>{t('finance.comisionEur')}</span>
                </label>
                <input type="number" step="0.01" value={wFee} onChange={(e) => setWFee(e.target.value)} placeholder="0.00" className="w-full bg-[var(--bg-card-solid)] border border-[var(--border-card)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)]" />
              </div>
              <div className="flex items-end gap-2">
                {wAmount && wRate && (
                  <span className="text-sm font-medium pb-2" style={{ color: COLORS.savings }}>
                    = {formatCurrencyDec(((parseFloat(wAmount) || 0) - (parseFloat(wFee) || 0)) * (parseFloat(wRate) || 0))}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddWithdrawal} className="flex-1 py-2 bg-acid text-black rounded-lg text-sm font-medium">
                {editingWithdrawalId ? 'Actualizar retiro' : t('finance.agregarRetiro')}
              </button>
              <button onClick={() => { setShowWithdrawalForm(false); setEditingWithdrawalId(null); setWAmount(''); setWRate(''); setWFee(''); }} className="px-4 py-2 bg-[var(--bg-input)] text-[var(--text-muted)] rounded-lg text-sm">{t('finance.cancelar')}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setShowWithdrawalForm(true); setEditingWithdrawalId(null); }} disabled={wiseBalance <= 0} className="w-full py-2 text-sm font-medium bg-[var(--bg-input)] text-[var(--text-primary)] border border-dashed border-[var(--border-card)] rounded-lg hover:bg-[var(--bg-card-solid)] transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
            <Plus size={14} /> {t('finance.nuevoRetiro')}
          </button>
        )}
      </div>
      )}

      {/* === MANUAL COP === */}
      <div className="glass-card p-5">
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{t('finance.manualCopSection')}</p>
          {displayCalc.manualCop > 0 && <span className="text-sm font-medium" style={{ color: COLORS.savings }}>{formatCurrency(displayCalc.manualCop)}</span>}
        </div>
        <div className="flex justify-between items-center py-3">
          <div className="flex-1 pr-4">
            <p className="text-sm text-[var(--text-primary)]">{t('finance.otrosIngresos')}</p>
            <p className="text-[11px] text-[var(--text-muted)] opacity-70">{t('finance.freelance')}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">$</span>
            <input type="number" value={selectedBudget ? (currentBudget.manual_income_cop || 0) : 0} onChange={(e) => selectedBudget && updateBudgetField('manual_income_cop', parseFloat(e.target.value) || 0)} className="w-40 bg-[var(--bg-input)] border border-[var(--border-card)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] text-right focus:outline-none focus:border-[var(--border-hover)]" disabled={!selectedBudget} />
          </div>
        </div>
      </div>

      {/* === TOTAL === */}
      <div className="glass-card p-5">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">{t('finance.resumenIngresos')}</p>
        <div className="space-y-2">
          {useWise && displayCalc.wiseCop > 0 && <Row label="Wise (EUR → COP)" value={formatCurrencyDec(displayCalc.wiseCop)} color={COLORS.savings} />}
          {useWise && displayCalc.wiseCop > 0 && <Row label="Saldo en Wise" value={formatEur(wiseBalance)} color="#378ADD" />}
          {displayCalc.manualCop > 0 && <Row label="Manual (COP)" value={formatCurrency(displayCalc.manualCop)} color={COLORS.savings} />}
          <div className="flex justify-between items-center pt-2 border-t border-[var(--border-card)]">
            <span className="text-sm font-medium text-[var(--text-primary)]">Total COP del mes</span>
            <span className="text-xl font-medium" style={{ color: COLORS.savings }}>{formatCurrency(displayCalc.cop)}</span>
          </div>
        </div>
      </div>

    </div>
  );
}

function ExpensesTab() {
  const { t } = useLanguage();
  const [subtab, setSubtab] = useState('fijos');
  const {
    currentBudget, fixedExpenses, calculations, formatCurrency,
    updateFixedExpense, addFixedExpense, deleteFixedExpense, toggleFixedExpenseStatus,
    updateVariableExpense, addVariableExpense, deleteVariableExpense, toggleVariableExpenseStatus,
    copyFromPreviousMonth,
    budgets, currentIndex, setCurrentIndex, MONTHS_LONG,
  } = useMonthlyTracker();
  const { data: financeData, updateDb: updateFinDb } = useFinance();
  const { fixedTotal } = calculations;

  const isFixed = subtab === 'fijos';
  const isVariable = subtab === 'variables';
  const isAnuales = subtab === 'anuales';

  const [pickerDate, setPickerDate] = useState(() =>
    currentBudget ? new Date(currentBudget.year, currentBudget.month) : new Date()
  );

  useEffect(() => {
    if (currentBudget) {
      setPickerDate(new Date(currentBudget.year, currentBudget.month));
    }
  }, [currentBudget]);

  const handleMonthChange = (newDate) => {
    setPickerDate(newDate);
    const y = newDate.getFullYear();
    const m = newDate.getMonth();
    const idx = budgets.findIndex(b => Number(b.year) === y && Number(b.month) === m);
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

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* === MONTH PICKER === */}
      <div className="flex justify-center">
        <DatePicker selectedDate={pickerDate} onChange={handleMonthChange} monthOnly={true} />
      </div>

      <div className="flex gap-1 bg-[var(--bg-input)] rounded-xl p-1">
        <button onClick={() => setSubtab('fijos')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${isFixed ? 'bg-[var(--bg-card-solid)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
          <Lock size={12} /> {t('finance.fijos')} — {formatCurrency(fixedTotal)}
        </button>
        <button onClick={() => setSubtab('variables')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${isVariable ? 'bg-[var(--bg-card-solid)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
          <ArrowLeftRight size={12} /> {t('finance.variables')} — {formatCurrency(displayVarTotal)}
        </button>
        <button onClick={() => setSubtab('anuales')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${isAnuales ? 'bg-[var(--bg-card-solid)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
          <Calendar size={12} /> Anuales
        </button>
      </div>

      {(isFixed || isVariable) && (
        <>
          <div className="flex items-center gap-2">
            <button
              onClick={() => copyFromPreviousMonth()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border-card)] rounded-lg hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-all"
            >
              <Database size={12} />
              Copiar del mes anterior · neutro
            </button>
          </div>

          <div className="glass-card p-5">
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">{isFixed ? t('finance.gastosFijos') : t('finance.gastosVariables')}</p>
            <p className="text-xs text-[var(--text-muted)] mb-4">{isFixed ? 'Se cargan a la tarjeta de crédito y se pagan de contado.' : 'Mercado, salidas, compras puntuales, lo que varíe mes a mes.'}</p>
            <div className="space-y-2">
              {(isFixed ? fixedExpenses : selectedBudget?.gastosVar || []).map((item) => (
                <div key={item.id} className="flex items-center gap-1.5 sm:gap-2 py-2 border-b border-[var(--border-card)] last:border-b-0">
                  <StatusBulb
                    status={item.status || 0}
                    onClick={() => isFixed ? toggleFixedExpenseStatus(item.id) : toggleVariableExpenseStatus(item.id)}
                  />
                  <input type="text" value={item.label} onChange={(e) => isFixed ? updateFixedExpense(item.id, 'label', e.target.value) : updateVariableExpense(item.id, 'label', e.target.value)} placeholder="Nombre" className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border-card)] rounded-lg px-2 sm:px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)]" />
                  <input type="number" value={item.amount} onChange={(e) => isFixed ? updateFixedExpense(item.id, 'amount', e.target.value) : updateVariableExpense(item.id, 'amount', e.target.value)} className="w-20 sm:w-28 bg-[var(--bg-input)] border border-[var(--border-card)] rounded-lg px-2 sm:px-3 py-2 text-sm text-[var(--text-primary)] text-right focus:outline-none focus:border-[var(--border-hover)]" />
                  <button onClick={() => isFixed ? deleteFixedExpense(item.id) : deleteVariableExpense(item.id)} className="p-1.5 sm:p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors shrink-0" aria-label={t('finance.eliminar')}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={isFixed ? addFixedExpense : addVariableExpense} disabled={!isFixed && !selectedBudget} className="w-full mt-4 py-2.5 text-sm font-medium bg-[var(--bg-input)] text-[var(--text-primary)] border border-dashed border-[var(--border-card)] rounded-lg hover:bg-[var(--bg-card-solid)] transition-colors flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">
              <Plus size={14} /> {t('finance.nuevoGasto')} {isFixed ? 'fijo' : 'variable'}
            </button>
          </div>

          <div className="glass-card p-5">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-[var(--text-primary)]">Total {isFixed ? t('finance.fijos').toLowerCase() : t('finance.variables').toLowerCase()}</span>
              <span className="text-lg font-medium" style={{ color: COLORS.expenses }}>{formatCurrency(isFixed ? fixedTotal : displayVarTotal)}</span>
            </div>
          </div>
          <div className="bg-[var(--bg-input)] rounded-xl p-4 flex justify-between items-center">
            <span className="text-sm text-[var(--text-muted)]">Total gastos del mes</span>
            <span className="text-base font-medium" style={{ color: COLORS.expenses }}>{formatCurrency(fixedTotal + displayVarTotal)}</span>
          </div>
        </>
      )}

      {isAnuales && (
        <div className="glass-card p-5">
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Gastos anuales</p>
          <p className="text-xs text-[var(--text-muted)] mb-4">Impuestos, seguros, suscripciones y otros gastos que se pagan una vez al año.</p>
          <div className="space-y-2">
            {(financeData.annual || []).map((item) => (
              <div key={item.id} className="flex items-center gap-2 py-2 border-b border-[var(--border-card)] last:border-b-0">
                <StatusBulb
                  status={item.status || 0}
                  onClick={() => {
                    const next = ((item.status || 0) + 1) % 3;
                    updateFinDb('annual', 'update', { id: item.id, field: 'status', value: next });
                  }}
                />
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateFinDb('annual', 'update', { id: item.id, field: 'name', value: e.target.value })}
                  placeholder="Nombre"
                  className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border-card)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)]"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={item.amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\./g, '').replace(/,/g, '');
                    if (!/^\d*$/.test(raw)) return;
                    const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                    updateFinDb('annual', 'update', { id: item.id, field: 'amount', value: formatted });
                  }}
                  className="w-28 bg-[var(--bg-input)] border border-[var(--border-card)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] text-right focus:outline-none focus:border-[var(--border-hover)]"
                />
                <button
                  onClick={() => updateFinDb('annual', 'delete', { id: item.id })}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors shrink-0"
                  aria-label={t('finance.eliminar')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
              const d = new Date();
              const m = months[d.getMonth()];
              const day = String(d.getDate()).padStart(2, '0');
              updateFinDb('annual', 'add', {
                id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
                name: 'Nuevo Item',
                date: `${m} ${day}`,
                amount: '0',
                status: 0,
              });
            }}
            className="w-full mt-4 py-2.5 text-sm font-medium bg-[var(--bg-input)] text-[var(--text-primary)] border border-dashed border-[var(--border-card)] rounded-lg hover:bg-[var(--bg-card-solid)] transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Agregar gasto anual
          </button>
        </div>
      )}
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

function HistoryTab() {
  const { t } = useLanguage();
  const { savedBudgets, formatCurrency, MONTHS_SHORT } = useMonthlyTracker();

  const chartData = useMemo(() => {
    let accAhorro = 0, accColchon = 0;
    return savedBudgets.map((m) => {
      const wiseCop = Math.round((parseFloat(m.salary_eur) - parseFloat(m.wise_fee_eur)) * parseFloat(m.exchange_rate));
      const manualCop = Math.round(parseFloat(m.manual_income_cop) || 0);
      const cop = wiseCop + manualCop;
      const ahorro = Math.round(cop * (m.savings_pct || 0) / 100);
      const colchon = Math.round(cop * (m.cushion_pct || 0) / 100);
      accAhorro += ahorro;
      accColchon += colchon;
      return { label: `${MONTHS_SHORT[m.month]} ${m.year}`, cdt: accAhorro, colchon: accColchon };
    });
  }, [savedBudgets, MONTHS_SHORT]);

  const totals = useMemo(() => savedBudgets.reduce((acc, m) => {
    const wiseCop = Math.round((parseFloat(m.salary_eur) - parseFloat(m.wise_fee_eur)) * parseFloat(m.exchange_rate));
    const manualCop = Math.round(parseFloat(m.manual_income_cop) || 0);
    const cop = wiseCop + manualCop;
    acc.ahorro += Math.round(cop * (m.savings_pct || 0) / 100);
    acc.colchon += Math.round(cop * (m.cushion_pct || 0) / 100);
    return acc;
  }, { ahorro: 0, colchon: 0 }), [savedBudgets]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--bg-input)] rounded-xl p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">{t('finance.cdtAcumulado')}</p>
          <p className="text-xl font-medium" style={{ color: COLORS.savings }}>{formatCurrency(totals.ahorro)}</p>
        </div>
        <div className="bg-[var(--bg-input)] rounded-xl p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">{t('finance.colchonAcumulado')}</p>
          <p className="text-xl font-medium" style={{ color: COLORS.cushion }}>{formatCurrency(totals.colchon)}</p>
        </div>
      </div>
      <div className="glass-card p-5">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">{t('finance.evoluciónAhorro')}</p>
        <div className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="label" tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} stroke="var(--chart-axis)" />
                <YAxis tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} stroke="var(--chart-axis)" tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card-solid)', border: '1px solid var(--border-card)', borderRadius: '12px', color: 'var(--text-primary)' }} formatter={(value) => [formatCurrency(value), '']} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="cdt" name="CDT" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                <Bar dataKey="colchon" name="Colchón" fill="#378ADD" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">{t('finance.guardaPrimerMes')}</div>
          )}
        </div>
      </div>
      <div className="glass-card p-5">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">{t('finance.mesesRegistrados')}</p>
        {savedBudgets.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-2">{t('finance.guardaPrimerMes')}</p>
        ) : (
          <div className="space-y-2">
            {savedBudgets.map((m) => {
              const wiseCop = Math.round((parseFloat(m.salary_eur) - parseFloat(m.wise_fee_eur)) * parseFloat(m.exchange_rate));
              const manualCop = Math.round(parseFloat(m.manual_income_cop) || 0);
              const cop = wiseCop + manualCop;
              const ahorro = Math.round(cop * (m.savings_pct || 0) / 100);
              const colchon = Math.round(cop * (m.cushion_pct || 0) / 100);
              return (
                <div key={m.id} className="flex justify-between items-center py-2 border-b border-[var(--border-card)] last:border-b-0 text-sm">
                  <span className="text-[var(--text-primary)]">{MONTHS_SHORT[m.month]} {m.year}</span>
                  <span className="text-[var(--text-muted)]">{formatCurrency(cop)}</span>
                  <span style={{ color: COLORS.savings }}>+{formatCurrency(ahorro + colchon)}</span>
                </div>
              );
            })}
          </div>
        )}
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

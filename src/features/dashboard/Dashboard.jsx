import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, BarChart3, CheckSquare, Dumbbell, Trophy,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { useMonthlyTracker } from '../monthlyTracker/context/MonthlyTrackerContext';
import { useTasks } from '../tasks/context/TaskContext';
import { useUser } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';
import DatePicker from '../../shared/components/DatePicker';
import { getGoals } from '../goals/services/goals';
import { getHabits } from '../fitness/services/habits';
import { toast } from 'sonner';

import { MONTHS_SHORT as MONTHS } from '../../shared/lib/constants';

const CHART_GREEN = '#4ade80';
const CHART_RED = '#f87171';
const CHART_ORANGE = '#fb923c';
const CHART_BLUE = '#60a5fa';
const CHART_PURPLE = '#a78bfa';
const ACC_SAVINGS = '#1D9E75';
const ACC_CUSHION = '#378ADD';
const PIE_COLORS = ['#f87171', '#fb923c', '#a78bfa', '#60a5fa', '#4ade80'];

const ChartTooltip = ({ active, payload, label, fmt }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[var(--bg-card-solid)] border border-[var(--border-card)] rounded-xl px-3.5 py-2.5 shadow-2xl z-50">
        <p className="text-[var(--text-primary)] font-semibold text-xs mb-1.5">{label}</p>
        {payload.map((e, i) => (
          <p key={i} className="text-[11px] font-medium" style={{ color: e.color }}>{e.name}: {fmt(e.value)}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { userId } = useAuth();
  const { user } = useUser();
  const { t } = useLanguage();

  const {
    budgets,
    currentBudget: trackerBudget,
    currentIndex,
    setCurrentIndex,
    fixedExpenses,
    calculations: trackerCalc,
    formatCurrency: trackerFmt,
    formatCurrencyDec,
    MONTHS_LONG, MONTHS_SHORT,
    loading,
  } = useMonthlyTracker();

  const { spaces, categories, tasks } = useTasks();

  const [goals, setGoals] = useState([]);
  const [habits, setHabits] = useState([]);

  const [pickerDate, setPickerDate] = useState(() =>
    trackerBudget ? new Date(trackerBudget.year, trackerBudget.month) : new Date()
  );
  const [chartRange, setChartRange] = useState(6);

  const trackerLabel = `${MONTHS_LONG[pickerDate.getMonth()]} ${pickerDate.getFullYear()}`;
  const trackerMonthLabel = trackerBudget ? `${MONTHS_LONG[trackerBudget.month]} ${trackerBudget.year}` : '';

  useEffect(() => {
    if (!userId) return;
    getGoals(userId).then(setGoals).catch(() => {});
    getHabits(userId).then(setHabits).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (trackerBudget) {
      setPickerDate(new Date(trackerBudget.year, trackerBudget.month));
    }
  }, [trackerBudget]);

  const handleMonthChange = (newDate) => {
    setPickerDate(newDate);
    const y = newDate.getFullYear();
    const m = newDate.getMonth();
    const idx = budgets.findIndex(b => Number(b.year) === y && Number(b.month) === m);
    if (idx >= 0) setCurrentIndex(idx);
  };

  // ── Budget for the selected month (for display, independent of tracker's currentIndex) ──
  const selectedBudget = useMemo(() => {
    const y = pickerDate.getFullYear();
    const m = pickerDate.getMonth();
    return budgets.find(b => Number(b.year) === y && Number(b.month) === m) || trackerBudget || budgets[budgets.length - 1] || null;
  }, [budgets, pickerDate, trackerBudget]);

  // ── Display calculations for the selected month ──
  const displayCalc = useMemo(() => {
    if (!selectedBudget) {
      return { cop: 0, ahorro: 0, colchon: 0, fixedTotal: 0, varTotal: 0, disponible: 0 };
    }
    const b = selectedBudget;
    const budgetIncomes = b.incomes || [];
    const paidIncomes = budgetIncomes.filter((i) => (i.status || 0) === 1);
    const activeIncomes = paidIncomes.length > 0 ? paidIncomes : budgetIncomes;

    const totalCOP = activeIncomes.reduce((sum, i) => {
      const amt = parseFloat(i.amount) || 0;
      if (i.currency === 'COP') return sum + amt;
      const net = amt - (parseFloat(i.fee) || 0);
      return sum + Math.round(net * (parseFloat(i.rate) || 0));
    }, 0);
    const cop = totalCOP;
    const ahorro = Math.round(cop * (b.savings_pct || 0) / 100);
    const colchon = Math.round(cop * (b.cushion_pct || 0) / 100);

    const paidFixed = fixedExpenses.filter(g => (g.status || 0) === 1);
    const activeFixed = paidFixed.length > 0 ? paidFixed : fixedExpenses;
    const fTotal = activeFixed.reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);

    const paidVar = (b.gastosVar || []).filter(g => (g.status || 0) === 1);
    const activeVar = paidVar.length > 0 ? paidVar : (b.gastosVar || []);
    const vTotal = activeVar.reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);

    return { cop, fixedTotal: fTotal, varTotal: vTotal, ahorro, colchon, disponible: cop - ahorro - colchon - fTotal - vTotal };
  }, [selectedBudget, fixedExpenses]);

  // ── Derived values ──
  const income = trackerBudget ? trackerCalc.cop : 0;

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const monthDays = useMemo(() =>
    Array.from({ length: new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 0).getDate() },
      (_, i) => new Date(pickerDate.getFullYear(), pickerDate.getMonth(), i + 1)
    ), [pickerDate]);

  const habitRates = useMemo(() => habits.map(h => {
    const applicable = monthDays.filter(d => {
      const dow = d.getDay();
      if (h.frequency === 2) return dow >= 1 && dow <= 5;
      if (h.frequency === 3) return dow === 0 || dow === 6;
      return true;
    });
    if (applicable.length === 0) return { ...h, rate: 0 };
    const done = applicable.filter(d => {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return (h.history || {})[k] > 0;
    }).length;
    return { ...h, rate: Math.round((done / applicable.length) * 100) };
  }), [habits, monthDays]);
  const avgHabit = useMemo(() =>
    habitRates.length > 0
      ? Math.round(habitRates.reduce((s, h) => s + h.rate, 0) / habitRates.length)
      : 0
  , [habitRates]);

  // ── Chart: income vs expenses vs savings — filtered by range ──
  const incomeExpenseChart = useMemo(() => {
    const refY = pickerDate.getFullYear();
    const refM = pickerDate.getMonth();
    const budgetMap = {};
    budgets.forEach(b => { budgetMap[`${b.year}-${b.month}`] = b; });

    const data = [];
    const months = chartRange - 1;
    for (let i = months; i >= 0; i--) {
      let m = refM - i, y = refY;
      if (m < 0) { m += 12; y -= 1; }
      const b = budgetMap[`${y}-${m}`];
      let cop = 0, allocated = 0, fTotal = 0, vTotal = 0;
      if (b) {
        const budgetIncomes = b.incomes || [];
        cop = budgetIncomes
          .filter((i) => (i.status || 0) === 1)
          .reduce((sum, i) => {
            const amt = parseFloat(i.amount) || 0;
            if (i.currency === 'COP') return sum + amt;
            const net = amt - (parseFloat(i.fee) || 0);
            return sum + Math.round(net * (parseFloat(i.rate) || 0));
          }, 0);
        allocated = Math.round(cop * (b.savings_pct || 0) / 100) + Math.round(cop * (b.cushion_pct || 0) / 100);

        const paidFixed = fixedExpenses.filter(g => (g.status || 0) === 1);
        const activeFixed = paidFixed.length > 0 ? paidFixed : fixedExpenses;
        fTotal = activeFixed.reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);

        const paidVar = (b.gastosVar || []).filter(g => (g.status || 0) === 1);
        const activeVar = paidVar.length > 0 ? paidVar : (b.gastosVar || []);
        vTotal = activeVar.reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);
      }
      data.push({
        name: `${MONTHS[m]} ${y.toString().slice(2)}`,
        Ingresos: Math.round(cop),
        'Gastos Fijos': Math.round(fTotal),
        'Gastos Var.': Math.round(vTotal),
        Ahorro: allocated,
      });
    }
    return data;
  }, [budgets, pickerDate, chartRange, fixedExpenses]);

  // ── Expense donut ──
  const expensePie = useMemo(() => {
    if (!selectedBudget) return [];

    const fPaid = fixedExpenses.filter(g => (g.status || 0) === 1).reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);
    const fTotal = fixedExpenses.reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);
    const fPending = Math.max(0, fTotal - fPaid);

    const vars = selectedBudget.gastosVar || [];
    const vPaid = vars.filter(g => (g.status || 0) === 1).reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);
    const vTotal = vars.reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);
    const vPending = Math.max(0, vTotal - vPaid);

    return [
      fPaid > 0 ? { name: 'Fijos pagados', value: fPaid } : null,
      fPending > 0 ? { name: 'Fijos pend.', value: fPending } : null,
      vPaid > 0 ? { name: 'Var. pagados', value: vPaid } : null,
      vPending > 0 ? { name: 'Var. pend.', value: vPending } : null,
    ].filter(Boolean);
  }, [fixedExpenses, selectedBudget]);

  // ── Accumulated savings (CDT + Colchón) — from all budgets up to selected month ──
  const savingsChart = useMemo(() => {
    const refY = pickerDate.getFullYear();
    const refM = pickerDate.getMonth();
    const filtered = budgets.filter(b => {
      return b.year < refY || (b.year === refY && b.month <= refM);
    });
    let accA = 0, accC = 0;
    return filtered.map(m => {
      const incomes = m.incomes || [];
      const totalCOP = incomes
        .filter((i) => (i.status || 0) === 1)
        .reduce((s, i) => {
          const amt = parseFloat(i.amount) || 0;
          if (i.currency === 'COP') return s + amt;
          const net = amt - (parseFloat(i.fee) || 0);
          return s + Math.round(net * (parseFloat(i.rate) || 0));
        }, 0);
      accA += Math.round(totalCOP * (m.savings_pct || 0) / 100);
      accC += Math.round(totalCOP * (m.cushion_pct || 0) / 100);
      return { name: `${MONTHS[m.month]}`, CDT: accA, Colchón: accC };
    });
  }, [budgets, pickerDate]);

  const taskSpaceData = useMemo(() =>
    spaces.map(s => {
      const sc = categories.filter(c => c.space_id === s.id);
      const st = tasks.filter(t => sc.some(c => c.id === t.category_id));
      const done = st.filter(t => t.status === 'completed').length;
      return { name: s.name, Completadas: done, Pendientes: Math.max(0, st.length - done), color: s.color || CHART_GREEN };
    }), [spaces, categories, tasks]);

  const goalsCompleted = goals.filter(g => g.current >= g.target).length;

  const StatPill = ({ label, value, color }) => (
    <div className="flex items-center gap-2.5">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div className="min-w-0">
        <div className="text-2xl sm:text-[26px] font-bold text-[var(--text-primary)] tabular-nums leading-none truncate">{value}</div>
        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{label}</div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-acid border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[var(--text-muted)] text-sm">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">
            {t('dashboard.hola')} <span className="bg-gradient-to-r from-acid to-forest bg-clip-text text-transparent">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-0.5">{trackerLabel || t('dashboard.bienvenido')}</p>
        </div>
        <div className="flex items-center gap-3">
          <DatePicker selectedDate={pickerDate} onChange={handleMonthChange} monthOnly={true} />
        </div>
      </div>

      {/* STAT ROW */}
      <div className="glass-card p-5 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-4">
          <StatPill label={t('dashboard.ingresosTotales')} value={trackerFmt(displayCalc.cop)} color={CHART_GREEN} />
          <StatPill label="Gastos fijos" value={trackerFmt(displayCalc.fixedTotal)} color={CHART_RED} />
          <StatPill label="Gastos variables" value={trackerFmt(displayCalc.varTotal)} color={CHART_ORANGE} />
          <StatPill label={t('dashboard.disponible')} value={trackerFmt(displayCalc.disponible)} color={CHART_BLUE} />
          <StatPill label="Tareas" value={`${taskPct}%`} color={CHART_GREEN} />
          <StatPill label="Hábitos" value={`${avgHabit}%`} color={CHART_PURPLE} />
        </div>
      </div>

      {/* INCOME vs SAVINGS CHART */}
      <div className="glass-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <BarChart3 size={17} className="text-green-400" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">Ingresos vs Gastos vs Ahorro</h3>
          </div>
          <div className="flex gap-1 bg-[var(--bg-input)] rounded-lg p-0.5">
            {[3, 6, 12].map(n => (
              <button
                key={n}
                onClick={() => setChartRange(n)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  chartRange === n ? 'bg-[var(--bg-card-solid)] text-[var(--text-primary)] font-bold shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {n === 12 ? '1A' : `${n}M`}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 sm:h-72">
          {incomeExpenseChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeExpenseChart} margin={{ top: 5, right: 10, left: -15, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--border-card)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} dy={8} />
                <YAxis stroke="var(--border-card)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${Math.round(v / 1000)}k`} width={45} />
                <Tooltip content={<ChartTooltip fmt={trackerFmt} />} cursor={{ fill: 'var(--bg-input)' }} />
                <Bar dataKey="Ingresos" name="Ingresos" fill={CHART_GREEN} radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="Gastos Fijos" name="Gastos Fijos" fill={CHART_RED} radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="Gastos Var." name="Gastos Var." fill={CHART_ORANGE} radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="Ahorro" name="Ahorro" fill={ACC_SAVINGS} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-xs">Sin meses registrados</div>
          )}
        </div>
        <div className="flex justify-center gap-6 mt-4 flex-wrap">
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_GREEN }} /><span className="text-[var(--text-muted)] text-xs">Ingresos</span></div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_RED }} /><span className="text-[var(--text-muted)] text-xs">Gastos Fijos</span></div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_ORANGE }} /><span className="text-[var(--text-muted)] text-xs">Gastos Variables</span></div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ACC_SAVINGS }} /><span className="text-[var(--text-muted)] text-xs">Ahorro</span></div>
        </div>
      </div>

      {/* TWO-COL: Pie + Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense donut */}
        <div className="glass-card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingDown size={17} className="text-orange-400" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">Gastos del mes</h3>
          </div>
          <div className="h-52 sm:h-60 flex items-center justify-center relative">
            {expensePie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expensePie} innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value" stroke="none">
                    {expensePie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip fmt={trackerFmt} />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-[var(--text-muted)] text-xs">Sin gastos este mes</span>
            )}
            {expensePie.length > 0 && (
              <div className="absolute text-center pointer-events-none">
                <span className="text-[10px] text-[var(--text-muted)] block mb-0.5">Total pagado</span>
                <span className="font-bold text-[var(--text-primary)] text-sm tracking-tight">
                  {trackerFmt(expensePie.filter(e => !e.name.includes('pend.')).reduce((a, b) => a + b.value, 0))}
                </span>
              </div>
            )}
          </div>
          {expensePie.length > 0 && (
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-4">
              {expensePie.map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-[var(--text-muted)] text-[11px]">{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accumulated savings area */}
        <div className="glass-card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={17} className="text-green-400" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">Ahorro acumulado</h3>
          </div>
          <div className="h-52 sm:h-60">
            {savingsChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={savingsChart} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cdtG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={ACC_SAVINGS} stopOpacity={0.25} /><stop offset="95%" stopColor={ACC_SAVINGS} stopOpacity={0} /></linearGradient>
                    <linearGradient id="colG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={ACC_CUSHION} stopOpacity={0.25} /><stop offset="95%" stopColor={ACC_CUSHION} stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--border-card)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} dy={8} />
                  <YAxis stroke="var(--border-card)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${Math.round(v / 1000)}k`} width={45} />
                  <Tooltip content={<ChartTooltip fmt={trackerFmt} />} />
                  <Area type="monotone" dataKey="CDT" stroke={ACC_SAVINGS} strokeWidth={2} fill="url(#cdtG)" />
                  <Area type="monotone" dataKey="Colchón" stroke={ACC_CUSHION} strokeWidth={2} fill="url(#colG)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-xs">Guarda tu primer mes para ver el historial</div>
            )}
          </div>
          {savingsChart.length > 0 && (
            <div className="flex justify-center gap-8 mt-4">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ACC_SAVINGS }} /><span className="text-[var(--text-muted)] text-xs">CDT</span></div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ACC_CUSHION }} /><span className="text-[var(--text-muted)] text-xs">Colchón</span></div>
            </div>
          )}
        </div>
      </div>

      {/* TASKS + HABITS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <CheckSquare size={17} className="text-acid" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">Tareas por espacio</h3>
            </div>
            <span className={`text-xs font-bold ${taskPct >= 70 ? 'text-green-400' : taskPct >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{taskPct}%</span>
          </div>
          <div className="h-44 sm:h-48">
            {taskSpaceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskSpaceData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" horizontal={false} />
                  <XAxis type="number" stroke="transparent" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="transparent" tick={{ fill: 'var(--text-primary)', fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
                  <Tooltip content={<ChartTooltip fmt={trackerFmt} />} />
                  <Bar dataKey="Completadas" stackId="a" fill={CHART_GREEN} radius={[0, 3, 3, 0]} maxBarSize={18} />
                  <Bar dataKey="Pendientes" stackId="a" fill="var(--border-card)" radius={[0, 3, 3, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-xs">Sin espacios de tareas</div>
            )}
          </div>
        </div>

        <div className="glass-card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <Dumbbell size={17} className="text-purple-400" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">Hábitos del mes</h3>
          </div>
          {habitRates.length === 0 ? (
            <p className="text-[var(--text-muted)] text-xs text-center py-10">Sin hábitos configurados</p>
          ) : (
            <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
              {habitRates.map(h => (
                <div key={h.id}>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-sm text-[var(--text-primary)] truncate mr-2">{h.name}</span>
                    <span className="text-[11px] text-[var(--text-muted)] shrink-0">{h.rate}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--bg-input)] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${h.rate}%`, backgroundColor: h.color || CHART_PURPLE }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* GOALS */}
      {goals.length > 0 && (
        <div className="glass-card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <Trophy size={17} className="text-yellow-400" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">Metas financieras</h3>
            <span className="text-[11px] text-[var(--text-muted)] ml-auto">{goalsCompleted}/{goals.length} cumplidas</span>
          </div>
          <div className="space-y-3.5">
            {goals.map(g => {
              const pct = g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0;
              return (
                <div key={g.id}>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-sm text-[var(--text-primary)] truncate mr-2">{g.title}</span>
                    <span className="text-[11px] text-[var(--text-muted)] shrink-0">{trackerFmt(g.current)} / {trackerFmt(g.target)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--bg-input)] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: g.color || CHART_GREEN }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SAVED MONTHS */}
      {budgets.length > 0 && (
        <div className="glass-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-4">Meses registrados</h3>
          <div className="space-y-2">
            {budgets.filter(b => b.year < pickerDate.getFullYear() || (b.year === pickerDate.getFullYear() && b.month <= pickerDate.getMonth())).map((m) => {
              const incomes = m.incomes || [];
              const totalCOP = incomes
                .filter((i) => (i.status || 0) === 1)
                .reduce((s, i) => {
                  const amt = parseFloat(i.amount) || 0;
                  if (i.currency === 'COP') return s + amt;
                  const net = amt - (parseFloat(i.fee) || 0);
                  return s + Math.round(net * (parseFloat(i.rate) || 0));
                }, 0);
              const ahorro = Math.round(totalCOP * (m.savings_pct || 0) / 100);
              const colchon = Math.round(totalCOP * (m.cushion_pct || 0) / 100);
              return (
                <div key={m.id} className="flex justify-between items-center py-3 border-b border-[var(--border-card)] last:border-b-0 text-sm">
                  <span className="text-[var(--text-primary)] font-medium">{MONTHS_SHORT[m.month]} {m.year}</span>
                  <div className="flex items-center gap-6">
                    <span className="text-[var(--text-muted)]">{trackerFmt(totalCOP)}</span>
                    <span className="text-green-500 font-medium">+{trackerFmt(ahorro + colchon)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

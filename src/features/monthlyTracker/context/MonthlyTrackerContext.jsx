import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import * as budgetsDb from '../services/budgets';
import * as fixedExpensesDb from '../services/fixedExpenses';
import * as variableExpensesDb from '../services/variableExpenses';
import * as depositsDb from '../services/deposits';
import * as withdrawalsDb from '../services/withdrawals';

const MonthlyTrackerContext = createContext();

export function useMonthlyTracker() {
  return useContext(MonthlyTrackerContext);
}

const MONTHS_LONG = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTHS_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const DEFAULT_FIXED_EXPENSES = [
  { label: 'Entrenador', amount: 250000 },
  { label: 'Gym', amount: 99000 },
  { label: 'Plan de datos', amount: 53000 },
  { label: 'Netflix', amount: 30000 },
  { label: 'Google Photos', amount: 8900 },
  { label: 'Open Code', amount: 43000 },
];

const DEFAULT_VARIABLE_EXPENSES = [
  { label: 'Mercado', amount: 500000 },
  { label: 'Salidas / gustos', amount: 300000 },
];

function createDefaultBudget(year, month) {
  return {
    year,
    month,
    salary_eur: 600,
    wise_fee_eur: 15.28,
    exchange_rate: 3709.55,
    savings_pct: 20,
    cushion_pct: 20,
    saved: false,
    income_mode: 'wise',
    manual_income_cop: 0,
    gastosVar: DEFAULT_VARIABLE_EXPENSES.map((g, idx) => ({
      ...g,
      sort_order: idx,
    })),
  };
}

export function MonthlyTrackerProvider({ children }) {
  const { userId, isAuthenticated } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!userId || !isAuthenticated) {
      setBudgets([]);
      setFixedExpenses([]);
      setDeposits([]);
      setWithdrawals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let [budgetsData, fixedData, variablesData, depositsData, withdrawalsData] = await Promise.all([
        budgetsDb.getBudgets(userId),
        fixedExpensesDb.getFixedExpenses(userId),
        variableExpensesDb.getVariableExpenses(userId, null).catch(() => []),
        depositsDb.getDeposits(userId).catch(() => []),
        withdrawalsDb.getWithdrawals(userId, null).catch(() => []),
      ]);

      // Create default fixed expenses if none exist
      if (!fixedData || fixedData.length === 0) {
        fixedData = await Promise.all(
          DEFAULT_FIXED_EXPENSES.map((item, idx) =>
            fixedExpensesDb.createFixedExpense(userId, { ...item, sort_order: idx })
          )
        );
      }

      // Create default budget for current month if none exist
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const hasCurrentMonth = budgetsData.some(
        (b) => b.year === currentYear && b.month === currentMonth
      );

      if (!hasCurrentMonth) {
        const newBudget = createDefaultBudget(currentYear, currentMonth);
        const createdBudget = await budgetsDb.createBudget(userId, {
          year: newBudget.year,
          month: newBudget.month,
          salary_eur: newBudget.salary_eur,
          wise_fee_eur: newBudget.wise_fee_eur,
          exchange_rate: newBudget.exchange_rate,
          savings_pct: newBudget.savings_pct,
          cushion_pct: newBudget.cushion_pct,
          saved: newBudget.saved,
          income_mode: newBudget.income_mode,
          manual_income_cop: newBudget.manual_income_cop,
        });

        // Create default variable expenses for the new budget
        const newVariables = await Promise.all(
          newBudget.gastosVar.map((g, idx) =>
            variableExpensesDb.createVariableExpense(userId, createdBudget.id, {
              label: g.label,
              amount: g.amount,
              sort_order: idx,
            })
          )
        );

        variablesData = [...variablesData, ...newVariables];
        budgetsData = [...budgetsData, createdBudget];
      }

      // Merge variable expenses and withdrawals into their budgets
      const budgetsWithData = budgetsData.map((budget) => ({
        ...budget,
        gastosVar: variablesData
          .filter((v) => v.monthly_budget_id === budget.id)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
        withdrawals: withdrawalsData
          .filter((w) => w.monthly_budget_id === budget.id)
          .sort((a, b) => new Date(a.withdrawal_date || a.created_at) - new Date(b.withdrawal_date || b.created_at)),
      }));

      // Sort by date
      budgetsWithData.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      setFixedExpenses(fixedData || []);
      setBudgets(budgetsWithData);
      setDeposits(depositsData || []);
      setWithdrawals(withdrawalsData || []);

      // Set current index to the most recent month
      const lastIndex = budgetsWithData.length - 1;
      setCurrentIndex(lastIndex >= 0 ? lastIndex : 0);
    } catch (error) {
      console.error('Error loading monthly tracker data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentBudget = budgets[currentIndex];

  // Wise balance: total deposits - total withdrawn (amount already includes fee)
  const wiseBalance = useMemo(() => {
    const totalDeposited = deposits.reduce((s, d) => s + (parseFloat(d.amount_eur) || 0), 0);
    const totalWithdrawn = withdrawals.reduce((s, w) => s + (parseFloat(w.amount_eur) || 0), 0);
    return +(totalDeposited - totalWithdrawn).toFixed(2);
  }, [deposits, withdrawals]);

  // Withdrawals for current month
  const currentWithdrawals = useMemo(() => {
    if (!currentBudget) return [];
    return (currentBudget.withdrawals || []);
  }, [currentBudget]);

  const calculations = useMemo(() => {
    if (!currentBudget) {
      return {
        cop: 0, ahorro: 0, colchon: 0, fixedTotal: 0, varTotal: 0,
        gastos: 0, disponible: 0, netEur: 0, pctComision: '0.00',
        wiseCop: 0, manualCop: 0, hasWithdrawals: false,
      };
    }

    const m = currentBudget;
    const eurSalary = parseFloat(m.salary_eur) || 0;
    const comision = parseFloat(m.wise_fee_eur) || 0;
    const tasa = parseFloat(m.exchange_rate) || 0;
    const netEur = +(eurSalary - comision).toFixed(2);
    const legacyWiseCop = Math.round(netEur * tasa);
    const manualCop = Math.round(parseFloat(m.manual_income_cop) || 0);

    // If has withdrawals, Wise COP = sum of cop_received; else legacy calculation
    const monthWithdrawals = m.withdrawals || [];
    const hasWithdrawals = monthWithdrawals.length > 0;
    const withdrawalsCop = monthWithdrawals.reduce((s, w) => s + (parseFloat(w.cop_received) || 0), 0);

    const wiseCop = hasWithdrawals ? withdrawalsCop : (eurSalary > 0 ? legacyWiseCop : 0);

    // Total COP = Wise + Manual (both can contribute)
    const cop = wiseCop + manualCop;

    const ahorro = Math.round(cop * (m.savings_pct || 0) / 100);
    const colchon = Math.round(cop * (m.cushion_pct || 0) / 100);
    const fixedTotal = fixedExpenses.filter((g) => (g.status || 0) === 1).reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);
    const varTotal = (m.gastosVar || []).filter((g) => (g.status || 0) === 1).reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);
    const gastos = fixedTotal + varTotal;
    const disponible = cop - ahorro - colchon - gastos;
    const pctComision = (eurSalary > 0 && !hasWithdrawals) ? ((comision / eurSalary) * 100).toFixed(2) : '0.00';

    return { cop, ahorro, colchon, fixedTotal, varTotal, gastos, disponible, netEur, pctComision, wiseCop, manualCop, hasWithdrawals };
  }, [currentBudget, fixedExpenses]);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(Math.round(val || 0));

  const formatEur = (val) => '€' + parseFloat(val || 0).toFixed(2);

  const formatCurrencyDec = (val) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(val || 0);

  const updateBudgetField = useCallback(async (field, value) => {
    if (!userId || !currentBudget) return;
    const budgetId = currentBudget.id;
    try {
      setBudgets((prev) => prev.map((b) => (b.id === budgetId ? { ...b, [field]: value } : b)));
      await budgetsDb.updateBudget(budgetId, userId, { [field]: value });
    } catch (error) {
      console.error('Error updating budget field:', error);
    }
  }, [userId, currentBudget]);

  const updateFixedExpense = useCallback(async (id, field, value) => {
    if (!userId) return;
    try {
      const parsedValue = field === 'amount' ? parseFloat(value) || 0 : value;
      setFixedExpenses((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: parsedValue } : item)));
      await fixedExpensesDb.updateFixedExpense(id, userId, { [field]: parsedValue });
    } catch (error) {
      console.error('Error updating fixed expense:', error);
    }
  }, [userId]);

  const addFixedExpense = useCallback(async () => {
    if (!userId) return;
    try {
      const newItem = await fixedExpensesDb.createFixedExpense(userId, { label: 'Nuevo gasto', amount: 0, sort_order: fixedExpenses.length });
      setFixedExpenses((prev) => [...prev, newItem]);
    } catch (error) {
      console.error('Error adding fixed expense:', error);
    }
  }, [userId, fixedExpenses.length]);

  const deleteFixedExpense = useCallback(async (id) => {
    if (!userId) return;
    try {
      await fixedExpensesDb.deleteFixedExpense(id, userId);
      setFixedExpenses((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error deleting fixed expense:', error);
    }
  }, [userId]);

  const toggleFixedExpenseStatus = useCallback(async (id) => {
    if (!userId) return;
    const item = fixedExpenses.find((e) => e.id === id);
    if (!item) return;
    const nextStatus = ((item.status || 0) + 1) % 3;
    try {
      setFixedExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, status: nextStatus } : e)));
      await fixedExpensesDb.updateFixedExpense(id, userId, { status: nextStatus });
    } catch (error) {
      console.error('Error toggling fixed expense status:', error);
    }
  }, [userId, fixedExpenses]);

  const updateVariableExpense = useCallback(async (id, field, value) => {
    if (!userId || !currentBudget) return;
    const budgetId = currentBudget.id;
    const parsedValue = field === 'amount' ? parseFloat(value) || 0 : value;
    try {
      setBudgets((prev) => prev.map((b) => {
        if (b.id !== budgetId) return b;
        return { ...b, gastosVar: b.gastosVar.map((g) => g.id === id ? { ...g, [field]: parsedValue } : g) };
      }));
      await variableExpensesDb.updateVariableExpense(id, userId, { [field]: parsedValue });
    } catch (error) {
      console.error('Error updating variable expense:', error);
    }
  }, [userId, currentBudget]);

  const addVariableExpense = useCallback(async () => {
    if (!userId || !currentBudget) return;
    const budgetId = currentBudget.id;
    try {
      const newItem = await variableExpensesDb.createVariableExpense(userId, budgetId, { label: 'Nuevo gasto', amount: 0, sort_order: currentBudget.gastosVar?.length || 0 });
      setBudgets((prev) => prev.map((b) => b.id === budgetId ? { ...b, gastosVar: [...(b.gastosVar || []), newItem] } : b));
    } catch (error) {
      console.error('Error adding variable expense:', error);
    }
  }, [userId, currentBudget]);

  const deleteVariableExpense = useCallback(async (id) => {
    if (!userId || !currentBudget) return;
    const budgetId = currentBudget.id;
    try {
      await variableExpensesDb.deleteVariableExpense(id, userId);
      setBudgets((prev) => prev.map((b) => b.id === budgetId ? { ...b, gastosVar: b.gastosVar.filter((g) => g.id !== id) } : b));
    } catch (error) {
      console.error('Error deleting variable expense:', error);
    }
  }, [userId, currentBudget]);

  const toggleVariableExpenseStatus = useCallback(async (id) => {
    if (!userId || !currentBudget) return;
    const items = currentBudget.gastosVar || [];
    const item = items.find((e) => e.id === id);
    if (!item) return;
    const nextStatus = ((item.status || 0) + 1) % 3;
    const budgetId = currentBudget.id;
    try {
      setBudgets((prev) => prev.map((b) => b.id === budgetId ? {
        ...b,
        gastosVar: b.gastosVar.map((g) => g.id === id ? { ...g, status: nextStatus } : g),
      } : b));
      await variableExpensesDb.updateVariableExpense(id, userId, { status: nextStatus });
    } catch (error) {
      console.error('Error toggling variable expense status:', error);
    }
  }, [userId, currentBudget]);

  // ====== Deposits ======
  const addDeposit = useCallback(async (amountEur, depositDate) => {
    if (!userId) return;
    try {
      const newItem = await depositsDb.createDeposit(userId, {
        amount_eur: amountEur,
        deposit_date: depositDate || new Date().toISOString().slice(0, 10),
      });
      setDeposits((prev) => [...prev, newItem]);
    } catch (error) {
      console.error('Error adding deposit:', error);
    }
  }, [userId]);

  const updateDeposit = useCallback(async (id, updates) => {
    if (!userId) return;
    try {
      setDeposits((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
      await depositsDb.updateDeposit(id, userId, updates);
    } catch (error) {
      console.error('Error updating deposit:', error);
    }
  }, [userId]);

  const deleteDeposit = useCallback(async (id) => {
    if (!userId) return;
    try {
      await depositsDb.deleteDeposit(id, userId);
      setDeposits((prev) => prev.filter((d) => d.id !== id));
    } catch (error) {
      console.error('Error deleting deposit:', error);
    }
  }, [userId]);

  // ====== Withdrawals ======
  const addWithdrawal = useCallback(async (amountEur, exchangeRate, feeEur, withdrawalDate) => {
    if (!userId || !currentBudget) return;
    const budgetId = currentBudget.id;
    const netEur = (parseFloat(amountEur) || 0) - (parseFloat(feeEur) || 0);
    const copReceived = parseFloat((netEur * (parseFloat(exchangeRate) || 0)).toFixed(2));
    try {
      const newItem = await withdrawalsDb.createWithdrawal(userId, budgetId, {
        amount_eur: amountEur,
        exchange_rate: exchangeRate,
        fee_eur: feeEur,
        cop_received: copReceived,
        withdrawal_date: withdrawalDate || new Date().toISOString().slice(0, 10),
      });
      setWithdrawals((prev) => [...prev, newItem]);
      setBudgets((prev) => prev.map((b) =>
        b.id === budgetId ? { ...b, withdrawals: [...(b.withdrawals || []), newItem] } : b
      ));
    } catch (error) {
      console.error('Error adding withdrawal:', error);
    }
  }, [userId, currentBudget]);

  const updateWithdrawal = useCallback(async (id, updates) => {
    if (!userId) return;
    try {
      let processedUpdates = { ...updates };
      if (updates.amount_eur !== undefined || updates.exchange_rate !== undefined || updates.fee_eur !== undefined) {
        setBudgets((prev) => {
          const budget = prev.find((b) => (b.withdrawals || []).some((w) => w.id === id));
          if (budget) {
            const w = budget.withdrawals.find((w) => w.id === id);
            const newAmount = updates.amount_eur !== undefined ? parseFloat(updates.amount_eur) : parseFloat(w.amount_eur);
            const newRate = updates.exchange_rate !== undefined ? parseFloat(updates.exchange_rate) : parseFloat(w.exchange_rate);
            const newFee = updates.fee_eur !== undefined ? parseFloat(updates.fee_eur) : parseFloat(w.fee_eur);
            const netEur = newAmount - newFee;
            processedUpdates.cop_received = parseFloat((netEur * newRate).toFixed(2));
          }
          return prev;
        });
      }
      setWithdrawals((prev) => prev.map((w) => (w.id === id ? { ...w, ...processedUpdates } : w)));
      setBudgets((prev) => prev.map((b) =>
        b.id === (currentBudget?.id) ? { ...b, withdrawals: (b.withdrawals || []).map((w) => w.id === id ? { ...w, ...processedUpdates } : w) } : b
      ));
      await withdrawalsDb.updateWithdrawal(id, userId, processedUpdates);
    } catch (error) {
      console.error('Error updating withdrawal:', error);
    }
  }, [userId, currentBudget]);

  const deleteWithdrawal = useCallback(async (id) => {
    if (!userId) return;
    try {
      await withdrawalsDb.deleteWithdrawal(id, userId);
      setWithdrawals((prev) => prev.filter((w) => w.id !== id));
      setBudgets((prev) => prev.map((b) =>
        b.id === (currentBudget?.id) ? { ...b, withdrawals: (b.withdrawals || []).filter((w) => w.id !== id) } : b
      ));
    } catch (error) {
      console.error('Error deleting withdrawal:', error);
    }
  }, [userId, currentBudget]);

  const copyFromPreviousMonth = useCallback(async () => {
    if (!userId || !currentBudget || budgets.length < 1) return;

    const curMonth = Number(currentBudget.month);
    const curYear = Number(currentBudget.year);
    let prevMonth = curMonth - 1;
    let prevYear = curYear;
    if (prevMonth < 0) { prevMonth = 11; prevYear = curYear - 1; }

    const prev = budgets.find(
      (b) => Number(b.year) === prevYear && Number(b.month) === prevMonth
    );
    if (!prev) return;

    try {
      // 1. Copy budget fields (income settings)
      const budgetFields = {
        salary_eur: prev.salary_eur,
        wise_fee_eur: prev.wise_fee_eur,
        exchange_rate: prev.exchange_rate,
        savings_pct: prev.savings_pct,
        cushion_pct: prev.cushion_pct,
        income_mode: prev.income_mode,
        manual_income_cop: prev.manual_income_cop,
      };
      await budgetsDb.updateBudget(currentBudget.id, userId, budgetFields);

      // 2. Replace variable expenses with previous month's
      const currentVar = currentBudget.gastosVar || [];
      for (const g of currentVar) {
        if (g.id) {
          await variableExpensesDb.deleteVariableExpense(g.id, userId);
        }
      }
      const prevVar = prev.gastosVar || [];
      const newVariables = await Promise.all(
        prevVar.map((g, idx) =>
          variableExpensesDb.createVariableExpense(userId, currentBudget.id, {
            label: g.label,
            amount: g.amount,
            sort_order: idx,
          })
        )
      );

      // 3. Reset fixed expenses status to 0
      for (const fe of fixedExpenses) {
        if (fe.id) {
          await fixedExpensesDb.updateFixedExpense(fe.id, userId, { status: 0 });
        }
      }

      // Update state
      setBudgets((prevBudgets) =>
        prevBudgets.map((b) => {
          if (b.id === currentBudget.id) {
            return { ...b, ...budgetFields, gastosVar: newVariables };
          }
          return b;
        })
      );
      setFixedExpenses((prevFes) => prevFes.map((fe) => ({ ...fe, status: 0 })));
    } catch (error) {
      console.error('Error copying from previous month:', error);
    }
  }, [userId, currentBudget, budgets, fixedExpenses]);

  const saveCurrentMonth = useCallback(async () => {
    if (!userId || !currentBudget) return;
    try {
      await budgetsDb.updateBudget(currentBudget.id, userId, { saved: true });
      setBudgets((prev) => prev.map((b) => (b.id === currentBudget.id ? { ...b, saved: true } : b)));
    } catch (error) {
      console.error('Error saving month:', error);
    }
  }, [userId, currentBudget]);

  const createNextMonth = useCallback(async () => {
    if (!userId || budgets.length === 0) return;
    const last = budgets[budgets.length - 1];
    let nextMonth = last.month + 1;
    let nextYear = last.year;
    if (nextMonth > 11) { nextMonth = 0; nextYear += 1; }

    const existingIndex = budgets.findIndex((b) => b.year === nextYear && b.month === nextMonth);
    if (existingIndex >= 0) { setCurrentIndex(existingIndex); return; }

    try {
      const createdBudget = await budgetsDb.createBudget(userId, {
        year: nextYear, month: nextMonth,
        salary_eur: last.salary_eur, wise_fee_eur: last.wise_fee_eur,
        exchange_rate: last.exchange_rate, savings_pct: last.savings_pct,
        cushion_pct: last.cushion_pct, saved: false,
        income_mode: last.income_mode || 'wise', manual_income_cop: last.manual_income_cop || 0,
      });

      const newVariables = await Promise.all(
        (last.gastosVar || []).map((g, idx) =>
          variableExpensesDb.createVariableExpense(userId, createdBudget.id, { label: g.label, amount: g.amount, sort_order: idx })
        )
      );

      const budgetWithVariables = { ...createdBudget, gastosVar: newVariables, withdrawals: [] };
      setBudgets((prev) => [...prev, budgetWithVariables]);
      setCurrentIndex(budgets.length);
    } catch (error) {
      console.error('Error creating next month:', error);
    }
  }, [userId, budgets]);

  const savedBudgets = useMemo(() => budgets.filter((b) => b.saved), [budgets]);

  const accumulated = useMemo(() => {
    return savedBudgets.reduce((acc, m) => {
      const eurSalary = parseFloat(m.salary_eur) || 0;
      const comision = parseFloat(m.wise_fee_eur) || 0;
      const tasa = parseFloat(m.exchange_rate) || 0;
      const netEur = eurSalary - comision;
      const monthWithdrawals = m.withdrawals || [];
      const withdrawalsCop = monthWithdrawals.reduce((s, w) => s + (parseFloat(w.cop_received) || 0), 0);
      const wiseCop = monthWithdrawals.length > 0 ? withdrawalsCop : Math.round(netEur * tasa);
      const manualCop = Math.round(parseFloat(m.manual_income_cop) || 0);
      const cop = wiseCop + manualCop;
      acc.ahorro += Math.round(cop * (m.savings_pct || 0) / 100);
      acc.colchon += Math.round(cop * (m.cushion_pct || 0) / 100);
      return acc;
    }, { ahorro: 0, colchon: 0 });
  }, [savedBudgets]);

  const value = {
    budgets, currentBudget, currentIndex, setCurrentIndex,
    fixedExpenses, deposits, withdrawals, wiseBalance, currentWithdrawals,
    loading, calculations, formatCurrency, formatCurrencyDec, formatEur, MONTHS_LONG, MONTHS_SHORT,
    updateBudgetField,
    updateFixedExpense, addFixedExpense, deleteFixedExpense, toggleFixedExpenseStatus,
    updateVariableExpense, addVariableExpense, deleteVariableExpense, toggleVariableExpenseStatus,
    addDeposit, updateDeposit, deleteDeposit,
    addWithdrawal, updateWithdrawal, deleteWithdrawal,
    saveCurrentMonth, createNextMonth, copyFromPreviousMonth, savedBudgets, accumulated, reload: loadData,
  };

  return (
    <MonthlyTrackerContext.Provider value={value}>
      {children}
    </MonthlyTrackerContext.Provider>
  );
}

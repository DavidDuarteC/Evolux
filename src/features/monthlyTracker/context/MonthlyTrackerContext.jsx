import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import * as budgetsDb from '../services/budgets';
import * as fixedExpensesDb from '../services/fixedExpenses';
import * as variableExpensesDb from '../services/variableExpenses';
import * as depositsDb from '../services/deposits';
import * as incomesDb from '../services/incomes';

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!userId || !isAuthenticated) {
      setBudgets([]);
      setFixedExpenses([]);
      setDeposits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let [budgetsData, fixedData, variablesData, depositsData, incomesData] = await Promise.all([
        budgetsDb.getBudgets(userId),
        fixedExpensesDb.getFixedExpenses(userId),
        variableExpensesDb.getVariableExpenses(userId, null).catch(() => []),
        depositsDb.getDeposits(userId).catch(() => []),
        incomesDb.getIncomes(null, userId).catch(() => []),
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

        // Create default incomes for the new budget
        const defaultIncomes = await Promise.all([
          incomesDb.createIncome(userId, createdBudget.id, {
            label: 'Ingreso principal', currency: 'COP', amount: '0', sort_order: 0,
          }),
          incomesDb.createIncome(userId, createdBudget.id, {
            label: 'Wise EUR', currency: 'EUR', amount: '600', fee: '15.28', rate: '3709.55', sort_order: 1,
          }),
        ]);
        incomesData = [...incomesData, ...defaultIncomes];
      }

      // Merge variable expenses and incomes into their budgets
      const budgetsWithData = budgetsData.map((budget) => ({
        ...budget,
        gastosVar: variablesData
          .filter((v) => v.monthly_budget_id === budget.id)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
        incomes: incomesData
          .filter((i) => i.budget_id === budget.id)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
      }));

      // Sort by date
      budgetsWithData.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      setFixedExpenses(fixedData || []);
      setBudgets(budgetsWithData);
      setDeposits(depositsData || []);

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

  // Wise balance: total deposits - EUR withdrawn from incomes
  const wiseBalance = useMemo(() => {
    if (!currentBudget) return 0;
    const totalDeposited = deposits.reduce((s, d) => s + (parseFloat(d.amount_eur) || 0), 0);
    const eurIncomes = (currentBudget.incomes || []).filter((i) => i.currency === 'EUR' && (i.status || 0) === 1);
    const totalWithdrawn = eurIncomes.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    return +(totalDeposited - totalWithdrawn).toFixed(2);
  }, [deposits, currentBudget]);

  const calculations = useMemo(() => {
    if (!currentBudget) {
      return {
        cop: 0, ahorro: 0, colchon: 0, fixedTotal: 0, varTotal: 0,
        gastos: 0, disponible: 0, netEur: 0, pctComision: '0.00',
      };
    }

    const m = currentBudget;
    const budgetIncomes = m.incomes || [];

    // Sum all incomes (COP directly, EUR/USD converted)
    const totalCOP = budgetIncomes
      .filter((i) => (i.status || 0) === 1)
      .reduce((sum, i) => {
        const amt = parseFloat(i.amount) || 0;
        if (i.currency === 'COP') return sum + amt;
        const net = amt - (parseFloat(i.fee) || 0);
        return sum + Math.round(net * (parseFloat(i.rate) || 0));
      }, 0);

    const cop = totalCOP;

    const ahorro = Math.round(cop * (m.savings_pct || 0) / 100);
    const colchon = Math.round(cop * (m.cushion_pct || 0) / 100);
    const fixedTotal = fixedExpenses.filter((g) => (g.status || 0) === 1).reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);
    const varTotal = (m.gastosVar || []).filter((g) => (g.status || 0) === 1).reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);
    const gastos = fixedTotal + varTotal;
    const disponible = cop - ahorro - colchon - gastos;

    // Legacy fields for backward compatibility
    const wiseIncome = budgetIncomes.find((i) => i.currency === 'EUR');
    const usdIncome = budgetIncomes.find((i) => i.currency === 'USD');
    const copIncome = budgetIncomes.find((i) => i.currency === 'COP');

    return {
      cop, ahorro, colchon, fixedTotal, varTotal, gastos, disponible,
      netEur: 0, pctComision: '0.00',
      incomes: budgetIncomes,
      wiseCop: wiseIncome
        ? Math.round(((parseFloat(wiseIncome.amount) || 0) - (parseFloat(wiseIncome.fee) || 0)) * (parseFloat(wiseIncome.rate) || 0))
        : 0,
      manualCop: copIncome ? Math.round(parseFloat(copIncome.amount) || 0) : 0,
      usdCop: usdIncome
        ? Math.round(((parseFloat(usdIncome.amount) || 0) - (parseFloat(usdIncome.fee) || 0)) * (parseFloat(usdIncome.rate) || 0))
        : 0,
    };
  }, [currentBudget, fixedExpenses]);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(Math.round(val || 0));

  const formatEur = (val) => '€' + parseFloat(val || 0).toFixed(2);

  const formatUsd = (val) => 'US$' + parseFloat(val || 0).toFixed(2);

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

  // ====== Incomes ======
  const addIncome = useCallback(async (data) => {
    if (!userId || !currentBudget) return;
    const budgetId = currentBudget.id;
    const sort_order = (currentBudget.incomes || []).length;
    try {
      const newItem = await incomesDb.createIncome(userId, budgetId, { ...data, sort_order });
      setBudgets((prev) => prev.map((b) =>
        b.id === budgetId ? { ...b, incomes: [...(b.incomes || []), newItem] } : b
      ));
      return newItem;
    } catch (error) {
      console.error('Error adding income:', error);
    }
  }, [userId, currentBudget]);

  const updateIncome = useCallback(async (id, updates) => {
    if (!userId) return;
    try {
      await incomesDb.updateIncome(id, userId, updates);
      setBudgets((prev) => prev.map((b) => ({
        ...b,
        incomes: (b.incomes || []).map((i) => i.id === id ? { ...i, ...updates } : i),
      })));
    } catch (error) {
      console.error('Error updating income:', error);
    }
  }, [userId]);

  const deleteIncome = useCallback(async (id) => {
    if (!userId) return;
    try {
      await incomesDb.deleteIncome(id, userId);
      setBudgets((prev) => prev.map((b) => ({
        ...b,
        incomes: (b.incomes || []).filter((i) => i.id !== id),
      })));
    } catch (error) {
      console.error('Error deleting income:', error);
    }
  }, [userId]);

  const toggleIncomeStatus = useCallback(async (id) => {
    if (!userId || !currentBudget) return;
    const items = currentBudget.incomes || [];
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const nextStatus = ((item.status || 0) + 1) % 3;
    try {
      await incomesDb.updateIncome(id, userId, { status: nextStatus });
      setBudgets((prev) => prev.map((b) => ({
        ...b,
        incomes: (b.incomes || []).map((i) => i.id === id ? { ...i, status: nextStatus } : i),
      })));
    } catch (error) {
      console.error('Error toggling income status:', error);
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
        usd_amount: prev.usd_amount || '0',
        usd_rate: prev.usd_rate || '0',
        usd_fee: prev.usd_fee || '0',
        usd_cop: prev.usd_cop || '0',
      };
      await budgetsDb.updateBudget(currentBudget.id, userId, budgetFields);

      // 2. Copy incomes from previous month
      const prevIncomes = prev.incomes || [];
      for (const inc of currentBudget.incomes || []) {
        if (inc.id) {
          await incomesDb.deleteIncome(inc.id, userId);
        }
      }
      const newIncomes = await Promise.all(
        prevIncomes.map((inc, idx) =>
          incomesDb.createIncome(userId, currentBudget.id, {
            label: inc.label,
            currency: inc.currency,
            amount: inc.amount,
            fee: inc.fee || '0',
            rate: inc.rate || '0',
            status: 0,
            sort_order: idx,
          })
        )
      );

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
            return { ...b, ...budgetFields, gastosVar: newVariables, incomes: newIncomes };
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
        usd_amount: last.usd_amount || '0', usd_rate: last.usd_rate || '0',
        usd_fee: last.usd_fee || '0', usd_cop: last.usd_cop || '0',
      });

      const newVariables = await Promise.all(
        (last.gastosVar || []).map((g, idx) =>
          variableExpensesDb.createVariableExpense(userId, createdBudget.id, { label: g.label, amount: g.amount, sort_order: idx })
        )
      );

      const newIncomes = await Promise.all([
        incomesDb.createIncome(userId, createdBudget.id, {
          label: 'Ingreso principal', currency: 'COP', amount: '0', sort_order: 0,
        }),
        incomesDb.createIncome(userId, createdBudget.id, {
          label: 'Wise EUR', currency: 'EUR', amount: '600', fee: '15.28', rate: '3709.55', sort_order: 1,
        }),
      ]);

      const budgetWithIncomes = {
        ...createdBudget,
        gastosVar: newVariables,
        withdrawals: [],
        incomes: newIncomes,
      };
      setBudgets((prev) => [...prev, budgetWithIncomes]);
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
    fixedExpenses, deposits, wiseBalance,
    loading, calculations, formatCurrency, formatCurrencyDec, formatEur, formatUsd, MONTHS_LONG, MONTHS_SHORT,
    updateBudgetField,
    updateFixedExpense, addFixedExpense, deleteFixedExpense, toggleFixedExpenseStatus,
    updateVariableExpense, addVariableExpense, deleteVariableExpense, toggleVariableExpenseStatus,
    addIncome, updateIncome, deleteIncome, toggleIncomeStatus,
    addDeposit, updateDeposit, deleteDeposit,
    saveCurrentMonth, createNextMonth, copyFromPreviousMonth, savedBudgets, accumulated, reload: loadData,
  };

  return (
    <MonthlyTrackerContext.Provider value={value}>
      {children}
    </MonthlyTrackerContext.Provider>
  );
}

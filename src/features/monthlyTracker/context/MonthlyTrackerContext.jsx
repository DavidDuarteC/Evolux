import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from 'sonner';
import * as budgetsDb from '../services/budgets';
import * as fixedExpensesDb from '../services/fixedExpenses';
import * as variableExpensesDb from '../services/variableExpenses';
import * as depositsDb from '../services/deposits';
import * as incomesDb from '../services/incomes';

import { MONTHS_LONG, MONTHS_SHORT } from '../../../shared/lib/constants';

const MonthlyTrackerContext = createContext();

export function useMonthlyTracker() {
  return useContext(MonthlyTrackerContext);
}

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

    // Timeout: force loading=false if Supabase doesn't respond within 15s
    let loadTimedOut = false;
    const loadTimeoutId = setTimeout(() => {
      loadTimedOut = true;
      console.warn('Monthly tracker load timeout - forcing loading to false');
      setLoading(false);
    }, 10000);

    try {
      let [budgetsData, fixedData, variablesData, depositsData, incomesData] = await Promise.all([
        budgetsDb.getBudgets(userId),
        fixedExpensesDb.getFixedExpenses(userId),
        variableExpensesDb.getVariableExpenses(userId, null).catch(() => []),
        depositsDb.getDeposits(userId).catch(() => []),
        incomesDb.getIncomes(null, userId).catch(() => []),
      ]);

      if (loadTimedOut) return;

      clearTimeout(loadTimeoutId);

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

        // Create default fixed expenses for the new budget
        const defaultFixed = await Promise.all(
          DEFAULT_FIXED_EXPENSES.map((item, idx) =>
            fixedExpensesDb.createFixedExpense(userId, { ...item, sort_order: idx, budget_id: createdBudget.id })
          )
        );
        fixedData = [...(fixedData || []), ...defaultFixed];
      }

      // ═══ Migration: create incomes from old budget fields ═══
      for (const budget of budgetsData) {
        const budgetIncomes = incomesData.filter((i) => i.budget_id === budget.id);
        const hasCurrency = (cur) => budgetIncomes.some((i) => i.currency === cur);

        const newIncomes = [];

        // Manual COP
        if (!hasCurrency('COP')) {
          const manualCop = parseFloat(budget.manual_income_cop) || 0;
          if (manualCop > 0) {
            const inc = await incomesDb.createIncome(userId, budget.id, {
              label: 'Ingreso manual', currency: 'COP', amount: String(manualCop), sort_order: 0,
            });
            newIncomes.push(inc);
          }
        }

        // USD
        if (!hasCurrency('USD')) {
          const usdAmt = parseFloat(budget.usd_amount) || 0;
          if (usdAmt > 0) {
            const inc = await incomesDb.createIncome(userId, budget.id, {
              label: 'USD', currency: 'USD', amount: String(usdAmt),
              fee: String(parseFloat(budget.usd_fee) || 0),
              rate: String(parseFloat(budget.usd_rate) || 0),
              sort_order: 1,
            });
            newIncomes.push(inc);
          }
        }

        // EUR (legacy salary - only if no EUR income exists yet)
        if (!hasCurrency('EUR')) {
          const eurSalary = parseFloat(budget.salary_eur) || 0;
          if (eurSalary > 0) {
            const inc = await incomesDb.createIncome(userId, budget.id, {
              label: 'Wise EUR', currency: 'EUR', amount: String(eurSalary),
              fee: String(parseFloat(budget.wise_fee_eur) || 0),
              rate: String(parseFloat(budget.exchange_rate) || 0),
              sort_order: 2,
            });
            newIncomes.push(inc);
          }
        }

        incomesData = [...incomesData, ...newIncomes];
      }
      // ═════════════════════════════════════════════════════════════

      // Fix any orphaned fixedExpenses missing budget_id by binding to their created_at budget
      for (const f of (fixedData || [])) {
        if (!f.budget_id && budgetsData.length > 0) {
          const createdAt = f.created_at ? new Date(f.created_at) : new Date();
          const targetBudget = budgetsData.find(
            (b) => b.year === createdAt.getFullYear() && b.month === createdAt.getMonth()
          ) || budgetsData[0];

          f.budget_id = targetBudget.id;
          fixedExpensesDb.updateFixedExpense(f.id, userId, { budget_id: targetBudget.id }).catch(() => {});
        }
      }

      // Merge variable expenses, incomes, and fixed expenses into their budgets
      const budgetsWithData = budgetsData.map((budget) => ({
        ...budget,
        gastosVar: variablesData
          .filter((v) => v.monthly_budget_id === budget.id)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
        incomes: incomesData
          .filter((i) => i.budget_id === budget.id)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
        fixedExpenses: fixedData
          .filter((f) => f.budget_id === budget.id)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
      }));

      // Sort by date
      budgetsWithData.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

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

  // Sync fixedExpenses with current budget's fixed expenses
  useEffect(() => {
    if (currentBudget?.fixedExpenses) {
      setFixedExpenses(currentBudget.fixedExpenses);
    } else {
      setFixedExpenses([]);
    }
  }, [currentBudget]);

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

    const paidIncomes = budgetIncomes.filter((i) => (i.status || 0) === 1);
    const activeIncomes = paidIncomes.length > 0 ? paidIncomes : budgetIncomes;

    // Sum incomes (COP directly, EUR/USD converted)
    const totalCOP = activeIncomes.reduce((sum, i) => {
      const amt = parseFloat(i.amount) || 0;
      if (i.currency === 'COP') return sum + amt;
      const net = amt - (parseFloat(i.fee) || 0);
      return sum + Math.round(net * (parseFloat(i.rate) || 0));
    }, 0);

    const cop = totalCOP;

    const ahorro = Math.round(cop * (m.savings_pct || 0) / 100);
    const colchon = Math.round(cop * (m.cushion_pct || 0) / 100);

    const paidFixed = fixedExpenses.filter((g) => (g.status || 0) === 1);
    const activeFixed = paidFixed.length > 0 ? paidFixed : fixedExpenses;
    const fixedTotal = activeFixed.reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);

    const paidVar = (m.gastosVar || []).filter((g) => (g.status || 0) === 1);
    const activeVar = paidVar.length > 0 ? paidVar : (m.gastosVar || []);
    const varTotal = activeVar.reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);

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
      // Also update in budgets array
      setBudgets((prev) => prev.map((b) => ({
        ...b,
        fixedExpenses: (b.fixedExpenses || []).map((f) => f.id === id ? { ...f, [field]: parsedValue } : f),
      })));
      await fixedExpensesDb.updateFixedExpense(id, userId, { [field]: parsedValue });
    } catch (error) {
      console.error('Error updating fixed expense:', error);
    }
  }, [userId]);

  const addFixedExpense = useCallback(async () => {
    if (!userId || !currentBudget) return;
    const budgetId = currentBudget.id;
    try {
      const newItem = await fixedExpensesDb.createFixedExpense(userId, {
        label: 'Nuevo gasto', amount: 0, sort_order: fixedExpenses.length, budget_id: budgetId,
      });
      setFixedExpenses((prev) => [...prev, newItem]);
      setBudgets((prev) => prev.map((b) =>
        b.id === budgetId ? { ...b, fixedExpenses: [...(b.fixedExpenses || []), newItem] } : b
      ));
    } catch (error) {
      console.error('Error adding fixed expense:', error);
    }
  }, [userId, currentBudget, fixedExpenses.length]);

  const deleteFixedExpense = useCallback(async (id) => {
    if (!userId) return;
    try {
      await fixedExpensesDb.deleteFixedExpense(id, userId);
      setFixedExpenses((prev) => prev.filter((item) => item.id !== id));
      setBudgets((prev) => prev.map((b) => ({
        ...b,
        fixedExpenses: (b.fixedExpenses || []).filter((f) => f.id !== id),
      })));
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
      setBudgets((prev) => prev.map((b) => ({
        ...b,
        fixedExpenses: (b.fixedExpenses || []).map((f) => f.id === id ? { ...f, status: nextStatus } : f),
      })));
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

  const moveFixedExpense = useCallback(async (id, direction) => {
    const idx = fixedExpenses.findIndex((item) => item.id === id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= fixedExpenses.length) return;

    const newOrder = [...fixedExpenses];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    const updated = newOrder.map((item, index) => ({ ...item, sort_order: index }));

    setFixedExpenses(updated);
    if (currentBudget) {
      const budgetId = currentBudget.id;
      setBudgets((prev) => prev.map((b) => (b.id === budgetId ? { ...b, fixedExpenses: updated } : b)));
    }

    try {
      await Promise.all([
        fixedExpensesDb.updateFixedExpense(updated[idx].id, userId, { sort_order: idx }),
        fixedExpensesDb.updateFixedExpense(updated[swapIdx].id, userId, { sort_order: swapIdx }),
      ]);
    } catch (err) {
      console.error('Error moving fixed expense:', err);
    }
  }, [userId, fixedExpenses, currentBudget]);

  const moveVariableExpense = useCallback(async (id, direction) => {
    if (!currentBudget) return;
    const varItems = currentBudget.gastosVar || [];
    const idx = varItems.findIndex((item) => item.id === id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= varItems.length) return;

    const newOrder = [...varItems];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    const updated = newOrder.map((item, index) => ({ ...item, sort_order: index }));

    const budgetId = currentBudget.id;
    setBudgets((prev) => prev.map((b) => (b.id === budgetId ? { ...b, gastosVar: updated } : b)));

    try {
      await Promise.all([
        variableExpensesDb.updateVariableExpense(updated[idx].id, userId, { sort_order: idx }),
        variableExpensesDb.updateVariableExpense(updated[swapIdx].id, userId, { sort_order: swapIdx }),
      ]);
    } catch (err) {
      console.error('Error moving variable expense:', err);
    }
  }, [userId, currentBudget]);

  const moveIncome = useCallback(async (id, direction) => {
    if (!currentBudget) return;
    const incomes = currentBudget.incomes || [];
    const idx = incomes.findIndex((item) => item.id === id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= incomes.length) return;

    const newOrder = [...incomes];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    const updated = newOrder.map((item, index) => ({ ...item, sort_order: index }));

    const budgetId = currentBudget.id;
    setBudgets((prev) => prev.map((b) => (b.id === budgetId ? { ...b, incomes: updated } : b)));

    try {
      await Promise.all([
        incomesDb.updateIncome(updated[idx].id, userId, { sort_order: idx }),
        incomesDb.updateIncome(updated[swapIdx].id, userId, { sort_order: swapIdx }),
      ]);
    } catch (err) {
      console.error('Error moving income:', err);
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
    if (!prev) {
      toast.warning('No hay datos del mes anterior para copiar');
      return;
    }

    toast.success('Copiando datos del mes anterior...');

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

      // 2.5 Copy fixed expenses from previous month
      const currentFixed = currentBudget.fixedExpenses || [];
      for (const fe of currentFixed) {
        if (fe.id) {
          await fixedExpensesDb.deleteFixedExpense(fe.id, userId);
        }
      }
      const prevFixed = prev.fixedExpenses || [];
      const newFixed = await Promise.all(
        prevFixed.map((fe, idx) =>
          fixedExpensesDb.createFixedExpense(userId, {
            label: fe.label, amount: fe.amount, sort_order: idx, budget_id: currentBudget.id,
          })
        )
      );

      // 3. Replace variable expenses with previous month's
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
            const resetFixed = (b.fixedExpenses || []).map((fe) => ({ ...fe, status: 0 }));
            return { ...b, ...budgetFields, gastosVar: newVariables, incomes: newIncomes, fixedExpenses: resetFixed };
          }
          return b;
        })
      );
      setFixedExpenses((prevFes) => prevFes.map((fe) => ({ ...fe, status: 0 })));
      toast.success('Datos del mes anterior copiados correctamente');
    } catch (error) {
      console.error('Error copying from previous month:', error);
      toast.error('Error al copiar datos del mes anterior');
    }
  }, [userId, currentBudget, budgets, fixedExpenses]);

  // ====== Section Specific Copy / Clear ======
  const copyIncomesFromPreviousMonth = useCallback(async () => {
    if (!userId || !currentBudget || budgets.length < 1) return;
    const curMonth = Number(currentBudget.month);
    const curYear = Number(currentBudget.year);
    let prevMonth = curMonth - 1;
    let prevYear = curYear;
    if (prevMonth < 0) { prevMonth = 11; prevYear = curYear - 1; }

    const prev = budgets.find((b) => Number(b.year) === prevYear && Number(b.month) === prevMonth);
    if (!prev || !prev.incomes || prev.incomes.length === 0) {
      toast.warning('No hay ingresos del mes anterior para copiar');
      return;
    }

    try {
      const budgetId = currentBudget.id;
      for (const inc of currentBudget.incomes || []) {
        if (inc.id) await incomesDb.deleteIncome(inc.id, userId);
      }
      const newIncomes = await Promise.all(
        prev.incomes.map((inc, idx) =>
          incomesDb.createIncome(userId, budgetId, {
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
      setBudgets((prevBudgets) => prevBudgets.map((b) => b.id === budgetId ? { ...b, incomes: newIncomes } : b));
      toast.success('Ingresos copiados del mes anterior');
    } catch (err) {
      console.error('Error copying incomes:', err);
      toast.error('Error al copiar ingresos');
    }
  }, [userId, currentBudget, budgets]);

  const clearIncomes = useCallback(async () => {
    if (!userId || !currentBudget) return;
    try {
      const budgetId = currentBudget.id;
      for (const inc of currentBudget.incomes || []) {
        if (inc.id) await incomesDb.deleteIncome(inc.id, userId);
      }
      setBudgets((prevBudgets) => prevBudgets.map((b) => b.id === budgetId ? { ...b, incomes: [] } : b));
      toast.success('Ingresos limpiados');
    } catch (err) {
      console.error('Error clearing incomes:', err);
      toast.error('Error al limpiar ingresos');
    }
  }, [userId, currentBudget]);

  const copyFixedExpensesFromPreviousMonth = useCallback(async () => {
    if (!userId || !currentBudget || budgets.length < 1) return;
    const curMonth = Number(currentBudget.month);
    const curYear = Number(currentBudget.year);
    let prevMonth = curMonth - 1;
    let prevYear = curYear;
    if (prevMonth < 0) { prevMonth = 11; prevYear = curYear - 1; }

    const prev = budgets.find((b) => Number(b.year) === prevYear && Number(b.month) === prevMonth);
    if (!prev || !prev.fixedExpenses || prev.fixedExpenses.length === 0) {
      toast.warning('No hay gastos fijos del mes anterior para copiar');
      return;
    }

    try {
      const budgetId = currentBudget.id;
      for (const fe of currentBudget.fixedExpenses || []) {
        if (fe.id) await fixedExpensesDb.deleteFixedExpense(fe.id, userId);
      }
      const newFixed = await Promise.all(
        prev.fixedExpenses.map((fe, idx) =>
          fixedExpensesDb.createFixedExpense(userId, {
            label: fe.label,
            amount: fe.amount,
            sort_order: idx,
            budget_id: budgetId,
            status: 0,
            payment_date: fe.payment_date || fe.date || '',
          })
        )
      );
      setBudgets((prevBudgets) => prevBudgets.map((b) => b.id === budgetId ? { ...b, fixedExpenses: newFixed } : b));
      setFixedExpenses(newFixed);
      toast.success('Gastos fijos copiados del mes anterior');
    } catch (err) {
      console.error('Error copying fixed expenses:', err);
      toast.error('Error al copiar gastos fijos');
    }
  }, [userId, currentBudget, budgets]);

  const clearFixedExpenses = useCallback(async () => {
    if (!userId || !currentBudget) return;
    try {
      const budgetId = currentBudget.id;
      for (const fe of currentBudget.fixedExpenses || []) {
        if (fe.id) await fixedExpensesDb.deleteFixedExpense(fe.id, userId);
      }
      setBudgets((prevBudgets) => prevBudgets.map((b) => b.id === budgetId ? { ...b, fixedExpenses: [] } : b));
      setFixedExpenses([]);
      toast.success('Gastos fijos limpiados');
    } catch (err) {
      console.error('Error clearing fixed expenses:', err);
      toast.error('Error al limpiar gastos fijos');
    }
  }, [userId, currentBudget]);

  const copyVariableExpensesFromPreviousMonth = useCallback(async () => {
    if (!userId || !currentBudget || budgets.length < 1) return;
    const curMonth = Number(currentBudget.month);
    const curYear = Number(currentBudget.year);
    let prevMonth = curMonth - 1;
    let prevYear = curYear;
    if (prevMonth < 0) { prevMonth = 11; prevYear = curYear - 1; }

    const prev = budgets.find((b) => Number(b.year) === prevYear && Number(b.month) === prevMonth);
    if (!prev || !prev.gastosVar || prev.gastosVar.length === 0) {
      toast.warning('No hay gastos variables del mes anterior para copiar');
      return;
    }

    try {
      const budgetId = currentBudget.id;
      for (const g of currentBudget.gastosVar || []) {
        if (g.id) await variableExpensesDb.deleteVariableExpense(g.id, userId);
      }
      const newVar = await Promise.all(
        prev.gastosVar.map((g, idx) =>
          variableExpensesDb.createVariableExpense(userId, budgetId, {
            label: g.label,
            amount: g.amount,
            sort_order: idx,
            status: 0,
            date: g.date || '',
          })
        )
      );
      setBudgets((prevBudgets) => prevBudgets.map((b) => b.id === budgetId ? { ...b, gastosVar: newVar } : b));
      toast.success('Gastos variables copiados del mes anterior');
    } catch (err) {
      console.error('Error copying variable expenses:', err);
      toast.error('Error al copiar gastos variables');
    }
  }, [userId, currentBudget, budgets]);

  const clearVariableExpenses = useCallback(async () => {
    if (!userId || !currentBudget) return;
    try {
      const budgetId = currentBudget.id;
      for (const g of currentBudget.gastosVar || []) {
        if (g.id) await variableExpensesDb.deleteVariableExpense(g.id, userId);
      }
      setBudgets((prevBudgets) => prevBudgets.map((b) => b.id === budgetId ? { ...b, gastosVar: [] } : b));
      toast.success('Gastos variables limpiados');
    } catch (err) {
      console.error('Error clearing variable expenses:', err);
      toast.error('Error al limpiar gastos variables');
    }
  }, [userId, currentBudget]);

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

      const newIncomes = await Promise.all(
        (last.incomes || []).map((inc, idx) =>
          incomesDb.createIncome(userId, createdBudget.id, {
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

      // Fallback: create default incomes if previous month had none
      const finalIncomes = newIncomes.length > 0 ? newIncomes : await Promise.all([
        incomesDb.createIncome(userId, createdBudget.id, {
          label: 'Ingreso principal', currency: 'COP', amount: '0', sort_order: 0,
        }),
      ]);

      const budgetWithIncomes = {
        ...createdBudget,
        fixedExpenses: [],
        gastosVar: [],
        withdrawals: [],
        incomes: finalIncomes,
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
    updateFixedExpense, addFixedExpense, deleteFixedExpense, toggleFixedExpenseStatus, moveFixedExpense,
    updateVariableExpense, addVariableExpense, deleteVariableExpense, toggleVariableExpenseStatus, moveVariableExpense,
    addIncome, updateIncome, deleteIncome, toggleIncomeStatus, moveIncome,
    addDeposit, updateDeposit, deleteDeposit,
    saveCurrentMonth, createNextMonth, copyFromPreviousMonth,
    copyIncomesFromPreviousMonth, clearIncomes,
    copyFixedExpensesFromPreviousMonth, clearFixedExpenses,
    copyVariableExpensesFromPreviousMonth, clearVariableExpenses,
    savedBudgets, accumulated, reload: loadData,
  };

  return (
    <MonthlyTrackerContext.Provider value={value}>
      {children}
    </MonthlyTrackerContext.Provider>
  );
}

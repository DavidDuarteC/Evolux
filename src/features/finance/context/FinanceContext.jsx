import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from 'sonner';
import * as accountsDb from '../services/accounts';
import * as transactionsDb from '../services/transactions';
import { FINANCE_SECTIONS, TRANSACTION_STATUS, TRANSACTION_TYPE, MONTHS_SHORT, MONTHS_LONG } from '../../../shared/lib/constants';

const FinanceContext = createContext();

export function useFinance() {
    return useContext(FinanceContext);
}

export function FinanceProvider({ children }) {
    const { userId, isAuthenticated } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!userId || !isAuthenticated) {
            setAccounts([]);
            setTransactions([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            let [accountsData, transactionsData] = await Promise.all([
                accountsDb.getAccounts(userId),
                transactionsDb.getTransactions(userId),
            ]);

            if (!accountsData || accountsData.length === 0) {
                const defaultAccount = await accountsDb.createAccount(userId, { name: 'Principal', amount: 0 });
                accountsData = [defaultAccount];
            }

            setAccounts(accountsData || []);
            setTransactions(transactionsData || []);
        } catch (error) {
            console.error('Error loading finance data:', error);
            toast.error('Error al cargar datos financieros');
        } finally {
            setLoading(false);
        }
    }, [userId, isAuthenticated]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const updateAccount = async (id, newAmount, newName = null) => {
        if (!userId) return;
        try {
            await accountsDb.updateAccount(id, userId, { amount: parseInt(newAmount) || 0, name: newName });
            setAccounts(prev => prev.map(acc => 
                acc.id === id ? { ...acc, amount: parseInt(newAmount) || 0, name: newName || acc.name } : acc
            ));
        } catch (error) {
            console.error('Error updating account:', error);
            toast.error('Error al actualizar cuenta');
        }
    };

    const addAccount = async (name, amount) => {
        if (!userId) return null;
        try {
            const newAccount = await accountsDb.createAccount(userId, { name, amount: parseInt(amount) || 0 });
            setAccounts(prev => [...prev, newAccount]);
            return newAccount;
        } catch (error) {
            console.error('Error adding account:', error);
            return null;
        }
    };

    const removeAccount = async (id) => {
        if (!userId) return;
        try {
            await accountsDb.deleteAccount(id, userId);
            setAccounts(prev => prev.filter(acc => acc.id !== id));
        } catch (error) {
            console.error('Error removing account:', error);
        }
    };

    const addTransaction = async (accountId, type, name, amount, date, status = 0) => {
        if (!userId) return null;
        try {
            const newTransaction = await transactionsDb.createTransaction(userId, {
                account_id: accountId,
                type,
                name,
                amount,
                date,
                status,
            });
            setTransactions(prev => [newTransaction, ...prev]);
            return newTransaction;
        } catch (error) {
            console.error('Error adding transaction:', error);
            return null;
        }
    };

    const updateTransaction = async (id, updates) => {
        if (!userId) return;
        try {
            await transactionsDb.updateTransaction(id, userId, updates);
            setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
        } catch (error) {
            console.error('Error updating transaction:', error);
        }
    };

    const deleteTransaction = async (id) => {
        if (!userId) return;
        try {
            await transactionsDb.deleteTransaction(id, userId);
            setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error('Error deleting transaction:', error);
        }
    };

    // Reordena los items de una sección. Recibe los ids en el nuevo orden y
    // persiste sort_order = posición. Optimista en estado, luego guarda en BD.
    const reorderSection = async (section, orderedIds) => {
        if (!userId) return;
        setTransactions(prev => prev.map(t => {
            const idx = orderedIds.indexOf(t.id);
            return idx === -1 ? t : { ...t, sort_order: idx };
        }));
        try {
            await Promise.all(orderedIds.map((id, idx) => transactionsDb.updateTransaction(id, userId, { sort_order: idx })));
        } catch (error) {
            console.error('Error reordering section:', error);
        }
    };

    const formatCurrency = (val) => '$' + (val || 0).toLocaleString('es-CO');

    const formatDateToFrontend = (isoDateStr) => {
        if (!isoDateStr) return '';
        const date = new Date(isoDateStr + 'T00:00:00');
        const month = MONTHS_SHORT[date.getMonth()];
        const day = String(date.getDate()).padStart(2, '0');
        return `${month} ${day}`;
    };

    const formatDateToDatabase = (frontendDateStr, currentDate) => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth(); // 0-indexed
        const dayMatch = frontendDateStr ? frontendDateStr.match(/\d+/) : null;
        const day = dayMatch ? parseInt(dayMatch[0]) : 1;

        // Try to extract month from the frontend string (e.g. "Ene 15", "JUN 01")
        if (frontendDateStr && typeof frontendDateStr === 'string') {
            const monthMatch = frontendDateStr.match(/[A-Za-z\u00C0-\u024F]+/);
            if (monthMatch) {
                const frontendMonth = monthMatch[0];
                const monthIndex = MONTHS_SHORT.findIndex(m => m.toUpperCase() === frontendMonth.toUpperCase());
                if (monthIndex !== -1) return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
        }

        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const updateDb = async (section, operation, payload) => {
        if (!userId) return;

        const defaultAccountId = accounts[0]?.id;
        if (!defaultAccountId) {
            console.error('No accounts available to bind transaction to');
            return;
        }

        try {
            if (operation === 'delete') {
                await transactionsDb.deleteTransaction(payload.id, userId);
                setTransactions(prev => prev.filter(t => t.id !== payload.id));
            } else if (operation === 'add') {
                const type = (section === FINANCE_SECTIONS.FIXED_INCOME) ? TRANSACTION_TYPE.INCOME : TRANSACTION_TYPE.EXPENSE;
                const dbDate = formatDateToDatabase(payload.date, currentDate);
                const cleanAmount = Number(String(payload.amount).replace(/\./g, '')) || 0;

                const newTx = await transactionsDb.createTransaction(userId, {
                    account_id: defaultAccountId,
                    type,
                    category: section,
                    name: payload.name,
                    amount: cleanAmount,
                    date: dbDate,
                    status: payload.status || 0
                });
                setTransactions(prev => [newTx, ...prev]);
            } else if (operation === 'update') {
                let updates = {};
                if (payload.field === 'amount') {
                    updates.amount = Number(String(payload.value).replace(/\./g, '')) || 0;
                } else if (payload.field === 'date') {
                    updates.date = formatDateToDatabase(payload.value, currentDate);
                } else {
                    updates[payload.field] = payload.value;
                }

                await transactionsDb.updateTransaction(payload.id, userId, updates);
                setTransactions(prev => prev.map(t => t.id === payload.id ? { ...t, ...updates } : t));
            }
        } catch (error) {
            console.error(`Error in updateDb (${operation} in ${section}):`, error);
        }
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const data = useMemo(() => {
        const filteredTransactions = transactions.filter(t => {
            if (!t.date) return false;
            const tDate = new Date(t.date + 'T00:00:00');
            return tDate.getFullYear() === year;
        });

        // Mapea e (importante) ordena por sort_order para soportar reordenar arrastrando.
        // Empates (sort_order 0) mantienen el orden de la consulta (sort estable).
        const mapAndSort = (txs) => txs
            .map(t => ({
                id: t.id,
                name: t.name,
                amount: Number(t.amount).toLocaleString('es-CO'),
                date: formatDateToFrontend(t.date),
                status: t.status,
                sort_order: t.sort_order ?? 0,
                category_label: t.category_label,
            }))
            .sort((a, b) => a.sort_order - b.sort_order);

        return {
            [FINANCE_SECTIONS.ANNUAL]: mapAndSort(
                filteredTransactions.filter(t => t.category === FINANCE_SECTIONS.ANNUAL)
            ),
            [FINANCE_SECTIONS.FIXED_INCOME]: mapAndSort(
                filteredTransactions.filter(t => t.category === FINANCE_SECTIONS.FIXED_INCOME && new Date(t.date + 'T00:00:00').getMonth() === month)
            ),
            [FINANCE_SECTIONS.MONTHLY_EXPENSES]: mapAndSort(
                filteredTransactions.filter(t => t.category === FINANCE_SECTIONS.MONTHLY_EXPENSES && new Date(t.date + 'T00:00:00').getMonth() === month)
            ),
            [FINANCE_SECTIONS.VARIABLE_EXPENSES]: mapAndSort(
                filteredTransactions.filter(t => t.category === FINANCE_SECTIONS.VARIABLE_EXPENSES && new Date(t.date + 'T00:00:00').getMonth() === month)
            ),
        };
    }, [transactions, year, month]);

    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth < 0) {
        prevYear -= 1;
        prevMonth = 11;
    }

    const prevFilteredTransactions = transactions.filter(t => {
        if (!t.date) return false;
        const tDate = new Date(t.date + 'T00:00:00');
        return tDate.getFullYear() === prevYear && tDate.getMonth() === prevMonth;
    });

    const { totals, prevTotals, trends } = useMemo(() => {
        const totalIncome = data[FINANCE_SECTIONS.FIXED_INCOME]
            .filter(item => item.status === TRANSACTION_STATUS.PAID)
            .reduce((acc, item) => acc + (Number(String(item.amount).replace(/\./g, '')) || 0), 0);

        const totalFixedExpenses = data[FINANCE_SECTIONS.MONTHLY_EXPENSES]
            .filter(item => item.status === TRANSACTION_STATUS.PAID)
            .reduce((acc, item) => acc + (Number(String(item.amount).replace(/\./g, '')) || 0), 0);

        const totalVariableExpenses = data[FINANCE_SECTIONS.VARIABLE_EXPENSES]
            .filter(item => item.status === TRANSACTION_STATUS.PAID)
            .reduce((acc, item) => acc + (Number(String(item.amount).replace(/\./g, '')) || 0), 0);

        const totalExpenses = totalFixedExpenses + totalVariableExpenses;
        const savings = totalIncome - totalExpenses;

        const prevTotalIncome = prevFilteredTransactions
            .filter(t => t.category === FINANCE_SECTIONS.FIXED_INCOME && t.status === TRANSACTION_STATUS.PAID)
            .reduce((acc, t) => acc + Number(t.amount), 0);

        const prevTotalFixed = prevFilteredTransactions
            .filter(t => t.category === FINANCE_SECTIONS.MONTHLY_EXPENSES && t.status === TRANSACTION_STATUS.PAID)
            .reduce((acc, t) => acc + Number(t.amount), 0);

        const prevTotalVariable = prevFilteredTransactions
            .filter(t => t.category === FINANCE_SECTIONS.VARIABLE_EXPENSES && t.status === TRANSACTION_STATUS.PAID)
            .reduce((acc, t) => acc + Number(t.amount), 0);

        const prevTotalExpenses = prevTotalFixed + prevTotalVariable;
        const prevSavings = prevTotalIncome - prevTotalExpenses;

        const calculateTrend = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        const trends = {
            income: calculateTrend(totalIncome, prevTotalIncome),
            fixedExpenses: calculateTrend(totalFixedExpenses, prevTotalFixed),
            variableExpenses: calculateTrend(totalVariableExpenses, prevTotalVariable),
            savings: calculateTrend(savings, prevSavings),
        };

        const totals = {
            accountsTotal: accounts.reduce((acc, curr) => acc + Number(curr.amount), 0),
            income: totalIncome,
            fixedExpenses: totalFixedExpenses,
            variableExpenses: totalVariableExpenses,
            totalExpenses,
            savings,
        };

        const prevTotals = {
            income: prevTotalIncome,
            fixedExpenses: prevTotalFixed,
            variableExpenses: prevTotalVariable,
            savings: prevSavings,
        };

        return { totals, prevTotals, trends };
    }, [data, accounts, prevFilteredTransactions]);

    const value = {
        accounts,
        transactions,
        loading,
        currentDate, setCurrentDate,
        updateAccount,
        addAccount,
        removeAccount,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        reorderSection,
        updateDb,
        data,
        totals,
        prevTotals,
        trends,
        formatCurrency,
        months: MONTHS_LONG,
        reload: loadData,
    };

    return (
        <FinanceContext.Provider value={value}>
            {children}
        </FinanceContext.Provider>
    );
}

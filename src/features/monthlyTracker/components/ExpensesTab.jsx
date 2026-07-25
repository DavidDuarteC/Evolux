import React, { useState } from 'react';
import { useMonthlyTracker } from '../context/MonthlyTrackerContext';
import { Lock, ArrowLeftRight, Plus, Trash2 } from 'lucide-react';

export default function ExpensesTab() {
  const [subtab, setSubtab] = useState('fijos');
  const {
    currentBudget,
    fixedExpenses,
    calculations,
    formatCurrency,
    updateFixedExpense,
    addFixedExpense,
    deleteFixedExpense,
    updateVariableExpense,
    addVariableExpense,
    deleteVariableExpense,
  } = useMonthlyTracker();

  const { fixedTotal, varTotal, gastos } = calculations;
  const isFixed = subtab === 'fijos';

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-[var(--bg-input)] rounded-xl p-1 mb-4">
        <button
          onClick={() => setSubtab('fijos')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all
            ${isFixed
              ? 'bg-[var(--bg-card-solid)] text-[var(--text-primary)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
        >
          <Lock size={12} />
          Fijos — {formatCurrency(fixedTotal)}
        </button>
        <button
          onClick={() => setSubtab('variables')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all
            ${!isFixed
              ? 'bg-[var(--bg-card-solid)] text-[var(--text-primary)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
        >
          <ArrowLeftRight size={12} />
          Variables — {formatCurrency(varTotal)}
        </button>
      </div>

      <div className="glass-card p-5">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
          {isFixed ? 'Gastos fijos — se repiten cada mes' : 'Gastos variables — cambian cada mes'}
        </p>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          {isFixed
            ? 'Se cargan a la tarjeta de crédito y se pagan de contado.'
            : 'Mercado, salidas, compras puntuales, lo que varíe mes a mes.'}
        </p>

        <div className="space-y-2">
          {(isFixed ? fixedExpenses : currentBudget.gastosVar || []).map((item) => (
            <div key={item.id} className="flex items-center gap-2 py-2 border-b border-[var(--border-card)] last:border-b-0">
              <input
                type="text"
                value={item.label}
                onChange={(e) =>
                  isFixed
                    ? updateFixedExpense(item.id, 'label', e.target.value)
                    : updateVariableExpense(item.id, 'label', e.target.value)
                }
                placeholder="Nombre"
                className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border-card)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)]"
              />
              <input
                type="number"
                value={item.amount}
                onChange={(e) =>
                  isFixed
                    ? updateFixedExpense(item.id, 'amount', e.target.value)
                    : updateVariableExpense(item.id, 'amount', e.target.value)
                }
                className="w-28 bg-[var(--bg-input)] border border-[var(--border-card)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] text-right focus:outline-none focus:border-[var(--border-hover)]"
              />
              <button
                onClick={() =>
                  isFixed
                    ? deleteFixedExpense(item.id)
                    : deleteVariableExpense(item.id)
                }
                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors shrink-0"
                aria-label="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={isFixed ? addFixedExpense : addVariableExpense}
          className="w-full mt-4 py-2.5 text-sm font-medium bg-[var(--bg-input)] text-[var(--text-primary)] border border-dashed border-[var(--border-card)] rounded-lg hover:bg-[var(--bg-card-solid)] transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={14} />
          Agregar gasto {isFixed ? 'fijo' : 'variable'}
        </button>
      </div>

      <div className="glass-card p-5">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-[var(--text-primary)]">Total {isFixed ? 'fijos' : 'variables'}</span>
          <span className="text-lg font-medium" style={{ color: '#BA7517' }}>
            {formatCurrency(isFixed ? fixedTotal : varTotal)}
          </span>
        </div>
      </div>

      <div className="bg-[var(--bg-input)] rounded-xl p-4 flex justify-between items-center">
        <span className="text-sm text-[var(--text-muted)]">Total gastos del mes</span>
        <span className="text-base font-medium" style={{ color: '#BA7517' }}>{formatCurrency(gastos)}</span>
      </div>
    </div>
  );
}

import React from 'react';
import { useMonthlyTracker } from '../context/MonthlyTrackerContext';
import { Pencil, Save, Plus, ChevronRight, AlertTriangle } from 'lucide-react';

const COLORS = {
  savings: '#1D9E75',
  cushion: '#378ADD',
  expenses: '#BA7517',
  free: '#D3D1C7',
  danger: '#E24B4A',
};

const LABELS = [
  { color: COLORS.savings, label: 'CDT' },
  { color: COLORS.cushion, label: 'Colchón' },
  { color: COLORS.expenses, label: 'Gastos' },
  { color: COLORS.free, label: 'Libre' },
];

export default function MonthTab({ onGoWise, onGoGastos }) {
  const {
    currentBudget,
    calculations,
    MONTHS_LONG,
    formatCurrency,
    formatEur,
    updateBudgetField,
    saveCurrentMonth,
    createNextMonth,
  } = useMonthlyTracker();

  const label = `${MONTHS_LONG[currentBudget.month]} ${currentBudget.year}`;
  const { cop, ahorro, colchon, fixedTotal, varTotal, gastos, disponible, netEur, pctComision } = calculations;

  const total = Math.max(ahorro + colchon + gastos + Math.max(disponible, 0), 1);
  const segments = [
    { color: COLORS.savings, value: ahorro },
    { color: COLORS.cushion, value: colchon },
    { color: COLORS.expenses, value: gastos },
    { color: COLORS.free, value: Math.max(disponible, 0) },
  ];

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-1">Mes activo</p>
            <h3 className="text-lg font-medium text-[var(--text-primary)]">{label}</h3>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-md ${
              currentBudget.saved
                ? 'bg-[rgba(29,158,117,0.15)] text-[#1D9E75]'
                : 'bg-[rgba(186,117,23,0.15)] text-[#BA7517]'
            }`}
          >
            {currentBudget.saved ? 'Guardado' : 'En progreso'}
          </span>
        </div>

        <div className="flex justify-between items-center mb-2">
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-1">Recibes este mes</p>
            <div className="text-2xl font-medium" style={{ color: COLORS.savings }}>
              {formatCurrency(cop)}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              {formatEur(netEur)} × {parseFloat(currentBudget.exchange_rate).toFixed(2)} · comisión {formatEur(currentBudget.wise_fee_eur)}
            </p>
          </div>
          <button
            onClick={onGoWise}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-[var(--border-card)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Pencil size={12} />
            Wise
          </button>
        </div>

        <div className="h-2 rounded-full overflow-hidden flex my-4">
          {segments.map((seg, idx) => (
            <div
              key={idx}
              className="h-full transition-all duration-300"
              style={{
                flex: seg.value,
                backgroundColor: seg.color,
                minWidth: seg.value > 0 ? '4px' : '0px',
              }}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          {LABELS.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <span
                className="w-2 h-2 rounded-sm inline-block"
                style={{ backgroundColor: item.color }}
              />
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
            <div className="text-xl font-medium mb-3" style={{ color: COLORS.savings }}>
              {formatCurrency(ahorro)}
            </div>
            <input
              type="range"
              min="5"
              max="40"
              step="1"
              value={currentBudget.savings_pct}
              onChange={(e) => updateBudgetField('savings_pct', parseInt(e.target.value))}
              className="w-full accent-[#1D9E75]"
            />
          </div>
          <div className="bg-[var(--bg-input)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Colchón emergencias — {currentBudget.cushion_pct}%</p>
            <div className="text-xl font-medium mb-3" style={{ color: COLORS.cushion }}>
              {formatCurrency(colchon)}
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={currentBudget.cushion_pct}
              onChange={(e) => updateBudgetField('cushion_pct', parseInt(e.target.value))}
              className="w-full accent-[#378ADD]"
            />
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">Resumen del mes</p>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-1 border-b border-[var(--border-card)]">
            <span className="text-sm text-[var(--text-muted)]">Ingresas</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">{formatCurrency(cop)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[var(--border-card)]">
            <span className="text-sm text-[var(--text-muted)]">CDT / Ahorro</span>
            <span className="text-sm font-medium" style={{ color: COLORS.savings }}>{formatCurrency(ahorro)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[var(--border-card)]">
            <span className="text-sm text-[var(--text-muted)]">Colchón (Nu)</span>
            <span className="text-sm font-medium" style={{ color: COLORS.cushion }}>{formatCurrency(colchon)}</span>
          </div>
          <button
            onClick={onGoGastos}
            className="w-full flex justify-between items-center py-1 border-b border-[var(--border-card)] group"
          >
            <span className="text-sm text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
              Gastos fijos <ChevronRight size={12} className="inline" />
            </span>
            <span className="text-sm font-medium" style={{ color: COLORS.expenses }}>{formatCurrency(fixedTotal)}</span>
          </button>
          <button
            onClick={() => onGoGastos && onGoGastos('variables')}
            className="w-full flex justify-between items-center py-1 border-b border-[var(--border-card)] group"
          >
            <span className="text-sm text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
              Gastos variables <ChevronRight size={12} className="inline" />
            </span>
            <span className="text-sm font-medium" style={{ color: COLORS.expenses }}>{formatCurrency(varTotal)}</span>
          </button>
          <div className="flex justify-between items-center pt-1">
            <span className="text-sm font-medium text-[var(--text-primary)]">Queda libre</span>
            <span
              className="text-base font-medium"
              style={{ color: disponible < 0 ? COLORS.danger : COLORS.savings }}
            >
              {formatCurrency(disponible)}
            </span>
          </div>
        </div>
      </div>

      {disponible < 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400 flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Gastos superan el ingreso en {formatCurrency(Math.abs(disponible))}.</span>
        </div>
      )}

      <button
        onClick={saveCurrentMonth}
        className="w-full py-3 text-sm font-medium rounded-xl bg-[rgba(29,158,117,0.15)] text-[#1D9E75] border border-[rgba(29,158,117,0.3)] hover:bg-[rgba(29,158,117,0.25)] transition-colors flex items-center justify-center gap-2"
      >
        <Save size={16} />
        Guardar {label}
      </button>

      <button
        onClick={createNextMonth}
        className="w-full py-3 text-sm font-medium rounded-xl bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-card)] hover:bg-[var(--bg-card-solid)] transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        Crear mes siguiente
      </button>
    </div>
  );
}

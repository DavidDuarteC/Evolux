import React from 'react';
import { useMonthlyTracker } from '../context/MonthlyTrackerContext';
import { Bell } from 'lucide-react';

export default function WiseTab() {
  const { currentBudget, calculations, updateBudgetField, formatCurrency, formatEur } = useMonthlyTracker();
  const { cop, netEur, pctComision } = calculations;

  const fields = [
    {
      id: 'salary_eur',
      label: 'Salario enviado',
      sub: 'Lo que envías desde tu empleador',
      prefix: '€',
      step: '0.01',
    },
    {
      id: 'wise_fee_eur',
      label: 'Comisión Wise',
      sub: 'Aparece en "Incluye comisiones"',
      prefix: '€',
      step: '0.01',
    },
    {
      id: 'exchange_rate',
      label: 'Tasa de cambio',
      sub: '1 EUR = X COP (con decimales)',
      prefix: '',
      step: '0.01',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">Datos de Wise — cópialos exactos</p>
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.id} className="flex justify-between items-center py-3 border-b border-[var(--border-card)] last:border-b-0">
              <div className="flex-1 pr-4">
                <p className="text-sm text-[var(--text-primary)]">{field.label}</p>
                <p className="text-[11px] text-[var(--text-muted)] opacity-70">{field.sub}</p>
              </div>
              <div className="flex items-center gap-2">
                {field.prefix && (
                  <span className="text-xs text-[var(--text-muted)]">{field.prefix}</span>
                )}
                <input
                  type="number"
                  step={field.step}
                  value={parseFloat(currentBudget[field.id]).toFixed(2)}
                  onChange={(e) => updateBudgetField(field.id, parseFloat(e.target.value) || 0)}
                  className="w-32 bg-[var(--bg-input)] border border-[var(--border-card)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] text-right focus:outline-none focus:border-[var(--border-hover)]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-5">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">Resultado</p>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-[var(--border-card)]">
            <span className="text-sm text-[var(--text-muted)]">Envías</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">{formatEur(currentBudget.salary_eur)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[var(--border-card)]">
            <span className="text-sm text-[var(--text-muted)]">Comisión ({pctComision}%)</span>
            <span className="text-sm font-medium text-red-400">−{formatEur(currentBudget.wise_fee_eur)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[var(--border-card)]">
            <span className="text-sm text-[var(--text-muted)]">Netos convertidos</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">{formatEur(netEur)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[var(--border-card)]">
            <span className="text-sm text-[var(--text-muted)]">Tasa aplicada</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">{parseFloat(currentBudget.exchange_rate).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-sm font-medium text-[var(--text-primary)]">Recibes en Bancolombia</span>
            <span className="text-xl font-medium" style={{ color: '#1D9E75' }}>{formatCurrency(cop)}</span>
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-input)] rounded-xl p-4 text-xs text-[var(--text-muted)] leading-relaxed flex items-start gap-2">
        <Bell size={14} className="shrink-0 mt-0.5" />
        <span>
          <strong className="text-[var(--text-primary)]">Tip:</strong> Activa alertas de tasa en Wise para transferir cuando suba.
        </span>
      </div>
    </div>
  );
}

import React from 'react';
import { useMonthlyTracker } from '../context/MonthlyTrackerContext';
import { TrendingUp, Shield, CreditCard, ShoppingCart } from 'lucide-react';

const POCKETS = [
  { icon: TrendingUp, key: 'ahorro', label: 'CDT / Ahorro', sub: 'Transfiere a CDT Bancolombia o Lulo Bank', color: '#1D9E75' },
  { icon: Shield, key: 'colchon', label: 'Colchón emergencias', sub: 'Transfiere a cuenta Nu (~10% EA)', color: '#378ADD' },
  { icon: CreditCard, key: 'fixedTotal', label: 'Pago tarjeta de crédito', sub: 'Fijos', color: '#BA7517' },
];

export default function PocketsTab() {
  const { currentBudget, calculations, formatCurrency, MONTHS_LONG } = useMonthlyTracker();
  const { ahorro, colchon, fixedTotal } = calculations;

  const values = { ahorro, colchon, fixedTotal };

  const variableItems = (currentBudget.gastosVar || []).map((g) => ({
    icon: ShoppingCart,
    key: g.id,
    label: g.label,
    sub: 'Gasto variable del mes',
    color: '#888780',
    value: parseFloat(g.amount) || 0,
  }));

  return (
    <div className="space-y-4">
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
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {pocket.key === 'fixedTotal' ? `${pocket.sub}: ${formatCurrency(fixedTotal)}` : pocket.sub}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium" style={{ color: pocket.color }}>
                  {formatCurrency(values[pocket.key])}
                </span>
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
                <span className="text-sm font-medium" style={{ color: item.color }}>
                  {formatCurrency(item.value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card p-5">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">Flujo el día de pago</p>
        <div className="space-y-2">
          {[
            'Wise transfiere a Bancolombia',
            'Mueves al bolsillo CDT → abres CDT',
            'Mueves al bolsillo Colchón → transfieres a Nu',
            'Dejas el pago TC en la cuenta principal',
            'El resto para tus gastos variables',
          ].map((step, idx) => (
            <div key={idx} className="flex gap-3 py-1.5 text-sm text-[var(--text-muted)]">
              <span className="font-medium" style={{ color: '#1D9E75', minWidth: '20px' }}>{idx + 1}.</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

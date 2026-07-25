import React, { useMemo } from 'react';
import { useMonthlyTracker } from '../context/MonthlyTrackerContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function HistoryTab() {
  const { savedBudgets, calculations, formatCurrency, MONTHS_SHORT } = useMonthlyTracker();

  const chartData = useMemo(() => {
    let accAhorro = 0;
    let accColchon = 0;
    return savedBudgets.map((m) => {
      const salaryEur = parseFloat(m.salary_eur) || 0;
      const feeEur = parseFloat(m.wise_fee_eur) || 0;
      const rate = parseFloat(m.exchange_rate) || 0;
      const cop = Math.round((salaryEur - feeEur) * rate);
      const ahorro = Math.round(cop * (m.savings_pct || 0) / 100);
      const colchon = Math.round(cop * (m.cushion_pct || 0) / 100);
      accAhorro += ahorro;
      accColchon += colchon;
      return {
        label: `${MONTHS_SHORT[m.month]} ${m.year}`,
        cdt: accAhorro,
        colchon: accColchon,
      };
    });
  }, [savedBudgets, MONTHS_SHORT]);

  const totals = useMemo(() => {
    return savedBudgets.reduce(
      (acc, m) => {
        const salaryEur = parseFloat(m.salary_eur) || 0;
        const feeEur = parseFloat(m.wise_fee_eur) || 0;
        const rate = parseFloat(m.exchange_rate) || 0;
        const cop = Math.round((salaryEur - feeEur) * rate);
        acc.ahorro += Math.round(cop * (m.savings_pct || 0) / 100);
        acc.colchon += Math.round(cop * (m.cushion_pct || 0) / 100);
        return acc;
      },
      { ahorro: 0, colchon: 0 }
    );
  }, [savedBudgets]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--bg-input)] rounded-xl p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">CDT acumulado</p>
          <p className="text-xl font-medium" style={{ color: '#1D9E75' }}>{formatCurrency(totals.ahorro)}</p>
        </div>
        <div className="bg-[var(--bg-input)] rounded-xl p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">Colchón acumulado</p>
          <p className="text-xl font-medium" style={{ color: '#378ADD' }}>{formatCurrency(totals.colchon)}</p>
        </div>
      </div>

      <div className="glass-card p-5">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">Evolución del ahorro</p>
        <div className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--chart-tick)', fontSize: 11 }}
                  stroke="var(--chart-axis)"
                />
                <YAxis
                  tick={{ fill: 'var(--chart-tick)', fontSize: 11 }}
                  stroke="var(--chart-axis)"
                  tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card-solid)',
                    border: '1px solid var(--border-card)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                  }}
                  formatter={(value) => [formatCurrency(value), '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="cdt" name="CDT" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                <Bar dataKey="colchon" name="Colchón" fill="#378ADD" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">
              Guarda tu primer mes para ver el historial.
            </div>
          )}
        </div>
      </div>

      <div className="glass-card p-5">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">Meses registrados</p>
        {savedBudgets.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-2">Guarda tu primer mes para ver el historial.</p>
        ) : (
          <div className="space-y-2">
            {savedBudgets.map((m) => {
              const salaryEur = parseFloat(m.salary_eur) || 0;
              const feeEur = parseFloat(m.wise_fee_eur) || 0;
              const rate = parseFloat(m.exchange_rate) || 0;
              const cop = Math.round((salaryEur - feeEur) * rate);
              const ahorro = Math.round(cop * (m.savings_pct || 0) / 100);
              const colchon = Math.round(cop * (m.cushion_pct || 0) / 100);
              return (
                <div key={m.id} className="flex justify-between items-center py-2 border-b border-[var(--border-card)] last:border-b-0 text-sm">
                  <span className="text-[var(--text-primary)]">{MONTHS_SHORT[m.month]} {m.year}</span>
                  <span className="text-[var(--text-muted)]">{formatCurrency(cop)}</span>
                  <span style={{ color: '#1D9E75' }}>+{formatCurrency(ahorro + colchon)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

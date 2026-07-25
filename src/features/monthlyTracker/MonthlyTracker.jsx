import React, { useState } from 'react';
import { useMonthlyTracker } from './context/MonthlyTrackerContext';
import { Calendar, ArrowRightLeft, List, BarChart3, Wallet, Loader2, RefreshCw, Database } from 'lucide-react';
import MonthTab from './components/MonthTab';
import WiseTab from './components/WiseTab';
import ExpensesTab from './components/ExpensesTab';
import HistoryTab from './components/HistoryTab';
import PocketsTab from './components/PocketsTab';

const TABS = [
  { id: 'mes', label: 'Mes', icon: Calendar },
  { id: 'wise', label: 'Wise', icon: ArrowRightLeft },
  { id: 'gastos', label: 'Gastos', icon: List },
  { id: 'historia', label: 'Historial', icon: BarChart3 },
  { id: 'bolsillos', label: 'Bolsillos', icon: Wallet },
];

export default function MonthlyTracker() {
  const [activeTab, setActiveTab] = useState('mes');
  const { loading, currentBudget } = useMonthlyTracker();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-acid animate-spin" />
      </div>
    );
  }

  if (!currentBudget) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md text-center space-y-4">
          <Database size={40} className="mx-auto text-[var(--text-muted)]" />
          <h3 className="text-lg font-medium text-[var(--text-primary)]">No se pudieron cargar los datos</h3>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Lo más probable es que las tablas del tracker aún no existan en Supabase.
            Ejecuta <code className="bg-[var(--bg-input)] px-1.5 py-0.5 rounded text-xs">sql/supabase_schema.sql</code> en el SQL Editor de Supabase.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-input)] hover:bg-[var(--bg-card-solid)] text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors border border-[var(--border-card)]"
          >
            <RefreshCw size={14} />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-8">
      <div className="flex gap-1 bg-[var(--bg-input)] rounded-xl p-1 mb-6">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-medium transition-all
                ${isActive
                  ? 'bg-[var(--bg-card-solid)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'mes' && <MonthTab onGoWise={() => setActiveTab('wise')} onGoGastos={() => setActiveTab('gastos')} />}
      {activeTab === 'wise' && <WiseTab />}
      {activeTab === 'gastos' && <ExpensesTab />}
      {activeTab === 'historia' && <HistoryTab />}
      {activeTab === 'bolsillos' && <PocketsTab />}
    </div>
  );
}

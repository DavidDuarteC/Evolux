import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightLeft, Scale, Database, RefreshCw, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useMonthlyTracker } from '../monthlyTracker/context/MonthlyTrackerContext';
import DatePicker from '../../shared/components/DatePicker';
import PageHeader from '../../shared/components/PageHeader';
import LiquidityTab from './components/LiquidityTab';
import IncomeExpensesTab from './components/IncomeExpensesTab';

const Finance = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('resumen');
  const { loading, currentBudget, budgets, setCurrentIndex, MONTHS_LONG } = useMonthlyTracker();

  const [pickerDate, setPickerDate] = useState(() =>
    currentBudget ? new Date(currentBudget.year, currentBudget.month) : new Date()
  );

  const handleMonthChange = (newDate) => {
    setPickerDate(newDate);
    const y = newDate.getFullYear();
    const m = newDate.getMonth();
    const idx = budgets.findIndex(b => Number(b.year) === y && Number(b.month) === m);
    if (idx >= 0) setCurrentIndex(idx);
  };

  const TABS = [
    { id: 'resumen', label: 'Ingresos y Gastos', icon: ArrowRightLeft },
    { id: 'liquidez', label: t('finance.liquidez'), icon: Scale },
  ];

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
          <h3 className="text-lg font-medium text-[var(--text-primary)]">{t('common.sinDatos')}</h3>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            {t('common.verificarTablas')}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-input)] hover:bg-[var(--bg-card-solid)] text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors border border-[var(--border-card)]"
          >
            <RefreshCw size={14} />
            {t('common.reintentar')}
          </button>
        </div>
      </div>
    );
  }

  const label = `${MONTHS_LONG[currentBudget.month]} ${currentBudget.year}`;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <PageHeader
        title={t('finance.title')}
        subtitle={label}
        right={<DatePicker selectedDate={pickerDate} onChange={handleMonthChange} monthOnly={true} />}
      />

      {/* === TAB NAVIGATION === */}
      <div className="flex gap-1 bg-[var(--bg-input)] rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer
                ${isActive
                  ? 'bg-[var(--bg-card-solid)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'resumen' && (
            <IncomeExpensesTab budgets={budgets} pickerDate={pickerDate} />
          )}
          {activeTab === 'liquidez' && (
            <LiquidityTab />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Finance;

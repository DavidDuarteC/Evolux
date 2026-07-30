import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Clock, CreditCard, Scale, Plus, Trash2, Pencil, Check, ChevronUp, ChevronDown } from 'lucide-react';
import StatCard from '../../../shared/components/StatCard';
import { useAuth } from '../../../hooks/useAuth';
import {
  getWalletMonth, addWalletItem, updateWalletItem,
  deleteWalletItem, emptyMonth,
} from '../services/wallet';

const COLUMNS = [
  { key: 'actual', title: 'Dinero Actual', color: 'green', icon: Wallet, placeholder: 'Ej. Davibank' },
  { key: 'pending', title: 'Pendiente por Recibir', color: 'orange', icon: Clock, placeholder: 'Ej. Kapital Sushi' },
  { key: 'debt', title: 'Deudas', color: 'red', icon: CreditCard, placeholder: 'Ej. Tarjeta de crédito' },
];
const ACCENTS = { green: '#22c55e', orange: '#f97316', red: '#ef4444' };

const fmt = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(n || 0).toLocaleString('es-CO');
const fmtInput = (n) => (n ? Number(n).toLocaleString('es-CO') : '');
const monthKeyOf = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export default function LiquidityTab({ sharedDate }) {
  const { userId } = useAuth();
  const [currentDate, setCurrentDate] = useState(sharedDate || new Date());

  useEffect(() => { if (sharedDate) setCurrentDate(sharedDate); }, [sharedDate]);
  const [data, setData] = useState(emptyMonth());
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({ actual: false, pending: false, debt: false });
  const monthKey = monthKeyOf(currentDate);

  useEffect(() => {
    let active = true;
    if (!userId) return;
    setLoading(true);
    getWalletMonth(userId, monthKey)
      .then((d) => { if (active) setData(d); })
      .catch((e) => { console.error(e); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, monthKey]);

  const toggleEdit = (colKey) => setEditing((prev) => ({ ...prev, [colKey]: !prev[colKey] }));
  const updateLocal = (colKey, id, field, value) => setData((prev) => ({ ...prev, [colKey]: prev[colKey].map((it) => (it.id === id ? { ...it, [field]: value } : it)) }));
  const persistItem = async (colKey, id) => { const item = data[colKey].find((it) => it.id === id); if (!item || !userId) return; try { await updateWalletItem(id, userId, { name: item.name, value: item.value }); } catch (e) { console.error(e); } };
  const addItem = async (colKey) => { if (!userId) return; try { const created = await addWalletItem(userId, monthKey, colKey, data[colKey].length); setData((prev) => ({ ...prev, [colKey]: [...prev[colKey], created] })); } catch (e) { console.error(e); } };
  const removeItem = async (colKey, id) => { if (!userId) return; setData((prev) => ({ ...prev, [colKey]: prev[colKey].filter((it) => it.id !== id) })); try { await deleteWalletItem(id, userId); } catch (e) { console.error(e); } };
  const moveItem = (colKey, id, direction) => { const arr = [...data[colKey]]; const idx = arr.findIndex((i) => i.id === id); const swap = direction === 'up' ? idx - 1 : idx + 1; if (idx === -1 || swap < 0 || swap >= arr.length) return; [arr[idx], arr[swap]] = [arr[swap], arr[idx]]; setData((prev) => ({ ...prev, [colKey]: arr })); if (userId) arr.forEach((it, i) => updateWalletItem(it.id, userId, { sort_order: i }).catch(() => {})); };

  const totals = useMemo(() => {
    const sum = (arr) => arr.reduce((acc, it) => acc + (Number(it.value) || 0), 0);
    const actual = sum(data.actual); const pending = sum(data.pending); const debt = sum(data.debt);
    return { actual, pending, debt, liquidez: actual + pending - debt };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard title="Dinero Actual" amount={fmt(totals.actual)} icon={Wallet} colorTheme="green" subtitle="Este mes" />
        <StatCard title="Pendiente" amount={fmt(totals.pending)} icon={Clock} colorTheme="orange" subtitle="Por cobrar" />
        <StatCard title="Deudas" amount={fmt(totals.debt)} icon={CreditCard} colorTheme="red" subtitle="Por pagar" />
        <StatCard title="Total" amount={fmt(totals.liquidez)} icon={Scale} colorTheme="blue" subtitle="Liquidez real" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {COLUMNS.map((col) => {
          const accent = ACCENTS[col.color]; const items = data[col.key]; const isEditingCol = editing[col.key];
          const colTotal = items.reduce((acc, it) => acc + (Number(it.value) || 0), 0); const ColIcon = col.icon;
          return (
            <div key={col.key} className="glass-card p-6" style={{ overflow: 'visible' }}>
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-[var(--border-card)]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: `${accent}1a`, color: accent }}><ColIcon size={18} /></div>
                  <h3 className="font-bold text-[var(--text-primary)] text-sm tracking-wide uppercase">{col.title}</h3>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-sm font-number" style={{ color: accent }}>{fmt(colTotal)}</span>
                  <button onClick={() => toggleEdit(col.key)} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isEditingCol ? 'bg-acid text-black' : 'bg-[var(--bg-card-solid)] text-[var(--text-primary)] border border-[var(--border-card)] hover:bg-[var(--bg-input)]'}`} title={isEditingCol ? 'Listo' : 'Editar'}>{isEditingCol ? <Check size={14} /> : <Pencil size={12} />}</button>
                </div>
              </div>
              <div className="space-y-1.5">
                {items.length === 0 && <p className="text-center text-[var(--text-muted)] text-xs italic py-1.5">{loading ? 'Cargando…' : 'Sin items aún'}</p>}
                <AnimatePresence initial={false}>
                  {items.map((it, idx) => (
                    <motion.div key={it.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      {isEditingCol ? (
                        <div className="flex items-center gap-2 py-2 border-b border-[var(--border-card)] last:border-b-0">
                          <div className="flex flex-col items-center -my-1 shrink-0">
                            <button onClick={() => moveItem(col.key, it.id, 'up')} disabled={idx === 0} className="text-[var(--text-muted)]/50 hover:text-[var(--text-primary)] disabled:opacity-20 transition-colors leading-none" title="Subir"><ChevronUp size={13} /></button>
                            <button onClick={() => moveItem(col.key, it.id, 'down')} disabled={idx === items.length - 1} className="text-[var(--text-muted)]/50 hover:text-[var(--text-primary)] disabled:opacity-20 transition-colors leading-none" title="Bajar"><ChevronDown size={13} /></button>
                          </div>
                          <input type="text" value={it.name} onChange={(e) => updateLocal(col.key, it.id, 'name', e.target.value)} onBlur={() => persistItem(col.key, it.id)} placeholder={col.placeholder} className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border-card)] rounded px-1.5 py-1 text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/30 focus:outline-none focus:border-[var(--border-hover)]" />
                          <input type="text" inputMode="numeric" value={fmtInput(it.value)} onChange={(e) => updateLocal(col.key, it.id, 'value', Number(e.target.value.replace(/\D/g, '')) || 0)} onBlur={() => persistItem(col.key, it.id)} placeholder="$0" className="w-24 shrink-0 bg-[var(--bg-input)] border border-[var(--border-card)] rounded px-1.5 py-1 text-[11px] text-[var(--text-primary)] text-right font-number placeholder:text-[var(--text-muted)]/30 focus:outline-none focus:border-[var(--border-hover)]" />
                          <button onClick={() => removeItem(col.key, it.id)} className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors shrink-0" title="Eliminar"><Trash2 size={13} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3 py-2 border-b border-[var(--border-card)] last:border-b-0">
                          <span className="text-[11px] text-[var(--text-primary)] font-medium truncate">{it.name || <span className="text-[var(--text-muted)] italic">Sin nombre</span>}</span>
                          <span className="text-[11px] font-bold text-[var(--text-primary)] shrink-0">{fmt(it.value)}</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {isEditingCol && (
                <button onClick={() => addItem(col.key)} className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[var(--border-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] hover:bg-white/[0.03] transition-colors text-sm font-semibold">
                  <Plus size={16} /> Agregar
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

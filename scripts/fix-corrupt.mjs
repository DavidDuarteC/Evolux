#!/usr/bin/env node
/**
 * Fix corrupt encrypted values in wallet_items, transactions, goals, goal_history.
 * Uses supabase-js for Edge Function calls (which works with anon key)
 * and supabase db query for direct DB access (bypasses RLS).
 */
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const SUPABASE_URL = 'https://tjbluywadxsbyqtxviyt.supabase.co';
const ANON_KEY = 'sb_publishable_6vRIpL85wKXSvaEK-vui3w_uRl8nYK-';
const supabase = createClient(SUPABASE_URL, ANON_KEY);
const CWD = '/Users/davidduarte/Documents/Projects/Evolux';

function run(sql) {
  return execSync(`supabase db query --linked ${JSON.stringify(sql)}`, { cwd: CWD, encoding: 'utf-8' });
}

function getRows(table, fields) {
  const cols = fields.map(f => `'${f}'::text, "${f}"::text`).join(', ');
  const sql = `SELECT json_agg(json_build_object(${cols})::text) FROM "${table}";`;
  const out = run(sql);
  const m = out.match(/(\[.*\])/s);
  if (!m) return [];
  let raw = m[1].replace(/}(\s*){/g, '},$1{');
  try {
    const items = JSON.parse(raw);
    return items.map(i => typeof i === 'string' ? JSON.parse(i) : i);
  } catch { return []; }
}

// Tables to fix: [name, [field, isNumber]]
const FIX = [
  ['wallet_items', [['name', false], ['value', true]]],
  ['transactions', [['name', false], ['amount', true], ['category', false]]],
  ['goals', [['title', false], ['target', true], ['current', true]]],
  ['goal_history', [['amount', true], ['note', false]]],
];

function isEncrypted(val) {
  if (typeof val !== 'string' || val.length < 10) return false;
  // Check both raw and escaped quote formats
  return val.includes('\\"iv\\"') || (val.includes('"iv"') && val.includes('"cipherText"'));
}

function esc(val, isNum) {
  if (isNum) return String(parseFloat(val) || 0);
  return `'${String(val).replace(/'/g, "''")}'`;
}

let total = 0;

for (const [table, fields] of FIX) {
  console.log(`\n━━━ ${table}`);
  const allCols = ['id', ...fields.map(f => f[0])];
  const rows = getRows(table, allCols);
  console.log(`   ${rows.length} rows read`);

  for (const row of rows) {
    const id = row.id;
    if (!id) continue;
    const sets = [];
    for (const [field, isNum] of fields) {
      const val = row[field];
      if (isEncrypted(val)) {
        // Decrypt via Edge Function
        const { data, error } = await supabase.functions.invoke('finance-crypto', {
          body: { action: 'decrypt', value: val, expectedType: isNum ? 'number' : 'string' }
        });
        if (!error && data?.value !== undefined && data.value !== val) {
          sets.push(`"${field}"=${esc(data.value, isNum)}`);
        }
      }
    }
    if (sets.length > 0) {
      const sql = `UPDATE "${table}" SET ${sets.join(', ')} WHERE id='${id}';`;
      run(sql);
      console.log(`   ✔ ${id.slice(0,12)} → ${sets.length} campos`);
      total++;
    }
  }
}

console.log(`\n✅ ${total} filas actualizadas`);

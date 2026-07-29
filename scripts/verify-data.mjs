// Script para verificar datos desencriptados — solo lectura, no modifica nada.
// Uso: node scripts/verify-data.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cargar .env
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = Object.fromEntries(
  envContent.split('\n').filter(l => l && !l.startsWith('#')).map(l => l.split('=').map(s => s.trim()))
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const anonEmail = env.VITE_AUTH_EMAIL;
const anonPass = env.VITE_AUTH_PASSWORD;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Autenticar (necesario para RLS)
  const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
    email: anonEmail,
    password: anonPass,
  });
  if (authError) {
    console.warn('⚠️ Auth con email/pass falló, intentando modo anon — RLS podría bloquear queries');
  } else {
    console.log(`✅ Autenticado como: ${user?.email}\n`);
  }

  // 1. Budgets
  const { data: budgets } = await supabase.from('monthly_budgets').select('id, year, month, salary_eur, wise_fee_eur, exchange_rate, manual_income_cop').order('year').order('month');
  console.log('━━━ BUDGETS ━━━');
  for (const b of budgets || []) {
    console.log(`📅 ${b.year}-${String(b.month+1).padStart(2,'0')}`);
    console.log(`   salary_eur: ${b.salary_eur}`);
    console.log(`   wise_fee_eur: ${b.wise_fee_eur}`);
    console.log(`   exchange_rate: ${b.exchange_rate}`);
    console.log(`   manual_income_cop: ${b.manual_income_cop}`);
    console.log();
  }

  // 2. Incomes
  const { data: incomes } = await supabase.from('monthly_incomes').select('*').order('sort_order');
  console.log('━━━ INCOMES (desde encrypt → decrypt vía Edge Function) ━━━');
  try {
    const { data: decrypted } = await supabase.functions.invoke('finance-crypto', {
      body: { action: 'batch_decrypt', table: 'monthly_incomes', records: incomes }
    }).catch(() => ({ data: null }));
    for (const inc of decrypted || incomes || []) {
      console.log(`   ${inc.label.padEnd(20)} ${inc.currency}  ${inc.amount.padStart(8)}  fee:${(inc.fee||'0').padStart(6)}  rate:${(inc.rate||'0').padStart(8)}  status:${inc.status}`);
    }
  } catch {
    // Si batch decrypt no existe, mostrar raw
    for (const inc of incomes || []) {
      const safe = (v) => typeof v === 'string' && v.includes('iv') ? '🔒 encriptado' : v;
      console.log(`   ${safe(inc.label).padEnd(20)} ${inc.currency}  ${safe(String(inc.amount)).padStart(8)}  fee:${safe(String(inc.fee||'0')).padStart(6)}  rate:${safe(String(inc.rate||'0')).padStart(8)}  status:${inc.status}`);
    }
  }

  // 3. Fixed expenses
  const { data: fixed } = await supabase.from('monthly_fixed_expenses').select('*').order('sort_order');
  console.log('\n━━━ GASTOS FIJOS ━━━');
  for (const f of fixed || []) {
    const safe = (v) => typeof v === 'string' && v.includes('iv') ? '🔒' : v;
    console.log(`   ${safe(f.label).padEnd(20)} ${f.amount?.toString?.()?.padStart(8) || '🔒'}  status:${f.status}`);
  }

  // 4. Variable expenses
  const { data: variable } = await supabase.from('monthly_variable_expenses').select('*').order('sort_order');
  console.log('\n━━━ GASTOS VARIABLES ━━━');
  for (const v of variable || []) {
    const safe = (v) => typeof v === 'string' && v.includes('iv') ? '🔒' : v;
    console.log(`   ${safe(v.label).padEnd(20)} ${v.amount?.toString?.()?.padStart(8) || '🔒'}  status:${v.status}`);
  }

  console.log('\n✅ Verificación completada — solo lectura, no se modificó nada.');
}

main().catch(console.error);

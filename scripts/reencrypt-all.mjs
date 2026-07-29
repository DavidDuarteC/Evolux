#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tjbluywadxsbyqtxviyt.supabase.co';
const ANON_KEY = 'sb_publishable_6vRIpL85wKXSvaEK-vui3w_uRl8nYK-';
const supabase = createClient(SUPABASE_URL, ANON_KEY);

const config = [
  { name: "monthly_budgets", fields: [
    { field: "salary_eur", type: "number" }, { field: "wise_fee_eur", type: "number" },
    { field: "exchange_rate", type: "number" }, { field: "manual_income_cop", type: "number" },
    { field: "usd_amount", type: "number" }, { field: "usd_rate", type: "number" },
    { field: "usd_fee", type: "number" }, { field: "usd_cop", type: "number" },
  ]},
  { name: "monthly_fixed_expenses", fields: [
    { field: "label", type: "string" }, { field: "amount", type: "number" },
  ]},
  { name: "monthly_variable_expenses", fields: [
    { field: "label", type: "string" }, { field: "amount", type: "number" },
  ]},
  { name: "monthly_incomes", fields: [
    { field: "label", type: "string" }, { field: "amount", type: "number" },
    { field: "fee", type: "number" }, { field: "rate", type: "number" },
  ]},
  { name: "wise_deposits", fields: [
    { field: "amount_eur", type: "number" },
  ]},
  { name: "accounts", fields: [
    { field: "name", type: "string" }, { field: "amount", type: "number" },
  ]},
  { name: "transactions", fields: [
    { field: "name", type: "string" }, { field: "amount", type: "number" }, { field: "category", type: "string" },
  ]},
  { name: "wallet_items", fields: [
    { field: "name", type: "string" }, { field: "value", type: "number" },
  ]},
  { name: "goals", fields: [
    { field: "title", type: "string" }, { field: "target", type: "number" }, { field: "current", type: "number" },
  ]},
  { name: "goal_history", fields: [
    { field: "amount", type: "number" }, { field: "note", type: "string" },
  ]},
];

const { data, error } = await supabase.functions.invoke('finance-crypto', {
  body: { action: 'migrate-existing', tables: config }
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('\nResults:');
  for (const r of data.results) {
    console.log(`  ${r.table}: ${r.processed} rows processed`);
  }
  console.log('\n✅ Re-encrypted');
}

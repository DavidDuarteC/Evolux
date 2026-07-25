import { supabase } from '../../../shared/services/supabase';
import { transformSensitiveFields } from '../../../shared/lib/crypto';

const handleError = (error) => {
  console.error('Database error:', error);
  throw error;
};

export const getBudgets = async (userId) => {
  const { data, error } = await supabase
    .from('monthly_budgets')
    .select('*')
    .eq('user_id', userId)
    .order('year', { ascending: true })
    .order('month', { ascending: true });
  if (error) handleError(error);

  if (!data) return [];
  return Promise.all(data.map((budget) => transformSensitiveFields(budget, 'monthly_budgets', 'decrypt')));
};

export const getBudgetByMonth = async (userId, year, month) => {
  const { data, error } = await supabase
    .from('monthly_budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();
  if (error) handleError(error);

  return data ? transformSensitiveFields(data, 'monthly_budgets', 'decrypt') : null;
};

export const createBudget = async (userId, budget) => {
  const encryptedBudget = await transformSensitiveFields(
    { ...budget, user_id: userId },
    'monthly_budgets',
    'encrypt'
  );
  const { data, error } = await supabase
    .from('monthly_budgets')
    .insert([encryptedBudget])
    .select()
    .single();
  if (error) handleError(error);
  return data ? transformSensitiveFields(data, 'monthly_budgets', 'decrypt') : data;
};

export const updateBudget = async (id, userId, updates) => {
  const encryptedUpdates = await transformSensitiveFields(updates, 'monthly_budgets', 'encrypt');
  const { error } = await supabase
    .from('monthly_budgets')
    .update(encryptedUpdates)
    .eq('id', id)
    .eq('user_id', userId);
  if (error) handleError(error);
  return { success: true };
};

export const deleteBudget = async (id, userId) => {
  const { error } = await supabase
    .from('monthly_budgets')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) handleError(error);
  return { success: true };
};

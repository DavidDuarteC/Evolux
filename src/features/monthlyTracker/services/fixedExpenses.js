import { supabase } from '../../../shared/services/supabase';
import { transformSensitiveFields } from '../../../shared/lib/crypto';

const handleError = (error) => {
  console.error('Database error:', error);
  throw error;
};

export const getFixedExpenses = async (userId, budgetId = null) => {
  let query = supabase
    .from('monthly_fixed_expenses')
    .select('*')
    .eq('user_id', userId);
  if (budgetId) {
    query = query.eq('budget_id', budgetId);
  }
  const { data, error } = await query;
  if (error) handleError(error);

  if (!data) return [];
  return Promise.all(data.map((item) => transformSensitiveFields(item, 'monthly_fixed_expenses', 'decrypt')));
};

export const createFixedExpense = async (userId, item) => {
  const encryptedItem = await transformSensitiveFields(
    { ...item, user_id: userId },
    'monthly_fixed_expenses',
    'encrypt'
  );
  const { data, error } = await supabase
    .from('monthly_fixed_expenses')
    .insert([encryptedItem])
    .select()
    .single();
  if (error) handleError(error);
  return data ? transformSensitiveFields(data, 'monthly_fixed_expenses', 'decrypt') : data;
};

export const updateFixedExpense = async (id, userId, updates) => {
  const encryptedUpdates = await transformSensitiveFields(updates, 'monthly_fixed_expenses', 'encrypt');
  const { error } = await supabase
    .from('monthly_fixed_expenses')
    .update(encryptedUpdates)
    .eq('id', id)
    .eq('user_id', userId);
  if (error) handleError(error);
  return { success: true };
};

export const deleteFixedExpense = async (id, userId) => {
  const { error } = await supabase
    .from('monthly_fixed_expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) handleError(error);
  return { success: true };
};

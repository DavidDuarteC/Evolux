import { supabase } from '../../../shared/services/supabase';
import { transformSensitiveFields } from '../../../shared/lib/crypto';

const handleError = (error) => {
  console.error('Database error:', error);
  throw error;
};

export const getVariableExpenses = async (userId, budgetId) => {
  let query = supabase
    .from('monthly_variable_expenses')
    .select('*')
    .eq('user_id', userId)
    ;

  if (budgetId) {
    query = query.eq('monthly_budget_id', budgetId);
  }

  const { data, error } = await query;
  if (error) handleError(error);

  if (!data) return [];
  return Promise.all(data.map((item) => transformSensitiveFields(item, 'monthly_variable_expenses', 'decrypt')));
};

export const createVariableExpense = async (userId, budgetId, item) => {
  const encryptedItem = await transformSensitiveFields(
    { ...item, user_id: userId, monthly_budget_id: budgetId },
    'monthly_variable_expenses',
    'encrypt'
  );
  const { data, error } = await supabase
    .from('monthly_variable_expenses')
    .insert([encryptedItem])
    .select()
    .single();
  if (error) handleError(error);
  return data ? transformSensitiveFields(data, 'monthly_variable_expenses', 'decrypt') : data;
};

export const updateVariableExpense = async (id, userId, updates) => {
  const encryptedUpdates = await transformSensitiveFields(updates, 'monthly_variable_expenses', 'encrypt');
  const { error } = await supabase
    .from('monthly_variable_expenses')
    .update(encryptedUpdates)
    .eq('id', id)
    .eq('user_id', userId);
  if (error) handleError(error);
  return { success: true };
};

export const deleteVariableExpense = async (id, userId) => {
  const { error } = await supabase
    .from('monthly_variable_expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) handleError(error);
  return { success: true };
};

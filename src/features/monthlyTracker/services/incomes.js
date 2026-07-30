import { supabase } from '../../../shared/services/supabase';
import { transformSensitiveFields } from '../../../shared/lib/crypto';

const TABLE = 'monthly_incomes';

const handleError = (error) => {
  console.error('Database error:', error);
  throw error;
};

export const getIncomes = async (budgetId, userId) => {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId);
  if (budgetId) {
    query = query.eq('budget_id', budgetId);
  }
  const { data, error } = await query;
  if (error) handleError(error);
  if (!data) return [];
  return Promise.all(data.map((r) => transformSensitiveFields(r, TABLE, 'decrypt')));
};

export const createIncome = async (userId, budgetId, income) => {
  const encrypted = await transformSensitiveFields(
    { ...income, budget_id: budgetId, user_id: userId },
    TABLE,
    'encrypt'
  );
  const { data, error } = await supabase
    .from(TABLE)
    .insert([encrypted])
    .select()
    .single();
  if (error) handleError(error);
  return data ? transformSensitiveFields(data, TABLE, 'decrypt') : data;
};

export const updateIncome = async (id, userId, updates) => {
  const encryptedUpdates = await transformSensitiveFields(updates, TABLE, 'encrypt');
  const { error } = await supabase
    .from(TABLE)
    .update(encryptedUpdates)
    .eq('id', id)
    .eq('user_id', userId);
  if (error) handleError(error);
  return { success: true };
};

export const deleteIncome = async (id, userId) => {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) handleError(error);
  return { success: true };
};

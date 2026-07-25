import { supabase } from '../../../shared/services/supabase';
import { transformSensitiveFields } from '../../../shared/lib/crypto';

const handleError = (error) => {
  console.error('Database error:', error);
  throw error;
};

export const getWithdrawals = async (userId, budgetId) => {
  let query = supabase
    .from('wise_withdrawals')
    .select('*')
    .eq('user_id', userId)
    .order('withdrawal_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (budgetId) {
    query = query.eq('monthly_budget_id', budgetId);
  }

  const { data, error } = await query;
  if (error) handleError(error);

  if (!data) return [];
  return Promise.all(data.map((item) => transformSensitiveFields(item, 'wise_withdrawals', 'decrypt')));
};

export const createWithdrawal = async (userId, budgetId, withdrawal) => {
  const encryptedItem = await transformSensitiveFields(
    { ...withdrawal, user_id: userId, monthly_budget_id: budgetId },
    'wise_withdrawals',
    'encrypt'
  );
  const { data, error } = await supabase
    .from('wise_withdrawals')
    .insert([encryptedItem])
    .select()
    .single();
  if (error) handleError(error);
  return data ? transformSensitiveFields(data, 'wise_withdrawals', 'decrypt') : data;
};

export const updateWithdrawal = async (id, userId, updates) => {
  const encryptedUpdates = await transformSensitiveFields(updates, 'wise_withdrawals', 'encrypt');
  const { error } = await supabase
    .from('wise_withdrawals')
    .update(encryptedUpdates)
    .eq('id', id)
    .eq('user_id', userId);
  if (error) handleError(error);
  return { success: true };
};

export const deleteWithdrawal = async (id, userId) => {
  const { error } = await supabase
    .from('wise_withdrawals')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) handleError(error);
  return { success: true };
};

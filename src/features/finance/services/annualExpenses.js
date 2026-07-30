import { supabase } from '../../../shared/services/supabase';
import { transformSensitiveFields } from '../../../shared/lib/crypto';

const TABLE = 'annual_expenses';

const handleError = (error) => {
  console.error('Database error:', error);
  throw error;
};

export const getAnnualExpenses = async (userId) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    ;
  if (error) handleError(error);
  if (!data) return [];
  return Promise.all(data.map((r) => transformSensitiveFields(r, TABLE, 'decrypt')));
};

export const createAnnualExpense = async (userId, item) => {
  const encrypted = await transformSensitiveFields(
    { ...item, user_id: userId },
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

export const updateAnnualExpense = async (id, userId, updates) => {
  const encrypted = await transformSensitiveFields(updates, TABLE, 'encrypt');
  const { error } = await supabase
    .from(TABLE)
    .update(encrypted)
    .eq('id', id)
    .eq('user_id', userId);
  if (error) handleError(error);
  return { success: true };
};

export const deleteAnnualExpense = async (id, userId) => {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) handleError(error);
  return { success: true };
};

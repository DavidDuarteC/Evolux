import { supabase } from '../../../shared/services/supabase';
import { transformSensitiveFields } from '../../../shared/lib/crypto';

const handleError = (error) => {
  console.error('Database error:', error);
  throw error;
};

export const getDeposits = async (userId) => {
  const { data, error } = await supabase
    .from('wise_deposits')
    .select('*')
    .eq('user_id', userId)
    .order('deposit_date', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) handleError(error);

  if (!data) return [];
  return Promise.all(data.map((item) => transformSensitiveFields(item, 'wise_deposits', 'decrypt')));
};

export const createDeposit = async (userId, deposit) => {
  const encryptedItem = await transformSensitiveFields(
    { ...deposit, user_id: userId },
    'wise_deposits',
    'encrypt'
  );
  const { data, error } = await supabase
    .from('wise_deposits')
    .insert([encryptedItem])
    .select()
    .single();
  if (error) handleError(error);
  return data ? transformSensitiveFields(data, 'wise_deposits', 'decrypt') : data;
};

export const updateDeposit = async (id, userId, updates) => {
  const encryptedUpdates = await transformSensitiveFields(updates, 'wise_deposits', 'encrypt');
  const { error } = await supabase
    .from('wise_deposits')
    .update(encryptedUpdates)
    .eq('id', id)
    .eq('user_id', userId);
  if (error) handleError(error);
  return { success: true };
};

export const deleteDeposit = async (id, userId) => {
  const { error } = await supabase
    .from('wise_deposits')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) handleError(error);
  return { success: true };
};

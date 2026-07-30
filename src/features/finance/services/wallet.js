// Almacenamiento de la BILLETERA en Supabase (tabla wallet_items).
// Cada item: { id, user_id, month_key, column_type: 'actual'|'pending'|'debt', name, value, sort_order }
// RLS: cada usuario solo ve/edita lo suyo (auth.uid() = user_id).
import { supabase } from '../../../shared/services/supabase';
import { transformSensitiveFields } from '../../../shared/lib/crypto';

const handleError = (error) => {
    console.error('Wallet DB error:', error);
    throw error;
};

export const emptyMonth = () => ({ actual: [], pending: [], debt: [] });

// Devuelve los items de un mes, agrupados por columna.
export async function getWalletMonth(userId, monthKey) {
    const { data, error } = await supabase
        .from('wallet_items')
        .select('*')
        .eq('user_id', userId)
        .eq('month_key', monthKey)
        .order('created_at', { ascending: true });
    if (error) handleError(error);

    const decryptedRows = await Promise.all((data || []).map((row) => transformSensitiveFields(row, 'wallet_items', 'decrypt')));
    const grouped = emptyMonth();
    decryptedRows.forEach((r) => {
        if (grouped[r.column_type]) {
            grouped[r.column_type].push({ id: r.id, name: r.name || '', value: Number(r.value) || 0 });
        }
    });
    return grouped;
}

// Crea un item vacío en una columna y devuelve la fila creada.
export async function addWalletItem(userId, monthKey, columnType) {
    const encryptedItem = await transformSensitiveFields({
        user_id: userId,
        month_key: monthKey,
        column_type: columnType,
        name: '',
        value: 0,
    }, 'wallet_items', 'encrypt');

    const { data, error } = await supabase
        .from('wallet_items')
        .insert([encryptedItem])
        .select()
        .single();
    if (error) handleError(error);

    const decryptedData = data ? await transformSensitiveFields(data, 'wallet_items', 'decrypt') : data;
    return { id: decryptedData.id, name: decryptedData.name || '', value: Number(decryptedData.value) || 0 };
}

// Actualiza nombre/valor de un item.
export async function updateWalletItem(id, userId, fields) {
    const encryptedFields = await transformSensitiveFields(fields, 'wallet_items', 'encrypt');
    const { error } = await supabase
        .from('wallet_items')
        .update(encryptedFields)
        .eq('id', id)
        .eq('user_id', userId);
    if (error) handleError(error);
}

// Elimina un item.
export async function deleteWalletItem(id, userId) {
    const { error } = await supabase
        .from('wallet_items')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
    if (error) handleError(error);
}

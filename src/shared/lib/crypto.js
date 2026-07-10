import { supabase } from '../services/supabase';

const SENSITIVE_FIELDS = {
  accounts: {
    name: 'string',
    amount: 'number',
  },
  transactions: {
    name: 'string',
    amount: 'number',
    category: 'string',
  },
  wallet_items: {
    name: 'string',
    value: 'number',
  },
  goals: {
    title: 'string',
    target: 'number',
    current: 'number',
  },
  goal_history: {
    amount: 'number',
    note: 'string',
  },
};

const edgeFunctionName = 'finance-crypto';

const isEncryptedPayload = (value) => {
  if (typeof value !== 'string') return false;
  try {
    const parsed = JSON.parse(value);
    return Boolean(parsed && typeof parsed === 'object' && parsed.iv && parsed.cipherText);
  } catch {
    return false;
  }
};

// Detecta tanto el formato correcto {"iv":"...","cipherText":"..."} como el
// formato corrupto heredado {"value":"{\"iv\":\"...\",\"cipherText\":\"...\"}"}.
const isEncryptedOrCorruptPayload = (value) => {
  if (typeof value !== 'string') return false;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return false;
    if (parsed.iv && parsed.cipherText) return true;
    if (parsed.value && typeof parsed.value === 'string') {
      const inner = JSON.parse(parsed.value);
      return Boolean(inner && typeof inner === 'object' && inner.iv && inner.cipherText);
    }
    return false;
  } catch {
    return false;
  }
};

const callEdgeFunction = async (action, payload) => {
  const { data, error } = await supabase.functions.invoke(edgeFunctionName, {
    body: { action, ...payload },
  });

  if (error) {
    throw error;
  }

  return data;
};

export const encryptValue = async (value) => {
  if (value === null || value === undefined || value === '') {
    return value;
  }

  if (isEncryptedPayload(String(value))) {
    return value;
  }

  const result = await callEdgeFunction('encrypt', { value });
  return result.value;
};

export const decryptValue = async (value, expectedType = 'string') => {
  if (typeof value !== 'string' || !isEncryptedOrCorruptPayload(value)) {
    return value;
  }

  const payload = await callEdgeFunction('decrypt', { value, expectedType });
  return payload.value;
};

export const transformSensitiveFields = async (record, tableName, mode) => {
  if (!record || typeof record !== 'object') {
    return record;
  }

  const fields = SENSITIVE_FIELDS[tableName] || {};
  const transformed = { ...record };

  for (const [fieldName, expectedType] of Object.entries(fields)) {
    if (Object.prototype.hasOwnProperty.call(transformed, fieldName)) {
      const value = transformed[fieldName];
      if (mode === 'encrypt') {
        transformed[fieldName] = await encryptValue(value);
      } else if (mode === 'decrypt') {
        transformed[fieldName] = await decryptValue(value, expectedType);
      }
    }
  }

  return transformed;
};

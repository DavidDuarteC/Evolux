import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://tjbluywadxsbyqtxviyt.supabase.co', 
  'sb_publishable_6vRIpL85wKXSvaEK-vui3w_uRl8nYK-');

const val = '{"value":"{\\"iv\\":\\"vU501e155C8Hs7J+\\",\\"cipherText\\":\\"xcRP5zuK7GPVpmp4K9yv6IoCj1w=\\"}"}';
console.log('Input:', val.substring(0, 60));

const { data, error } = await supabase.functions.invoke('finance-crypto', {
  body: { action: 'decrypt', value: val, expectedType: 'string' }
});
console.log('Error:', error?.message || 'none');
console.log('Result:', JSON.stringify(data));

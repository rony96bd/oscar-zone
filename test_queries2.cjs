require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: c } = await supabase.from('cashout_requests').select('id, amount, status, processed_by');
  console.log('Cashouts count:', c?.length, c?.[0]);

  const { data: l } = await supabase.from('finance_logs').select('id, type, amount, created_by');
  console.log('Logs count:', l?.length, l?.[0]);

  const { data: p } = await supabase.from('game_point_purchases').select('id, amount, created_by');
  console.log('Purchases count:', p?.length, p?.[0]);
}
test();


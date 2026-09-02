require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) { console.error('Missing env'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('1. Orders:');
  const { data: o, error: e1 } = await supabase.from('orders').select('id, base_amount, updated_at, payment_method:payment_methods(name, agent_commission_rate), profile:profiles!orders_user_id_fkey(full_name), game:games(name)').eq('status', 'completed').limit(1);
  console.log(e1 || 'OK');

  console.log('2. Cashouts:');
  const { data: c, error: e2 } = await supabase.from('cashout_requests').select('id, amount, updated_at, payment_method:payment_methods(name), profile:profiles!cashout_requests_user_id_fkey(full_name)').in('status', ['completed', 'approved']).limit(1);
  console.log(e2 || 'OK');

  console.log('3. Purchases:');
  const { data: p, error: e3 } = await supabase.from('game_point_purchases').select('id, amount, created_at, game:games(name), profile:profiles(full_name)').limit(1);
  console.log(e3 || 'OK');

  console.log('4. Logs:');
  const { data: l, error: e4 } = await supabase.from('finance_logs').select('id, amount, type, method, note, log_date, created_at, profile:profiles(full_name)').limit(1);
  console.log(e4 || 'OK');
}
test();


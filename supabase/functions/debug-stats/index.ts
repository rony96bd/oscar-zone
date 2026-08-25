import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const { data: policies, error } = await supabase.from('pg_policies').select('*').eq('tablename', 'accounting_cycles');
  
  return new Response(JSON.stringify({ policies, error }), { headers: { 'Content-Type': 'application/json' } });
});

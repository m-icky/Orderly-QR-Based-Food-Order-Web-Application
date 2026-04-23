const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function findConstraints() {
  console.log('Finding relationships for orders table...');
  const { data, error } = await supabase.from('orders').select('*').limit(1);
  if (error) {
    console.error('Error selecting from orders:', error.message);
    return;
  }
  
  // We can't query information_schema directly via Supabase client usually
  // unless we have an RPC. 
  // Let's try to see if we can guess the name.
  
  const namesToTry = ['orders_shop_id_fkey', 'fk_order_shop', 'shop_id_fkey'];
  
  for (const name of namesToTry) {
    console.log(`Trying join with !${name}...`);
    const { error: joinError } = await supabase
      .from('orders')
      .select(`*, shops!${name}(name)`)
      .limit(1);
    
    if (!joinError) {
      console.log(`✅ Success with !${name}`);
      return;
    } else {
      console.log(`❌ Failed with !${name}: ${joinError.message}`);
    }
  }
}

findConstraints();

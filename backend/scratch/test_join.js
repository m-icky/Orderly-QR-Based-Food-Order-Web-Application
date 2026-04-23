const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testJoin() {
  console.log('Testing join without explicit constraint name...');
  const { data, error } = await supabase
    .from('orders')
    .select('*, shops(name)')
    .limit(1);

  if (error) {
    console.error('Join without name failed:', error.message);
  } else {
    console.log('Join without name succeeded!');
    console.log('Data:', JSON.stringify(data, null, 2));
  }

  console.log('\nTesting join WITH explicit constraint name (fk_order_shop)...');
  const { data: data2, error: error2 } = await supabase
    .from('orders')
    .select('*, shops!fk_order_shop(name)')
    .limit(1);

  if (error2) {
    console.error('Join WITH name failed:', error2.message);
  } else {
    console.log('Join WITH name succeeded!');
  }
}

testJoin();

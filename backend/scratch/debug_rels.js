const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function findConstraints() {
  console.log('Testing joins between orders and shops...');
  const tests = [
    { name: 'fk_order_shop', syntax: 'shops!fk_order_shop(name)' },
    { name: 'orders_shop_id_fkey', syntax: 'shops!orders_shop_id_fkey(name)' },
    { name: 'shop_id', syntax: 'shops!shop_id(name)' },
    { name: 'default', syntax: 'shops(name)' }
  ];
  
  for (const test of tests) {
    const { error } = await supabase.from('orders').select(test.syntax).limit(1);
    if (!error) {
      console.log(`✅ ${test.name} works: ${test.syntax}`);
    } else {
      console.log(`❌ ${test.name} fails: ${error.message}`);
    }
  }

  console.log('\nTesting joins between users and shops...');
  const userTests = [
    { name: 'fk_user_shop', syntax: 'shops!fk_user_shop(*)' },
    { name: 'users_shop_id_fkey', syntax: 'shops!users_shop_id_fkey(*)' },
    { name: 'shop_id', syntax: 'shops!shop_id(*)' },
    { name: 'default', syntax: 'shops(*)' }
  ];

  for (const test of userTests) {
    const { error } = await supabase.from('users').select(test.syntax).limit(1);
    if (!error) {
      console.log(`✅ ${test.name} works: ${test.syntax}`);
    } else {
      console.log(`❌ ${test.name} fails: ${error.message}`);
    }
  }
}

findConstraints();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkConstraints() {
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql: `
      SELECT
          conname AS constraint_name,
          contype AS constraint_type
      FROM
          pg_constraint
      WHERE
          conrelid = 'orders'::regclass;
    `
  });

  if (error) {
      console.error('Error fetching constraints:', error.message);
      console.log('Trying alternative (direct information_schema):');
      const { data: data2, error: error2 } = await supabase.from('orders').select('*').limit(1);
      if (error2) {
          console.error('Could not even select from orders:', error2.message);
      } else {
          console.log('Successfully selected from orders, but could not check constraints via RPC.');
          console.log('This usually means exec_sql RPC is not enabled.');
      }
      return;
  }

  console.log('Constraints on "orders" table:');
  console.table(data);
}

checkConstraints();

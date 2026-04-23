const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLoginQuery() {
    const email = 'superadmin@orderly.com';
    console.log('Testing query for email:', email);
    
    // Using the exact join from auth.js
    const { data: user, error } = await supabase
      .from('users')
      .select('*, shops!fk_user_shop(*)')
      .eq('email', email.toLowerCase())
      .single();

    if (error) {
        console.error('Query Error:', error);
        return;
    }

    console.log('User found:', user ? 'Yes' : 'No');
    if (user) {
        console.log('ID:', user.id);
        console.log('Role:', user.role);
        console.log('Is Active:', user.is_active);
        console.log('Shop ID:', user.shop_id);
        console.log('Shop data:', user.shops);
        console.log('Password hash start:', user.password.substring(0, 15) + '...');
    }
}

testLoginQuery();

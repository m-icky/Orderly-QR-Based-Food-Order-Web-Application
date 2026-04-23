const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPassword() {
  const email = 'superadmin@orderly.com';
  const newHash = '$2a$12$rfneTWcwHonq2DoI3mMF8.AsBW66sIOttkQu6vwq9uyJQsECXnooS'; // hash for 'superadmin123'

  console.log(`Updating password for ${email}...`);

  const { data, error } = await supabase
    .from('users')
    .update({ password: newHash })
    .eq('email', email)
    .select();

  if (error) {
    console.error('Error updating password:', error);
    process.exit(1);
  }

  console.log('Successfully updated password hash.');
  console.log('Updated user:', data[0]);
}

fixPassword();

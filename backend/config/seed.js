const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const supabase = require('./supabase');

const seed = async () => {
  const { data: existing, error } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'super_admin')
    .single();

  if (existing) {
    console.log('Super admin already exists.');
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash('superadmin123', 12);
  
  const { data: user, error: insertError } = await supabase
    .from('users')
    .insert({
      name: 'Super Admin',
      email: 'superadmin@orderly.com',
      password: hashedPassword,
      role: 'super_admin',
    })
    .select()
    .single();

  if (insertError) throw insertError;

  console.log('✅ Super Admin created:');
  console.log('   Email: superadmin@orderly.com');
  console.log('   Password: superadmin123');
  process.exit(0);
};

seed().catch(err => {
  console.error(err);
  process.exit(1);
});

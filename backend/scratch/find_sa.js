require('dotenv').config({ path: '../.env' });
const supabase = require('../config/supabase');

async function findSuperAdmin() {
    const { data, error } = await supabase
        .from('users')
        .select('email, role')
        .eq('role', 'super_admin');
    
    if (error) {
        console.error(error);
        return;
    }
    console.log(data);
}

findSuperAdmin();

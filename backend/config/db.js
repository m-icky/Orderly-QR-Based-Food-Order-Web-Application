const supabase = require('./supabase');

const connectDB = async () => {
  try {
    // Basic connectivity check: list tables or just check client config
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows found' which is fine
        throw error;
    }
    
    console.log(`✅ Supabase Connected: ${process.env.SUPABASE_URL}`);
  } catch (error) {
    console.error(`❌ Supabase connection failed: ${error.message}`);
    // We don't exit(1) here in case the tables aren't created yet during first setup
    // process.exit(1);
  }
};

module.exports = connectDB;

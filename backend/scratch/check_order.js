const supabase = require('../config/supabase');

async function checkOrder(orderId) {
    console.log(`Checking order: ${orderId}`);
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', orderId);
        
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Result:', data);
    }
}

const args = process.argv.slice(2);
if (args[0]) {
    checkOrder(args[0]);
} else {
    console.log('Please provide an orderId');
}

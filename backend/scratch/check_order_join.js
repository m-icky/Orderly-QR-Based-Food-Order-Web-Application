const supabase = require('../config/supabase');

async function checkOrderWithJoin(orderId) {
    console.log(`Checking order with join: ${orderId}`);
    const { data, error } = await supabase
        .from('orders')
        .select('*, shops!fk_orders_shop(id, name, logo)')
        .eq('order_id', orderId)
        .single();
        
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Result:', data);
    }
}

const args = process.argv.slice(2);
if (args[0]) {
    checkOrderWithJoin(args[0]);
} else {
    console.log('Please provide an orderId');
}

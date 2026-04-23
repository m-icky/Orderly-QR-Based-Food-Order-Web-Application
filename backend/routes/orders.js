const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { protect, authorize } = require('../middleware/auth');
const { getIO } = require('../socket/socketManager');

// Helper to map order properties for frontend
const mapOrder = (o) => {
  if (!o) return o;
  const mapped = {
    ...o,
    _id: o.id,
    orderId: o.order_id,
    orderStatus: o.order_status,
    paymentStatus: o.payment_status,
    paymentMethod: o.payment_method,
    totalAmount: o.total_amount,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    tableNumber: o.table_number,
    specialInstructions: o.special_instructions,
    createdAt: o.created_at,
    updatedAt: o.updated_at
  };
  
  if (o.shops) {
    mapped.shopId = { ...o.shops, _id: o.shops.id };
    delete mapped.shops;
  }
  
  return mapped;
};

// Helper to generate unique 5-digit order ID
async function generateOrderId() {
  let orderId;
  let exists = true;
  while (exists) {
    orderId = Math.floor(10000 + Math.random() * 90000).toString();
    const { data } = await supabase
      .from('orders')
      .select('order_id')
      .eq('order_id', orderId)
      .single();
    if (!data) exists = false;
  }
  return orderId;
}

// POST /api/orders — Place new order (public)
router.post('/', async (req, res) => {
  try {
    const {
      shopId, items, customerName, customerPhone,
      tableNumber, specialInstructions, paymentMethod
    } = req.body;

    if (!shopId || !items || !items.length || !paymentMethod) {
      return res.status(400).json({ message: 'shopId, items, and paymentMethod are required.' });
    }

    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopError || !shop || !shop.is_open) {
      return res.status(400).json({ message: 'Shop not found or is closed.' });
    }

    // Validate and compute total
    let totalAmount = 0;
    const orderItems = [];

    for (const cartItem of items) {
      const { data: foodItem } = await supabase
        .from('food_items')
        .select('*')
        .eq('id', cartItem.itemId)
        .single();

      if (!foodItem || !foodItem.is_available) {
        return res.status(400).json({ message: `Item "${cartItem.name}" is no longer available.` });
      }
      const qty = Math.max(1, parseInt(cartItem.quantity));
      totalAmount += foodItem.price * qty;
      orderItems.push({
        itemId: foodItem.id,
        name: foodItem.name,
        price: foodItem.price,
        quantity: qty,
        image: foodItem.image,
        isVeg: foodItem.is_veg,
      });
    }

    const orderId = await generateOrderId();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        shop_id: shopId,
        order_id: orderId,
        items: orderItems,
        total_amount: totalAmount,
        customer_name: customerName || 'Guest',
        customer_phone: customerPhone || '',
        table_number: tableNumber || '',
        special_instructions: specialInstructions || '',
        payment_method: paymentMethod,
        payment_status: 'pending',
        order_status: 'pending',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const mappedOrder = mapOrder(order);

    // Emit real-time event to admin
    const io = getIO();
    if (io) {
      io.to(`shop_${shopId}`).emit('new_order', mappedOrder);
    }

    res.status(201).json({ order: mappedOrder });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/orders/:shopId — Admin: get all orders for shop
router.get('/:shopId', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, date } = req.query;
    const from = (parseInt(page) - 1) * parseInt(limit);
    const to = from + parseInt(limit) - 1;

    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('shop_id', req.params.shopId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) query = query.eq('order_status', status);
    
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
    }

    const { data: orders, count: total, error } = await query;

    if (error) throw error;

    const mappedOrders = orders.map(o => mapOrder(o));
    res.json({ orders: mappedOrders, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/orders/single/:orderId — Get single order by orderId string
router.get('/single/:orderId', async (req, res) => {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*, shops!fk_orders_shop(id, name, logo)')
      .eq('order_id', req.params.orderId)
      .single();

    if (error || !order) return res.status(404).json({ message: 'Order not found.' });

    res.json({ order: mapOrder(order) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/orders/status — Admin: update order status
router.put('/status', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { orderId, orderStatus, paymentStatus } = req.body;

    const updates = {};
    if (orderStatus) updates.order_status = orderStatus;
    if (paymentStatus) updates.payment_status = paymentStatus;

    const { data: order, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (error || !order) return res.status(404).json({ message: 'Order not found.' });

    const mappedOrder = mapOrder(order);

    // Emit update
    const io = getIO();
    if (io) {
      io.to(`shop_${order.shop_id}`).emit('order_updated', mappedOrder);
    }

    res.json({ order: mappedOrder });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Analytics and Reports helpers (Group by in JS)
const groupOrdersForAnalytics = (orders, period) => {
  const chartData = {};
  orders.forEach(order => {
    const date = new Date(order.created_at);
    let key;
    if (period === 'daily') {
      key = `${date.getHours()}:00`;
    } else {
      key = date.toISOString().split('T')[0];
    }
    
    if (!chartData[key]) chartData[key] = { _id: key, orders: 0, revenue: 0 };
    chartData[key].orders += 1;
    chartData[key].revenue += Number(order.total_amount);
  });
  return Object.values(chartData).sort((a,b) => a._id.localeCompare(b._id));
};

// GET /api/orders/report/:shopId — Admin report generation
router.get('/report/:shopId', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;
    const shopId = req.params.shopId;
    
    const { data: shop } = await supabase.from('shops').select('*').eq('id', shopId).single();
    
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    
    if (period === 'daily') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'annually') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('shop_id', shopId)
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    const totalOrders = orders.length;
    const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total_amount), 0);
    
    const statusCounts = {};
    orders.forEach(o => {
      statusCounts[o.order_status] = (statusCounts[o.order_status] || 0) + 1;
    });
    const statusCountsArr = Object.entries(statusCounts).map(([status, count]) => ({ _id: status, count }));

    const chartData = groupOrdersForAnalytics(orders, period);

    res.json({
      period,
      startDate,
      endDate: new Date(),
      totalOrders,
      totalRevenue,
      statusCounts: statusCountsArr,
      chartData,
      downloadedBy: req.user.name,
      shopDetails: shop ? { name: shop.name, address: shop.address, phone: shop.phone } : { name: 'Unknown Shop' },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/orders/analytics/:shopId — Admin analytics
router.get('/analytics/:shopId', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const shopId = req.params.shopId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: allOrders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('shop_id', shopId);

    if (error) throw error;

    const totalOrders = allOrders.length;
    const todayOrders = allOrders.filter(o => new Date(o.created_at) >= today).length;
    const pendingOrders = allOrders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.order_status)).length;
    
    const totalRevenue = allOrders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total_amount), 0);
    const todayRevenue = allOrders.filter(o => o.payment_status === 'paid' && new Date(o.created_at) >= today).reduce((sum, o) => sum + Number(o.total_amount), 0);
    
    const statusCounts = {};
    allOrders.forEach(o => {
      statusCounts[o.order_status] = (statusCounts[o.order_status] || 0) + 1;
    });
    const statusCountsArr = Object.entries(statusCounts).map(([status, count]) => ({ _id: status, count }));

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const weeklyOrders = allOrders.filter(o => new Date(o.created_at) >= lastWeek);
    const weeklyData = groupOrdersForAnalytics(weeklyOrders, 'weekly');

    res.json({
      totalOrders,
      todayOrders,
      pendingOrders,
      totalRevenue,
      todayRevenue,
      statusCounts: statusCountsArr,
      weeklyData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/orders/simulate-upi-payment — Simulate UPI payment
router.post('/simulate-upi-payment', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    const { data: order, error } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        upi_transaction_id: 'UPI' + Date.now()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error || !order) return res.status(404).json({ message: 'Order not found.' });

    const mappedOrder = mapOrder(order);

    const io = getIO();
    if (io) {
      io.to(`shop_${order.shop_id}`).emit('order_updated', mappedOrder);
    }

    res.json({ order: mappedOrder, message: 'UPI payment simulated successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

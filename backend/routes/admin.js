const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { protect, authorize } = require('../middleware/auth');
const QRCode = require('qrcode');
const mapOrder = require('../utils/mapOrder');
const { tryResilientJoin } = require('../utils/supabaseUtils');

// POST /api/admin/create — Super Admin only
router.post('/create', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { name, email, password, shopName, shopDescription, address, phone, upiId } = req.body;

    if (!name || !email || !password || !shopName) {
      return res.status(400).json({ message: 'Name, email, password, and shop name are required.' });
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({ name, email: email.toLowerCase(), password: hashedPassword, role: 'admin' })
      .select()
      .single();

    if (userError) throw userError;

    // Create shop
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .insert({
        name: shopName,
        description: shopDescription || '',
        owner_id: user.id,
        address: address || '',
        phone: phone || '',
        upi_id: upiId || '',
      })
      .select()
      .single();

    if (shopError) throw shopError;

    // Generate QR code URL
    const shopUrl = `${process.env.CLIENT_URL}/shop/${shop.id}`;
    const qrCode = await QRCode.toDataURL(shopUrl, { width: 300, margin: 2 });

    // Update shop with QR code
    const { data: updatedShop } = await supabase
      .from('shops')
      .update({ qr_code: qrCode })
      .eq('id', shop.id)
      .select()
      .single();

    // Update user with shop_id
    await supabase
      .from('users')
      .update({ shop_id: shop.id })
      .eq('id', user.id);

    updatedShop._id = updatedShop.id;
    user._id = user.id;

    res.status(201).json({
      message: 'Admin and shop created successfully.',
      user: { _id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.is_active },
      shop: updatedShop,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/list — Super Admin
router.get('/list', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { data: admins, error } = await tryResilientJoin(
      supabase,
      'users',
      '*',
      'shops',
      '*',
      (q) => q.eq('role', 'admin').order('created_at', { ascending: false })
    );

    if (error) throw error;

    const mappedAdmins = admins.map(admin => {
      admin._id = admin.id;
      admin.isActive = admin.is_active;
      if (admin.shops) {
        admin.shopId = { ...admin.shops, _id: admin.shops.id };
        delete admin.shops;
      }
      return admin;
    });

    res.json({ admins: mappedAdmins });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/:id — Super Admin
router.put('/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { name, email, isActive } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (isActive !== undefined) updates.is_active = isActive;

    let { data: user, error } = await tryResilientJoin(
      supabase,
      'users',
      '*',
      'shops',
      '*',
      (q) => q.update(updates).eq('id', req.params.id).select()
    );
    if (Array.isArray(user)) user = user[0];

    if (error || !user) return res.status(404).json({ message: 'Admin not found.' });

    user._id = user.id;
    user.isActive = user.is_active;
    if (user.shops) {
      user.shopId = { ...user.shops, _id: user.shops.id };
      delete user.shops;
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/admin/:id — Super Admin
router.delete('/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Admin deactivated.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper for group analytics logic
const groupOrdersInJS = (orders, period) => {
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

// GET /api/admin/analytics — Super Admin global analytics
router.get('/analytics/global', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { data: orders, error: ordersError } = await tryResilientJoin(
      supabase, 
      'orders', 
      '*', 
      'shops', 
      'name', 
      (q) => q.order('created_at', { ascending: false })
    );

    if (ordersError) throw ordersError;

    const { count: totalAdmins } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('is_active', true);
    const { count: totalShops } = await supabase.from('shops').select('id', { count: 'exact', head: true });
    
    const totalOrders = orders.length;
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayOrders = orders.filter(o => new Date(o.created_at) >= today).length;
    
    const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total_amount), 0);
    
    const recentOrders = orders.slice(0, 10).map(o => mapOrder(o));

    res.json({ totalAdmins, totalShops, totalOrders, todayOrders, totalRevenue, recentOrders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/report/global — Super Admin report generation
router.get('/report/global', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;
    
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
        .gte('created_at', startDate.toISOString());

    if (error) throw error;

    const totalOrders = orders.length;
    const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total_amount), 0);
    
    const statusCounts = {};
    orders.forEach(o => {
        statusCounts[o.order_status] = (statusCounts[o.order_status] || 0) + 1;
    });
    const statusCountsArr = Object.entries(statusCounts).map(([status, count]) => ({ _id: status, count }));

    const chartData = groupOrdersInJS(orders, period);

    res.json({
      period,
      startDate,
      endDate: new Date(),
      totalOrders,
      totalRevenue,
      statusCounts: statusCountsArr,
      chartData,
      downloadedBy: req.user.name,
      shopDetails: { name: 'Global Network - All Shops', phone: '', address: '' }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

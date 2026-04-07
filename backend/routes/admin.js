const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Shop = require('../models/Shop');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');
const QRCode = require('qrcode');

// POST /api/admin/create — Super Admin only
router.post('/create', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { name, email, password, shopName, shopDescription, address, phone, upiId } = req.body;

    if (!name || !email || !password || !shopName) {
      return res.status(400).json({ message: 'Name, email, password, and shop name are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use.' });
    }

    // Create user
    const user = await User.create({ name, email, password, role: 'admin' });

    // Generate QR code placeholder (will be updated after shop creation)
    const shop = await Shop.create({
      name: shopName,
      description: shopDescription || '',
      ownerId: user._id,
      address: address || '',
      phone: phone || '',
      upiId: upiId || '',
    });

    // Generate QR code URL
    const shopUrl = `${process.env.CLIENT_URL}/shop/${shop._id}`;
    const qrCode = await QRCode.toDataURL(shopUrl, { width: 300, margin: 2 });

    shop.qrCode = qrCode;
    await shop.save();

    user.shopId = shop._id;
    await user.save();

    res.status(201).json({
      message: 'Admin and shop created successfully.',
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      shop,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/list — Super Admin
router.get('/list', protect, authorize('super_admin'), async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).populate('shopId').sort({ createdAt: -1 });
    res.json({ admins });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/:id — Super Admin
router.put('/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { name, email, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, isActive },
      { new: true, runValidators: true }
    ).populate('shopId');

    if (!user) return res.status(404).json({ message: 'Admin not found.' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/admin/:id — Super Admin
router.delete('/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Admin not found.' });

    user.isActive = false;
    await user.save();
    res.json({ message: 'Admin deactivated.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/analytics — Super Admin global analytics
router.get('/analytics/global', protect, authorize('super_admin'), async (req, res) => {
  try {
    const totalAdmins = await User.countDocuments({ role: 'admin', isActive: true });
    const totalShops = await Shop.countDocuments();
    const totalOrders = await Order.countDocuments();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = await Order.countDocuments({ createdAt: { $gte: today } });

    const revenueAgg = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    const recentOrders = await Order.find()
      .populate('shopId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

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
    let groupingFormat = '%Y-%m-%d';
    
    if (period === 'daily') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      groupingFormat = '%H:00';
    } else if (period === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'annually') {
      startDate.setFullYear(startDate.getFullYear() - 1);
      groupingFormat = '%Y-%m';
    }

    const [
      totalOrders,
      totalRevenueAgg,
      statusCounts,
      chartData
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: startDate } }),
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: period === 'daily' 
                  ? { $dateToString: { format: '%H:00', date: '$createdAt' } } 
                  : { $dateToString: { format: groupingFormat, date: '$createdAt' } },
            orders: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      period,
      startDate,
      endDate: new Date(),
      totalOrders,
      totalRevenue: totalRevenueAgg[0]?.total || 0,
      statusCounts,
      chartData,
      downloadedBy: req.user.name,
      shopDetails: { name: 'Global Network - All Shops', phone: '', address: '' }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

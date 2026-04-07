const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const FoodItem = require('../models/FoodItem');
const Shop = require('../models/Shop');
const { protect, authorize } = require('../middleware/auth');
const { getIO } = require('../socket/socketManager');

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

    const shop = await Shop.findById(shopId);
    if (!shop || !shop.isOpen) {
      return res.status(400).json({ message: 'Shop not found or is closed.' });
    }

    // Validate and compute total
    let totalAmount = 0;
    const orderItems = [];

    for (const cartItem of items) {
      const foodItem = await FoodItem.findById(cartItem.itemId);
      if (!foodItem || !foodItem.isAvailable) {
        return res.status(400).json({ message: `Item "${cartItem.name}" is no longer available.` });
      }
      const qty = Math.max(1, parseInt(cartItem.quantity));
      totalAmount += foodItem.price * qty;
      orderItems.push({
        itemId: foodItem._id,
        name: foodItem.name,
        price: foodItem.price,
        quantity: qty,
        image: foodItem.image,
        isVeg: foodItem.isVeg,
      });
    }

    const orderId = await Order.generateOrderId();

    const order = await Order.create({
      shopId,
      orderId,
      items: orderItems,
      totalAmount,
      customerName: customerName || 'Guest',
      customerPhone: customerPhone || '',
      tableNumber: tableNumber || '',
      specialInstructions: specialInstructions || '',
      paymentMethod,
      paymentStatus: paymentMethod === 'upi' ? 'pending' : 'pending',
      orderStatus: 'pending',
    });

    // Emit real-time event to admin
    const io = getIO();
    if (io) {
      io.to(`shop_${shopId}`).emit('new_order', order);
    }

    res.status(201).json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/orders/:shopId — Admin: get all orders for shop
router.get('/:shopId', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, date } = req.query;

    const filter = { shopId: req.params.shopId };
    if (status) filter.orderStatus = status;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({ orders, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/orders/single/:orderId — Get single order by orderId string
router.get('/single/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId }).populate('shopId', 'name logo');
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/orders/status — Admin: update order status
router.put('/status', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { orderId, orderStatus, paymentStatus } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    await order.save();

    // Emit update
    const io = getIO();
    if (io) {
      io.to(`shop_${order.shopId}`).emit('order_updated', order);
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/orders/report/:shopId — Admin report generation
router.get('/report/:shopId', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;
    const shopId = req.params.shopId;
    
    const shop = await Shop.findById(shopId);
    
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
      Order.countDocuments({ shopId, createdAt: { $gte: startDate } }),
      Order.aggregate([
        { $match: { shopId: require('mongoose').Types.ObjectId.createFromHexString(shopId), paymentStatus: 'paid', createdAt: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Order.aggregate([
        { $match: { shopId: require('mongoose').Types.ObjectId.createFromHexString(shopId), createdAt: { $gte: startDate } } },
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        {
          $match: {
            shopId: require('mongoose').Types.ObjectId.createFromHexString(shopId),
            createdAt: { $gte: startDate }
          }
        },
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
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalOrders,
      todayOrders,
      pendingOrders,
      revenueAgg,
      todayRevenueAgg,
      statusCounts,
      weeklyData
    ] = await Promise.all([
      Order.countDocuments({ shopId }),
      Order.countDocuments({ shopId, createdAt: { $gte: today } }),
      Order.countDocuments({ shopId, orderStatus: { $in: ['pending', 'confirmed', 'preparing'] } }),
      Order.aggregate([
        { $match: { shopId: require('mongoose').Types.ObjectId.createFromHexString(shopId), paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Order.aggregate([
        { $match: { shopId: require('mongoose').Types.ObjectId.createFromHexString(shopId), paymentStatus: 'paid', createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Order.aggregate([
        { $match: { shopId: require('mongoose').Types.ObjectId.createFromHexString(shopId) } },
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        {
          $match: {
            shopId: require('mongoose').Types.ObjectId.createFromHexString(shopId),
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            orders: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      totalOrders,
      todayOrders,
      pendingOrders,
      totalRevenue: revenueAgg[0]?.total || 0,
      todayRevenue: todayRevenueAgg[0]?.total || 0,
      statusCounts,
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
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    order.paymentStatus = 'paid';
    order.upiTransactionId = 'UPI' + Date.now();
    await order.save();

    const io = getIO();
    if (io) {
      io.to(`shop_${order.shopId}`).emit('order_updated', order);
    }

    res.json({ order, message: 'UPI payment simulated successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

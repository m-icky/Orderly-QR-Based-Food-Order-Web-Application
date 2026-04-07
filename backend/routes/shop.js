const express = require('express');
const router = express.Router();
const Shop = require('../models/Shop');
const FoodItem = require('../models/FoodItem');
const { protect, authorize } = require('../middleware/auth');
const QRCode = require('qrcode');
const upload = require('../middleware/upload');

// GET /api/shop/:id — Public (customer)
router.get('/:id', async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found.' });

    const foodItems = await FoodItem.find({ shopId: shop._id, isAvailable: true })
      .sort({ category: 1, sortOrder: 1 });

    // Group by category
    const menu = {};
    foodItems.forEach(item => {
      if (!menu[item.category]) menu[item.category] = [];
      menu[item.category].push(item);
    });

    res.json({ shop, menu, categories: Object.keys(menu) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/shop/admin/me — Admin's own shop
router.get('/admin/me', protect, authorize('admin'), async (req, res) => {
  try {
    const shop = await Shop.findOne({ ownerId: req.user._id });
    if (!shop) return res.status(404).json({ message: 'Shop not found.' });
    res.json({ shop });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/shop/:id — Admin update own shop
router.put('/:id', protect, authorize('admin', 'super_admin'), upload.single('logo'), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found.' });

    // Ensure admin can only update their own shop
    if (req.user.role === 'admin' && shop.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this shop.' });
    }

    const updates = { ...req.body };
    if (req.file) {
      updates.logo = `/uploads/${req.file.filename}`;
    }

    Object.assign(shop, updates);
    await shop.save();

    res.json({ shop });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/shop/:id/regenerate-qr — Regenerate QR code
router.post('/:id/regenerate-qr', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found.' });

    const shopUrl = `${process.env.CLIENT_URL}/shop/${shop._id}`;
    const qrCode = await QRCode.toDataURL(shopUrl, { width: 300, margin: 2 });
    shop.qrCode = qrCode;
    await shop.save();

    res.json({ qrCode: shop.qrCode, shopUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

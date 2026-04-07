const express = require('express');
const router = express.Router();
const FoodItem = require('../models/FoodItem');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET /api/food/:shopId — All items for a shop (admin view, includes unavailable)
router.get('/:shopId', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const items = await FoodItem.find({ shopId: req.params.shopId })
      .sort({ category: 1, sortOrder: 1 });
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/food — Create food item
router.post('/', protect, authorize('admin'), upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, isVeg, isAvailable, tags } = req.body;
    let image = req.body.image;
    
    if (req.file) {
      image = `/uploads/${req.file.filename}`;
    }

    if (!name || !price || !category) {
      return res.status(400).json({ message: 'Name, price, and category are required.' });
    }

    const shopId = req.user.shopId;
    if (!shopId) return res.status(400).json({ message: 'Admin has no shop assigned.' });

    const item = await FoodItem.create({
      shopId, name, description, price, image, category,
      isVeg: isVeg !== undefined ? isVeg : true,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      tags: tags || [],
    });

    res.status(201).json({ item });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/food/:id — Update food item
router.put('/:id', protect, authorize('admin'), upload.single('image'), async (req, res) => {
  try {
    const item = await FoodItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Food item not found.' });

    // Ensure admin owns this item
    if (item.shopId.toString() !== req.user.shopId?.toString()) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    const updates = { ...req.body };
    if (req.file) {
      updates.image = `/uploads/${req.file.filename}`;
    }

    Object.assign(item, updates);
    await item.save();
    res.json({ item });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/food/:id — Delete food item
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const item = await FoodItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Food item not found.' });

    if (item.shopId.toString() !== req.user.shopId?.toString()) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    await item.deleteOne();
    res.json({ message: 'Food item deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/food/:id/toggle — Toggle availability
router.patch('/:id/toggle', protect, authorize('admin'), async (req, res) => {
  try {
    const item = await FoodItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Food item not found.' });

    if (item.shopId.toString() !== req.user.shopId?.toString()) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    item.isAvailable = !item.isAvailable;
    await item.save();
    res.json({ item });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadToSupabase } = require('../utils/supabaseStorage');

// GET /api/food/shop/:shopId — public (customer)
router.get('/shop/:shopId', async (req, res) => {
  try {
    const { data: items, error } = await supabase
      .from('food_items')
      .select('*')
      .eq('shop_id', req.params.shopId)
      .eq('is_available', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    const mappedItems = items.map(item => ({ ...item, _id: item.id }));
    res.json(mappedItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/food/admin/me — admin's own food items
router.get('/admin/me', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: items, error } = await supabase
      .from('food_items')
      .select('*')
      .eq('shop_id', req.user.shop_id)
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) throw error;

    const mappedItems = items.map(item => ({ ...item, _id: item.id }));
    res.json(mappedItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/food — admin create item
router.post('/', protect, authorize('admin'), upload.single('image'), async (req, res) => {
  try {
    const itemData = {
      ...req.body,
      shop_id: req.user.shop_id,
      price: parseFloat(req.body.price),
      is_veg: req.body.is_veg === 'true' || req.body.is_veg === true,
      is_available: req.body.is_available === 'true' || req.body.is_available === true,
      sort_order: parseInt(req.body.sort_order || 0),
    };

    if (req.file) {
      itemData.image = await uploadToSupabase(req.file);
    }

    // Handle tags if sent as string
    if (typeof itemData.tags === 'string') {
      itemData.tags = itemData.tags.split(',').map(t => t.trim()).filter(t => t);
    }

    const { data: item, error } = await supabase
      .from('food_items')
      .insert(itemData)
      .select()
      .single();

    if (error) throw error;

    item._id = item.id;
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/food/:id — admin update item
router.put('/:id', protect, authorize('admin'), upload.single('image'), async (req, res) => {
  try {
    const updates = {
      ...req.body,
    };

    if (updates.price) updates.price = parseFloat(updates.price);
    if (updates.is_veg !== undefined) updates.is_veg = updates.is_veg === 'true' || updates.is_veg === true;
    if (updates.is_available !== undefined) updates.is_available = updates.is_available === 'true' || updates.is_available === true;
    if (updates.sort_order) updates.sort_order = parseInt(updates.sort_order);

    if (req.file) {
      updates.image = await uploadToSupabase(req.file);
    }

    if (typeof updates.tags === 'string') {
      updates.tags = updates.tags.split(',').map(t => t.trim()).filter(t => t);
    }

    // Clean updates
    delete updates._id;
    delete updates.id;
    delete updates.shop_id;
    delete updates.created_at;
    delete updates.updated_at;

    const { data: item, error } = await supabase
      .from('food_items')
      .update(updates)
      .eq('id', req.params.id)
      .eq('shop_id', req.user.shop_id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ message: 'Item not found.' });
      throw error;
    }

    item._id = item.id;
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/food/:id/toggle — Toggle availability
router.patch('/:id/toggle', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: item, error: fetchError } = await supabase
      .from('food_items')
      .select('is_available')
      .eq('id', req.params.id)
      .eq('shop_id', req.user.shop_id)
      .single();

    if (fetchError || !item) return res.status(404).json({ message: 'Item not found.' });

    const { data: updatedItem, error: updateError } = await supabase
      .from('food_items')
      .update({ is_available: !item.is_available })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    updatedItem._id = updatedItem.id;
    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/food/:id — admin delete item
router.delete('/:id', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('food_items')
      .delete()
      .eq('id', req.params.id)
      .eq('shop_id', req.user.shop_id);

    if (error) throw error;

    res.json({ message: 'Item deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

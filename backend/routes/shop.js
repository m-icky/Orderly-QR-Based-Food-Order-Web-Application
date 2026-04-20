const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { protect, authorize } = require('../middleware/auth');
const QRCode = require('qrcode');
const upload = require('../middleware/upload');
const { uploadToSupabase } = require('../utils/supabaseStorage');

// GET /api/shop/:id — Public (customer)
router.get('/:id', async (req, res) => {
  try {
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (shopError || !shop) return res.status(404).json({ message: 'Shop not found.' });

    const { data: foodItems, error: itemsError } = await supabase
      .from('food_items')
      .select('*')
      .eq('shop_id', shop.id)
      .eq('is_available', true)
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });

    if (itemsError) throw itemsError;

    // Group by category
    const menu = {};
    foodItems.forEach(item => {
      // Map id to _id for frontend
      const mappedItem = { ...item, _id: item.id };
      if (!menu[mappedItem.category]) menu[mappedItem.category] = [];
      menu[mappedItem.category].push(mappedItem);
    });

    // Map shop id to _id
    shop._id = shop.id;

    res.json({ shop, menu, categories: Object.keys(menu) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/shop/admin/me — Admin's own shop
router.get('/admin/me', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: shop, error } = await supabase
      .from('shops')
      .select('*')
      .eq('owner_id', req.user.id)
      .single();

    if (error || !shop) return res.status(404).json({ message: 'Shop not found.' });
    
    shop._id = shop.id;
    res.json({ shop });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/shop/:id — Admin update own shop
router.put('/:id', protect, authorize('admin', 'super_admin'), upload.single('logo'), async (req, res) => {
  try {
    const { data: shop, error: fetchError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !shop) return res.status(404).json({ message: 'Shop not found.' });

    // Ensure admin can only update their own shop
    if (req.user.role === 'admin' && shop.owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this shop.' });
    }

    const updates = { ...req.body };
    
    // Remove Mongoose-specific or read-only fields if they slipped in
    delete updates._id;
    delete updates.id;
    delete updates.owner_id;
    delete updates.created_at;
    delete updates.updated_at;

    if (req.file) {
      updates.logo = await uploadToSupabase(req.file);
    }

    // Convert string fields if needed (Supabase might handle this based on types)
    if (updates.is_open) updates.is_open = updates.is_open === 'true';

    const { data: updatedShop, error: updateError } = await supabase
      .from('shops')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    updatedShop._id = updatedShop.id;
    res.json({ shop: updatedShop });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/shop/:id/regenerate-qr — Regenerate QR code
router.post('/:id/regenerate-qr', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { data: shop, error: fetchError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !shop) return res.status(404).json({ message: 'Shop not found.' });

    const shopUrl = `${process.env.CLIENT_URL}/shop/${shop.id}`;
    const qrCode = await QRCode.toDataURL(shopUrl, { width: 300, margin: 2 });
    
    const { data: updatedShop, error: updateError } = await supabase
      .from('shops')
      .update({ qr_code: qrCode })
      .eq('id', shop.id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({ qrCode: updatedShop.qr_code, shopUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

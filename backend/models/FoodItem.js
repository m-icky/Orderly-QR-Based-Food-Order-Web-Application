const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, default: '' },
  category: { type: String, required: true, trim: true },
  isVeg: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
  tags: [{ type: String }],
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

foodItemSchema.index({ shopId: 1, category: 1 });

module.exports = mongoose.model('FoodItem', foodItemSchema);

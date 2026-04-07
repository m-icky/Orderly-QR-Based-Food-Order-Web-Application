const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  logo: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  qrCode: { type: String, default: '' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  upiId: { type: String, default: '' },
  isOpen: { type: Boolean, default: true },
  categories: [{ type: String }],
  theme: { type: String, default: '#FF6B35' },
}, { timestamps: true });

module.exports = mongoose.model('Shop', shopSchema);

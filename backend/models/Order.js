const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodItem', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String, default: '' },
  isVeg: { type: Boolean, default: true },
});

const orderSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  orderId: {
    type: String,
    unique: true,
    required: true,
  },
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true, min: 0 },
  customerName: { type: String, default: 'Guest' },
  customerPhone: { type: String, default: '' },
  tableNumber: { type: String, default: '' },
  specialInstructions: { type: String, default: '' },
  paymentMethod: {
    type: String,
    enum: ['cod', 'upi'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'pending'
  },
  upiTransactionId: { type: String, default: '' },
}, { timestamps: true });

orderSchema.index({ shopId: 1, createdAt: -1 });
orderSchema.index({ orderId: 1 });

// Generate unique 5-digit order ID
orderSchema.statics.generateOrderId = async function() {
  let orderId;
  let exists = true;
  while (exists) {
    orderId = Math.floor(10000 + Math.random() * 90000).toString();
    exists = await this.findOne({ orderId });
  }
  return orderId;
};

module.exports = mongoose.model('Order', orderSchema);

/**
 * Standardizes Supabase order data for the frontend.
 * Maps snake_case database columns to camelCase properties.
 */
const mapOrder = (o) => {
  if (!o) return o;
  const mapped = {
    ...o,
    _id: o.id,
    orderId: o.order_id,
    orderStatus: o.order_status,
    paymentStatus: o.payment_status,
    paymentMethod: o.payment_method,
    totalAmount: o.total_amount,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    tableNumber: o.table_number,
    specialInstructions: o.special_instructions,
    createdAt: o.created_at,
    updatedAt: o.updated_at
  };
  
  if (o.shops) {
    mapped.shopId = { ...o.shops, _id: o.shops.id };
    delete mapped.shops;
  }
  
  return mapped;
};

module.exports = mapOrder;

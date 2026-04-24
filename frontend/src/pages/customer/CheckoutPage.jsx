import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, CreditCard, Wallet, User, Phone, Hash, MessageSquare } from 'lucide-react'
import api from '../../utils/api'
import useCartStore from '../../store/cartStore'
import { formatCurrency } from '../../utils/format'
import toast from 'react-hot-toast'

export default function CheckoutPage() {
  const { shopId } = useParams()
  const navigate = useNavigate()
  const { items, getTotal, clearCart } = useCartStore()
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [form, setForm] = useState({
    customerName: '', customerPhone: '', tableNumber: '', specialInstructions: ''
  })

  const { data: shopData } = useQuery({
    queryKey: ['shop-mini', shopId],
    queryFn: () => api.get(`/api/shop/${shopId}`).then(r => r.data),
  })

  const total = getTotal()
  const gst = Math.round(total * 0.05)
  const grandTotal = total + gst

  const placeMutation = useMutation({
    mutationFn: (body) => api.post('/api/orders', body),
    onSuccess: ({ data }) => {
      const order = data.order
      clearCart()
      if (paymentMethod === 'upi') {
        navigate(`/shop/${shopId}/upi-payment/${order.orderId}`)
      } else {
        navigate(`/shop/${shopId}/order-success/${order.orderId}`)
      }
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed to place order'),
  })

  const handlePlace = () => {
    if (items.length === 0) return toast.error('Cart is empty')
    placeMutation.mutate({
      shopId,
      items: items.map(i => ({ itemId: i.itemId, name: i.name, quantity: i.quantity })),
      paymentMethod,
      ...form,
    })
  }

  const shop = shopData?.shop

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="bg-white sticky top-0 z-20 px-4 py-4 border-b border-gray-100 flex items-center gap-3">
          <button onClick={() => navigate(`/shop/${shopId}/cart`)} className="p-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display font-700 text-gray-900 text-lg">Checkout</h1>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* Customer Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <h2 className="font-display font-600 text-gray-800 text-sm">Your Details <span className="text-gray-400 font-normal">(optional)</span></h2>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={form.customerName}
                onChange={e => setForm({ ...form, customerName: e.target.value })}
                placeholder="Your name"
                className="input pl-9"
              />
            </div>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={form.customerPhone}
                onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                placeholder="Phone number"
                className="input pl-9"
              />
            </div>
            <div className="relative">
              <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={form.tableNumber}
                onChange={e => setForm({ ...form, tableNumber: e.target.value })}
                placeholder="Table number (if dine-in)"
                className="input pl-9"
              />
            </div>
            <div className="relative">
              <MessageSquare size={14} className="absolute left-3 top-3 text-gray-400" />
              <textarea
                value={form.specialInstructions}
                onChange={e => setForm({ ...form, specialInstructions: e.target.value })}
                placeholder="Special instructions (e.g. no onions, extra spicy)..."
                className="input pl-9 resize-none"
                rows={2}
              />
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h2 className="font-display font-600 text-gray-800 text-sm mb-3">Order Summary</h2>
            <div className="space-y-2 text-sm">
              {items.map(item => (
                <div key={item.itemId} className="flex justify-between text-gray-600">
                  <span className="truncate flex-1">{item.name} × {item.quantity}</span>
                  <span className="ml-2 flex-shrink-0">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-gray-100 pt-2 mt-1 space-y-1">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(total)}</span></div>
                <div className="flex justify-between text-gray-500"><span>GST (5%)</span><span>{formatCurrency(gst)}</span></div>
                <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
                  <span>Total</span>
                  <span className="text-brand-500">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h2 className="font-display font-600 text-gray-800 text-sm mb-3">Payment Method</h2>
            <div className="space-y-2">
              <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-brand-400 bg-brand-50' : 'border-gray-200 bg-white'}`}>
                <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="hidden" />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === 'cod' ? 'border-brand-500' : 'border-gray-300'}`}>
                  {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />}
                </div>
                <Wallet size={18} className="text-brand-500" />
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Cash on Delivery</p>
                  <p className="text-xs text-gray-400">Pay when you receive your order</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'upi' ? 'border-brand-400 bg-brand-50' : 'border-gray-200 bg-white'}`}>
                <input type="radio" name="payment" value="upi" checked={paymentMethod === 'upi'} onChange={() => setPaymentMethod('upi')} className="hidden" />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === 'upi' ? 'border-brand-500' : 'border-gray-300'}`}>
                  {paymentMethod === 'upi' && <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />}
                </div>
                <CreditCard size={18} className="text-brand-500" />
                <div>
                  <p className="font-semibold text-gray-800 text-sm">UPI Payment</p>
                  <p className="text-xs text-gray-400">{shop?.upiId ? `Pay to ${shop.upiId}` : 'Pay via UPI'}</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Place Order */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handlePlace}
            disabled={placeMutation.isPending}
            className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2"
          >
            {placeMutation.isPending ? 'Placing Order...' : (
              <>
                Place Order · <span className="font-bold">{formatCurrency(grandTotal)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

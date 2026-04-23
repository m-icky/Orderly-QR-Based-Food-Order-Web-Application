import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Clock, ChefHat, ArrowLeft, Phone } from 'lucide-react'
import api from '../../utils/api'
import { formatCurrency, formatDate, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../../utils/format'

const STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'completed']

export default function OrderSuccessPage() {
  const { shopId, orderId } = useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.get(`/api/orders/single/${orderId}`).then(r => r.data),
    refetchInterval: 10000,
  })

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse">
          <CheckCircle size={28} className="text-green-500" />
        </div>
        <p className="text-gray-400">Loading your order...</p>
      </div>
    </div>
  )

  const order = data?.order
  if (!order) return null

  const currentStep = STEPS.indexOf(order.orderStatus)
  const sc = ORDER_STATUS_COLORS[order.orderStatus] || ORDER_STATUS_COLORS.pending

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-lg mx-auto px-4">
        {/* Success header */}
        <div className="text-center pt-12 pb-6 animate-slide-up">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h1 className="font-display text-2xl font-700 text-gray-900">Order Placed!</h1>
          <p className="text-gray-500 mt-1 text-sm">Your order has been received</p>
        </div>

        {/* Order ID card */}
        <div className="bg-brand-500 rounded-2xl p-5 text-white text-center mb-4 shadow-lg shadow-brand-200">
          <p className="text-sm text-white/70">Order ID</p>
          <p className="text-4xl font-display font-800 tracking-wider mt-1">#{order.orderId}</p>
          <p className="text-sm text-white/70 mt-1">Save this ID to track your order</p>
        </div>

        {/* Status */}
        <div className={`rounded-2xl border p-4 mb-4 ${sc.bg} ${sc.border}`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${sc.dot}`} />
            <p className={`font-semibold ${sc.text}`}>Status: {ORDER_STATUS_LABELS[order.orderStatus] || order.orderStatus || 'Pending'}</p>
          </div>

          {/* Progress bar */}
          <div className="mt-3 flex items-center gap-1">
            {STEPS.slice(0, 5).map((step, i) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`flex-1 h-1.5 rounded-full transition-all ${i <= currentStep ? 'bg-brand-500' : 'bg-gray-200'}`} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {STEPS.slice(0, 5).map((step, i) => (
              <span key={step} className={`text-xs capitalize ${i === currentStep ? 'text-brand-600 font-semibold' : i < currentStep ? 'text-gray-500' : 'text-gray-300'}`}>
                {step}
              </span>
            ))}
          </div>
        </div>

        {/* Order details */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <h2 className="font-display font-600 text-gray-800 mb-3">Order Details</h2>
          <div className="space-y-2 text-sm">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="flex-1 text-gray-700">{item.name}</span>
                <span className="text-gray-400">×{item.quantity}</span>
                <span className="font-medium text-gray-800">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
              {order.tableNumber && (
                <div className="flex justify-between text-gray-500">
                  <span>Table</span><span>{order.tableNumber}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>Payment</span>
                <span className="capitalize">{order.paymentMethod.toUpperCase()} · {order.paymentStatus}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
                <span>Total Paid</span>
                <span className="text-brand-500">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Shop info */}
        {order.shopId && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
              <ChefHat size={18} className="text-brand-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{order.shopId.name}</p>
              <p className="text-xs text-gray-400">Ordered at {formatDate(order.createdAt)}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/shop/${shopId}`)}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <ArrowLeft size={15} /> Order More
          </button>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Clock size={15} /> Refresh Status
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Filter, ChefHat, Phone, MessageSquare, RefreshCw } from 'lucide-react'
import api from '../../utils/api'
import useAuthStore from '../../store/authStore'
import { useSocket } from '../../hooks/useSocket'
import { formatCurrency, formatDate, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../../utils/format'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']

export default function AdminOrders() {
  const { user } = useAuthStore()
  const shopId = user?.shopId?._id || user?.shopId
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['orders', shopId, filter],
    queryFn: () => api.get(`/api/orders/${shopId}?${filter !== 'all' ? `status=${filter}&` : ''}limit=50`).then(r => r.data),
    enabled: !!shopId,
    refetchInterval: 15000,
  })

  const updateMutation = useMutation({
    mutationFn: ({ orderId, orderStatus, paymentStatus }) =>
      api.put('/api/orders/status', { orderId, orderStatus, paymentStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries(['orders', shopId])
      toast.success('Order updated')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed'),
  })

  const handleNewOrder = useCallback((order) => {
    toast.success(`New order #${order.orderId}!`, { icon: '🔔', duration: 5000 })
    queryClient.invalidateQueries(['orders', shopId])
  }, [shopId, queryClient])

  useSocket(shopId, handleNewOrder, () => queryClient.invalidateQueries(['orders', shopId]))

  const orders = (data?.orders || []).filter(o =>
    !search || o.orderId.includes(search) || o.customerName.toLowerCase().includes(search.toLowerCase())
  )

  const nextStatus = {
    pending: 'confirmed',
    confirmed: 'preparing',
    preparing: 'ready',
    ready: 'completed',
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-700 text-gray-900">Orders</h1>
        <div className="flex items-center gap-2 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-green-200">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live Updates
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order ID or customer..."
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all capitalize ${
                filter === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
              }`}
            >
              {s === 'all' ? 'All' : ORDER_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="card text-center py-16">
          <RefreshCw size={24} className="mx-auto text-gray-300 animate-spin mb-3" />
          <p className="text-gray-400">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="card text-center py-16">
          <ChefHat size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 font-medium">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const sc = ORDER_STATUS_COLORS[order.orderStatus]
            const pc = PAYMENT_STATUS_COLORS[order.paymentStatus]
            const next = nextStatus[order.orderStatus]
            return (
              <div
                key={order._id}
                className="card hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedOrder(selectedOrder?._id === order._id ? null : order)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-brand-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border border-brand-100">
                    <span className="text-xs text-brand-400 font-medium leading-none">#</span>
                    <span className="text-brand-600 font-bold text-sm">{order.orderId}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800">{order.customerName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${sc.bg} ${sc.text} ${sc.border}`}>
                        {ORDER_STATUS_LABELS[order.orderStatus]}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pc.bg} ${pc.text}`}>
                        {order.paymentMethod.toUpperCase()} · {order.paymentStatus}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {order.items.length} item(s) · {formatDate(order.createdAt)}
                      {order.tableNumber && ` · Table ${order.tableNumber}`}
                    </p>
                  </div>
                  <p className="font-bold text-gray-800 text-base flex-shrink-0">{formatCurrency(order.totalAmount)}</p>
                </div>

                {/* Expanded view */}
                {selectedOrder?._id === order._id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in space-y-3">
                    {/* Items */}
                    <div className="space-y-2">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="flex-1 text-gray-700">{item.name}</span>
                          <span className="text-gray-400">x{item.quantity}</span>
                          <span className="text-gray-700 font-medium">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    {order.specialInstructions && (
                      <div className="flex items-start gap-2 bg-amber-50 rounded-xl p-3">
                        <MessageSquare size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700">{order.specialInstructions}</p>
                      </div>
                    )}
                    {order.customerPhone && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Phone size={13} />
                        {order.customerPhone}
                      </div>
                    )}
                    {/* Action buttons */}
                    <div className="flex gap-2 flex-wrap pt-1">
                      {next && (
                        <button
                          onClick={e => { e.stopPropagation(); updateMutation.mutate({ orderId: order._id, orderStatus: next }) }}
                          className="btn-primary py-2 text-sm"
                        >
                          Mark as {ORDER_STATUS_LABELS[next]}
                        </button>
                      )}
                      {order.orderStatus !== 'cancelled' && order.orderStatus !== 'completed' && (
                        <button
                          onClick={e => { e.stopPropagation(); updateMutation.mutate({ orderId: order._id, orderStatus: 'cancelled' }) }}
                          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-all"
                        >
                          Cancel
                        </button>
                      )}
                      {order.paymentStatus === 'pending' && (
                        <button
                          onClick={e => { e.stopPropagation(); updateMutation.mutate({ orderId: order._id, paymentStatus: 'paid' }) }}
                          className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-xl border border-green-200 transition-all"
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

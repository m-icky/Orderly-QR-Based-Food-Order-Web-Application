import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, TrendingUp, Clock, CheckCircle, ChefHat, ArrowRight } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../utils/api'
import useAuthStore from '../../store/authStore'
import { useSocket } from '../../hooks/useSocket'
import { formatCurrency, formatDate, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../../utils/format'
import toast from 'react-hot-toast'
import LiveClock from '../../components/LiveClock'

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="card flex items-start gap-4">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-display font-700 text-gray-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
)

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const shopId = user?.shopId?._id || user?.shopId
  const queryClient = useQueryClient()
  const [liveOrders, setLiveOrders] = useState([])

  const { data: analytics } = useQuery({
    queryKey: ['analytics', shopId],
    queryFn: () => api.get(`/api/orders/analytics/${shopId}`).then(r => r.data),
    enabled: !!shopId,
    refetchInterval: 30000,
  })

  const { data: ordersData } = useQuery({
    queryKey: ['orders', shopId, 'recent'],
    queryFn: () => api.get(`/api/orders/${shopId}?limit=5`).then(r => r.data),
    enabled: !!shopId,
  })

  const handleNewOrder = useCallback((order) => {
    setLiveOrders(prev => [order, ...prev.slice(0, 4)])
    toast.success(`New order #${order.orderId} received!`, {
      icon: '🔔', duration: 5000,
    })
    queryClient.invalidateQueries(['orders', shopId])
    queryClient.invalidateQueries(['analytics', shopId])
  }, [shopId, queryClient])

  const handleOrderUpdated = useCallback((order) => {
    queryClient.invalidateQueries(['orders', shopId])
  }, [shopId, queryClient])

  useSocket(shopId, handleNewOrder, handleOrderUpdated)

  const recentOrders = ordersData?.orders || []

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-700 text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {user?.shopId?.name || 'Your Restaurant'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LiveClock />
          <div className="flex items-center gap-2 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </div>
        </div>
      </div>

      {/* Live notification banner */}
      {liveOrders.length > 0 && (
        <div className="bg-brand-500 text-white rounded-2xl p-4 flex items-center gap-3 animate-slide-up">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={20} />
          </div>
          <div className="flex-1">
            <p className="font-semibold">New order #{liveOrders[0].orderId}!</p>
            <p className="text-sm text-white/80">{formatCurrency(liveOrders[0].totalAmount)} · {liveOrders[0].items.length} item(s)</p>
          </div>
          <Link to="/admin/orders" className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-medium">
            View
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Total Orders" value={analytics?.totalOrders ?? '—'} color="bg-brand-500" />
        <StatCard icon={TrendingUp} label="Today's Revenue" value={analytics ? formatCurrency(analytics.todayRevenue) : '—'} color="bg-green-500" sub="Paid orders only" />
        <StatCard icon={Clock} label="Pending" value={analytics?.pendingOrders ?? '—'} color="bg-yellow-500" sub="Active orders" />
        <StatCard icon={CheckCircle} label="Today's Orders" value={analytics?.todayOrders ?? '—'} color="bg-blue-500" />
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-600 text-gray-900">Recent Orders</h2>
          <Link to="/admin/orders" className="flex items-center gap-1 text-sm text-brand-500 font-medium hover:text-brand-600">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-12">
            <ChefHat size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 font-medium">No orders yet</p>
            <p className="text-sm text-gray-300 mt-1">Orders will appear here in real-time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map(order => {
              const sc = ORDER_STATUS_COLORS[order.orderStatus]
              return (
                <div key={order._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 flex-shrink-0">
                    <span className="text-sm font-bold text-brand-500">#{order.orderId}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-gray-800">{order.customerName}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${sc.bg} ${sc.text} ${sc.border}`}>
                        {ORDER_STATUS_LABELS[order.orderStatus]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{order.items.length} items · {formatDate(order.createdAt)}</p>
                  </div>
                  <p className="font-semibold text-gray-800 text-sm">{formatCurrency(order.totalAmount)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

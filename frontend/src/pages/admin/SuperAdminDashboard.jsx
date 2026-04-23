import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Store, ShoppingBag, TrendingUp, ArrowRight, Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../utils/api'
import { formatCurrency, formatDate, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../../utils/format'
import LiveClock from '../../components/LiveClock'
import ReportGenerator from '../../components/ReportGenerator'

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="card flex items-start gap-4">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-display font-700 text-gray-900 mt-0.5">{value}</p>
    </div>
  </div>
)

export default function SuperAdminDashboard() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [selectedShop, setSelectedShop] = useState('global')
  
  const generateReport = async (period) => {
    try {
      setIsGenerating(true)
      const url = selectedShop === 'global' ? `/api/admin/report/global?period=${period}` : `/api/orders/report/${selectedShop}?period=${period}`
      const res = await api.get(url)
      setReportData(res.data)
    } catch (error) {
      console.error(error)
      setIsGenerating(false)
    }
  }

  const { data: listData } = useQuery({
    queryKey: ['admin-list'],
    queryFn: () => api.get('/api/admin/list').then(r => r.data),
  })
  const admins = listData?.admins || []

  const { data, isLoading } = useQuery({
    queryKey: ['global-analytics'],
    queryFn: () => api.get('/api/admin/analytics/global').then(r => r.data),
    refetchInterval: 30000,
  })

  if (isLoading) return <div className="card text-center py-16 text-gray-400">Loading...</div>

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-display text-2xl font-700 text-gray-900">Global Overview</h1>
            <p className="text-sm text-gray-500 mt-0.5">Super Admin Dashboard</p>
          </div>
          <LiveClock />
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={selectedShop}
            onChange={(e) => setSelectedShop(e.target.value)}
            className="input py-2 text-sm bg-white"
          >
            <option value="global">All Shops (Global)</option>
            {admins.map(admin => admin.shopId && (
              <option key={admin.shopId._id} value={admin.shopId._id}>
                {admin.shopId.name} ({admin.name})
              </option>
            ))}
          </select>
          <select 
            id="report-period"
            className="input py-2 text-sm bg-white"
            defaultValue="weekly"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="annually">Annually</option>
          </select>
          <button 
            onClick={() => generateReport(document.getElementById('report-period').value)}
            disabled={isGenerating}
            className="btn-primary flex items-center gap-2"
          >
            <Download size={16} /> 
            {isGenerating ? 'Generating...' : 'Download Report'}
          </button>
        </div>
      </div>

      <ReportGenerator 
        data={reportData} 
        isGenerating={isGenerating} 
        onComplete={() => setIsGenerating(false)} 
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Active Admins" value={data?.totalAdmins ?? 0} color="bg-blue-500" />
        <StatCard icon={Store} label="Total Shops" value={data?.totalShops ?? 0} color="bg-purple-500" />
        <StatCard icon={ShoppingBag} label="All Orders" value={data?.totalOrders ?? 0} color="bg-brand-500" />
        <StatCard icon={TrendingUp} label="Total Revenue" value={formatCurrency(data?.totalRevenue ?? 0)} color="bg-green-500" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-600 text-gray-900">Recent Orders (All Shops)</h2>
          <Link to="/admin/admins" className="flex items-center gap-1 text-sm text-brand-500 font-medium hover:text-brand-600">
            Manage Admins <ArrowRight size={14} />
          </Link>
        </div>
        {(data?.recentOrders || []).length === 0 ? (
          <div className="text-center py-12 text-gray-400">No orders yet</div>
        ) : (
          <div className="space-y-3">
            {data.recentOrders.map(order => {
              const sc = ORDER_STATUS_COLORS[order.orderStatus] || ORDER_STATUS_COLORS.pending
              return (
                <div key={order._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 flex-shrink-0">
                    <span className="text-xs font-bold text-brand-500">#{order.orderId}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{order.shopId?.name || 'Unknown Shop'}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${sc.bg} ${sc.text} ${sc.border}`}>
                        {ORDER_STATUS_LABELS[order.orderStatus] || order.orderStatus || 'Pending'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                  </div>
                  <p className="font-semibold text-sm">{formatCurrency(order.totalAmount)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

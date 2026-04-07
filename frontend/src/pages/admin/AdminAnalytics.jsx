import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { TrendingUp, ShoppingBag, DollarSign, Clock, Download } from 'lucide-react'
import api from '../../utils/api'
import useAuthStore from '../../store/authStore'
import { formatCurrency, formatDateShort } from '../../utils/format'
import ReportGenerator from '../../components/ReportGenerator'

const COLORS = ['#FF6B35', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444']

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

export default function AdminAnalytics() {
  const { user } = useAuthStore()
  const shopId = user?.shopId?._id || user?.shopId

  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState(null)
  
  const generateReport = async (period) => {
    try {
      setIsGenerating(true)
      const res = await api.get(`/api/orders/report/${shopId}?period=${period}`)
      setReportData(res.data)
    } catch (error) {
      console.error(error)
      setIsGenerating(false)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['analytics-full', shopId],
    queryFn: () => api.get(`/api/orders/analytics/${shopId}`).then(r => r.data),
    enabled: !!shopId,
    refetchInterval: 60000,
  })

  if (isLoading) return <div className="card text-center py-16 text-gray-400">Loading analytics...</div>

  const statusData = (data?.statusCounts || []).map(s => ({
    name: s._id.charAt(0).toUpperCase() + s._id.slice(1),
    value: s.count
  }))

  const weeklyData = (data?.weeklyData || []).map(d => ({
    date: formatDateShort(d._id),
    orders: d.orders,
    revenue: d.revenue,
  }))

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-700 text-gray-900">Analytics</h1>
        <div className="flex items-center gap-2">
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Total Orders" value={data?.totalOrders ?? 0} color="bg-brand-500" />
        <StatCard icon={DollarSign} label="Total Revenue" value={formatCurrency(data?.totalRevenue ?? 0)} color="bg-green-500" />
        <StatCard icon={TrendingUp} label="Today Revenue" value={formatCurrency(data?.todayRevenue ?? 0)} color="bg-blue-500" />
        <StatCard icon={Clock} label="Pending Orders" value={data?.pendingOrders ?? 0} color="bg-yellow-500" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Weekly Orders & Revenue */}
        <div className="card">
          <h2 className="font-display font-600 text-gray-800 mb-4">Last 7 Days — Orders</h2>
          {weeklyData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-300">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontFamily: 'Plus Jakarta Sans' }}
                  cursor={{ fill: '#f3f4f6' }}
                />
                <Bar dataKey="orders" fill="#FF6B35" radius={[6, 6, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Weekly Revenue */}
        <div className="card">
          <h2 className="font-display font-600 text-gray-800 mb-4">Last 7 Days — Revenue (₹)</h2>
          {weeklyData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-300">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontFamily: 'Plus Jakarta Sans' }}
                  formatter={(v) => [`₹${v}`, 'Revenue']}
                  cursor={{ fill: '#f3f4f6' }}
                />
                <Bar dataKey="revenue" fill="#10B981" radius={[6, 6, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Order Status Pie */}
      <div className="card">
        <h2 className="font-display font-600 text-gray-800 mb-4">Order Status Breakdown</h2>
        {statusData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-300">No data yet</div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Legend formatter={(v) => <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'Plus Jakarta Sans' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

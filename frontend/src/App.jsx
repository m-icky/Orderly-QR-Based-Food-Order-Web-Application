import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminOrders from './pages/admin/AdminOrders'
import AdminMenu from './pages/admin/AdminMenu'
import AdminShop from './pages/admin/AdminShop'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminLayout from './components/admin/AdminLayout'

// Super Admin Pages
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard'
import SuperAdminAdmins from './pages/admin/SuperAdminAdmins'

// Customer Pages
import ShopPage from './pages/customer/ShopPage'
import CartPage from './pages/customer/CartPage'
import CheckoutPage from './pages/customer/CheckoutPage'
import OrderSuccessPage from './pages/customer/OrderSuccessPage'
import UpiPaymentPage from './pages/customer/UpiPaymentPage'

const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/admin/dashboard" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public customer routes */}
      <Route path="/shop/:shopId" element={<ShopPage />} />
      <Route path="/shop/:shopId/cart" element={<CartPage />} />
      <Route path="/shop/:shopId/checkout" element={<CheckoutPage />} />
      <Route path="/shop/:shopId/order-success/:orderId" element={<OrderSuccessPage />} />
      <Route path="/shop/:shopId/upi-payment/:orderId" element={<UpiPaymentPage />} />

      {/* Auth */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin', 'super_admin']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="menu" element={
          <ProtectedRoute roles={['admin']}>
            <AdminMenu />
          </ProtectedRoute>
        } />
        <Route path="shop" element={
          <ProtectedRoute roles={['admin']}>
            <AdminShop />
          </ProtectedRoute>
        } />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="admins" element={
          <ProtectedRoute roles={['super_admin']}>
            <SuperAdminAdmins />
          </ProtectedRoute>
        } />
        <Route path="super-dashboard" element={
          <ProtectedRoute roles={['super_admin']}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  )
}

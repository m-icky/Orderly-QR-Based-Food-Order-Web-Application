import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, Store, QrCode, Eye, EyeOff, Trash2, ExternalLink } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const emptyForm = {
  name: '', email: '', password: '',
  shopName: '', shopDescription: '', address: '', phone: '', upiId: ''
}

export default function SuperAdminAdmins() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [showPassword, setShowPassword] = useState(false)
  const [viewQR, setViewQR] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => api.get('/api/admin/list').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/api/admin/create', body),
    onSuccess: () => {
      queryClient.invalidateQueries(['admins'])
      setShowModal(false)
      setForm(emptyForm)
      toast.success('Admin and shop created!')
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed to create admin'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/admin/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['admins']); toast.success('Admin deactivated') },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password || !form.shopName) {
      return toast.error('Name, email, password and shop name are required')
    }
    createMutation.mutate(form)
  }

  const admins = data?.admins || []

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-700 text-gray-900">Admin Accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{admins.length} admin(s) registered</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Create Admin
        </button>
      </div>

      {isLoading ? (
        <div className="card text-center py-16 text-gray-400">Loading admins...</div>
      ) : admins.length === 0 ? (
        <div className="card text-center py-16">
          <Users size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 font-medium">No admins yet</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-4">Create your first admin</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {admins.map(admin => (
            <div key={admin._id} className={`card transition-all ${!admin.isActive ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-lg">
                    {admin.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{admin.name}</p>
                    <p className="text-xs text-gray-400">{admin.email}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${admin.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {admin.isActive ? 'Active' : 'Disabled'}
                </span>
              </div>

              {admin.shopId && (
                <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Store size={13} className="text-brand-500" />
                    <span className="font-medium">{admin.shopId.name}</span>
                  </div>
                  {admin.shopId.phone && (
                    <p className="text-xs text-gray-400 pl-5">{admin.shopId.phone}</p>
                  )}
                </div>
              )}

              <div className="mt-3 flex gap-2 flex-wrap">
                {admin.shopId?.qrCode && (
                  <button
                    onClick={() => setViewQR(admin.shopId)}
                    className="flex items-center gap-1.5 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg border border-brand-200 transition-colors"
                  >
                    <QrCode size={12} /> View QR
                  </button>
                )}
                {admin.shopId && (
                  <a
                    href={`/shop/${admin.shopId._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <ExternalLink size={12} /> Visit Shop
                  </a>
                )}
                {admin.isActive && (
                  <button
                    onClick={() => { if (confirm('Deactivate this admin?')) deleteMutation.mutate(admin._id) }}
                    className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors ml-auto"
                  >
                    <Trash2 size={12} /> Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Admin Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="p-6">
              <h2 className="font-display text-xl font-700 text-gray-900 mb-5">Create New Admin</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-brand-50 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Admin Account</p>
                  <div>
                    <label className="label">Full Name *</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="John Doe" required />
                  </div>
                  <div>
                    <label className="label">Email *</label>
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input" placeholder="admin@restaurant.com" required />
                  </div>
                  <div>
                    <label className="label">Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        className="input pr-10" placeholder="Min. 6 characters" required minLength={6}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Shop Details</p>
                  <div>
                    <label className="label">Shop Name *</label>
                    <input value={form.shopName} onChange={e => setForm({ ...form, shopName: e.target.value })} className="input" placeholder="My Restaurant" required />
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <input value={form.shopDescription} onChange={e => setForm({ ...form, shopDescription: e.target.value })} className="input" placeholder="Best food in town" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Phone</label>
                      <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input" placeholder="+91 9876543210" />
                    </div>
                    <div>
                      <label className="label">UPI ID</label>
                      <input value={form.upiId} onChange={e => setForm({ ...form, upiId: e.target.value })} className="input" placeholder="shop@upi" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Address</label>
                    <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="input" placeholder="123, Main Street" />
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create Admin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {viewQR && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setViewQR(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="font-display font-700 text-gray-900 mb-1">{viewQR.name}</h3>
            <p className="text-xs text-gray-400 mb-5">Scan to access menu</p>
            <img src={viewQR.qrCode} alt="QR Code" className="w-56 h-56 mx-auto rounded-2xl border-4 border-gray-100" />
            <a href={viewQR.qrCode} download={`${viewQR.name}-QR.png`} className="btn-primary mt-5 w-full block">
              Download QR
            </a>
            <button onClick={() => setViewQR(null)} className="btn-secondary mt-2 w-full">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

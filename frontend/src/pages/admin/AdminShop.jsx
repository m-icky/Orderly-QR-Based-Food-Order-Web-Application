import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Store, QrCode, RefreshCw, Save, ExternalLink, Copy } from 'lucide-react'
import api from '../../utils/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return `${baseUrl}${path}`;
}

export default function AdminShop() {
  const { user } = useAuthStore()
  const shopId = user?.shopId?._id || user?.shopId
  const queryClient = useQueryClient()
  const [form, setForm] = useState({})

  const { data, isLoading } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => api.get(`/api/shop/admin/me`).then(r => r.data),
  })

  useEffect(() => {
    if (data?.shop) {
      const s = data.shop
      setForm({ name: s.name, description: s.description, address: s.address, phone: s.phone, upiId: s.upiId, theme: s.theme, logo: s.logo })
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: (body) => api.put(`/api/shop/${shopId}`, body),
    onSuccess: () => { queryClient.invalidateQueries(['shop']); toast.success('Shop updated!') },
    onError: err => toast.error(err.response?.data?.message || 'Update failed'),
  })

  const handleUpdate = () => {
    const formData = new FormData()
    formData.append('name', form.name || '')
    formData.append('description', form.description || '')
    formData.append('phone', form.phone || '')
    formData.append('upiId', form.upiId || '')
    formData.append('address', form.address || '')
    formData.append('theme', form.theme || '#FF6B35')
    
    if (form.logo && typeof form.logo !== 'string') {
      formData.append('logo', form.logo)
    } else if (typeof form.logo === 'string' && form.logo) {
      formData.append('logo', form.logo)
    }
    
    updateMutation.mutate(formData)
  }

  const regenQRMutation = useMutation({
    mutationFn: (url) => api.post(`/api/shop/${shopId}/regenerate-qr`, { url }),
    onSuccess: () => { queryClient.invalidateQueries(['shop']); toast.success('QR code regenerated!') },
  })

  const shop = data?.shop
  console.log(shop)
  const shopUrl = `${window.location.origin}/shop/${shopId}`
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

  const handleRegenQR = () => {
    regenQRMutation.mutate(shopUrl)
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shopUrl)
    toast.success('Shop URL copied!')
  }

  if (isLoading) return <div className="card text-center py-16 text-gray-400">Loading shop info...</div>

  return (
    <div className="animate-fade-in space-y-5">
      <h1 className="font-display text-2xl font-700 text-gray-900">My Shop</h1>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Form */}
        <div className="lg:col-span-2 card space-y-4">
          <h2 className="font-display font-600 text-gray-800 flex items-center gap-2">
            <Store size={18} className="text-brand-500" /> Shop Details
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Shop Name</label>
              <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="input resize-none" rows={2} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} className="input" placeholder="+91 9876543210" />
            </div>
            <div>
              <label className="label">UPI ID</label>
              <input value={form.upiId || ''} onChange={e => setForm({ ...form, upiId: e.target.value })} className="input" placeholder="shop@upi" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Logo Upload</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => setForm({ ...form, logo: e.target.files[0] })} 
                className="input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 p-2 border border-gray-200" 
              />
              {form.logo && typeof form.logo === 'string' && (
                <div className="mt-2 text-xs text-brand-500">
                  <img src={getImageUrl(form.logo)} alt="Logo Preview" className="h-10 object-contain rounded-lg border border-gray-200 p-1" />
                </div>
              )}
            </div>
            <div>
              <label className="label">Brand Color</label>
              <div className="flex gap-2">
                <input type="color" value={form.theme || '#FF6B35'} onChange={e => setForm({ ...form, theme: e.target.value })} className="h-10 w-14 rounded-xl border border-gray-200 cursor-pointer p-1" />
                <input value={form.theme || '#FF6B35'} onChange={e => setForm({ ...form, theme: e.target.value })} className="input flex-1" />
              </div>
            </div>
          </div>
          <button onClick={handleUpdate} disabled={updateMutation.isPending} className="btn-primary flex items-center gap-2">
            <Save size={15} />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* QR Code */}
        <div className="card flex flex-col items-center gap-4">
          <h2 className="font-display font-600 text-gray-800 flex items-center gap-2 w-full">
            <QrCode size={18} className="text-brand-500" /> Shop QR Code
          </h2>
          {!isLocalhost && shopUrl ? (
            <img src={shopUrl} alt="QR Code" className="w-48 h-48 rounded-2xl border-4 border-gray-100 shadow-sm" />
          ) : (
            <div className="w-48 h-48 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-300">
              <QrCode size={48} />
            </div>
          )}
          <p className="text-xs text-gray-400 text-center">Customers scan this to access your menu</p>

          <div className="w-full space-y-2">
            <div className="flex gap-2">
              <input value={shopUrl} readOnly className="input text-xs flex-1 bg-gray-50" />
              <button onClick={handleCopyUrl} className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                <Copy size={15} />
              </button>
            </div>
            <div className="flex gap-2">
              <a href={shopUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1 flex items-center justify-center gap-2 py-2 text-sm">
                <ExternalLink size={14} /> Preview
              </a>
              <button onClick={handleRegenQR} disabled={regenQRMutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2 py-2 text-sm">
                <RefreshCw size={14} className={regenQRMutation.isPending ? 'animate-spin' : ''} />
                Regenerate
              </button>
            </div>
            {shop?.qrCode && (
              <a href={shop.qrCode} download={`${shop.name}-QR.png`} className="btn-secondary w-full flex items-center justify-center gap-2 py-2 text-sm">
                Download QR
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

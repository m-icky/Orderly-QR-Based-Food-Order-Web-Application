import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search, UtensilsCrossed } from 'lucide-react'
import api from '../../utils/api'
import useAuthStore from '../../store/authStore'
import { formatCurrency } from '../../utils/format'
import toast from 'react-hot-toast'

const FOOD_EMOJI = { default: '🍽️' }

const emptyForm = { name: '', description: '', price: '', category: '', isVeg: true, isAvailable: true, image: '', tags: '' }

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return `${baseUrl}${path}`;
}

export default function AdminMenu() {
  const { user } = useAuthStore()
  const shopId = user?.shopId?._id || user?.shopId
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['food', shopId],
    queryFn: () => api.get(`/api/food/${shopId}`).then(r => r.data),
    enabled: !!shopId,
  })

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/api/food', body),
    onSuccess: () => { queryClient.invalidateQueries(['food', shopId]); closeModal(); toast.success('Item added!') },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => api.put(`/api/food/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries(['food', shopId]); closeModal(); toast.success('Item updated!') },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/food/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['food', shopId]); toast.success('Item deleted') },
  })
  const toggleMutation = useMutation({
    mutationFn: (id) => api.patch(`/api/food/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries(['food', shopId]),
  })

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (item) => {
    setEditItem(item)
    setForm({ ...item, price: item.price.toString(), tags: item.tags?.join(', ') || '' })
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditItem(null); setForm(emptyForm) }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Fallback if tags handling needs JSON structure or just simple appends
    const tagsArray = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    
    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('description', form.description || '');
    formData.append('price', parseFloat(form.price));
    formData.append('category', form.category);
    formData.append('isVeg', form.isVeg);
    formData.append('isAvailable', form.isAvailable);
    
    tagsArray.forEach(tag => formData.append('tags', tag));
    
    if (form.image && typeof form.image !== 'string') {
      formData.append('image', form.image); // the actual File object
    } else if (typeof form.image === 'string' && form.image) {
      formData.append('image', form.image); // keep existing URL
    }

    if (editItem) updateMutation.mutate({ id: editItem._id, body: formData })
    else createMutation.mutate(formData)
  }

  const items = data?.items || []
  const categories = ['all', ...new Set(items.map(i => i.category))]
  const filtered = items.filter(i =>
    (catFilter === 'all' || i.category === catFilter) &&
    (!search || i.name.toLowerCase().includes(search.toLowerCase()))
  )

  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-700 text-gray-900">Menu Management</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="input pl-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all capitalize ${catFilter === c ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="card text-center py-16 text-gray-400">Loading menu...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card text-center py-16">
          <UtensilsCrossed size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 font-medium">No items found</p>
          <button onClick={openCreate} className="btn-primary mt-4">Add your first item</button>
        </div>
      ) : (
        Object.entries(grouped).map(([category, catItems]) => (
          <div key={category} className="card">
            <h2 className="font-display font-600 text-gray-800 mb-4 capitalize">{category}</h2>
            <div className="divide-y divide-gray-50">
              {catItems.map(item => (
                <div key={item._id} className={`flex items-center gap-3 py-3 first:pt-0 last:pb-0 transition-opacity ${!item.isAvailable ? 'opacity-50' : ''}`}>
                  {item.image ? (
                    <img src={getImageUrl(item.image)} alt={item.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-gray-100" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-sm border-2 flex-shrink-0 ${item.isVeg ? 'border-green-500' : 'border-red-500'}`}>
                        <span className={`block w-1.5 h-1.5 rounded-full m-0.5 ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                      </span>
                      <p className="font-semibold text-gray-800 text-sm truncate">{item.name}</p>
                    </div>
                    {item.description && <p className="text-xs text-gray-400 truncate mt-0.5">{item.description}</p>}
                    <p className="text-sm font-bold text-brand-500 mt-0.5">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => toggleMutation.mutate(item._id)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title={item.isAvailable ? 'Disable' : 'Enable'}>
                      {item.isAvailable ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} className="text-gray-400" />}
                    </button>
                    <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => { if (confirm('Delete this item?')) deleteMutation.mutate(item._id) }}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="p-6">
              <h2 className="font-display text-xl font-700 text-gray-900 mb-5">{editItem ? 'Edit Item' : 'Add New Item'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Item Name *</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="e.g. Butter Chicken" required />
                  </div>
                  <div>
                    <label className="label">Price (₹) *</label>
                    <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="input" placeholder="150" min="0" step="0.01" required />
                  </div>
                  <div>
                    <label className="label">Category *</label>
                    <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input" placeholder="e.g. Main Course" required />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Description</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input resize-none" rows={2} placeholder="Brief description..." />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Image Upload</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e => setForm({ ...form, image: e.target.files[0] })} 
                      className="input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 p-2 border border-gray-200" 
                    />
                    {form.image && typeof form.image === 'string' && (
                      <p className="text-xs text-gray-500 mt-2 truncate">Current image: {form.image.split('/').pop()}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="label">Tags (comma separated)</label>
                    <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="input" placeholder="spicy, popular, bestseller" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isVeg} onChange={e => setForm({ ...form, isVeg: e.target.checked })} className="w-4 h-4 accent-green-500" />
                      <span className="text-sm font-medium text-gray-700">Vegetarian</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isAvailable} onChange={e => setForm({ ...form, isAvailable: e.target.checked })} className="w-4 h-4 accent-brand-500" />
                      <span className="text-sm font-medium text-gray-700">Available</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editItem ? 'Update' : 'Add Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

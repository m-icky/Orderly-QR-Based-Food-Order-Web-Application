import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShoppingBag, Search, MapPin, Phone, Plus, Minus, ChefHat } from 'lucide-react'
import api from '../../utils/api'
import useCartStore from '../../store/cartStore'
import { formatCurrency } from '../../utils/format'
import toast from 'react-hot-toast'

const VegBadge = ({ isVeg }) => (
  <span className={`inline-flex items-center justify-center w-4 h-4 border-2 rounded-sm flex-shrink-0 ${isVeg ? 'border-green-500' : 'border-red-500'}`}>
    <span className={`w-2 h-2 rounded-full ${isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
  </span>
)

const FoodCard = ({ item, shopId }) => {
  const { addItem, removeItem, getQuantity } = useCartStore()
  const qty = getQuantity(item._id)

  const handleAdd = () => {
    addItem({ itemId: item._id, name: item.name, price: item.price, image: item.image, isVeg: item.isVeg })
    toast.success(`${item.name} added!`, { duration: 1000 })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3 hover:shadow-md transition-all">
      {item.image ? (
        <img src={item.image} alt={item.name} className="w-24 h-24 rounded-xl object-cover flex-shrink-0 bg-gray-100" />
      ) : (
        <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center text-3xl flex-shrink-0">🍽️</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <VegBadge isVeg={item.isVeg} />
              <h3 className="font-semibold text-gray-800 text-sm leading-tight">{item.name}</h3>
            </div>
            {item.description && <p className="text-xs text-gray-400 line-clamp-2">{item.description}</p>}
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-brand-500">{formatCurrency(item.price)}</span>
          {qty === 0 ? (
            <button
              onClick={handleAdd}
              className="flex items-center gap-1 bg-brand-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-brand-600 active:scale-95 transition-all"
            >
              <Plus size={13} /> ADD
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-brand-500 text-white rounded-xl overflow-hidden">
              <button onClick={() => removeItem(item._id)} className="px-2.5 py-1.5 hover:bg-brand-600 active:scale-95 transition-all">
                <Minus size={13} />
              </button>
              <span className="text-sm font-bold min-w-[1.25rem] text-center">{qty}</span>
              <button onClick={handleAdd} className="px-2.5 py-1.5 hover:bg-brand-600 active:scale-95 transition-all">
                <Plus size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ShopPage() {
  const { shopId } = useParams()
  const navigate = useNavigate()
  const { setShop, getItemCount } = useCartStore()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['shop-menu', shopId],
    queryFn: () => api.get(`/api/shop/${shopId}`).then(r => r.data),
    staleTime: 30000,
  })

  useEffect(() => {
    if (shopId) setShop(shopId)
  }, [shopId])

  useEffect(() => {
    if (data?.categories?.length) setActiveCategory(data.categories[0])
  }, [data])

  const itemCount = getItemCount()

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <ChefHat size={28} className="text-brand-500" />
        </div>
        <p className="text-gray-400">Loading menu...</p>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-gray-500 font-medium">Shop not found</p>
        <p className="text-sm text-gray-400 mt-1">Please check the QR code and try again</p>
      </div>
    </div>
  )

  const { shop, menu, categories } = data

  const filteredMenu = {}
  Object.entries(menu).forEach(([cat, items]) => {
    const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    if (filtered.length) filteredMenu[cat] = filtered
  })

  const displayCategories = search ? Object.keys(filteredMenu) : categories

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-lg mx-auto">
          {/* Shop info */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            {shop.logo ? (
              <img src={shop.logo} alt={shop.name} className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                <ChefHat size={20} className="text-brand-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-700 text-gray-900 text-base leading-tight">{shop.name}</h1>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${shop.isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-400">{shop.isOpen ? 'Open' : 'Closed'}</span>
                {shop.address && (
                  <>
                    <span className="text-gray-300">·</span>
                    <MapPin size={10} className="text-gray-400" />
                    <span className="text-xs text-gray-400 truncate">{shop.address}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-2.5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search dishes..."
                className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition-all"
              />
            </div>
          </div>

          {/* Category tabs */}
          {!search && (
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat)
                    document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all capitalize ${
                    activeCategory === cat ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-6">
        {displayCategories.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400">No items found</p>
          </div>
        ) : (
          displayCategories.map(cat => (
            <div key={cat} id={`cat-${cat}`}>
              <h2 className="font-display font-700 text-gray-800 text-base mb-3 capitalize">{cat}</h2>
              <div className="space-y-3">
                {(filteredMenu[cat] || menu[cat]).map(item => (
                  <FoodCard key={item._id} item={item} shopId={shopId} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating cart button */}
      {itemCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-40 animate-slide-up">
          <button
            onClick={() => navigate(`/shop/${shopId}/cart`)}
            className="bg-brand-500 text-white flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl shadow-brand-300 hover:bg-brand-600 active:scale-95 transition-all w-full max-w-sm"
          >
            <div className="bg-white/20 rounded-xl px-2 py-0.5 text-sm font-bold">{itemCount}</div>
            <span className="flex-1 font-semibold text-base">View Cart</span>
            <ShoppingBag size={20} />
          </button>
        </div>
      )}
    </div>
  )
}

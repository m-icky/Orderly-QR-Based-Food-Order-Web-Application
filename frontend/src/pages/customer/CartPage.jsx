import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react'
import useCartStore from '../../store/cartStore'
import { formatCurrency } from '../../utils/format'

const VegDot = ({ isVeg }) => (
  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
)

export default function CartPage() {
  const { shopId } = useParams()
  const navigate = useNavigate()
  const { items, addItem, removeItem, deleteItem, getTotal } = useCartStore()

  const total = getTotal()

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center mb-4">
          <ShoppingBag size={36} className="text-brand-500" />
        </div>
        <h2 className="font-display font-700 text-gray-800 text-xl">Your cart is empty</h2>
        <p className="text-gray-400 mt-2 text-sm text-center">Add items from the menu to get started</p>
        <button onClick={() => navigate(`/shop/${shopId}`)} className="btn-primary mt-6 flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Menu
        </button>
      </div>
    )
  }

  const gst = Math.round(total * 0.05)
  const grandTotal = total + gst

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="bg-white sticky top-0 z-20 px-4 py-4 border-b border-gray-100 flex items-center gap-3">
          <button onClick={() => navigate(`/shop/${shopId}`)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display font-700 text-gray-900 text-lg">Your Cart</h1>
          <span className="ml-auto text-sm text-gray-400">{items.length} item(s)</span>
        </div>

        {/* Items */}
        <div className="px-4 pt-4 space-y-3">
          {items.map(item => (
            <div key={item.itemId} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-orange-50 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <VegDot isVeg={item.isVeg} />
                  <p className="font-semibold text-gray-800 text-sm truncate">{item.name}</p>
                </div>
                <p className="text-brand-500 font-bold text-sm mt-1">{formatCurrency(item.price)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={() => deleteItem(item.itemId)} className="p-1 text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
                <div className="flex items-center gap-2 bg-brand-500 text-white rounded-xl overflow-hidden">
                  <button onClick={() => removeItem(item.itemId)} className="px-2 py-1 hover:bg-brand-600 transition-colors">
                    <Minus size={12} />
                  </button>
                  <span className="text-sm font-bold min-w-[1.25rem] text-center">{item.quantity}</span>
                  <button onClick={() => addItem(item)} className="px-2 py-1 hover:bg-brand-600 transition-colors">
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bill Summary */}
        <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="font-display font-600 text-gray-800 mb-3">Bill Summary</h3>
          <div className="space-y-2 text-sm">
            {items.map(item => (
              <div key={item.itemId} className="flex items-center justify-between text-gray-600">
                <span className="truncate flex-1">{item.name} × {item.quantity}</span>
                <span className="flex-shrink-0 ml-2">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-dashed border-gray-200 pt-2 mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>GST (5%)</span>
                <span>{formatCurrency(gst)}</span>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-2 flex items-center justify-between font-bold text-gray-900">
              <span>Total</span>
              <span className="text-brand-500 text-base">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Proceed button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => navigate(`/shop/${shopId}/checkout`)}
            className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2"
          >
            Proceed to Checkout
            <span className="bg-white/20 px-2 py-0.5 rounded-lg text-sm font-bold">{formatCurrency(grandTotal)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      shopId: null,

      setShop: (shopId) => {
        if (get().shopId && get().shopId !== shopId) {
          set({ items: [], shopId })
        } else {
          set({ shopId })
        }
      },

      addItem: (item) => {
        const items = get().items
        const existing = items.find(i => i.itemId === item.itemId)
        if (existing) {
          set({ items: items.map(i => i.itemId === item.itemId ? { ...i, quantity: i.quantity + 1 } : i) })
        } else {
          set({ items: [...items, { ...item, quantity: 1 }] })
        }
      },

      removeItem: (itemId) => {
        const items = get().items
        const existing = items.find(i => i.itemId === itemId)
        if (existing?.quantity > 1) {
          set({ items: items.map(i => i.itemId === itemId ? { ...i, quantity: i.quantity - 1 } : i) })
        } else {
          set({ items: items.filter(i => i.itemId !== itemId) })
        }
      },

      deleteItem: (itemId) => set({ items: get().items.filter(i => i.itemId !== itemId) }),

      clearCart: () => set({ items: [], shopId: null }),

      getQuantity: (itemId) => get().items.find(i => i.itemId === itemId)?.quantity || 0,

      getTotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'orderly_cart' }
  )
)

export default useCartStore

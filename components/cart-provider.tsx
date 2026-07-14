'use client'

import { createContext, useContext, useState } from 'react'

type CartLine = { id: string; quantity: number; cost: { totalAmount: { amount: string; currencyCode: string } }; merchandise: { id: string; title: string; product: { title: string; handle: string; featuredImage: { url: string; altText: string | null } | null } } }
type Cart = { id: string; checkoutUrl: string; totalQuantity: number; cost: { totalAmount: { amount: string; currencyCode: string } }; lines: { nodes: CartLine[] } }
type CartContextValue = { cart: Cart | null; open: boolean; setOpen: (open: boolean) => void; add: (variantId: string, quantity?: number) => Promise<void>; update: (lineId: string, quantity: number) => Promise<void>; remove: (lineId: string) => Promise<void>; busy: boolean }

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function mutate(payload: Record<string, unknown>) {
    setBusy(true)
    try {
      const response = await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok || data.error || data.userErrors?.length) throw new Error(data.error || data.userErrors?.[0]?.message)
      setCart(data.cart)
      return data.cart as Cart
    } finally { setBusy(false) }
  }

  async function add(variantId: string, quantity = 1) {
    const next = cart ? await mutate({ action: 'add', cartId: cart.id, merchandiseId: variantId, quantity }) : await mutate({ action: 'create', merchandiseId: variantId, quantity })
    setOpen(true)
    if (next?.id) document.cookie = `willow_cart=${encodeURIComponent(next.id)}; path=/; max-age=2592000; samesite=lax`
  }

  async function update(lineId: string, quantity: number) { if (cart) await mutate({ action: 'update', cartId: cart.id, lineId, quantity }) }
  async function remove(lineId: string) { if (cart) await mutate({ action: 'remove', cartId: cart.id, lineId }) }

  return <CartContext.Provider value={{ cart, open, setOpen, add, update, remove, busy }}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}

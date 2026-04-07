import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

let socket = null

export const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      transports: ['websocket'],
      autoConnect: true,
    })
  }
  return socket
}

export const useSocket = (shopId, onNewOrder, onOrderUpdated) => {
  const socketRef = useRef(null)

  useEffect(() => {
    if (!shopId) return
    socketRef.current = getSocket()
    socketRef.current.emit('join_shop', shopId)

    if (onNewOrder) socketRef.current.on('new_order', onNewOrder)
    if (onOrderUpdated) socketRef.current.on('order_updated', onOrderUpdated)

    return () => {
      if (onNewOrder) socketRef.current.off('new_order', onNewOrder)
      if (onOrderUpdated) socketRef.current.off('order_updated', onOrderUpdated)
      socketRef.current.emit('leave_shop', shopId)
    }
  }, [shopId])
}

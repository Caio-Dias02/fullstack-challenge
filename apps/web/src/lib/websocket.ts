import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const connectWebSocket = (userId: string, token: string): Socket => {
  if (socket?.connected) {
    return socket
  }

  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3003'

  socket = io(wsUrl, {
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    withCredentials: true,
    transports: ['websocket', 'polling'],
  })

  socket.on('connect', () => {
    console.log('✅ WebSocket connected')
    // Subscribe to user events
    socket?.emit('subscribe', { userId })
  })

  socket.on('subscribed', (data) => {
    console.log('📌 Subscribed to user:', data.userId)
  })

  socket.on('disconnect', () => {
    console.log('❌ WebSocket disconnected')
  })

  socket.on('error', (error) => {
    console.error('⚠️ WebSocket error:', error)
  })

  return socket
}

export const disconnectWebSocket = () => {
  if (socket) {
    socket.emit('unsubscribe', { userId: socket.id })
    socket.disconnect()
    socket = null
  }
}

export const getWebSocket = (): Socket | null => {
  return socket
}

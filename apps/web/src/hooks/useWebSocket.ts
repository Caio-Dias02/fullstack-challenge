import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { connectWebSocket, disconnectWebSocket } from '@/lib/websocket'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/store/toast'
import { tasksQueryKeys } from './useTasksQuery'

export const useWebSocket = () => {
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const toast = useToast()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user || !token) {
      disconnectWebSocket()
      return
    }

    // Connect to WebSocket
    const socket = connectWebSocket(user.id, token)

    // Remove old listeners to avoid duplicates
    socket.off('task:created')
    socket.off('task:updated')
    socket.off('task:deleted')
    socket.off('comment:new')

    // Listen for task:created
    socket.on('task:created', (event: any) => {
      console.log('📬 Received task:created:', event.title)
      toast.success(`New task created: ${event.title}`)
      // Invalidate all task queries to refetch
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all })
    })

    // Listen for task:updated
    socket.on('task:updated', (event: any) => {
      console.log('📬 Received task:updated:', event.taskId)
      const changes = event.changes || {}
      const changedFields = Object.keys(changes)
      if (changedFields.length > 0) {
        toast.info(`Task updated: ${changedFields.join(', ')}`)
      }
      // Invalidate task detail and list queries
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.detail(event.taskId) })
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.lists() })
    })

    // Listen for task:deleted
    socket.on('task:deleted', (event: any) => {
      console.log('📬 Received task:deleted:', event.taskId)
      toast.info(`Task deleted`)
      // Invalidate all task queries to refetch
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all })
    })

    // Listen for comment:new
    socket.on('comment:new', (event: any) => {
      console.log('📬 Received comment:new:', event.taskId)
      toast.info(`New comment on task`)
      // Invalidate comments for this task
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.comments(event.taskId) })
    })

    // Cleanup on unmount
    return () => {
      // Remove listeners to prevent duplicates on reconnect
      socket.off('task:created')
      socket.off('task:updated')
      socket.off('task:deleted')
      socket.off('comment:new')
    }
  }, [user, token, toast, queryClient])
}

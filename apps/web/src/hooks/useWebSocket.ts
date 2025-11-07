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
      toast.success(`Nova tarefa criada: ${event.title}`)
      // Refetch all task queries
      queryClient.refetchQueries({
        queryKey: tasksQueryKeys.all
      })
    })

    // Listen for task:updated
    socket.on('task:updated', (event: any) => {
      console.log('📬 Received task:updated:', event.taskId)
      const changes = event.changes || {}
      const changedFields = Object.keys(changes)
      if (changedFields.length > 0) {
        toast.info(`Tarefa atualizada: ${changedFields.join(', ')}`)
      }
      // Refetch task detail and list queries
      queryClient.refetchQueries({
        queryKey: tasksQueryKeys.detail(event.taskId)
      })
      queryClient.refetchQueries({
        queryKey: tasksQueryKeys.lists()
      })
    })

    // Listen for comment:new
    socket.on('comment:new', (event: any) => {
      console.log('📬 Received comment:new:', event.taskId)
      toast.info(`Novo comentário na tarefa`)
      // Refetch comments for this task
      queryClient.refetchQueries({
        queryKey: tasksQueryKeys.comments(event.taskId)
      })
      queryClient.refetchQueries({
        queryKey: tasksQueryKeys.detail(event.taskId)
      })
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

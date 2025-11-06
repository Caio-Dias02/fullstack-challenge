import { useEffect } from 'react'
import { connectWebSocket, disconnectWebSocket } from '@/lib/websocket'
import { useAuthStore } from '@/store/auth'
import { useTasksStore } from '@/store/tasks'
import { useToast } from '@/store/toast'
import { tasksAPI } from '@/api/tasks'

export const useWebSocket = () => {
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const setTasks = useTasksStore((state) => state.setTasks)
  const toast = useToast()

  useEffect(() => {
    if (!user || !token) {
      disconnectWebSocket()
      return
    }

    // Connect to WebSocket
    const socket = connectWebSocket(user.id, token)

    // Helper to refresh tasks
    const refreshTasks = async () => {
      try {
        const data = await tasksAPI.list()
        setTasks(data)
      } catch (err) {
        console.error('Failed to refresh tasks:', err)
      }
    }

    // Remove old listeners to avoid duplicates
    socket.off('task:created')
    socket.off('task:updated')
    socket.off('comment:new')

    // Listen for task:created
    socket.on('task:created', (event: any) => {
      console.log('📬 Received task:created:', event.title)
      toast.success(`New task created: ${event.title}`)
      refreshTasks()
    })

    // Listen for task:updated
    socket.on('task:updated', (event: any) => {
      console.log('📬 Received task:updated:', event.taskId)
      const changes = event.changes || {}
      const changedFields = Object.keys(changes)
      if (changedFields.length > 0) {
        toast.info(`Task updated: ${changedFields.join(', ')}`)
      }
      refreshTasks()
    })

    // Listen for comment:new
    socket.on('comment:new', (event: any) => {
      console.log('📬 Received comment:new:', event.taskId)
      toast.info(`New comment on task`)
      refreshTasks()
    })

    // Cleanup on unmount
    return () => {
      // Remove listeners to prevent duplicates on reconnect
      socket.off('task:created')
      socket.off('task:updated')
      socket.off('comment:new')
    }
  }, [user, token, setTasks, toast])
}

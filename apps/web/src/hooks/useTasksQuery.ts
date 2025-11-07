import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksAPI } from '@/api/tasks'
import { useToast } from '@/store/toast'

// Query keys
export const tasksQueryKeys = {
  all: ['tasks'] as const,
  lists: () => [...tasksQueryKeys.all, 'list'] as const,
  list: (filters: any) => [...tasksQueryKeys.lists(), filters] as const,
  details: () => [...tasksQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...tasksQueryKeys.details(), id] as const,
  comments: (taskId: string) => [...tasksQueryKeys.detail(taskId), 'comments'] as const,
  history: (taskId: string) => [...tasksQueryKeys.detail(taskId), 'history'] as const,
}

/**
 * Fetch all tasks
 */
export const useTasksList = () => {
  const toast = useToast()
  return useQuery({
    queryKey: tasksQueryKeys.lists(),
    queryFn: async () => {
      try {
        return await tasksAPI.list()
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to fetch tasks')
        throw err
      }
    },
    staleTime: 0,
    gcTime: 5 * 60 * 1000, // 5 min garbage collection
  })
}

/**
 * Fetch a single task by ID
 */
export const useTaskDetail = (taskId: string) => {
  const toast = useToast()
  return useQuery({
    queryKey: tasksQueryKeys.detail(taskId),
    queryFn: async () => {
      try {
        return await tasksAPI.get(taskId)
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load task')
        throw err
      }
    },
    enabled: !!taskId,
  })
}

/**
 * Fetch comments for a task
 */
export const useTaskComments = (taskId: string) => {
  const toast = useToast()
  return useQuery({
    queryKey: tasksQueryKeys.comments(taskId),
    queryFn: async () => {
      try {
        return await tasksAPI.getComments(taskId)
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load comments')
        throw err
      }
    },
    enabled: !!taskId,
  })
}

/**
 * Create a new task
 */
export const useCreateTask = () => {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => tasksAPI.create(data),
    onSuccess: async () => {
      // Refetch tasks list immediately
      await queryClient.refetchQueries({
        queryKey: tasksQueryKeys.lists()
      })
      toast.success('Tarefa criada com sucesso')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Falha ao criar tarefa')
    },
  })
}

/**
 * Update a task
 */
export const useUpdateTask = (taskId: string) => {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => tasksAPI.update(taskId, data),
    onSuccess: async (updatedTask) => {
      // Update the specific task detail query with fresh data
      queryClient.setQueryData(tasksQueryKeys.detail(taskId), updatedTask)

      // Refetch task detail immediately
      await queryClient.refetchQueries({
        queryKey: tasksQueryKeys.detail(taskId)
      })

      // Refetch tasks list immediately
      await queryClient.refetchQueries({
        queryKey: tasksQueryKeys.lists()
      })

      toast.success('Tarefa atualizada com sucesso')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Falha ao atualizar tarefa')
    },
  })
}

/**
 * Delete a task
 */
export const useDeleteTask = () => {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskId: string) => tasksAPI.delete(taskId),
    onSuccess: async () => {
      // Refetch all task queries immediately
      await queryClient.refetchQueries({
        queryKey: tasksQueryKeys.all
      })
      toast.success('Tarefa deletada com sucesso')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Falha ao deletar tarefa')
    },
  })
}

/**
 * Add a comment to a task
 */
export const useAddComment = (taskId: string) => {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => tasksAPI.addComment(taskId, data),
    onSuccess: async () => {
      // Refetch comments for this task immediately
      await queryClient.refetchQueries({
        queryKey: tasksQueryKeys.comments(taskId)
      })
      // Also refetch task detail
      await queryClient.refetchQueries({
        queryKey: tasksQueryKeys.detail(taskId)
      })
      toast.success('Comentário adicionado com sucesso')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Falha ao adicionar comentário')
    },
  })
}

/**
 * Fetch task history/audit log
 */
export const useTaskHistory = (taskId: string) => {
  const toast = useToast()
  return useQuery({
    queryKey: tasksQueryKeys.history(taskId),
    queryFn: async () => {
      try {
        return await tasksAPI.getHistory(taskId)
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load history')
        throw err
      }
    },
    enabled: !!taskId,
  })
}

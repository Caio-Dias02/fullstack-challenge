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
    onSuccess: (newTask) => {
      // Invalidate the tasks list to refetch
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.lists() })
      toast.success('Task created successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create task')
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
    onSuccess: (updatedTask) => {
      // Update the specific task detail query
      queryClient.setQueryData(tasksQueryKeys.detail(taskId), updatedTask)
      // Invalidate the tasks list
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.lists() })
      toast.success('Task updated successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update task')
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
    onSuccess: () => {
      // Invalidate all task queries
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all })
      toast.success('Task deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete task')
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
    onSuccess: () => {
      // Invalidate comments for this task
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.comments(taskId) })
      toast.success('Comment added successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add comment')
    },
  })
}

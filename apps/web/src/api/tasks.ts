import { apiClient } from './client'
import { Task } from '../store/tasks'

export interface CreateTaskRequest {
  title: string
  description?: string
  dueDate?: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  assignees?: string[]
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  status?: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  assignees?: string[]
}

export interface Comment {
  id: string
  body: string
  authorId: string
  taskId: string
  createdAt: string
}

export interface CreateCommentRequest {
  body: string
}

export const tasksAPI = {
  list: async (): Promise<Task[]> => {
    const res = await apiClient.get('/api/tasks')
    return res.data
  },

  get: async (id: string): Promise<Task> => {
    const res = await apiClient.get(`/api/tasks/${id}`)
    return res.data
  },

  create: async (data: CreateTaskRequest): Promise<Task> => {
    const res = await apiClient.post('/api/tasks', data)
    return res.data
  },

  update: async (id: string, data: UpdateTaskRequest): Promise<Task> => {
    const res = await apiClient.patch(`/api/tasks/${id}`, data)
    return res.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/tasks/${id}`)
  },

  getComments: async (taskId: string): Promise<Comment[]> => {
    const res = await apiClient.get(`/api/tasks/${taskId}/comments`)
    return res.data
  },

  addComment: async (taskId: string, data: CreateCommentRequest): Promise<Comment> => {
    const res = await apiClient.post(`/api/tasks/${taskId}/comments`, data)
    return res.data
  },
}

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

export interface AuthorData {
  id: string
  username: string
  email: string
}

export interface Comment {
  id: string
  body: string
  authorId: string
  authorData?: AuthorData
  taskId: string
  createdAt: string
}

export interface CreateCommentRequest {
  body: string
}

export interface TaskHistory {
  id: string
  changedBy: string
  changedByData?: {
    username: string
    email: string
  }
  field: string
  oldValue?: string
  newValue?: string
  createdAt: string
}

export const tasksAPI = {
  list: async (): Promise<Task[]> => {
    const res = await apiClient.get('/tasks')
    return res.data
  },

  get: async (id: string): Promise<Task> => {
    const res = await apiClient.get(`/tasks/${id}`)
    return res.data
  },

  create: async (data: CreateTaskRequest): Promise<Task> => {
    const res = await apiClient.post('/tasks', data)
    return res.data
  },

  update: async (id: string, data: UpdateTaskRequest): Promise<Task> => {
    const res = await apiClient.patch(`/tasks/${id}`, data)
    return res.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`)
  },

  getComments: async (taskId: string): Promise<Comment[]> => {
    const res = await apiClient.get(`/tasks/${taskId}/comments`)
    return res.data
  },

  addComment: async (taskId: string, data: CreateCommentRequest): Promise<Comment> => {
    const res = await apiClient.post(`/tasks/${taskId}/comments`, data)
    return res.data
  },

  getHistory: async (taskId: string): Promise<TaskHistory[]> => {
    const res = await apiClient.get(`/tasks/${taskId}/history`)
    return res.data
  },
}

import { create } from 'zustand'

export interface Task {
  id: string
  title: string
  description?: string
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  creatorId: string
  assignees: string[]
  createdAt: string
  updatedAt: string
}

export interface TasksState {
  tasks: Task[]
  selectedTask: Task | null
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (task: Task) => void
  deleteTask: (id: string) => void
  setSelectedTask: (task: Task | null) => void
}

export const useTasksStore = create<TasksState>((set) => ({
  tasks: [],
  selectedTask: null,
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTask: (task) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
      selectedTask: state.selectedTask?.id === task.id ? task : state.selectedTask,
    })),
  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      selectedTask: state.selectedTask?.id === id ? null : state.selectedTask,
    })),
  setSelectedTask: (task) => set({ selectedTask: task }),
}))

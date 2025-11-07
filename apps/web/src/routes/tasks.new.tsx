import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTasksStore } from '@/store/tasks'
import { Spinner } from '@/components/spinner'
import { useCreateTask } from '@/hooks/useTasksQuery'
import { rootRoute } from './__root'

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.string().optional().refine(
    (date) => {
      if (!date) return true // optional field
      const selectedDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return selectedDate >= today
    },
    'Due date must be today or in the future'
  ),
})

type CreateTaskForm = z.infer<typeof createTaskSchema>

export const Route = createFileRoute('/tasks/new')({
  getParentRoute: () => rootRoute,
  component: NewTaskPage,
})

export function NewTaskPage() {
  const navigate = useNavigate()
  const addTask = useTasksStore((state) => state.addTask)

  // Use TanStack Query mutation
  const { mutate: createTask, isPending } = useCreateTask()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskSchema),
  })

  const onSubmit = async (data: CreateTaskForm) => {
    createTask(data, {
      onSuccess: (created: any) => {
        addTask(created)
        navigate({ to: `/tasks/${created.id}` })
      },
    })
  }

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <Link to="/">
        <Button variant="outline">← Back</Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create New Task</CardTitle>
          <CardDescription>Add a new task to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input {...register('title')} placeholder="Task title" />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                {...register('description')}
                placeholder="Task description (optional)"
                className="w-full p-2 border rounded text-sm"
                rows={4}
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select {...register('priority')} className="w-full p-2 border rounded text-sm">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <Input {...register('dueDate')} type="date" />
                {errors.dueDate && <p className="text-red-500 text-sm mt-1">{errors.dueDate.message}</p>}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <div className="flex items-center justify-center gap-2">
                  <Spinner size="sm" />
                  <span>Creating...</span>
                </div>
              ) : (
                'Create Task'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

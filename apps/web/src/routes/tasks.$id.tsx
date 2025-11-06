import { createFileRoute, useParams, useNavigate, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTasksStore } from '@/store/tasks'
import { tasksAPI, Comment } from '@/api/tasks'
import { useAuthStore } from '@/store/auth'
import { rootRoute } from './__root'

const commentSchema = z.object({
  body: z.string().min(1, 'Comment is required').max(1000, 'Comment too long'),
})

type CommentForm = z.infer<typeof commentSchema>

export const Route = createFileRoute('/tasks/$id')({
  getParentRoute: () => rootRoute,
  component: TaskDetailPage,
})

export function TaskDetailPage() {
  const { id } = useParams({ from: '/tasks/$id' })
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const selectedTask = useTasksStore((state) => state.selectedTask)
  const updateTask = useTasksStore((state) => state.updateTask)
  const deleteTask = useTasksStore((state) => state.deleteTask)
  const [task, setTask] = useState(selectedTask)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingStatus, setEditingStatus] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentForm>({
    resolver: zodResolver(commentSchema),
  })

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await tasksAPI.get(id)
        setTask(data)
        updateTask(data)

        const commentsData = await tasksAPI.getComments(id)
        setComments(commentsData)
      } catch (err) {
        setError('Failed to load task')
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [id, updateTask])

  const handleStatusChange = async (newStatus: any) => {
    if (!task) return

    try {
      const updated = await tasksAPI.update(task.id, { status: newStatus })
      setTask(updated)
      updateTask(updated)
      setEditingStatus(false)
    } catch (err) {
      setError('Failed to update status')
    }
  }

  const handleDeleteTask = async () => {
    if (!task) return

    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      await tasksAPI.delete(task.id)
      deleteTask(task.id)
      navigate({ to: '/' })
    } catch (err) {
      setError('Failed to delete task')
    }
  }

  const onCommentSubmit = async (data: CommentForm) => {
    if (!task) return

    try {
      const newComment = await tasksAPI.addComment(task.id, data)
      setComments([...comments, newComment])
      reset()
    } catch (err) {
      setError('Failed to add comment')
    }
  }

  const isCreator = task?.creatorId === user?.id
  const isAssignee = task?.assignees.includes(user?.id || '')

  if (loading) return <div className="p-6">Loading...</div>
  if (!task) return <div className="p-6">Task not found</div>

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/">
          <Button variant="outline">← Back</Button>
        </Link>
        <div className="flex gap-2">
          {isCreator && (
            <Button variant="destructive" onClick={handleDeleteTask}>
              Delete
            </Button>
          )}
        </div>
      </div>

      {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      {/* Task Details */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-3xl">{task.title}</CardTitle>
              <CardDescription>Created by {task.creatorId}</CardDescription>
            </div>
            <div className="flex flex-col gap-2">
              <Badge>{task.priority}</Badge>
              {editingStatus ? (
                <div className="space-y-2">
                  {['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={task.status === status ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(status)}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              ) : (
                <Badge
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => isCreator && setEditingStatus(true)}
                >
                  {task.status}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {task.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {task.dueDate && (
              <div>
                <h3 className="font-semibold mb-1">Due Date</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(task.dueDate).toLocaleDateString()}
                </p>
              </div>
            )}
            <div>
              <h3 className="font-semibold mb-1">Assignees</h3>
              <p className="text-sm text-muted-foreground">{task.assignees.length} people</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      {(isCreator || isAssignee) && (
        <Card>
          <CardHeader>
            <CardTitle>Comments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet</p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-3 bg-muted rounded">
                    <p className="text-sm font-medium">{comment.authorId}</p>
                    <p className="text-sm text-muted-foreground">{comment.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(comment.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit(onCommentSubmit)} className="space-y-2 border-t pt-4">
              <textarea
                {...register('body')}
                className="w-full p-2 border rounded text-sm"
                placeholder="Add a comment..."
                rows={3}
              />
              {errors.body && <p className="text-red-500 text-sm">{errors.body.message}</p>}
              <Button type="submit" size="sm">
                Add Comment
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

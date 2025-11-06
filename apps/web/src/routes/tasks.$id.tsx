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
import { useToast } from '@/store/toast'
import { tasksAPI, Comment } from '@/api/tasks'
import { authAPI, UserSearchResult } from '@/api/auth'
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
  const toast = useToast()
  const [task, setTask] = useState(selectedTask)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [editingStatus, setEditingStatus] = useState(false)
  const [editingAssignees, setEditingAssignees] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)

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
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load task')
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [id, updateTask])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length < 1) {
        setSearchResults([])
        return
      }

      setSearching(true)
      try {
        const results = await authAPI.searchUsers(searchQuery)
        setSearchResults(
          results.filter((u) => !task?.assignees.includes(u.id))
        )
      } catch (err: any) {
        toast.error('Failed to search users')
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, task?.assignees, toast])

  const handleStatusChange = async (newStatus: any) => {
    if (!task) return

    try {
      const updated = await tasksAPI.update(task.id, { status: newStatus })
      setTask(updated)
      updateTask(updated)
      setEditingStatus(false)
      toast.success('Task status updated')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    }
  }

  const handleDeleteTask = async () => {
    if (!task) return

    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      await tasksAPI.delete(task.id)
      deleteTask(task.id)
      toast.success('Task deleted successfully')
      navigate({ to: '/' })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete task')
    }
  }

  const onCommentSubmit = async (data: CommentForm) => {
    if (!task) return

    try {
      const newComment = await tasksAPI.addComment(task.id, data)
      setComments([...comments, newComment])
      reset()
      toast.success('Comment added successfully')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add comment')
    }
  }

  const handleAddAssignee = async (userId: string) => {
    if (!task || !userId) {
      toast.error('Please select a user')
      return
    }

    if (task.assignees.includes(userId)) {
      toast.error('User is already assigned')
      return
    }

    try {
      const updated = await tasksAPI.update(task.id, {
        assignees: [...task.assignees, userId],
      })
      setTask(updated)
      updateTask(updated)
      setSearchQuery('')
      setSearchResults([])
      toast.success('Assignee added')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add assignee')
    }
  }

  const handleRemoveAssignee = async (assigneeId: string) => {
    if (!task) return

    try {
      const updated = await tasksAPI.update(task.id, {
        assignees: task.assignees.filter((id) => id !== assigneeId),
      })
      setTask(updated)
      updateTask(updated)
      toast.success('Assignee removed')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove assignee')
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

      {/* Task Details */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-3xl">{task.title}</CardTitle>
              <CardDescription>
                Created by{' '}
                {(task as any).creatorData ? (
                  <>
                    <span className="font-medium">{(task as any).creatorData.username}</span>
                    <span className="text-xs ml-1">({(task as any).creatorData.email})</span>
                  </>
                ) : user?.id === task.creatorId ? (
                  <>
                    <span className="font-medium">{user.username}</span>
                    <span className="text-xs ml-1">({user.email})</span>
                  </>
                ) : (
                  task.creatorId
                )}
              </CardDescription>
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
              <h3 className="font-semibold mb-2">Assignees</h3>
              {editingAssignees ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      placeholder="Search by email or username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="text-sm"
                    />
                    {searchQuery && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-10">
                        {searchResults.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => handleAddAssignee(user.id)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b last:border-b-0"
                          >
                            <div className="font-medium">{user.username}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {(task as any).assigneesData && (task as any).assigneesData.length > 0 && (
                    <div className="space-y-1">
                      {(task as any).assigneesData.map((assignee: any) => (
                        <div
                          key={assignee.id}
                          className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                        >
                          <div>
                            <div className="font-medium">{assignee.username}</div>
                            <div className="text-xs text-gray-500">{assignee.email}</div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveAssignee(assignee.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingAssignees(false)
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {task.assignees.length} people
                  </p>
                  {isCreator && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingAssignees(true)}
                    >
                      Manage
                    </Button>
                  )}
                </div>
              )}
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
                    <div className="text-sm font-medium">
                      {comment.authorData ? (
                        <>
                          <span>{comment.authorData.username}</span>
                          <span className="text-xs text-gray-500 ml-1">({comment.authorData.email})</span>
                        </>
                      ) : (
                        comment.authorId
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{comment.body}</p>
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

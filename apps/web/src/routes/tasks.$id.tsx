import { createFileRoute, useParams, useNavigate, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTasksStore } from '@/store/tasks'
import { useToast } from '@/store/toast'
import { tasksAPI } from '@/api/tasks'
import { authAPI, UserSearchResult } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { Spinner } from '@/components/spinner'
import { useTaskDetail, useTaskComments, useUpdateTask, useDeleteTask, useAddComment, useTaskHistory } from '@/hooks/useTasksQuery'
import { pt } from '@/lib/translations'

const commentSchema = z.object({
  body: z.string().min(1, pt.commentRequired).max(1000, pt.commentTooLong),
})

type CommentForm = z.infer<typeof commentSchema>

const editTaskSchema = z.object({
  title: z.string().min(1, pt.titleRequired).max(200, pt.titleTooLong),
  description: z.string().max(2000, pt.descriptionTooLong).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  dueDate: z.string().optional().refine(
    (date) => {
      if (!date) return true // optional field
      const selectedDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return selectedDate >= today
    },
    pt.dueDateFuture
  ),
})

type EditTaskForm = z.infer<typeof editTaskSchema>

export const Route = createFileRoute()({
  component: TaskDetailPage,
})

export function TaskDetailPage() {
  const { id } = useParams({ from: '/tasks/$id' })
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const updateTask = useTasksStore((state) => state.updateTask)
  const deleteTask = useTasksStore((state) => state.deleteTask)
  const toast = useToast()

  // TanStack Query hooks
  const { data: task, isLoading } = useTaskDetail(id)
  const { data: comments = [] } = useTaskComments(id)
  const { data: history = [] } = useTaskHistory(id)
  const { mutate: mutateUpdateTask } = useUpdateTask(id)
  const { mutate: mutateDeleteTask } = useDeleteTask()
  const { mutate: mutateAddComment } = useAddComment(id)

  const [editingStatus, setEditingStatus] = useState(false)
  const [editingAssignees, setEditingAssignees] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [allUsers, setAllUsers] = useState<UserSearchResult[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [deletingTask, setDeletingTask] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [addingComment, setAddingComment] = useState(false)
  const [removingAssignee, setRemovingAssignee] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingTask, setEditingTask] = useState(false)
  const [savingTask, setSavingTask] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentForm>({
    resolver: zodResolver(commentSchema),
  })

  const {
    register: registerEditForm,
    handleSubmit: handleSubmitEditForm,
    reset: resetEditForm,
    formState: { errors: editErrors },
  } = useForm<EditTaskForm>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      priority: task?.priority || 'MEDIUM',
      dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    },
  })

  // Sync task to Zustand store for compatibility
  useEffect(() => {
    if (task) {
      updateTask(task)
    }
  }, [task, updateTask])

  // Load all users when entering assignees edit mode
  useEffect(() => {
    if (editingAssignees && allUsers.length === 0) {
      setLoadingUsers(true)
      authAPI.getAllUsers().then((users) => {
        setAllUsers(users)
        setSearchResults(users.filter((u) => !task?.assignees.includes(u.id)))
      }).catch(() => {
        toast.error('Failed to load users')
      }).finally(() => {
        setLoadingUsers(false)
      })
    }
  }, [editingAssignees])

  // Filter users based on search query
  useEffect(() => {
    if (searchQuery.length < 1) {
      setSearchResults(allUsers.filter((u) => !task?.assignees.includes(u.id)))
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = allUsers.filter((u) =>
      !task?.assignees.includes(u.id) &&
      (u.username.toLowerCase().includes(query) || u.email.toLowerCase().includes(query))
    )
    setSearchResults(filtered)
  }, [searchQuery, allUsers, task?.assignees])

  const handleStatusChange = async (newStatus: any) => {
    if (!task) return

    setUpdatingStatus(true)
    mutateUpdateTask(
      { status: newStatus },
      {
        onSuccess: () => {
          setEditingStatus(false)
        },
        onSettled: () => {
          setUpdatingStatus(false)
        },
      }
    )
  }

  const handleDeleteTask = async () => {
    if (!task) return

    setDeletingTask(true)
    mutateDeleteTask(task.id, {
      onSuccess: () => {
        deleteTask(task.id)
        setShowDeleteDialog(false)
        // Redirect immediately to avoid refetch errors
        toast.success('Task deleted successfully')
        setTimeout(() => {
          navigate({ to: '/' })
        }, 300)
      },
      onSettled: () => {
        setDeletingTask(false)
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to delete task')
      }
    })
  }

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false)
  }

  const onEditTaskSubmit = async (data: EditTaskForm) => {
    if (!task) return

    setSavingTask(true)
    mutateUpdateTask(
      {
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        dueDate: data.dueDate || undefined,
      },
      {
        onSuccess: () => {
          setEditingTask(false)
        },
        onSettled: () => {
          setSavingTask(false)
        },
      }
    )
  }

  const handleEditClick = () => {
    resetEditForm({
      title: task?.title || '',
      description: task?.description || '',
      priority: task?.priority || 'MEDIUM',
      dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    })
    setEditingTask(true)
  }

  const handleEditCancel = () => {
    setEditingTask(false)
  }

  const onCommentSubmit = async (data: CommentForm) => {
    if (!task) return

    setAddingComment(true)
    mutateAddComment(data, {
      onSuccess: () => {
        reset()
      },
      onSettled: () => {
        setAddingComment(false)
      },
    })
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

    setRemovingAssignee(assigneeId)
    mutateUpdateTask(
      { assignees: task.assignees.filter((id) => id !== assigneeId) },
      {
        onSuccess: () => {
          toast.success('Assignee removed')
          // Redirect if current user was removed
          if (assigneeId === user?.id) {
            setTimeout(() => navigate({ to: '/' }), 500)
          }
        },
        onSettled: () => {
          setRemovingAssignee(null)
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.message || 'Failed to remove assignee')
        }
      }
    )
  }

  const isCreator = task?.creatorId === user?.id
  const isAssignee = task?.assignees.includes(user?.id || '')

  if (isLoading) return <div className="flex flex-col items-center justify-center py-12"><Spinner size="lg" /><p className="text-muted-foreground mt-4">{pt.tasks}...</p></div>
  if (!task) return <div className="p-6">Tarefa não encontrada</div>

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/">
          <Button variant="outline">{pt.back}</Button>
        </Link>
        <div className="flex gap-2">
          {isCreator && (
            <>
              <Button variant="outline" onClick={handleEditClick} disabled={editingTask}>
                {pt.edit}
              </Button>
              <Button variant="destructive" onClick={handleDeleteClick} disabled={deletingTask}>
              {deletingTask ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />
                  <span>{pt.deleting}</span>
                </div>
              ) : (
                pt.delete
              )}
            </Button>
            </>
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
                {pt.createdBy}{' '}
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
                      disabled={updatingStatus}
                    >
                      {updatingStatus ? (
                        <div className="flex items-center gap-2">
                          <Spinner size="sm" />
                          <span>{status}</span>
                        </div>
                      ) : (
                        status
                      )}
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
              <h3 className="font-semibold mb-2">{pt.description}</h3>
              <p className="text-sm text-muted-foreground">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {task.dueDate && (
              <div>
                <h3 className="font-semibold mb-1">{pt.dueDate}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(task.dueDate).toLocaleDateString()}
                </p>
              </div>
            )}
            <div>
              <h3 className="font-semibold mb-2">{pt.assignees}</h3>
              {editingAssignees ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      placeholder={pt.searchUsers}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  {loadingUsers ? (
                    <div className="flex items-center justify-center py-4">
                      <Spinner size="sm" />
                      <span className="ml-2 text-sm">{pt.loadingUsers}</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="border rounded max-h-64 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleAddAssignee(user.id)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b last:border-b-0 transition"
                        >
                          <div className="font-medium">{user.username}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 py-2">
                      {searchQuery ? pt.noUsers : pt.noMoreUsers}
                    </p>
                  )}
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
                            disabled={removingAssignee === assignee.id}
                          >
                            {removingAssignee === assignee.id ? (
                              <div className="flex items-center gap-2">
                                <Spinner size="sm" />
                                <span>{pt.removing}</span>
                              </div>
                            ) : (
                              pt.remove
                            )}
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
                    {pt.done}
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {task.assignees.length} {task.assignees.length !== 1 ? pt.people : pt.person}
                  </p>
                  {isCreator && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingAssignees(true)}
                    >
                      {pt.manage}
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
            <CardTitle>{pt.comments}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{pt.noComments}</p>
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
                placeholder="Adicionar comentário..."
                rows={3}
              />
              {errors.body && <p className="text-red-500 text-sm">{errors.body.message}</p>}
              <Button type="submit" size="sm" disabled={addingComment}>
                {addingComment ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" />
                    <span>{pt.addingComment}</span>
                  </div>
                ) : (
                  pt.addComment
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* History Section */}
      {(isCreator || isAssignee) && (
        <Card>
          <CardHeader>
            <CardTitle>{pt.changeHistory}</CardTitle>
            <CardDescription>{pt.trackChanges}</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{pt.noChanges}</p>
            ) : (
              <div className="space-y-3">
                {history.map((entry: any) => (
                  <div key={entry.id} className="p-3 bg-muted rounded border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold">
                          <span className="capitalize">{entry.field}</span> {pt.changed}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {pt.by}: {entry.changedByData ? (
                            <>
                              <span>{entry.changedByData.username}</span>
                              <span className="ml-1">({entry.changedByData.email})</span>
                            </>
                          ) : (
                            entry.changedBy
                          )}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="mt-2 space-y-1">
                      {entry.oldValue !== undefined && entry.oldValue !== null && entry.oldValue !== '' && (
                        <p className="text-xs">
                          <span className="text-red-600">{pt.from}:</span> <span className="line-through">{entry.oldValue}</span>
                        </p>
                      )}
                      {entry.newValue !== undefined && entry.newValue !== null && entry.newValue !== '' && (
                        <p className="text-xs">
                          <span className="text-green-600">{pt.to}:</span> <span className="font-medium">{entry.newValue}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Task Dialog */}
      <Dialog open={editingTask} onOpenChange={setEditingTask}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{pt.editTask}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitEditForm(onEditTaskSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{pt.title}</label>
              <input
                {...registerEditForm('title')}
                type="text"
                className="w-full border rounded px-3 py-2 text-sm"
              />
              {editErrors.title && <p className="text-red-500 text-sm mt-1">{editErrors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{pt.description}</label>
              <textarea
                {...registerEditForm('description')}
                className="w-full border rounded px-3 py-2 text-sm"
                rows={3}
              />
              {editErrors.description && <p className="text-red-500 text-sm mt-1">{editErrors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{pt.priority}</label>
                <select {...registerEditForm('priority')} className="w-full border rounded px-3 py-2 text-sm">
                  <option value="LOW">{pt.low}</option>
                  <option value="MEDIUM">{pt.medium}</option>
                  <option value="HIGH">{pt.high}</option>
                  <option value="URGENT">{pt.urgent}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{pt.dueDate}</label>
                <input {...registerEditForm('dueDate')} type="date" className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleEditCancel} disabled={savingTask}>
                {pt.cancel}
              </Button>
              <Button type="submit" disabled={savingTask}>
                {savingTask ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" />
                    <span>{pt.saving}</span>
                  </div>
                ) : (
                  pt.save
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pt.deleteTask}</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar esta tarefa? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel} disabled={deletingTask}>
              {pt.cancel}
            </Button>
            <Button variant="destructive" onClick={handleDeleteTask} disabled={deletingTask}>
              {deletingTask ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />
                  <span>{pt.deleting}</span>
                </div>
              ) : (
                pt.delete
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

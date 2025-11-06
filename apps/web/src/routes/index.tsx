import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { useTasksStore } from '@/store/tasks'
import { useToast } from '@/store/toast'
import { tasksAPI } from '@/api/tasks'
import { Task } from '@/store/tasks'
import { Link } from '@tanstack/react-router'

export function TasksPage() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const tasks = useTasksStore((state) => state.tasks)
  const setTasks = useTasksStore((state) => state.setTasks)
  const toast = useToast()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const data = await tasksAPI.list()
        setTasks(data)
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to fetch tasks')
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [setTasks])

  const getStatusColor = (status: Task['status']) => {
    const colors = {
      TODO: 'bg-gray-100',
      IN_PROGRESS: 'bg-blue-100',
      REVIEW: 'bg-purple-100',
      DONE: 'bg-green-100',
    }
    return colors[status]
  }

  const getPriorityColor = (priority: Task['priority']) => {
    const colors = {
      LOW: 'outline',
      MEDIUM: 'secondary',
      HIGH: 'destructive',
      URGENT: 'destructive',
    }
    return colors[priority]
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Welcome, {user?.username || user?.email}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/tasks/new">
            <Button>New Task</Button>
          </Link>
          <Button variant="outline" onClick={() => logout()}>
            Logout
          </Button>
        </div>
      </div>

      {/* Tasks Grid */}
      {loading ? (
        <div className="text-center py-12">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No tasks yet. Create one to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <Link key={task.id} to={`/tasks/${task.id}`}>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-2">{task.title}</CardTitle>
                    <Badge variant={getPriorityColor(task.priority) as any}>{task.priority}</Badge>
                  </div>
                  <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {task.description && <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>}
                  {task.dueDate && (
                    <p className="text-xs text-muted-foreground">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {task.assignees.length} assignee{task.assignees.length !== 1 ? 's' : ''}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

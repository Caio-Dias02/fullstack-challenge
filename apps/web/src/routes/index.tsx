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
import { Spinner } from '@/components/spinner'

export function TasksPage() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const tasks = useTasksStore((state) => state.tasks)
  const setTasks = useTasksStore((state) => state.setTasks)
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedPriority, setSelectedPriority] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

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

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = !selectedStatus || task.status === selectedStatus
    const matchesPriority = !selectedPriority || task.priority === selectedPriority
    const matchesSearch = !searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesPriority && matchesSearch
  })

  const clearFilters = () => {
    setSelectedStatus('')
    setSelectedPriority('')
    setSearchQuery('')
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

      {/* Search and Filters */}
      {!loading && tasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Search & Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Search by title</label>
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="border rounded px-3 py-2 text-sm"
                >
                  <option value="">All statuses</option>
                  <option value="TODO">TODO</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="REVIEW">Review</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="border rounded px-3 py-2 text-sm"
                >
                  <option value="">All priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              {(selectedStatus || selectedPriority || searchQuery) && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Spinner size="lg" />
          <p className="text-muted-foreground mt-4">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No tasks yet. Create one to get started!</p>
          </CardContent>
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No tasks match the selected filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
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

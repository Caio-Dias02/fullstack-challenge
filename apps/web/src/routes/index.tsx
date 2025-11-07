import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { useTasksStore } from '@/store/tasks'
import { Task } from '@/store/tasks'
import { Link } from '@tanstack/react-router'
import { Spinner } from '@/components/spinner'
import { useTasksList } from '@/hooks/useTasksQuery'
import { Plus, LogOut, Search, Filter, X, Calendar, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { pt } from '@/lib/translations'

export function TasksPage() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const setTasks = useTasksStore((state) => state.setTasks)

  // Use TanStack Query hook
  const { data: tasks = [], isLoading } = useTasksList()

  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedPriority, setSelectedPriority] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  // Sync to Zustand store for compatibility with other components
  useEffect(() => {
    if (tasks.length > 0) {
      setTasks(tasks)
    }
  }, [tasks, setTasks])

  const getStatusColor = (status: Task['status']) => {
    const colors = {
      TODO: 'bg-slate-100 text-slate-700 border-slate-200',
      IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
      REVIEW: 'bg-purple-100 text-purple-700 border-purple-200',
      DONE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    }
    return colors[status]
  }

  const getStatusLabel = (status: Task['status']) => {
    const labels = {
      TODO: pt.todo,
      IN_PROGRESS: pt.inProgress,
      REVIEW: pt.review,
      DONE: pt.done,
    }
    return labels[status]
  }

  const getPriorityColor = (priority: Task['priority']) => {
    const colors = {
      LOW: 'bg-slate-100 text-slate-600 border-slate-200',
      MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
      HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
      URGENT: 'bg-red-100 text-red-700 border-red-200',
    }
    return colors[priority]
  }

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = !selectedStatus || task.status === selectedStatus
    const matchesPriority = !selectedPriority || task.priority === selectedPriority
    const matchesSearch = !searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase())
    const isCreatorOrAssignee = task.creatorId === user?.id || task.assignees.includes(user?.id || '')
    return matchesStatus && matchesPriority && matchesSearch && isCreatorOrAssignee
  })

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedStatus, selectedPriority, searchQuery])

  // Calculate pagination
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex)

  const clearFilters = () => {
    setSelectedStatus('')
    setSelectedPriority('')
    setSearchQuery('')
  }

  return (
    <div className="min-h-screen space-y-8 p-6 md:p-8 lg:p-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-slate-900">
            {pt.tasks}
          </h1>
          <p className="text-muted-foreground text-lg">
            {pt.welcomeBack}, <span className="font-semibold text-foreground">{user?.username || user?.email}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/tasks/new">
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
              <Plus className="mr-2 h-4 w-4" />
              {pt.newTask}
            </Button>
          </Link>
          <Button variant="outline" onClick={() => logout()} className="hover:bg-slate-100 transition-colors">
            <LogOut className="mr-2 h-4 w-4" />
            {pt.logout}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      {!isLoading && tasks.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Filter className="h-5 w-5 text-blue-600" />
              {pt.searchFilters}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">{pt.searchByTitle}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={pt.searchTasks}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-lg px-10 py-2.5 text-sm focus:border-blue-500 transition-all outline-none bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-sm font-semibold mb-2 text-slate-700">{pt.status}</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 transition-all outline-none bg-white cursor-pointer"
                  >
                    <option value="">{pt.allStatuses}</option>
                    <option value="TODO">{pt.todo}</option>
                    <option value="IN_PROGRESS">{pt.inProgress}</option>
                    <option value="REVIEW">{pt.review}</option>
                    <option value="DONE">{pt.done}</option>
                  </select>
                </div>

                <div className="flex-1 min-w-[180px]">
                  <label className="block text-sm font-semibold mb-2 text-slate-700">{pt.priority}</label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 transition-all outline-none bg-white cursor-pointer"
                  >
                    <option value="">{pt.allPriorities}</option>
                    <option value="LOW">{pt.low}</option>
                    <option value="MEDIUM">{pt.medium}</option>
                    <option value="HIGH">{pt.high}</option>
                    <option value="URGENT">{pt.urgent}</option>
                  </select>
                </div>

                {(selectedStatus || selectedPriority || searchQuery) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="hover:bg-slate-100 transition-colors"
                  >
                    <X className="mr-2 h-4 w-4" />
                    {pt.clearFilters}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks Grid */}
      {isLoading ? (
        <Card className="border-slate-200">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center">
              <Spinner size="lg" />
              <p className="text-slate-600 mt-4 font-medium">{pt.loadingTasks}</p>
            </div>
          </CardContent>
        </Card>
      ) : tasks.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <div className="space-y-3">
              <p className="text-slate-600 text-lg font-medium">{pt.noTasks}</p>
              <p className="text-slate-500">{pt.createOne}</p>
              <Link to="/tasks/new" className="inline-block mt-4">
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                  <Plus className="mr-2 h-4 w-4" />
                  {pt.createFirstTask}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <div className="space-y-3">
              <p className="text-slate-600 text-lg font-medium">{pt.noTasksMatch}</p>
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                <X className="mr-2 h-4 w-4" />
                {pt.clearFilters}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedTasks.map((task) => (
            <Link key={task.id} to="/tasks/$id" params={{ id: task.id }}>
              <Card className="cursor-pointer transition-all duration-300 border-slate-200 hover:border-blue-300 hover:-translate-y-1 group bg-white">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg font-semibold line-clamp-2 group-hover:text-blue-600 transition-colors flex-1">
                      {task.title}
                    </CardTitle>
                    <Badge className={`${getPriorityColor(task.priority)} border font-medium shrink-0`}>
                      {task.priority}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <Badge className={`${getStatusColor(task.status)} border font-medium`}>
                      {getStatusLabel(task.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {task.description && (
                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  )}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                    {task.dueDate && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{pt.due}: {new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Users className="h-3.5 w-3.5" />
                      <span>
                        {task.assignees.length} {task.assignees.length !== 1 ? pt.people : pt.person}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Card className="border-slate-200">
              <CardContent className="py-5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-slate-600 font-medium">
                    {pt.page} <span className="font-bold text-slate-900">{currentPage}</span> {pt.of}{' '}
                    <span className="font-bold text-slate-900">{totalPages}</span> · {pt.showing}{' '}
                    <span className="font-bold text-slate-900">{paginatedTasks.length}</span> {pt.of}{' '}
                    <span className="font-bold text-slate-900">{filteredTasks.length}</span> {pt.tasks}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="hover:bg-slate-100 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {pt.previous}
                    </Button>

                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 ${
                            currentPage === page
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'hover:bg-slate-100'
                          }`}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="hover:bg-slate-100 disabled:opacity-50"
                    >
                      {pt.next}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

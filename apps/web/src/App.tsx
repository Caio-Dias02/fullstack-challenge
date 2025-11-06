import { RouterProvider, createRouter, createBrowserHistory, RootRoute, Route, useLocation, useNavigate } from '@tanstack/react-router'
import { Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuthStore } from './store/auth'
import { useWebSocket } from './hooks/useWebSocket'
import { TasksPage } from './routes/index'
import { LoginPage } from './routes/login'
import { RegisterPage } from './routes/register'
import { NewTaskPage } from './routes/tasks.new'
import { TaskDetailPage } from './routes/tasks.$id'
import { ToastContainer } from './components/toast-container'

// Root layout
const RootLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { token } = useAuthStore()

  // Initialize WebSocket connection when authenticated
  useWebSocket()

  // Redirect logic
  useEffect(() => {
    const publicRoutes = ['/login', '/register']
    const isPublicRoute = publicRoutes.includes(location.pathname)

    if (!token && !isPublicRoute) {
      navigate({ to: '/login', replace: true })
    } else if (token && isPublicRoute) {
      navigate({ to: '/', replace: true })
    }
  }, [token, location.pathname, navigate])

  return (
    <div className="min-h-screen bg-background">
      <Outlet />
      <ToastContainer />
    </div>
  )
}

const rootRoute = new RootRoute({
  component: RootLayout,
})

const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  component: TasksPage,
})

const loginRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const registerRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
})

const taskNewRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/tasks/new',
  component: NewTaskPage,
})

const taskDetailRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/tasks/$id',
  component: TaskDetailPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  taskNewRoute,
  taskDetailRoute,
])

const history = createBrowserHistory()
const router = createRouter({ routeTree, history })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function App() {
  return <RouterProvider router={router} />
}

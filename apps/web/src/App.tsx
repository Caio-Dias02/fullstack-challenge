import { RouterProvider, createRouter, createBrowserHistory, RootRoute, Route } from '@tanstack/react-router'
import { Outlet } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

// Root layout
const rootRoute = new RootRoute({
  component: () => (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  ),
})

// Lazy load pages
const IndexComponent = lazy(() => import('./routes/index').then(m => ({ default: m.TasksPage })))
const LoginComponent = lazy(() => import('./routes/login').then(m => ({ default: m.LoginPage })))
const RegisterComponent = lazy(() => import('./routes/register').then(m => ({ default: m.RegisterPage })))
const TaskNewComponent = lazy(() => import('./routes/tasks.new').then(m => ({ default: m.NewTaskPage })))
const TaskDetailComponent = lazy(() => import('./routes/tasks.$id').then(m => ({ default: m.TaskDetailPage })))

const Loading = () => <div className="flex items-center justify-center min-h-screen">Loading...</div>

const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <Suspense fallback={<Loading />}>
      <IndexComponent />
    </Suspense>
  ),
})

const loginRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => (
    <Suspense fallback={<Loading />}>
      <LoginComponent />
    </Suspense>
  ),
})

const registerRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: () => (
    <Suspense fallback={<Loading />}>
      <RegisterComponent />
    </Suspense>
  ),
})

const taskNewRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/tasks/new',
  component: () => (
    <Suspense fallback={<Loading />}>
      <TaskNewComponent />
    </Suspense>
  ),
})

const taskDetailRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/tasks/$id',
  component: () => (
    <Suspense fallback={<Loading />}>
      <TaskDetailComponent />
    </Suspense>
  ),
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

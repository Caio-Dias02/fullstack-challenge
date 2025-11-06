import { createRootRoute, Outlet } from '@tanstack/react-router'

export const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  ),
})

export const Route = rootRoute

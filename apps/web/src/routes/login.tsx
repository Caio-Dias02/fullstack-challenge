import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth'
import { authAPI } from '@/api/auth'
import { rootRoute } from './__root'

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email or username is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export const Route = createFileRoute('/login')({
  getParentRoute: () => rootRoute,
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setError('')
    setLoading(true)

    try {
      // Determine if it's email or username
      const isEmail = data.emailOrUsername.includes('@')
      const loginData = isEmail
        ? { email: data.emailOrUsername, password: data.password }
        : { username: data.emailOrUsername, password: data.password }

      const response = await authAPI.login(loginData)
      setAuth(response.user, response.accessToken)
      navigate({ to: '/' })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your credentials to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

            <div>
              <label className="block text-sm font-medium mb-1">Email or Username</label>
              <Input
                {...register('emailOrUsername')}
                placeholder="john@example.com or johndoe"
                type="text"
              />
              {errors.emailOrUsername && (
                <p className="text-red-500 text-sm mt-1">{errors.emailOrUsername.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <Input {...register('password')} placeholder="••••••••" type="password" />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline">
                Register
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

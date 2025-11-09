import { useNavigate, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/store/toast'
import { authAPI } from '@/api/auth'
import { Spinner } from '@/components/spinner'
import { pt } from '@/lib/translations'

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email ou nome de usuário é obrigatório'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)

    try {
      // Determine if it's email or username
      const isEmail = data.emailOrUsername.includes('@')
      const loginData = isEmail
        ? { email: data.emailOrUsername, password: data.password }
        : { username: data.emailOrUsername, password: data.password }

      const response = await authAPI.login(loginData)
      setAuth(response.user, response.accessToken)
      toast.success('Login realizado com sucesso!')
      navigate({ to: '/' })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Falha no login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{pt.login}</CardTitle>
          <CardDescription>Digite suas credenciais para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{pt.email} ou {pt.username}</label>
              <Input
                {...register('emailOrUsername')}
                placeholder="john@example.com ou johndoe"
                type="text"
              />
              {errors.emailOrUsername && (
                <p className="text-red-500 text-sm mt-1">{errors.emailOrUsername.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{pt.password}</label>
              <Input {...register('password')} placeholder="••••••••" type="password" />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Spinner size="sm" />
                  <span>Entrando...</span>
                </div>
              ) : (
                pt.login
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Não tem uma conta?{' '}
              <Link to="/register" className="text-primary hover:underline">
                {pt.register}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

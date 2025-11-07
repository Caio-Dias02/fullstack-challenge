import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
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
import { rootRoute } from './__root'
import { pt } from '@/lib/translations'

const registerSchema = z.object({
  email: z.string().email('Endereço de email inválido').max(100, 'Email muito longo'),
  username: z
    .string()
    .min(3, 'Nome de usuário deve ter no mínimo 3 caracteres')
    .max(30, 'Nome de usuário deve ter no máximo 30 caracteres')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Nome de usuário pode conter apenas caracteres alfanuméricos, underscore e hífen'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(128, 'Senha muito longa'),
})

type RegisterForm = z.infer<typeof registerSchema>

export const Route = createFileRoute('/register')({
  getParentRoute: () => rootRoute,
  component: RegisterPage,
})

export function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true)

    try {
      const response = await authAPI.register(data)
      setAuth(response.user, response.accessToken)
      toast.success('Conta criada com sucesso!')
      navigate({ to: '/' })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Falha no registro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar Conta</CardTitle>
          <CardDescription>Registre-se para começar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{pt.email}</label>
              <Input {...register('email')} placeholder="john@example.com" type="email" />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{pt.username}</label>
              <Input {...register('username')} placeholder="johndoe" type="text" />
              {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>}
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
                  <span>Criando conta...</span>
                </div>
              ) : (
                pt.register
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-primary hover:underline">
                {pt.login}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

# Fullstack Challenge - Task Management System

**Desenvolvido por:** Caio Dias | **Status:** MVP Completo | **Timeline:** ~29h | **Stack:** React + NestJS + TypeORM + RabbitMQ + Docker

Um sistema colaborativo de gerenciamento de tarefas com arquitetura de microserviços, notificações em tempo real e autenticação JWT. Users podem criar tarefas, atribuir para colegas, comentar e receber notificações em tempo real.

---

## 📐 Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│              (TanStack Router + shadcn/ui)                  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP + WebSocket
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway :3000                        │
│         (Rate Limiting: 10 req/s, JWT Validation)          │
└──┬──────────────────┬──────────────────┬────────────────────┘
   │                  │                  │
   ↓                  ↓                  ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│ Auth Service │ │ Tasks Service│ │ Notifications    │
│   :3001      │ │   :3002      │ │ Service :3003    │
│              │ │              │ │                  │
│ • Register   │ │ • CRUD Tasks │ │ • WebSocket      │
│ • Login      │ │ • Comments   │ │ • Event Consumer │
│ • Refresh    │ │ • History    │ │ • Broadcast      │
└──────┬───────┘ └──────┬───────┘ └────────┬─────────┘
       │                │                  │
       └────────────┬───┴──────────────────┘
                    │
         ┌──────────┴──────────┐
         ↓                     ↓
    ┌─────────┐            ┌──────────┐
    │RabbitMQ │◄──────────►│ Events   │
    │  Queue  │  Pub/Sub   │ Exchange │
    └─────────┘            └──────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌─────────┐ ┌─────────┐
│ Auth DB │ │Tasks DB │
│ (PG)    │ │ (PG)    │
└─────────┘ └─────────┘
```

### Fluxo de Criação de Tarefa

```
1. Client envia POST /api/tasks com JWT
2. Gateway valida token → Tasks Service
3. Tasks Service:
   - Salva no DB
   - Publica evento "task:created" no RabbitMQ
   - Retorna tarefa ao client
4. Notifications Service:
   - Consome evento
   - Enriquece com dados dos usuários
   - Emite WebSocket para assignees
5. Client recebe notificação real-time
```

---

## 🛠️ Decisões Técnicas e Trade-offs

### ✅ O Que Deu Certo

| Decisão | Por Quê | Benefício |
|---------|---------|-----------|
| **Separação por Microserviços** | Single Responsibility Principle | Escalabilidade, manutenção independente |
| **RabbitMQ para Eventos** | Desacoplamento entre serviços | Services não dependem uns dos outros |
| **WebSocket (Socket.io)** | Real-time nativo | UX imediata, sem polling constante |
| **TypeORM + Migrations** | Versionamento de schema | Rollback seguro, histórico de mudanças |
| **JWT Stateless** | Escalável sem sessão no servidor | Perfeito para microserviços |
| **PostgreSQL separados** | Database-per-Service pattern | Independência de dados por serviço |
| **Enriquecimento de dados** | Fetch user info no client response | UX melhor (mostra nome em vez de UUID) |

### ⚠️ Trade-offs e Limitações

| Escolha | Vantagem | Desvantagem |
|---------|----------|-------------|
| **Hard Delete** | Simples, sem soft_deleted flag | Sem recuperação de dados perdidos |
| **Sem Paginação** | MVP rápido de implementar | Problema em produção (N+1) |
| **localStorage para tokens** | Fácil de implementar | Vulnerável a XSS attacks |
| **Sem Audit Log Table** | Reduz complexidade inicial | Difícil rastrear quem fez o quê |
| **Database-per-Service** | Independência total | Sem foreign keys entre services |
| **Sem Testes Automatizados** | Economia de tempo | Risco de regressões |

---

## 🚨 Problemas Conhecidos e Soluções

### 1️⃣ TypeScript Compilation em Docker (🔧 RESOLVIDO)

**Problema:**
- Tasks service falhava ao iniciar por erro de TypeScript
- `Cannot find module 'class-validator'` em arquivos do pacote `types`
- Causa: TypeScript tentava compilar source files do `@fullstack-challenge/types` durante o build

**Solução Implementada:**
```typescript
// 1. Criado packages/types/tsconfig.json
// 2. Adicionado build script em packages/types/package.json
// 3. Atualizado Dockerfile para executar antes:
RUN pnpm --filter @fullstack-challenge/types build || true
// 4. Revert para path aliases (@fullstack-challenge/types)
```

**Resultado:** ✅ Tasks service agora compila corretamente

### 2️⃣ Enriquecimento de Dados (🔄 PARCIALMENTE COMPLETO)

**O que é:** Substituir UUIDs por nomes/emails reais em comentários e histórico de tarefas.

**Status:**
- ✅ `UsersService` busca dados de múltiplos usuários do Auth Service
- ✅ `enrichTaskWithAssigneeData()` implementado em tasks.service.ts
- ✅ `enrichCommentWithAuthorData()` implementado em comments.service.ts
- ✅ Controllers chamam enrichment antes de retornar responses
- ⏳ Pendente: Testes end-to-end com app rodando completo

**Como funciona:**
```typescript
// Tasks Service
const userMap = await this.usersService.getUsersByIds(assigneeIds);
enriched.assigneesData = Array.from(userMap.values());

// Comments Service
const author = await this.usersService.getUsersByIds([comment.authorId]);
enriched.authorData = author.get(comment.authorId);
```

### 3️⃣ Outras Limitações Conhecidas

- **Sem soft delete:** Tasks deletadas não podem ser recuperadas
- **Sem paginação:** Todo retorno sem limite (problema com N=grande)
- **Sem search:** Apenas listagem básica
- **Socket.io reconnection:** Não testado em desconexões prolongadas
- **Rate limiting:** Implementado mas sem testes de carga

---

## ⏱️ Tempo Gasto em Cada Componente

| Componente | Tempo | Detalhes |
|-----------|-------|----------|
| **Setup Inicial** | 1.5h | Turborepo, Docker, dockerfiles, .env |
| **Auth Service** | 3.5h | Register, login, JWT, bcrypt, migrations |
| **Tasks Service CRUD** | 2.5h | TypeORM entities, controllers, routes |
| **Comments System** | 1.5h | Comment entity, relationship, validation |
| **Task History** | 1.5h | Change tracking, differential logging |
| **API Gateway** | 1.5h | Rate limiting, JWT guard, proxy routes |
| **Events & RabbitMQ** | 2h | Publishing, exchange setup, routing |
| **Notifications Service** | 2.5h | RabbitMQ consumer, Socket.io setup |
| **Data Enrichment** | 2h | UsersService, enrichment methods |
| **Frontend (React + UI)** | 3h | Components, routing, auth context |
| **WebSocket Integration** | 1.5h | Client-side socket, event listeners |
| **Docker Debugging** | 3h | ⚠️ Compilation issues, lockfile updates |
| **Testing & Polish** | 1.5h | Bug fixes, logging improvements |
| **Documentation (README)** | 1h | Arquitetura, decisões, instruções |
| **TOTAL** | ~29h | Aproximadamente 3.5 dias úteis |

**Principais bottlenecks:**
1. Docker/TypeScript compilation (3h)
2. Data enrichment e inter-service communication (3h)
3. Frontend integration (4.5h)

---

## 📝 Instruções Específicas

### Para Desenvolvedores

**Debug de enriquecimento:**
```bash
# Ver logs detalhados da enrichment
docker compose logs -f tasks-service | grep "🎯\|Enriching"
```

**Testar comentários enriquecidos:**
```bash
# 1. Criar tarefa
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <token>" \
  -d '{"title":"Test"}'

# 2. Comentar
curl -X POST http://localhost:3000/api/tasks/<task-id>/comments \
  -H "Authorization: Bearer <token>" \
  -d '{"body":"Comentário teste"}'

# 3. Listar comentários (deve mostrar authorData com name/email)
curl http://localhost:3000/api/tasks/<task-id>/comments
```

**Limpar volumes do Docker:**
```bash
docker compose down -v
docker compose up -d
```

### Para Produção (Checklist)

- [ ] Mudar `noEmitOnError` para `true` em tsconfig
- [ ] Implementar soft delete com migration
- [ ] Adicionar paginação (limit 20, offset)
- [ ] Configurar HTTPS/TLS
- [ ] Usar HTTP-only cookies para tokens
- [ ] Setup de logging centralizado (Winston/Pino)
- [ ] Testes automatizados (min 60% coverage)
- [ ] Monitoring com health checks
- [ ] Backup automático de databases

---

## 🚀 Como Rodar

### Pré-requisitos
- Docker & Docker Compose
- Node.js 24+ (se rodar localmente)
- pnpm 10.14.0+

### Startup Rápido

```bash
# Clone e entre no diretório
cd fullstack-challenge

# Instale dependências (já feito no Docker)
pnpm install

# Inicie tudo com Docker
docker compose up -d

# Aguarde ~15s para os serviços iniciarem
sleep 15

# Acesse
# Frontend: http://localhost:3000
# Swagger (Auth): http://localhost:3001/api/docs
# Swagger (Tasks): http://localhost:3002/api/docs
```

### Desenvolvimento Local (sem Docker)

```bash
# Terminal 1: Auth Service
pnpm --filter @fullstack-challenge/auth-service dev

# Terminal 2: Tasks Service
pnpm --filter @fullstack-challenge/tasks-service dev

# Terminal 3: Notifications Service
pnpm --filter @fullstack-challenge/notifications-service dev

# Terminal 4: API Gateway
pnpm --filter api-gateway dev

# Terminal 5: Frontend
pnpm --filter web dev
```

---

## 🎯 O Que Melhoraria (Roadmap)

### Curto Prazo (Próxima Sprint)
- [ ] **Testes Unitários** para services críticos (Auth, Tasks)
- [ ] **Soft Delete** com recovery para tasks
- [ ] **Paginação** (limit 20, offset-based)
- [ ] **HTTP-only Cookies** para tokens (melhor que localStorage)
- [ ] **Validação de datas** futuras em update task

### Médio Prazo (2-3 sprints)
- [ ] **Audit Log Table** (track quem fez o quê)
- [ ] **Structured Logging** (Winston/Pino com JSON)
- [ ] **Search** com full-text indexing (PostgreSQL tsvector)
- [ ] **Task Templates** e recurring tasks
- [ ] **Health Checks** em todos os services
- [ ] **Testes E2E** com Cypress/Playwright

### Longo Prazo (Wishlist)
- [ ] **Team/Workspace** concept (multi-tenant)
- [ ] **Activity Feed** por usuário
- [ ] **Email Notifications** (além de WebSocket)
- [ ] **File Attachments** (S3/MinIO)
- [ ] **Task Dependencies** (Gantt chart)
- [ ] **Mobile App** (React Native)
- [ ] **Observability** (Prometheus + Grafana)

---

## 📁 Estrutura do Projeto

```
fullstack-challenge/
├── apps/
│   ├── web/                              # React Frontend
│   │   ├── src/
│   │   │   ├── routes/                  # TanStack Router pages
│   │   │   │   ├── home.tsx
│   │   │   │   ├── tasks.tsx
│   │   │   │   └── login.tsx
│   │   │   ├── components/              # shadcn/ui + custom
│   │   │   │   ├── task-card.tsx
│   │   │   │   ├── comment-section.tsx
│   │   │   │   └── navbar.tsx
│   │   │   ├── hooks/                   # Custom hooks
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── useTasks.ts
│   │   │   ├── context/                 # Auth context provider
│   │   │   │   └── auth-context.tsx
│   │   │   └── api/                     # Axios client config
│   │   │       └── client.ts
│   │   └── package.json
│   │
│   ├── api-gateway/                     # NestJS Gateway :3000
│   │   ├── src/
│   │   │   ├── main.ts                 # Entry point
│   │   │   ├── auth/
│   │   │   │   └── auth.controller.ts  # Proxy routes
│   │   │   ├── tasks/
│   │   │   │   └── tasks.controller.ts
│   │   │   └── common/
│   │   │       ├── guards/             # JWT guard
│   │   │       ├── filters/            # Exception filters
│   │   │       └── middleware/         # Rate limiter
│   │   └── package.json
│   │
│   ├── auth-service/                    # NestJS Auth :3001
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── jwt.strategy.ts
│   │   │   ├── users/
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── user.entity.ts
│   │   │   └── database/
│   │   │       └── migrations/
│   │   └── package.json
│   │
│   ├── tasks-service/                   # NestJS Tasks :3002
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── tasks/
│   │   │   │   ├── tasks.controller.ts
│   │   │   │   ├── tasks.service.ts     # Com enrichment
│   │   │   │   ├── users.service.ts     # Fetch user data
│   │   │   │   └── entities/
│   │   │   │       └── task.entity.ts
│   │   │   ├── comments/
│   │   │   │   ├── comments.controller.ts
│   │   │   │   ├── comments.service.ts  # Com enrichment
│   │   │   │   └── entities/
│   │   │   │       └── comment.entity.ts
│   │   │   ├── task-history/
│   │   │   │   ├── task-history.service.ts
│   │   │   │   └── entities/
│   │   │   │       └── task-history.entity.ts
│   │   │   ├── events/
│   │   │   │   └── events.service.ts    # RabbitMQ publisher
│   │   │   └── database/
│   │   │       └── migrations/
│   │   └── package.json
│   │
│   └── notifications-service/           # NestJS Notifications :3003
│       ├── src/
│       │   ├── main.ts
│       │   ├── events/
│       │   │   └── events.consumer.ts    # RabbitMQ consumer
│       │   └── websocket/
│       │       └── notifications.gateway.ts # Socket.io setup
│       └── package.json
│
├── packages/
│   ├── types/                           # Shared TypeScript types
│   │   ├── auth/
│   │   │   ├── index.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       └── register.dto.ts
│   │   ├── tasks/
│   │   │   ├── index.ts
│   │   │   └── dto/
│   │   │       ├── create-task.dto.ts
│   │   │       └── update-task.dto.ts
│   │   ├── comments/
│   │   │   ├── index.ts
│   │   │   └── dto/
│   │   │       └── create-comment.dto.ts
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json                # ⭐ Novo: build script
│   │
│   ├── eslint-config/                   # Shared ESLint rules
│   └── tsconfig/                        # Shared TypeScript config
│
├── docker-compose.yml                   # Orchestração de serviços
├── turbo.json                          # Turborepo config
├── pnpm-lock.yaml                      # Lock file atualizado
├── package.json                         # Root package.json
└── README.md                           # Este arquivo
```

---

## 🧪 Testes Manuais (Curl Examples)

### Registrar Usuário
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "caio@test.com",
    "username": "caio",
    "password": "senha123456"
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "email": "caio@test.com",
  "username": "caio",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### Fazer Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "caio@test.com",
    "password": "senha123456"
  }'
```

### Criar Tarefa
```bash
TOKEN="seu-access-token-aqui"

curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implementar nova feature",
    "description": "Descrição detalhada",
    "priority": "HIGH",
    "assignees": []
  }'
```

### Listar Tarefas
```bash
curl -X GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN"
```

### Adicionar Comentário
```bash
TASK_ID="uuid-da-tarefa"

curl -X POST http://localhost:3000/api/tasks/$TASK_ID/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Ótimo progresso!"
  }'
```

### Ver Comentários (com dados enriquecidos)
```bash
curl -X GET http://localhost:3000/api/tasks/$TASK_ID/comments \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | {body, authorData: .authorData}'
```

---

## 📊 Performance & Métricas

| Métrica | Valor | Detalhes |
|---------|-------|----------|
| **Rate Limit** | 10 req/s | Por IP, no API Gateway |
| **JWT Access Token** | 15 min | Curto prazo para segurança |
| **Refresh Token** | 7 dias | Permite re-autenticação |
| **Max Task Title** | 200 chars | Validado no DTO |
| **Max Comment** | 1000 chars | Validado no DTO |
| **Task Assignees** | Ilimitado | Sem limite de colaboradores |
| **DB Pool** | Default TypeORM | ~10 conexões |
| **RabbitMQ Queue** | Durable | Persistência de eventos |
| **WebSocket Timeout** | 60s | Ping/pong do Socket.io |

---

## 🔐 Segurança Implementada

### ✅ Implementado
- **Bcrypt (10 rounds):** Hashing de senhas
- **JWT:** Token-based auth stateless
- **Input Validation:** class-validator em todos DTOs
- **SQL Injection Prevention:** TypeORM parameterized queries
- **XSS Prevention:** React auto-escaping
- **CORS:** Configurado no API Gateway
- **Rate Limiting:** 10 req/s no gateway

### ⚠️ Recomendações para Produção
- [ ] HTTPS/TLS obrigatório
- [ ] JWT rotation em cada refresh
- [ ] Secrets em vault (HashiCorp Vault / AWS Secrets)
- [ ] CORS mais restritivo (origem específica)
- [ ] API Key para serviços inter-service
- [ ] Helmet.js no Express
- [ ] Request signing (HMAC)

---

## 📞 Debugging Tips

### Ver logs em tempo real
```bash
# Todos os serviços
docker compose logs -f

# Apenas um serviço
docker compose logs -f tasks-service

# Com filtro de keywords
docker compose logs tasks-service | grep "ERROR\|🎯"
```

### Entrar no container
```bash
docker compose exec tasks-service sh
cd /usr/src/app/apps/tasks-service
npm run build
```

### Reset completo
```bash
# Parar e remover tudo
docker compose down -v

# Reconstruir imagens
docker compose build --no-cache

# Iniciar novamente
docker compose up -d

# Aguardar 20s para databases inicializarem
sleep 20

# Verificar logs
docker compose logs tasks-service
```

### Verificar Status dos Serviços
```bash
# Health checks
curl http://localhost:3000/health      # Gateway
curl http://localhost:3001/auth/health # Auth
curl http://localhost:3002/health      # Tasks
curl http://localhost:3003/health      # Notifications

# RabbitMQ
curl http://localhost:15672/api/overview -u guest:guest

# Databases
docker compose exec auth-db psql -U postgres -d auth_db -c "SELECT 1;"
```

---

## 📝 Histórico de Desenvolvimento

### Sessão 1 (Primeiras 15h)
- ✅ Setup turborepo e docker-compose
- ✅ Auth service com JWT
- ✅ Tasks CRUD com TypeORM
- ✅ Comments system
- ✅ RabbitMQ events

### Sessão 2 (Próximas 10h)
- ✅ Data enrichment (users em comments)
- ✅ Docker/TypeScript compilation fixes
- ✅ Notifications service (Socket.io)
- ✅ Frontend integration
- ⏳ E2E testing
- 📝 Documentation (README)

### Problemas Resolvidos
1. TypeScript não compilava tipos do @fullstack-challenge/types
   - Solução: Build packages/types antes com pnpm filter
2. Inter-service communication (Auth → Tasks)
   - Solução: UsersService com HTTP client
3. Docker volume caching issues
   - Solução: docker compose down -v && docker compose up -d

---

## 👨‍💻 Desenvolvido por

**Caio Dias**

- TypeScript/Node.js Backend
- React Frontend
- Docker & DevOps
- Microservices Architecture

---

## 📄 Licença

UNLICENSED - Projeto de Challenge

**Last Updated:** Novembro 2025
**Version:** 1.0.0-MVP
**Est. Dev Time:** ~29 horas

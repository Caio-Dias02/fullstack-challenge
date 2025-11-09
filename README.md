# Fullstack Challenge - Task Management System

**Dev:** Caio Dias | **Status:** MVP | **Time:** ~29h | **Stack:** React + NestJS + TypeORM + RabbitMQ + Docker

Sistema colaborativo gerenciamento tarefas. Microserviços, real-time WebSocket, JWT auth.

---

## 📐 Arquitetura

```
┌─────────────────────────────────────┐
│       React Frontend :3000          │
│   (TanStack Router + shadcn/ui)     │
└────────────────┬────────────────────┘
                 │ HTTP + WebSocket
                 ▼
┌─────────────────────────────────────┐
│      API Gateway :3000              │
│  (Rate Limit 10/s, JWT Validation)  │
└──┬──────────────┬──────────────┬────┘
   │              │              │
   ▼              ▼              ▼
┌────────┐  ┌────────┐  ┌──────────────┐
│  Auth  │  │ Tasks  │  │Notifications │
│:3001   │  │:3002   │  │   :3003      │
└────┬───┘  └───┬────┘  └──────┬───────┘
     │          │               │
     ▼          ▼               │
   ┌──────┐  ┌──────┐          │
   │Auth  │  │Tasks │          │
   │DB    │  │DB    │          │
   └──────┘  └──────┘          │
                                │
                    ┌───────────┘
                    ▼
            ┌──────────────────┐
            │ RabbitMQ Events  │
            │  Pub/Sub Pattern │
            └──────────────────┘
```

### Fluxo Criação Tarefa

```
1. POST /api/tasks (JWT)
   ↓
2. Gateway valida → Tasks Service
   ↓
3. Tasks Service:
   - Salva DB
   - Publica "task:created" RabbitMQ
   - Retorna response
   ↓
4. Notifications Service consome evento
   - Busca dados users (enriquecimento)
   - Emite WebSocket para assignees
   ↓
5. Client recebe real-time notification
```

---

## 🛠️ Decisões Técnicas

### ✅ Acertadas

| Decisão | Por Quê | Benefício |
|---------|---------|-----------|
| Microserviços | Separação responsabilidades | Escalabilidade, deploys independentes |
| RabbitMQ | Desacoplamento serviços | Sem dependências síncronas |
| WebSocket | Real-time nativo | UX imediata, sem polling |
| JWT Stateless | Escalável multi-instância | Sem sessão centralizada |
| TypeORM + Migrations | Versionamento schema | Rollback seguro |
| DB por Serviço | Independência dados | Sem foreign keys inter-services |

### ⚠️ Trade-offs

| Escolha | Vantagem | Desvantagem |
|---------|----------|------------|
| Hard Delete | Lógica simples | Sem recuperação |
| Paginação Frontend (6/página) | Carregamento rápido | Sem offset backend |
| localStorage Tokens | Implementação fácil | Vulnerável XSS |
| Sem Testes | Economia tempo | Risco regressões |
| Sem Soft Delete | Menos complexity | Difícil auditoria |

---

## 🚨 Problemas Conhecidos & Soluções

### 1. TypeScript Compilation Docker (🔧 RESOLVIDO)

**Problema:** Tasks service não compilava
- `Cannot find module 'class-validator'` em `@fullstack-challenge/types`
- TypeScript tentava compilar source files do pacote tipos

**Solução:**
```bash
# packages/types/tsconfig.json criado
# packages/types/package.json: added build script
# Dockerfile: RUN pnpm --filter @fullstack-challenge/types build
# Revert para path aliases (@fullstack-challenge/types)
```

**Status:** ✅ Tasks service compila corretamente

### 2. Data Enrichment (🔄 IMPLEMENTADO)

**O que é:** Substituir UUIDs por nomes/emails em comentários e histórico

**Status:**
- ✅ `UsersService` busca múltiplos users do Auth Service
- ✅ `enrichTaskWithAssigneeData()` tasks.service.ts
- ✅ `enrichCommentWithAuthorData()` comments.service.ts
- ✅ Controllers chamam enrichment antes de retornar
- ⏳ E2E testing pendente

**Como:**
```typescript
const userMap = await this.usersService.getUsersByIds(ids);
enriched.assigneesData = Array.from(userMap.values());
```

### 3. Limitações Atuais

- Sem testes automatizados (zero cobertura)
- Hard delete (sem recuperação)
- Paginação apenas frontend (backend carrega tudo)
- Sem search/filtro avançado (apenas título)
- Frontend não exibe task history
- `synchronize: true` em DB (risco produção)

---

## ⏱️ Tempo Gasto Breakdown

| Componente | Tempo | O Quê |
|-----------|-------|-------|
| **Setup** | 1.5h | Turborepo, Docker, .env |
| **Auth Service** | 3.5h | Register, Login, JWT, Bcrypt |
| **Tasks CRUD** | 2.5h | Entities, Controllers, Routes |
| **Comments** | 1.5h | Entity, Relationships, Validation |
| **Task History** | 1.5h | Change tracking, Logging |
| **API Gateway** | 1.5h | Rate limit, JWT guard, Proxy |
| **RabbitMQ** | 2h | Publishing, Exchange, Routing |
| **Notifications** | 2.5h | Consumer, Socket.io, Broadcast |
| **Data Enrichment** | 2h | UsersService, Enrichment logic |
| **Frontend** | 3h | Components, Routing, Auth context |
| **WebSocket** | 1.5h | Client socket, Event listeners |
| **Docker Debug** | 3h | ⚠️ TypeScript, Lockfile issues |
| **Testing & Polish** | 1.5h | Bug fixes, Logging |
| **Docs** | 1h | README |
| **TOTAL** | **~29h** | 3.5 dias úteis |

**Bottlenecks:**
1. Docker/TypeScript (3h)
2. Data enrichment (3h)
3. Frontend integration (4.5h)

---

## 📝 Instruções Específicas

### Rodar com Docker (Rápido)

```bash
cd fullstack-challenge
pnpm install
docker compose up -d
sleep 15

# Acesso:
# Frontend: http://localhost:3000
# Auth Swagger: http://localhost:3001/api/docs
# Tasks Swagger: http://localhost:3002/api/docs
# RabbitMQ: http://localhost:15672 (guest/guest)
```

### Rodar Localmente (Sem Docker)

**Terminal 1 - Auth Service:**
```bash
pnpm --filter @fullstack-challenge/auth-service dev
```

**Terminal 2 - Tasks Service:**
```bash
pnpm --filter @fullstack-challenge/tasks-service dev
```

**Terminal 3 - Notifications Service:**
```bash
pnpm --filter @fullstack-challenge/notifications-service dev
```

**Terminal 4 - API Gateway:**
```bash
pnpm --filter api-gateway dev
```

**Terminal 5 - Frontend:**
```bash
pnpm --filter web dev
# Acessa http://localhost:5173
```

### Teste Manual (Curl)

**1. Registrar:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "caio@test.com",
    "username": "caio",
    "password": "senha123456"
  }'
```

**2. Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "caio@test.com",
    "password": "senha123456"
  }'
```

**3. Criar Tarefa:**
```bash
TOKEN="seu-token-aqui"

curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implementar feature",
    "description": "Desc aqui",
    "priority": "HIGH",
    "assignees": []
  }'
```

**4. Comentar:**
```bash
TASK_ID="uuid-da-tarefa"

curl -X POST http://localhost:3000/api/tasks/$TASK_ID/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body": "Ótimo progresso!"}'
```

**5. Ver Comentários (enriquecidos):**
```bash
curl -X GET http://localhost:3000/api/tasks/$TASK_ID/comments \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | {body, authorData}'
```

### Debugging

**Logs em tempo real:**
```bash
docker compose logs -f tasks-service
docker compose logs tasks-service | grep "ERROR\|🎯"
```

**Entrar no container:**
```bash
docker compose exec tasks-service sh
cd /usr/src/app/apps/tasks-service
npm run build
```

**Reset completo:**
```bash
docker compose down -v
docker compose build --no-cache
docker compose up -d
sleep 20
docker compose logs tasks-service
```

**Status dos serviços:**
```bash
curl http://localhost:3000/health
curl http://localhost:3001/auth/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:15672/api/overview -u guest:guest
```

---

## 📊 Métricas

| Métrica | Valor |
|---------|-------|
| Rate Limit | 10 req/s (por IP) |
| Access Token | 15 min |
| Refresh Token | 7 dias |
| Task Title | 200 chars max |
| Comment | 1000 chars max |
| Task Assignees | Ilimitado |
| DB Pool | ~10 conexões |
| WebSocket Timeout | 60s |

---

## 🔐 Segurança

**Implementado:** Bcrypt (10 rounds) • JWT stateless • Input validation • SQL injection prevention (TypeORM) • XSS prevention (React) • CORS • Rate limiting

**Para Produção:** HTTPS/TLS • JWT rotation • Secrets em vault • CORS específico • API keys inter-service • Helmet.js • Request signing

---

## 📁 Estrutura

```
fullstack-challenge/
├── apps/
│   ├── web/                    # React :3000
│   ├── api-gateway/            # NestJS :3000
│   ├── auth-service/           # NestJS :3001
│   ├── tasks-service/          # NestJS :3002
│   └── notifications-service/  # NestJS :3003
├── packages/ (types, eslint-config, tsconfig)
├── docker-compose.yml
├── turbo.json
└── README.md
```

---

## 🚀 Comandos Rápidos

```bash
docker compose up -d          # Dev
pnpm build                     # Build
docker compose logs -f         # Logs
docker compose down -v         # Reset
curl http://localhost:3000/health  # Health
```

---

**Desenvolvido por:** Caio Dias | **Nov 2025** | **v1.0.0-MVP** | **~29h**

# Fullstack Challenge - Collaborative Task Management System

**Status:** In Development | **Timeline:** 14 days | **Stack:** React + NestJS + TypeORM + RabbitMQ + Docker

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      React Frontend App                          │
│                (TanStack Router + shadcn/ui)                    │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP + WebSocket
┌────────────────────────▼────────────────────────────────────────┐
│                    API Gateway :3000                             │
│           (JWT Auth, Rate Limit 10 req/s, Routes)              │
└──┬──────────────────────────────────────────────────────────┬───┘
   │                                                            │
   │ RabbitMQ Communication                                    │
   ▼                                                            ▼
┌──────────────────────────┐              ┌──────────────────────────┐
│   Auth Service :3001     │              │  Tasks Service :3002     │
│  - Register/Login        │              │  - CRUD Tasks            │
│  - JWT Management        │              │  - Comments              │
│  - User Profiles         │              │  - Event Publishing      │
└──────────┬───────────────┘              └──────────────┬───────────┘
           │                                              │
           ▼                                              ▼
    ┌──────────────┐                            ┌──────────────┐
    │ PostgreSQL   │                            │ PostgreSQL   │
    │ auth_db      │                            │ tasks_db     │
    └──────────────┘                            └──────────────┘

                    ┌──────────────────────────┐
                    │  RabbitMQ Message Queue  │
                    └──────────┬───────────────┘
                               │
                               ▼
                    ┌──────────────────────────┐
                    │Notifications Service:3003│
                    │  - WebSocket Server      │
                    │  - Real-time Events      │
                    └──────────────────────────┘
```

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- pnpm (package manager)

### Installation

1. **Clone & Install**
   ```bash
   git clone <repo>
   cd fullstack-challenge
   pnpm install
   ```

2. **Run with Docker Compose**
   ```bash
   docker compose up -d
   ```

   This starts:
   - 2x PostgreSQL (auth_db, tasks_db)
   - RabbitMQ (port 5672, admin 15672)
   - Auth Service (port 3001)
   - Tasks Service (port 3002)
   - Notifications Service (port 3003)
   - API Gateway (port 3000)

3. **Access Services**
   - API: http://localhost:3000
   - Swagger Docs: http://localhost:3000/api/docs
   - RabbitMQ Admin: http://localhost:15672 (guest/guest)

---

## Environment Configuration

Create `.env` files in each service directory or use defaults:

```bash
# Auth Service
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=auth_db
JWT_SECRET=your-secret-key
PORT=3001

# Tasks Service
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASS=postgres
DB_NAME=tasks_db
RABBITMQ_URL=amqp://guest:guest@localhost:5672
PORT=3002

# API Gateway
PORT=3000
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MS=1000
```

See `.env.example` for full template.

---

## API Endpoints

### Authentication
```
POST   /auth/register         - Register new user
POST   /auth/login            - Login (email OR username + password)
POST   /auth/refresh          - Refresh access token
GET    /auth/me               - Get current user (protected)
GET    /auth/health           - Auth service health check
```

### Tasks
```
GET    /tasks                 - List user's tasks (creator OR assignee)
POST   /tasks                 - Create new task
GET    /tasks/:id             - Get task details
PATCH  /tasks/:id             - Update task
DELETE /tasks/:id             - Delete task (creator only)
GET    /health                - Tasks service health check
```

### Comments
```
POST   /tasks/:taskId/comments  - Create comment on task
GET    /tasks/:taskId/comments  - List task comments
```

### Health
```
GET    /health                - API Gateway health
GET    /auth/health           - Auth service health
GET    /health                - Tasks service health
GET    /                       - Notifications service health
```

---

## Business Rules

### Task Status Lifecycle
```
TODO → IN_PROGRESS → REVIEW → DONE
↑     ↓              ↓
└─────┴──────────────┘ (All transitions allowed)
```

### Authorization
- **Task Creator:** Can create, update, delete their own tasks
- **Assignees:** Can view and update assigned tasks
- **Comments:** Only assignees or creator can comment

### Validation
- **Email:** RFC 5322 standard, max 100 chars
- **Username:** 3-30 chars, alphanumeric + underscore/hyphen, unique
- **Password:** Min 8 chars, hashed with bcrypt (10 rounds)
- **Task Title:** 1-200 chars
- **Task Description:** Max 2000 chars
- **Due Date:** Must be future date (optional)

---

## Real-time Notifications (WebSocket)

Events published via RabbitMQ:

```javascript
// task:created
{
  event: 'task:created',
  taskId: 'uuid',
  title: 'Task name',
  assignees: ['user-id-1', 'user-id-2'],
  createdBy: 'user-id',
  timestamp: '2025-01-15T10:30:00Z'
}

// task:updated
{
  event: 'task:updated',
  taskId: 'uuid',
  changes: { status: { old: 'TODO', new: 'IN_PROGRESS' } },
  assignees: ['user-id-1'],
  updatedBy: 'user-id',
  timestamp: '2025-01-15T10:35:00Z'
}

// comment:new
{
  event: 'comment:new',
  commentId: 'uuid',
  taskId: 'uuid',
  authorId: 'user-id',
  body: 'Comment text',
  assignees: ['user-id-1'], // Excludes author
  timestamp: '2025-01-15T10:40:00Z'
}
```

---

## Rate Limiting

- **Global:** 10 requests/second per IP
- **Response Headers:**
  - `X-RateLimit-Limit: 10`
  - `X-RateLimit-Remaining: 5`
  - `X-RateLimit-Reset: <timestamp>`
- **On Limit Exceeded:** HTTP 429

---

## Database Schema

### User Entity
```sql
CREATE TABLE user (
  id UUID PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  username VARCHAR(30) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_user_email ON user(email);
CREATE INDEX idx_user_username ON user(username);
```

### Task Entity
```sql
CREATE TABLE task (
  id UUID PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description VARCHAR(2000),
  status VARCHAR(50) DEFAULT 'TODO',
  priority VARCHAR(50) DEFAULT 'MEDIUM',
  dueDate TIMESTAMP,
  creatorId UUID NOT NULL,
  assignees UUID[] DEFAULT '{}',
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_tasks_status ON task(status);
CREATE INDEX idx_tasks_priority ON task(priority);
CREATE INDEX idx_tasks_assignees ON task USING GIN(assignees);
CREATE INDEX idx_tasks_due_date ON task(dueDate);
```

### Comment Entity
```sql
CREATE TABLE comment (
  id UUID PRIMARY KEY,
  body VARCHAR(1000) NOT NULL,
  authorId UUID NOT NULL,
  taskId UUID NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  createdAt TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_comments_task_id ON comment(taskId);
CREATE INDEX idx_comments_author_id ON comment(authorId);
```

---

## JWT Token Format

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "username": "username",
  "iat": 1670000000,
  "exp": 1670900000
}
```

**Tokens:**
- Access Token: 15 minutes expiry, HTTP-only cookie
- Refresh Token: 7 days expiry, HTTP-only cookie

---

## Development Workflow

### Watch Mode (Development)
```bash
pnpm turbo run dev
```

This runs:
- TypeScript compiler in watch mode
- All services with nodemon (auto-restart)

### Build Production
```bash
pnpm build
```

### Testing
```bash
pnpm test
```

---

## Troubleshooting

### RabbitMQ Connection Refused
```bash
# Ensure RabbitMQ is running
docker compose ps

# Check RabbitMQ logs
docker compose logs rabbitmq
```

### Database Connection Errors
```bash
# Reset databases
docker compose down -v
docker compose up -d

# Verify DB is ready
docker compose exec postgres-auth pg_isready
```

### Port Already in Use
```bash
# Kill process on port (Linux/Mac)
lsof -ti:3000 | xargs kill -9

# Or use different ports in docker-compose.yml
```

---

## Deployment

### Docker Compose (Development)
```bash
docker compose up -d
```

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Change JWT_SECRET to strong random value
- [ ] Use separate PostgreSQL instances
- [ ] Configure RabbitMQ with authentication
- [ ] Add health check monitoring
- [ ] Set up logging aggregation
- [ ] Configure CORS origins
- [ ] Enable HTTPS/TLS

---

## Known Limitations

- ❌ No user-to-user messaging
- ❌ No file attachments
- ❌ No pagination (MVP - all results)
- ❌ No search/filtering (basic list only)
- ❌ No audit logs (basic timestamps only)
- ❌ No rate limit per-user (IP-based only)

---

## Next Steps (Future Enhancements)

1. **Frontend:** React app with task management UI
2. **Pagination:** Implement for tasks/comments lists
3. **Search:** Full-text search with PostgreSQL tsvector
4. **Logging:** Winston/Pino structured logging
5. **Tests:** Unit & integration test coverage
6. **Monitoring:** Prometheus + Grafana dashboards

---

## File Structure

```
fullstack-challenge/
├── apps/
│   ├── auth-service/          # User authentication microservice
│   │   └── src/
│   │       ├── auth/          # Auth logic & controllers
│   │       └── entities/      # User entity
│   ├── tasks-service/         # Task management microservice
│   │   └── src/
│   │       ├── tasks/         # Task CRUD & events
│   │       ├── comments/      # Comment system
│   │       ├── events/        # Event publishing
│   │       └── migrations/    # TypeORM migrations
│   ├── notifications-service/ # Real-time notifications
│   │   └── src/
│   │       ├── events/        # Event handlers
│   │       └── notifications/ # WebSocket gateway
│   ├── api-gateway/           # Request routing & auth
│   │   └── src/
│   │       ├── tasks/         # Task routes
│   │       ├── auth/          # Auth routes
│   │       └── guards/        # JWT guard
│   └── web/                   # React frontend (TODO)
│
├── packages/
│   ├── types/                 # Shared DTOs & types
│   │   ├── auth/
│   │   ├── tasks/
│   │   └── validators/
│   └── utils/                 # Shared utilities
│
├── docker-compose.yml         # Service orchestration
├── Dockerfile.* files         # Service Docker images
└── README.md                  # This file
```

---

## Performance Metrics

- Rate limit: 10 req/s (configurable)
- JWT expiry: 15 min (access) / 7 days (refresh)
- Max task title: 200 chars
- Max comment: 1000 chars
- DB connection pool: Default (TypeORM)

---

## Support & Contributions

For issues or feature requests, please create a GitHub issue or contact the development team.

**Last Updated:** 2025-11-05
**Version:** 1.0.0-MVP

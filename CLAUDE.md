# Fullstack Challenge - Business Rules & Architecture

## Project Overview
Collaborative task management system with microservices architecture, real-time notifications, and JWT authentication.

**Timeline:** 14 days | **Stack:** React + NestJS + TypeORM + RabbitMQ + Docker

---

## System Architecture

```mermaid
graph TB
    subgraph Frontend
        WEB[React App<br/>TanStack Router<br/>shadcn/ui]
    end

    subgraph API Layer
        GW[API Gateway<br/>Rate Limit: 10 req/s]
    end

    subgraph Services
        AUTH[Auth Service<br/>:3001]
        TASKS[Tasks Service<br/>:3002]
        NOTIF[Notifications Service<br/>:3003]
    end

    subgraph Infrastructure
        RMQ[RabbitMQ<br/>Message Queue]
        DB1[(PostgreSQL<br/>Auth DB)]
        DB2[(PostgreSQL<br/>Tasks DB)]
    end

    WEB -->|HTTP + WebSocket| GW
    GW -->|JWT Validation| AUTH
    GW -->|Protected Routes| TASKS
    GW -->|WebSocket| NOTIF

    TASKS -->|Publish Events| RMQ
    NOTIF -->|Consume Events| RMQ

    AUTH -.-> DB1
    TASKS -.-> DB2

    style WEB fill:#61dafb
    style GW fill:#ff6b6b
    style RMQ fill:#ff6600
```

---

## Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ TASK : "creates/assigned"
    TASK ||--o{ COMMENT : "has"
    USER ||--o{ COMMENT : "authors"

    USER {
        uuid id PK
        string email UK
        string username UK
        string password "bcrypt hashed"
        timestamp createdAt
        timestamp updatedAt
    }

    TASK {
        uuid id PK
        string title
        string description "nullable"
        timestamp dueDate "nullable"
        enum priority "LOW|MEDIUM|HIGH|URGENT"
        enum status "TODO|IN_PROGRESS|REVIEW|DONE"
        string[] assignees "user IDs"
        timestamp createdAt
        timestamp updatedAt
    }

    COMMENT {
        uuid id PK
        string body
        string authorId FK
        uuid taskId FK
        timestamp createdAt
    }
```

---

## Business Rules

### 1. Authentication & Authorization

#### Registration
- **Required fields:** email, username, password
- **Email validation:** RFC 5322 standard
- **Username constraints:**
  - Unique across system
  - Min 3, max 30 characters
  - Alphanumeric + underscore/hyphen only
- **Password requirements:**
  - Min 8 characters
  - Hashed with bcrypt (salt rounds: 10)
- **Duplicate handling:** Return 409 Conflict for existing email/username

#### Login
- **Credentials:** email OR username + password
- **Failed attempts:** No lockout mechanism required (can be differential)
- **Response:**
  - Access token (JWT, 15min expiry)
  - Refresh token (JWT, 7 days expiry)
  - User profile (id, email, username)

#### Token Management
- **Access token payload:**
  ```json
  {
    "sub": "user-id",
    "email": "user@example.com",
    "username": "username",
    "iat": 1234567890,
    "exp": 1234568790
  }
  ```
- **Refresh token:** Separate token with longer TTL
- **Token delivery:** HTTP-only cookies (preferred) or response body
- **Validation:** API Gateway validates all protected routes

#### Authorization Rules
- Users can only:
  - View tasks assigned to them
  - Create/update/delete their own tasks
  - Comment on tasks they have access to
  - Receive notifications for their assigned tasks

---

### 2. Task Management

#### Task Creation
- **Required fields:** title
- **Optional fields:** description, dueDate, priority, assignees
- **Default values:**
  - priority: MEDIUM
  - status: TODO
  - assignees: creator's ID
- **Validation:**
  - Title: 1-200 characters
  - Description: max 2000 characters
  - dueDate: future date only
  - assignees: valid user IDs (check existence)

#### Task Updates
- **Allowed transitions:** See Task Lifecycle diagram
- **Fields updatable:** all except id, createdAt
- **Audit logging:** Track who changed what + timestamp (differential)
- **Events triggered:**
  - Status change → `task:updated` event
  - New assignee → notification to assignee
  - Priority change → `task:updated` event

#### Task Deletion
- **Cascade behavior:** Delete all associated comments
- **Soft delete:** Not required (hard delete acceptable)
- **Authorization:** Only creator can delete

#### Multi-user Assignment
- **Limit:** No max assignees (business decision: unlimited collaboration)
- **Removal:** Can remove assignees; if self-removed, lose access
- **Notifications:** All assignees notified on task changes

---

### 3. Task Lifecycle

```mermaid
stateDiagram-v2
    [*] --> TODO: Create Task
    TODO --> IN_PROGRESS: Start Work
    TODO --> DONE: Quick Completion

    IN_PROGRESS --> REVIEW: Submit for Review
    IN_PROGRESS --> TODO: Pause/Revert
    IN_PROGRESS --> DONE: Complete Direct

    REVIEW --> DONE: Approve
    REVIEW --> IN_PROGRESS: Request Changes
    REVIEW --> TODO: Reject

    DONE --> TODO: Reopen
    DONE --> [*]

    note right of TODO
        Default state
        Priority: LOW→URGENT
    end note

    note right of DONE
        Terminal state
        Can reopen if needed
    end note
```

**Status Transition Rules:**
- All transitions bidirectional (flexible workflow)
- TODO → DONE allowed (quick tasks)
- DONE → TODO allowed (reopen mechanism)
- Status changes trigger notifications

---

### 4. Comment System

#### Comment Creation
- **Required fields:** body, taskId
- **Validation:**
  - Body: 1-1000 characters
  - TaskId: valid task UUID
  - User must have access to task
- **Author tracking:** Derived from JWT token
- **Timestamps:** Auto-generated createdAt

#### Comment Retrieval
- **Endpoint:** GET `/api/tasks/:id/comments`
- **Sorting:** Chronological (oldest first)
- **Pagination:** Not required (can be differential)
- **Authorization:** Only task assignees/creator can view

#### Comment Events
- **Trigger:** Every new comment → `comment:new` event
- **Payload:**
  ```json
  {
    "event": "comment:new",
    "taskId": "uuid",
    "commentId": "uuid",
    "authorId": "uuid",
    "body": "comment text",
    "timestamp": "ISO8601"
  }
  ```
- **Recipients:** All task assignees except author

---

### 5. Notifications & Events

#### Event Publishing (RabbitMQ)

```mermaid
sequenceDiagram
    participant C as Client
    participant G as API Gateway
    participant T as Tasks Service
    participant R as RabbitMQ
    participant N as Notifications Service
    participant W as WebSocket

    C->>G: POST /api/tasks (JWT)
    G->>T: Create Task
    T->>T: Save to DB
    T->>R: Publish task:created
    T-->>G: Task Created
    G-->>C: 201 Response

    R->>N: Consume Event
    N->>N: Process Recipients
    N->>W: Broadcast to Clients
    W-->>C: WebSocket Message

    Note over C,W: Real-time notification delivered
```

#### Event Types

**task:created**
- Triggered: New task created
- Recipients: All assignees
- Payload:
  ```json
  {
    "event": "task:created",
    "taskId": "uuid",
    "title": "Task title",
    "assignees": ["user-id-1"],
    "createdBy": "user-id",
    "timestamp": "ISO8601"
  }
  ```

**task:updated**
- Triggered: Task fields modified (status, priority, assignees)
- Recipients: All current + previous assignees
- Payload includes: changed fields, oldValue, newValue

**comment:new**
- Triggered: Comment posted
- Recipients: All task assignees except commenter
- Payload: comment details + task context

#### WebSocket Delivery
- **Protocol:** Socket.io or native WebSocket
- **Connection:** Client connects after authentication
- **Room management:** Users join rooms for their tasks
- **Reconnection:** Client handles reconnection logic
- **Offline users:** Messages NOT persisted (real-time only)

---

### 6. Access Control Matrix

| Resource | Action | Rule |
|----------|--------|------|
| Tasks | List | Own created or assigned tasks |
| Tasks | Create | Any authenticated user |
| Tasks | Read | Creator or assignee |
| Tasks | Update | Creator or assignee |
| Tasks | Delete | Creator only |
| Comments | Create | Task assignees only |
| Comments | List | Task assignees only |
| Comments | Update | Not allowed |
| Comments | Delete | Not allowed |

---

### 7. Data Validation Rules

#### Input Validation (class-validator)

**RegisterDTO:**
```typescript
email: IsEmail() + MaxLength(100)
username: IsString() + MinLength(3) + MaxLength(30) + Matches(/^[a-zA-Z0-9_-]+$/)
password: IsString() + MinLength(8) + MaxLength(128)
```

**CreateTaskDTO:**
```typescript
title: IsString() + MinLength(1) + MaxLength(200)
description: IsOptional() + IsString() + MaxLength(2000)
dueDate: IsOptional() + IsDateString() + IsAfterNow()
priority: IsEnum(TaskPriority)
assignees: IsOptional() + IsArray() + IsUUID(each: true)
```

**CreateCommentDTO:**
```typescript
body: IsString() + MinLength(1) + MaxLength(1000)
taskId: IsUUID()
```

**UpdateTaskDTO:**
```typescript
title: IsOptional() + IsString() + MinLength(1) + MaxLength(200)
status: IsOptional() + IsEnum(TaskStatus)
priority: IsOptional() + IsEnum(TaskPriority)
assignees: IsOptional() + IsArray() + IsUUID(each: true)
```

---

### 8. Rate Limiting

- **Global limit:** 10 requests/second per IP
- **Scope:** API Gateway level
- **Response:** 429 Too Many Requests
- **Headers:**
  - `X-RateLimit-Limit: 10`
  - `X-RateLimit-Remaining: 5`
  - `X-RateLimit-Reset: <timestamp>`
- **Bypass:** No exemptions (applies to all users)

---

### 9. Error Handling

#### Standard Error Format
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": {
    "field": "email",
    "constraint": "isEmail"
  }
}
```

#### Error Codes
- **400:** Validation errors, malformed input
- **401:** Missing/invalid JWT token
- **403:** Insufficient permissions
- **404:** Resource not found
- **409:** Duplicate email/username
- **429:** Rate limit exceeded
- **500:** Internal server error

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant G as API Gateway
    participant A as Auth Service
    participant D as Database

    rect rgb(200, 220, 255)
        Note over U,D: Registration Flow
        U->>F: Enter credentials
        F->>G: POST /auth/register
        G->>A: Forward request
        A->>A: Validate input
        A->>A: Hash password (bcrypt)
        A->>D: Save user
        D-->>A: User created
        A-->>G: 201 + tokens
        G-->>F: Access + Refresh tokens
        F->>F: Store tokens
    end

    rect rgb(255, 220, 200)
        Note over U,D: Login Flow
        U->>F: Enter credentials
        F->>G: POST /auth/login
        G->>A: Forward request
        A->>D: Find user
        D-->>A: User data
        A->>A: Verify password
        A->>A: Generate JWT tokens
        A-->>G: 200 + tokens
        G-->>F: Access + Refresh tokens
        F->>F: Store tokens
    end

    rect rgb(220, 255, 220)
        Note over U,D: Protected Request
        U->>F: Access resource
        F->>G: GET /tasks (+ JWT)
        G->>G: Validate token
        G->>A: Verify signature
        A-->>G: Token valid
        G->>G: Extract user info
        Note over G: User context available
    end

    rect rgb(255, 255, 200)
        Note over U,D: Token Refresh
        F->>G: POST /auth/refresh (RefreshToken)
        G->>A: Validate refresh token
        A->>A: Verify + check expiry
        A->>A: Generate new access token
        A-->>G: New access token
        G-->>F: Access token
        F->>F: Update stored token
    end
```

---

## Full Task Creation Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant G as Gateway
    participant T as Tasks Service
    participant DB as PostgreSQL
    participant MQ as RabbitMQ
    participant N as Notifications Service
    participant WS as WebSocket Clients

    C->>G: POST /api/tasks<br/>{title, assignees}
    G->>G: Verify JWT
    G->>T: Forward + user context

    T->>T: Validate DTO
    T->>DB: BEGIN TRANSACTION
    T->>DB: INSERT task
    DB-->>T: Task created
    T->>DB: COMMIT

    T->>MQ: Publish task:created event
    T-->>G: 201 Created + task data
    G-->>C: Task created

    MQ->>N: Event: task:created
    N->>N: Identify assignees
    N->>WS: Broadcast to assignee sockets
    WS-->>C: Real-time notification

    Note over C,WS: Assignees receive instant notification
```

---

## Technical Constraints

### Required Technology
- **Frontend:** React + TanStack Router (NO Next.js)
- **UI:** shadcn/ui (min 5 components) + Tailwind CSS
- **Backend:** NestJS microservices
- **ORM:** TypeORM (NO Prisma/MikroORM)
- **Queue:** RabbitMQ
- **Database:** PostgreSQL
- **Real-time:** WebSocket (mandatory)
- **Deployment:** Docker Compose
- **Monorepo:** Turborepo

### Required Features
- JWT auth (access + refresh tokens)
- Rate limiting (10 req/s)
- Input validation (class-validator)
- Swagger/OpenAPI docs
- TypeORM migrations
- Health checks (differential)

### Architectural Requirements
- Service separation (Gateway, Auth, Tasks, Notifications)
- Event-driven communication (RabbitMQ)
- Stateless services
- Database per service pattern

---

## Evaluation Criteria

### Must Have
1. **Functional completeness:** All features working
2. **Security basics:** JWT, password hashing, input validation
3. **Service separation:** Clear microservices boundaries
4. **Real-time:** WebSocket notifications functioning
5. **Docker deployment:** `docker compose up` works

### Nice to Have (Differentials)
- Unit tests coverage
- Structured logging (Winston/Pino)
- Health check endpoints
- Audit log implementation
- Pagination for lists
- User activity tracking

### Valued Qualities
- Code organization and clarity
- Pragmatic solutions over over-engineering
- UI/UX quality
- Documentation quality
- Clean git history

---

## Priority Definitions

| Priority | Description | Example Use Case |
|----------|-------------|------------------|
| LOW | No urgency, future tasks | Backlog items, ideas |
| MEDIUM | Normal workflow | Regular daily tasks |
| HIGH | Important, near-term deadline | This week deliverables |
| URGENT | Critical, immediate action | Blockers, prod issues |

---

## Implementation Checklist

### Backend Services
- [ ] **Auth Service:** Register, login, refresh, JWT strategy
- [ ] **Tasks Service:** CRUD, assignees, status transitions
- [ ] **Comments Module:** Create, list comments
- [ ] **API Gateway:** Route aggregation, rate limiting, JWT guard
- [ ] **Notifications Service:** RabbitMQ consumer, WebSocket server
- [ ] **TypeORM Migrations:** All entities + indexes
- [ ] **Swagger Docs:** All endpoints documented

### Frontend
- [ ] **Auth Pages:** Login/Register modal or pages
- [ ] **Task List:** Filters (status, priority), search
- [ ] **Task Detail:** View task, edit, delete, comments section
- [ ] **Real-time Updates:** WebSocket integration
- [ ] **State Management:** Auth context (Context API/Zustand)
- [ ] **Form Validation:** react-hook-form + zod
- [ ] **UI Components:** Min 5 shadcn/ui components
- [ ] **Notifications:** Toast for errors/success

### Infrastructure
- [ ] **Docker Compose:** All services orchestrated
- [ ] **PostgreSQL:** Separate DBs for auth & tasks
- [ ] **RabbitMQ:** Exchange/queue configuration
- [ ] **Environment Config:** .env files per service
- [ ] **Health Checks:** Service readiness endpoints

### Documentation
- [ ] **README:** Architecture diagram, setup steps, time breakdown
- [ ] **API Docs:** Swagger UI accessible
- [ ] **Known Issues:** Document limitations/bugs

---

## Repository Structure

```
fullstack-challenge/
├── apps/
│   ├── web/                    # React frontend
│   ├── api-gateway/            # NestJS gateway
│   ├── auth-service/           # NestJS auth microservice
│   ├── tasks-service/          # NestJS tasks microservice
│   └── notifications-service/  # NestJS notifications microservice
├── packages/
│   ├── types/                  # Shared TypeScript types
│   ├── utils/                  # Shared utilities
│   ├── eslint-config/          # Shared ESLint config
│   └── tsconfig/               # Shared TS config
├── docker-compose.yml
├── turbo.json
└── README.md
```

---

## Database Indexes (Performance)

```sql
-- Users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Tasks table
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_assignees ON tasks USING GIN(assignees);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Comments table
CREATE INDEX idx_comments_task_id ON comments(task_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);
```

---

## Security Considerations

### Authentication Security
- Passwords hashed with bcrypt (salt rounds ≥ 10)
- JWT secret stored in environment variables (NEVER commit)
- Refresh tokens rotated on use (optional enhancement)
- HTTP-only cookies prevent XSS attacks

### Input Validation
- All DTOs validated with class-validator
- SQL injection prevented by TypeORM parameterized queries
- XSS prevention via React auto-escaping
- CORS configured for specific origins only

### Authorization
- Every protected endpoint checks JWT validity
- User context extracted from token payload
- Resource ownership verified before mutations
- Assignee membership checked for task access

### Rate Limiting
- Prevents DoS attacks
- Applied at gateway level (fair for all services)
- Can implement per-user limits (enhancement)

---

## RabbitMQ Configuration

### Exchange & Queue Setup

```typescript
// Tasks Service - Publisher
await channel.assertExchange('tasks.events', 'topic', { durable: true });
await channel.publish('tasks.events', 'task.created', Buffer.from(JSON.stringify(event)));

// Notifications Service - Consumer
await channel.assertExchange('tasks.events', 'topic', { durable: true });
await channel.assertQueue('notifications.queue', { durable: true });
await channel.bindQueue('notifications.queue', 'tasks.events', 'task.*');
await channel.bindQueue('notifications.queue', 'tasks.events', 'comment.*');
```

### Routing Keys
- `task.created` → Task creation events
- `task.updated` → Task modification events
- `comment.new` → New comment events

---

## WebSocket Events (Client-Server)

### Client → Server
```typescript
// Connect with authentication
socket.emit('authenticate', { token: accessToken });

// Subscribe to user's notifications
socket.emit('subscribe', { userId: currentUser.id });
```

### Server → Client
```typescript
// Task created notification
{
  type: 'task:created',
  data: {
    taskId: 'uuid',
    title: 'New task',
    assignees: ['user-id'],
    createdBy: 'user-id',
    timestamp: '2024-01-15T10:30:00Z'
  }
}

// Task updated notification
{
  type: 'task:updated',
  data: {
    taskId: 'uuid',
    changes: {
      status: { old: 'TODO', new: 'IN_PROGRESS' }
    },
    updatedBy: 'user-id',
    timestamp: '2024-01-15T10:35:00Z'
  }
}

// New comment notification
{
  type: 'comment:new',
  data: {
    commentId: 'uuid',
    taskId: 'uuid',
    authorId: 'user-id',
    body: 'Comment text',
    timestamp: '2024-01-15T10:40:00Z'
  }
}
```

---

## Time Estimation (14 days)

| Component | Estimated Time |
|-----------|----------------|
| Auth Service + JWT | 2 days |
| Tasks Service + CRUD | 2 days |
| Comments Module | 1 day |
| Notifications + RabbitMQ | 2 days |
| API Gateway + Rate Limit | 1.5 days |
| Frontend (React + UI) | 3 days |
| WebSocket Integration | 1.5 days |
| Docker Compose Setup | 1 day |
| Testing + Bug Fixes | 1.5 days |
| Documentation + README | 0.5 day |
| **Buffer** | 1 day |

**Total:** ~14 working days

---

## Known Limitations & Trade-offs

### Current Implementation
- No pagination (acceptable for MVP, can add later)
- No soft delete for tasks (hard delete simplifies logic)
- No audit log table (can track in app logs)
- No email notifications (only WebSocket real-time)
- No file attachments for tasks/comments
- No task dependencies/subtasks
- No user profile editing after registration

### Future Enhancements
- Search with full-text indexing (PostgreSQL tsvector)
- Task templates and recurring tasks
- Team/workspace concept for organization
- Activity feed per user
- Export tasks to CSV/JSON
- Mobile app (React Native)
- Push notifications for offline users

---

## Quick Reference: HTTP Endpoints

### Auth Service (via Gateway)
```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - Login with credentials
POST   /api/auth/refresh       - Refresh access token
GET    /api/auth/me            - Get current user (protected)
```

### Tasks Service (via Gateway)
```
GET    /api/tasks              - List user's tasks (filters: status, priority)
POST   /api/tasks              - Create new task
GET    /api/tasks/:id          - Get task details
PUT    /api/tasks/:id          - Update task
DELETE /api/tasks/:id          - Delete task (creator only)
```

### Comments (via Gateway)
```
POST   /api/tasks/:id/comments - Create comment on task
GET    /api/tasks/:id/comments - List task comments
```

### Health Checks
```
GET    /health                 - Gateway health
GET    /api/auth/health        - Auth service health
GET    /api/tasks/health       - Tasks service health
```

---

## Environment Variables Template

```bash
# Auth Service
DATABASE_URL=postgresql://user:pass@localhost:5432/auth_db
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
PORT=3001

# Tasks Service
DATABASE_URL=postgresql://user:pass@localhost:5432/tasks_db
RABBITMQ_URL=amqp://localhost:5672
PORT=3002

# Notifications Service
RABBITMQ_URL=amqp://localhost:5672
WEBSOCKET_PORT=3003

# API Gateway
AUTH_SERVICE_URL=http://localhost:3001
TASKS_SERVICE_URL=http://localhost:3002
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MS=1000
PORT=3000

# Frontend
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3003
```

---

## Testing Strategy

### Unit Tests
- Auth service: Password hashing, JWT generation
- Tasks service: CRUD operations, validation
- Comments service: Comment creation, retrieval

### Integration Tests
- API Gateway: Route forwarding, rate limiting
- Auth flow: Register → Login → Refresh
- Task operations: Create → Update → Delete
- Notifications: Event publishing → WebSocket delivery

### E2E Tests (Optional)
- Complete user journey: Register → Create task → Add comment → Receive notification
- Multi-user scenario: Task assignment → notifications to assignees

---

**Document Version:** 1.0
**Last Updated:** 2025-01-15
**Author:** Technical Challenge Documentation
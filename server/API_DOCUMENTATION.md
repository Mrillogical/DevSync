# DevSync Backend API

REST API for the DevSync team task management server (Node.js, Express, PostgreSQL).

# Overview

DevSync is a full-stack collaborative project and task management platform.

The backend provides:
- JWT authentication
- Role-based access control (RBAC)
- Project management
- Team member management
- Task assignment and tracking
- PostgreSQL relational data management

Architecture follows a modular MVC-style structure using:
- Express.js
- PostgreSQL
- JWT
- bcryptjs

# Tech Stack

| Layer | Technology |
|---|---|
| Backend Runtime | Node.js |
| Backend Framework | Express.js |
| Database | PostgreSQL |
| Authentication | JWT |
| Password Hashing | bcryptjs |
| Database Driver | pg |
| Environment Config | dotenv |
| Development Tooling | nodemon |

## Conventions

| Item | Description |
|------|-------------|
| **Base URL** | `{BASE_URL}` — e.g. `http://localhost:3000` (or the `PORT` from your `.env`) |
| **Content type** | `application/json` for bodies where noted |
| **Identifiers** | UUIDs (`projectId`, `taskId`, `userId`, etc.) |
| **Timestamps** | ISO 8601 strings in JSON (PostgreSQL `TIMESTAMPTZ`) |
| **Errors** | JSON object with at least `error` (string). Validation errors often include `details.fields` (object of field names to string arrays). |

### Authentication header

Protected routes require a JWT issued by `POST /api/auth/login` or `POST /api/auth/signup`:

```http
Authorization: Bearer <access_token>
```

Omitting the header, using a wrong scheme, or sending an invalid/expired token returns **401** with an `error` message.

---

## Authentication

Base path: **`/api/auth`**

### Sign up

Creates a user account and returns a JWT.

| | |
|---|---|
| **Method** | `POST` |
| **Route** | `/api/auth/signup` |
| **Authorization** | None |

**Headers**

```http
Content-Type: application/json
```

**Request body**

| Field | Type | Required | Rules |
|-------|------|----------|--------|
| `email` | string | Yes | Trimmed, stored lowercase, valid email format, max 320 characters |
| `password` | string | Yes | 8–72 characters |
| `display_name` | string | Yes | Trimmed, 1–120 characters |

**Example request**

```json
{
  "email": "alex@example.com",
  "password": "correct-horse-battery-staple",
  "display_name": "Alex Rivera"
}
```

**Responses**

- **201 Created** — account created.

```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "alex@example.com",
    "display_name": "Alex Rivera",
    "created_at": "2026-05-13T12:00:00.000Z",
    "updated_at": "2026-05-13T12:00:00.000Z"
  },
  "token": "<jwt>"
}
```

- **409 Conflict** — email already registered.

```json
{
  "error": "An account with this email already exists."
}
```

- **422 Unprocessable Entity** — validation failed.

```json
{
  "error": "Validation failed.",
  "details": {
    "fields": {
      "email": ["Email format is invalid."],
      "password": ["Password must be at least 8 characters."]
    }
  }
}
```

---

### Log in

| | |
|---|---|
| **Method** | `POST` |
| **Route** | `/api/auth/login` |
| **Authorization** | None |

**Headers**

```http
Content-Type: application/json
```

**Request body**

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |
| `password` | string | Yes |

**Example request**

```json
{
  "email": "alex@example.com",
  "password": "correct-horse-battery-staple"
}
```

**Responses**

- **200 OK**

```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "alex@example.com",
    "display_name": "Alex Rivera",
    "created_at": "2026-05-13T12:00:00.000Z",
    "updated_at": "2026-05-13T12:00:00.000Z"
  },
  "token": "<jwt>"
}
```

- **401 Unauthorized** — invalid credentials (generic message).

```json
{
  "error": "Invalid email or password."
}
```

- **422 Unprocessable Entity** — validation (same `details.fields` shape as signup).

---

### Get current profile

| | |
|---|---|
| **Method** | `GET` |
| **Route** | `/api/auth/profile` |
| **Authorization** | **Bearer JWT** (required) |

**Headers**

```http
Authorization: Bearer <access_token>
```

**Request body**

None.

**Responses**

- **200 OK**

```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "alex@example.com",
    "display_name": "Alex Rivera",
    "created_at": "2026-05-13T12:00:00.000Z",
    "updated_at": "2026-05-13T12:00:00.000Z"
  }
}
```

- **401 Unauthorized** — missing/invalid token or user no longer exists.

---

## Projects

Base path: **`/api/projects`**

All routes below require **`Authorization: Bearer <token>`** unless noted.

---

### Create project

| | |
|---|---|
| **Method** | `POST` |
| **Route** | `/api/projects` |
| **Authorization** | Any authenticated user |

**Headers**

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request body**

| Field | Type | Required | Rules |
|-------|------|----------|--------|
| `name` | string | Yes | Trimmed, 1–200 characters |
| `description` | string | No | Trimmed; empty string stored as `null` |
| `deadline` | string \| number | No | Parseable date; **must not be in the past** |

**Example request**

```json
{
  "name": "Mobile app launch",
  "description": "Q2 release scope",
  "deadline": "2026-12-31T23:59:59.000Z"
}
```

**Responses**

- **201 Created** — creator is automatically added as **admin** in `project_members`.

```json
{
  "project": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "name": "Mobile app launch",
    "description": "Q2 release scope",
    "deadline": "2026-12-31T23:59:59.000Z",
    "created_by": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "created_at": "2026-05-13T12:05:00.000Z",
    "updated_at": "2026-05-13T12:05:00.000Z",
    "role": "admin",
    "joined_at": "2026-05-13T12:05:00.123Z"
  }
}
```

- **422 Unprocessable Entity** — validation (e.g. past `deadline`, empty `name`).

---

### List my projects

| | |
|---|---|
| **Method** | `GET` |
| **Route** | `/api/projects` |
| **Authorization** | Authenticated user |

**Headers**

```http
Authorization: Bearer <access_token>
```

**Request body**

None.

**Responses**

- **200 OK**

```json
{
  "projects": [
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "name": "Mobile app launch",
      "description": "Q2 release scope",
      "deadline": "2026-12-31T23:59:59.000Z",
      "created_by": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "created_at": "2026-05-13T12:05:00.000Z",
      "updated_at": "2026-05-13T12:05:00.000Z",
      "role": "member",
      "joined_at": "2026-05-14T09:00:00.000Z"
    }
  ]
}
```

---

### Get project by ID

| | |
|---|---|
| **Method** | `GET` |
| **Route** | `/api/projects/:projectId` |
| **Authorization** | **Project member** (`admin` or `member`) |

**Headers**

```http
Authorization: Bearer <access_token>
```

**Path parameters**

| Param | Description |
|-------|-------------|
| `projectId` | Project UUID |

**Request body**

None.

**Responses**

- **200 OK**

```json
{
  "project": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "name": "Mobile app launch",
    "description": "Q2 release scope",
    "deadline": "2026-12-31T23:59:59.000Z",
    "created_by": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "created_at": "2026-05-13T12:05:00.000Z",
    "updated_at": "2026-05-13T12:05:00.000Z",
    "role": "admin",
    "joined_at": "2026-05-13T12:05:00.123Z"
  }
}
```

- **400 Bad Request** — invalid `projectId` format.
- **403 Forbidden** — not a member of the project (or project not visible).

---

## Tasks

Base path: **`/api/projects/:projectId/tasks`**

All routes require **`Authorization: Bearer <token>`** and **membership** on `:projectId`. Additional rules per endpoint.

---

### Create task

| | |
|---|---|
| **Method** | `POST` |
| **Route** | `/api/projects/:projectId/tasks` |
| **Authorization** | **Project admin** only |

**Headers**

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request body**

| Field | Type | Required | Rules |
|-------|------|----------|--------|
| `title` | string | Yes | Trimmed, 1–300 characters |
| `description` | string | No | Trimmed; empty → `null` |
| `status` | string | No | Default `todo`. One of: `todo`, `in_progress`, `review`, `done`, `cancelled` |
| `priority` | string | No | Default `medium`. One of: `low`, `medium`, `high` |
| `assignee_id` | string (UUID) | No | Must be a **project member** if set |
| `due_at` | string \| number | No | Valid date; **must not be in the past** if provided |

**Example request**

```json
{
  "title": "Write API documentation",
  "description": "Cover auth, projects, tasks, members",
  "status": "todo",
  "priority": "high",
  "assignee_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "due_at": "2026-05-20T17:00:00.000Z"
}
```

**Responses**

- **201 Created**

```json
{
  "task": {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "project_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "title": "Write API documentation",
    "description": "Cover auth, projects, tasks, members",
    "status": "todo",
    "priority": "high",
    "assignee_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "created_by": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "due_at": "2026-05-20T17:00:00.000Z",
    "created_at": "2026-05-13T12:10:00.000Z",
    "updated_at": "2026-05-13T12:10:00.000Z"
  }
}
```

- **403 Forbidden** — caller is not a project admin.
- **422 Unprocessable Entity** — validation; assignee not in project:

```json
{
  "error": "Assignee must be a member of this project.",
  "details": {
    "fields": {
      "assignee_id": ["User is not a member of this project."]
    }
  }
}
```

---

### List tasks

| | |
|---|---|
| **Method** | `GET` |
| **Route** | `/api/projects/:projectId/tasks` |
| **Authorization** | Project **admin** or **member** |

**Behavior**

- **Admin:** all tasks in the project.
- **Member:** only tasks where **`assignee_id`** equals the current user (tasks assigned to them).

**Headers**

```http
Authorization: Bearer <access_token>
```

**Request body**

None.

**Responses**

- **200 OK**

```json
{
  "tasks": [
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "project_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "title": "Write API documentation",
      "description": null,
      "status": "in_progress",
      "priority": "high",
      "assignee_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "created_by": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "due_at": "2026-05-20T17:00:00.000Z",
      "created_at": "2026-05-13T12:10:00.000Z",
      "updated_at": "2026-05-13T14:00:00.000Z"
    }
  ]
}
```

---

### Get task by ID

| | |
|---|---|
| **Method** | `GET` |
| **Route** | `/api/projects/:projectId/tasks/:taskId` |
| **Authorization** | Project **admin** or **member** |

**Rules**

- **Admin:** any task in the project.
- **Member:** only if **`assignee_id`** is the current user.

**Headers**

```http
Authorization: Bearer <access_token>
```

**Responses**

- **200 OK** — same task object shape as in the list example.
- **400 Bad Request** — invalid `taskId` UUID.
- **403 Forbidden** — member viewing a task not assigned to them.
- **404 Not Found** — task not in this project.

---

### Update task

| | |
|---|---|
| **Method** | `PATCH` |
| **Route** | `/api/projects/:projectId/tasks/:taskId` |
| **Authorization** | Project **admin** or **member** (different body rules) |

#### Project admin

May send one or more of:

| Field | Type | Notes |
|-------|------|--------|
| `title` | string | Non-empty after trim, max 300 |
| `description` | string \| null | |
| `status` | string | One of the allowed statuses |
| `priority` | string | `low` \| `medium` \| `high` |
| `assignee_id` | string (UUID) \| null | If set, user must be a project member |
| `due_at` | string \| number \| null | Cleared with `null` / empty string per validation rules |

**Example**

```json
{
  "status": "review",
  "priority": "medium"
}
```

- **200 OK** — `{ "task": { ... } }`
- **422** — no valid fields, validation errors, or invalid assignee.

#### Project member

May send **only** `status` (no other keys). Only allowed if the task **`assignee_id`** is the current user.

**Example**

```json
{
  "status": "done"
}
```

- **200 OK** — `{ "task": { ... } }`
- **403** — task not assigned to this member.
- **422** — extra fields, invalid status, etc.

**Common status codes**

- **400** — invalid `taskId`.

---

## Project members

Base path: **`/api/projects/:projectId/members`**

All routes require **`Authorization: Bearer <token>`** and project context.

---

### List members

| | |
|---|---|
| **Method** | `GET` |
| **Route** | `/api/projects/:projectId/members` |
| **Authorization** | Project **admin** or **member** |

**Headers**

```http
Authorization: Bearer <access_token>
```

**Request body**

None.

**Responses**

- **200 OK**

```json
{
  "members": [
    {
      "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "alex@example.com",
      "display_name": "Alex Rivera",
      "role": "admin",
      "joined_at": "2026-05-13T12:05:00.123Z"
    },
    {
      "user_id": "d4e5f6a7-b8c9-0123-def0-234567890123",
      "email": "sam@example.com",
      "display_name": "Sam Lee",
      "role": "member",
      "joined_at": "2026-05-14T09:00:00.000Z"
    }
  ]
}
```

---

### Add member by email

| | |
|---|---|
| **Method** | `POST` |
| **Route** | `/api/projects/:projectId/members` |
| **Authorization** | **Project admin** only |

**Headers**

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request body**

| Field | Type | Required | Rules |
|-------|------|----------|--------|
| `email` | string | Yes | Valid email, max 320; matched against existing `users.email` |
| `role` | string | No | `admin` or `member` (default **`member`**) |

**Example request**

```json
{
  "email": "sam@example.com",
  "role": "member"
}
```

**Responses**

- **201 Created**

```json
{
  "member": {
    "user_id": "d4e5f6a7-b8c9-0123-def0-234567890123",
    "email": "sam@example.com",
    "display_name": "Sam Lee",
    "role": "member",
    "joined_at": "2026-05-14T09:00:00.000Z"
  }
}
```

- **404 Not Found** — no user with that email.
- **409 Conflict** — user already in the project.
- **422** — validation errors.

---

### Remove member

| | |
|---|---|
| **Method** | `DELETE` |
| **Route** | `/api/projects/:projectId/members/:userId` |
| **Authorization** | **Project admin** only |

**Path parameters**

| Param | Description |
|-------|-------------|
| `userId` | UUID of the user to remove from the project |

**Headers**

```http
Authorization: Bearer <access_token>
```

**Request body**

None.

**Responses**

- **204 No Content** — member removed successfully (empty body).
- **400 Bad Request** — invalid `userId` UUID.
- **403 Forbidden** — an admin cannot **remove themselves** if they are the **only** admin (`You cannot remove yourself as the last admin.`).
- **404 Not Found** — user is not in `project_members` for this project.

---

## Role summary (project-scoped)

| Area | Admin | Member |
|------|-------|--------|
| Create project (global) | ✓ (any logged-in user) | ✓ |
| List own projects | ✓ | ✓ |
| View project | ✓ | ✓ |
| Create task | ✓ | ✗ |
| List tasks | All tasks | Assigned tasks only |
| Get task | Any task | Assigned tasks only |
| Update task | Full field patch | `status` only, assigned tasks only |
| List members | ✓ | ✓ |
| Add / remove members | ✓ | ✗ |

---

## Operational endpoints (reference)

These are not under `/api` but may be used for monitoring:

| Method | Route | Auth | Description |
|--------|-------|------|---------------|
| `GET` | `/health` | None | Liveness |
| `GET` | `/health/ready` | None | Readiness (checks database) |

---

## Error response reference

| Code | Typical use |
|------|-------------|
| **400** | Invalid UUID or malformed input |
| **401** | Missing/invalid JWT, or invalid credentials (login) |
| **403** | Not allowed for this role or resource |
| **404** | Resource not found (user by email, task, member row) |
| **409** | Conflict (duplicate signup, duplicate project member) |
| **422** | Validation failed (`details.fields` when applicable) |
| **500** | Server error (message may be generic when `NODE_ENV=production`) |
| **503** | Database connectivity issues |

---

# Deployment Notes

The backend is designed to be deployed on:
- Railway
- Render
- VPS/Docker environments

Production deployment requires:
- PostgreSQL database
- Environment variables
- Secure JWT secret

# Planned Future Improvements

- File upload support
- Task comments/activity logs
- Real-time notifications using WebSockets
- Email invitations
- Project analytics dashboard
- Pagination and filtering
- Docker support
- Automated testing
- CI/CD pipeline

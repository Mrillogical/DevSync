# DevSync

A team task management app built with React, Node.js, Express, and PostgreSQL. Create projects, invite members, assign tasks, and track progress with role-based access control.

## Stack

- **Frontend** — React, Vite, Tailwind CSS, React Router
- **Backend** — Node.js, Express
- **Database** — PostgreSQL
- **Auth** — JWT, bcrypt

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/devsync.git
cd devsync
```

### 2. Set up the database

```bash
psql -U your_user -d your_db -f server/src/config/schema.sql
```

### 3. Configure the backend

Create `server/.env`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/devsync
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

```bash
cd server
npm install
npm run dev
```

### 4. Start the frontend

```bash
cd client
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## Project Structure

```
devsync/
├── client/        # React frontend
└── server/        # Express backend
    └── src/
        ├── config/        # DB connection + schema
        ├── controllers/   # Route handlers
        ├── middleware/     # Auth + role checks
        ├── routes/
        ├── services/      # DB queries
        └── server.js
```

## API

Full API docs are in [`server/API_DOCUMENTATION.md`](server/API_DOCUMENTATION.md).

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/projects` | List your projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id/tasks` | List tasks |
| POST | `/api/projects/:id/tasks` | Create task |
| GET | `/api/projects/:id/members` | List members |
| POST | `/api/projects/:id/members` | Invite member |

## Roles

Each project has two roles — **admin** and **member**.

- **Admin** — can create/delete tasks, invite/remove members, manage the project
- **Member** — can view assigned tasks and update their status

The user who creates a project is automatically the admin.

## Deployment

- **Backend** → [Railway](https://railway.app)
- **Frontend** → [Vercel](https://vercel.com) or [Netlify](https://netlify.com)
- **Database** → Railway PostgreSQL or [Neon](https://neon.tech)

Before deploying the frontend, update `baseURL` in `client/src/api/axios.js` to point to your live backend URL.
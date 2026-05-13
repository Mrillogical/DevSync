
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(320) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_email_lower_chk CHECK (email = lower(email)),
  CONSTRAINT users_email_len_chk CHECK (char_length(email) >= 3)
);

CREATE UNIQUE INDEX users_email_unique ON users (email);

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

COMMENT ON TABLE users IS 'Application accounts; project roles live on project_members.';

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  deadline TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT projects_name_trim_chk CHECK (name = trim(name)),
  CONSTRAINT projects_name_len_chk CHECK (char_length(trim(name)) >= 1)
);

CREATE INDEX projects_created_by_idx ON projects (created_by);

CREATE TRIGGER projects_set_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

COMMENT ON TABLE projects IS 'Work containers; membership and per-project roles are in project_members.';

CREATE TABLE project_members (
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id),
  CONSTRAINT project_members_role_chk CHECK (role IN ('admin', 'member'))
);

CREATE INDEX project_members_user_idx ON project_members (user_id);
CREATE INDEX project_members_project_role_idx ON project_members (project_id, role);

COMMENT ON TABLE project_members IS 'Per-project membership and RBAC (admin | member).';
COMMENT ON COLUMN project_members.role IS 'admin: manage members/settings; member: standard access.';

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'todo',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  assignee_id UUID REFERENCES users (id) ON DELETE SET NULL,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tasks_title_trim_chk CHECK (title = trim(title)),
  CONSTRAINT tasks_title_len_chk CHECK (char_length(trim(title)) >= 1),
  CONSTRAINT tasks_priority_chk CHECK (
  priority IN ('low', 'medium', 'high')
),
  CONSTRAINT tasks_status_chk CHECK (
    status IN ('todo', 'in_progress', 'review', 'done', 'cancelled')
  )
);

CREATE INDEX tasks_project_idx ON tasks (project_id);
CREATE INDEX tasks_project_status_idx ON tasks (project_id, status);
CREATE INDEX tasks_assignee_idx ON tasks (assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX tasks_due_at_idx ON tasks (due_at) WHERE due_at IS NOT NULL;

CREATE TRIGGER tasks_set_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

COMMENT ON TABLE tasks IS 'Tasks belong to exactly one project; assignee is optional.';
COMMENT ON COLUMN tasks.status IS 'todo | in_progress | review | done | cancelled';

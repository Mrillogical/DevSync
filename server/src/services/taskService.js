const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');

const ALLOWED_STATUSES = new Set([
  'todo',
  'in_progress',
  'review',
  'done',
  'cancelled',
]);

const ALLOWED_PRIORITIES = new Set(['low', 'medium', 'high']);

function mapTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignee_id: row.assignee_id,
    created_by: row.created_by,
    due_at: row.due_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function assertAssigneeIsMember(projectId, assigneeId) {
  if (!assigneeId) return;
  const { rows } = await query(
    `SELECT 1 FROM project_members
     WHERE project_id = $1 AND user_id = $2
     LIMIT 1`,
    [projectId, assigneeId]
  );
  if (rows.length === 0) {
    throw new AppError('Assignee must be a member of this project.', 422, {
      fields: { assignee_id: ['User is not a member of this project.'] },
    });
  }
}

/**
 * @param {string} projectId
 * @param {string} createdByUserId
 * @param {{
 *   title: string;
 *   description: string | null;
 *   status: string;
 *   priority: string;
 *   assignee_id: string | null;
 *   due_at: Date | null;
 * }} input
 */
async function createTask(projectId, createdByUserId, input) {
  await assertAssigneeIsMember(projectId, input.assignee_id);

  const { rows } = await query(
    `INSERT INTO tasks (
       project_id, title, description, status, priority, assignee_id, created_by, due_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING
       id, project_id, title, description, status, priority, assignee_id, created_by, due_at,
       created_at, updated_at`,
    [
      projectId,
      input.title,
      input.description,
      input.status,
      input.priority,
      input.assignee_id,
      createdByUserId,
      input.due_at,
    ]
  );
  return mapTask(rows[0]);
}

/**
 * @param {string} projectId
 * @param {string} viewerId
 * @param {'admin' | 'member'} role
 */
async function listTasks(projectId, viewerId, role) {
  if (role === 'admin') {
    const { rows } = await query(
      `SELECT
         id, project_id, title, description, status, priority, assignee_id, created_by, due_at,
         created_at, updated_at
       FROM tasks
       WHERE project_id = $1
       ORDER BY updated_at DESC`,
      [projectId]
    );
    return rows.map(mapTask);
  }

  const { rows } = await query(
    `SELECT
       id, project_id, title, description, status, priority, assignee_id, created_by, due_at,
       created_at, updated_at
     FROM tasks
     WHERE project_id = $1 AND assignee_id = $2
     ORDER BY updated_at DESC`,
    [projectId, viewerId]
  );
  return rows.map(mapTask);
}

/**
 * @param {string} projectId
 * @param {string} taskId
 */
async function getTaskById(projectId, taskId) {
  const { rows } = await query(
    `SELECT
       id, project_id, title, description, status, priority, assignee_id, created_by, due_at,
       created_at, updated_at
     FROM tasks
     WHERE project_id = $1 AND id = $2
     LIMIT 1`,
    [projectId, taskId]
  );
  return mapTask(rows[0]);
}

/**
 * @param {string} projectId
 * @param {string} taskId
 * @param {string} memberUserId
 * @param {{ status: string }} input
 */
async function updateTaskAsMember(projectId, taskId, memberUserId, input) {
  const existing = await getTaskById(projectId, taskId);
  if (!existing) {
    throw new AppError('Task not found.', 404);
  }
  if (existing.assignee_id !== memberUserId) {
    throw new AppError('You can only update tasks assigned to you.', 403);
  }

  const { rows } = await query(
    `UPDATE tasks
     SET status = $1
     WHERE project_id = $2 AND id = $3 AND assignee_id = $4
     RETURNING
       id, project_id, title, description, status, priority, assignee_id, created_by, due_at,
       created_at, updated_at`,
    [input.status, projectId, taskId, memberUserId]
  );
  return mapTask(rows[0]);
}

/**
 * @param {string} projectId
 * @param {string} taskId
 * @param {Partial<{
 *   title: string;
 *   description: string | null;
 *   status: string;
 *   priority: string;
 *   assignee_id: string | null;
 *   due_at: Date | null;
 * }>} patch
 */
async function updateTaskAsAdmin(projectId, taskId, patch) {
  const existing = await getTaskById(projectId, taskId);
  if (!existing) {
    throw new AppError('Task not found.', 404);
  }

  if (patch.assignee_id !== undefined) {
    await assertAssigneeIsMember(projectId, patch.assignee_id);
  }

  const title = patch.title !== undefined ? patch.title : existing.title;
  const description =
    patch.description !== undefined ? patch.description : existing.description;
  const status = patch.status !== undefined ? patch.status : existing.status;
  const priority = patch.priority !== undefined ? patch.priority : existing.priority;
  const assignee_id =
    patch.assignee_id !== undefined ? patch.assignee_id : existing.assignee_id;
  const due_at = patch.due_at !== undefined ? patch.due_at : existing.due_at;

  const { rows } = await query(
    `UPDATE tasks
     SET
       title = $1,
       description = $2,
       status = $3,
       priority = $4,
       assignee_id = $5,
       due_at = $6
     WHERE project_id = $7 AND id = $8
     RETURNING
       id, project_id, title, description, status, priority, assignee_id, created_by, due_at,
       created_at, updated_at`,
    [title, description, status, priority, assignee_id, due_at, projectId, taskId]
  );
  return mapTask(rows[0]);
}

module.exports = {
  createTask,
  listTasks,
  getTaskById,
  updateTaskAsMember,
  updateTaskAsAdmin,
  ALLOWED_STATUSES,
  ALLOWED_PRIORITIES,
};

const taskService = require('../services/taskService');
const { AppError } = require('../utils/AppError');
const { isUuid } = require('../middleware/roleMiddleware');

function collectCreateErrors(body) {
  /** @type {Record<string, string[]>} */
  const fields = {};

  const titleRaw = typeof body.title === 'string' ? body.title.trim() : '';
  if (!titleRaw) {
    fields.title = fields.title || [];
    fields.title.push('Title is required.');
  } else if (titleRaw.length > 300) {
    fields.title = fields.title || [];
    fields.title.push('Title must be at most 300 characters.');
  }

  let description = null;
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string') {
      fields.description = fields.description || [];
      fields.description.push('Description must be a string.');
    } else {
      const t = body.description.trim();
      description = t.length === 0 ? null : t;
    }
  }

  const status =
    typeof body.status === 'string' && body.status.trim()
      ? body.status.trim()
      : 'todo';
  if (!taskService.ALLOWED_STATUSES.has(status)) {
    fields.status = fields.status || [];
    fields.status.push(`Must be one of: ${[...taskService.ALLOWED_STATUSES].join(', ')}.`);
  }

  const priority =
    typeof body.priority === 'string' && body.priority.trim()
      ? body.priority.trim()
      : 'medium';
  if (!taskService.ALLOWED_PRIORITIES.has(priority)) {
    fields.priority = fields.priority || [];
    fields.priority.push(`Must be one of: ${[...taskService.ALLOWED_PRIORITIES].join(', ')}.`);
  }

  let assignee_id = null;
  if (body.assignee_id !== undefined && body.assignee_id !== null && body.assignee_id !== '') {
    if (typeof body.assignee_id !== 'string' || !isUuid(body.assignee_id)) {
      fields.assignee_id = fields.assignee_id || [];
      fields.assignee_id.push('assignee_id must be a valid UUID.');
    } else {
      assignee_id = body.assignee_id;
    }
  }

  let due_at = null;
  if (body.due_at !== undefined && body.due_at !== null && body.due_at !== '') {
    if (typeof body.due_at !== 'string' && typeof body.due_at !== 'number') {
      fields.due_at = fields.due_at || [];
      fields.due_at.push('due_at must be a date string or timestamp.');
    } else {
      const d = new Date(body.due_at);
      if (Number.isNaN(d.getTime())) {
        fields.due_at = fields.due_at || [];
        fields.due_at.push('due_at is not a valid date.');
      } else if (d.getTime() < Date.now()) {
        fields.due_at = fields.due_at || [];
        fields.due_at.push('due_at cannot be in the past.');
      } else {
        due_at = d;
      }
    }
  }

  return { fields, title: titleRaw, description, status, priority, assignee_id, due_at };
}

function parseOptionalDueAt(body, fields) {
  if (body.due_at === undefined || body.due_at === null || body.due_at === '') {
    return { value: undefined, unset: true };
  }
  if (typeof body.due_at !== 'string' && typeof body.due_at !== 'number') {
    fields.due_at = fields.due_at || [];
    fields.due_at.push('due_at must be a date string or timestamp.');
    return { value: undefined, unset: false };
  }
  const d = new Date(body.due_at);
  if (Number.isNaN(d.getTime())) {
    fields.due_at = fields.due_at || [];
    fields.due_at.push('due_at is not a valid date.');
    return { value: undefined, unset: false };
  }
  return { value: d, unset: false };
}

function collectAdminPatchErrors(body) {
  /** @type {Record<string, string[]>} */
  const fields = {};
  /** @type {Record<string, unknown>} */
  const patch = {};

  if (body.title !== undefined) {
    if (typeof body.title !== 'string') {
      fields.title = fields.title || [];
      fields.title.push('Title must be a string.');
    } else {
      const t = body.title.trim();
      if (!t) {
        fields.title = fields.title || [];
        fields.title.push('Title cannot be empty.');
      } else if (t.length > 300) {
        fields.title = fields.title || [];
        fields.title.push('Title must be at most 300 characters.');
      } else {
        patch.title = t;
      }
    }
  }

  if (body.description !== undefined) {
    if (body.description === null) {
      patch.description = null;
    } else if (typeof body.description !== 'string') {
      fields.description = fields.description || [];
      fields.description.push('Description must be a string or null.');
    } else {
      const t = body.description.trim();
      patch.description = t.length === 0 ? null : t;
    }
  }

  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !body.status.trim()) {
      fields.status = fields.status || [];
      fields.status.push('status must be a non-empty string.');
    } else if (!taskService.ALLOWED_STATUSES.has(body.status.trim())) {
      fields.status = fields.status || [];
      fields.status.push(`Must be one of: ${[...taskService.ALLOWED_STATUSES].join(', ')}.`);
    } else {
      patch.status = body.status.trim();
    }
  }

  if (body.priority !== undefined) {
    if (typeof body.priority !== 'string' || !body.priority.trim()) {
      fields.priority = fields.priority || [];
      fields.priority.push('priority must be a non-empty string.');
    } else if (!taskService.ALLOWED_PRIORITIES.has(body.priority.trim())) {
      fields.priority = fields.priority || [];
      fields.priority.push(`Must be one of: ${[...taskService.ALLOWED_PRIORITIES].join(', ')}.`);
    } else {
      patch.priority = body.priority.trim();
    }
  }

  if (body.assignee_id !== undefined) {
    if (body.assignee_id === null || body.assignee_id === '') {
      patch.assignee_id = null;
    } else if (typeof body.assignee_id !== 'string' || !isUuid(body.assignee_id)) {
      fields.assignee_id = fields.assignee_id || [];
      fields.assignee_id.push('assignee_id must be a valid UUID or null.');
    } else {
      patch.assignee_id = body.assignee_id;
    }
  }

  if (body.due_at !== undefined) {
    const parsed = parseOptionalDueAt(body, fields);
    if (!fields.due_at) {
      if (parsed.unset) {
        patch.due_at = null;
      } else if (parsed.value !== undefined) {
        patch.due_at = parsed.value;
      }
    }
  }

  return { fields, patch };
}

function collectMemberStatusPatch(body) {
  /** @type {Record<string, string[]>} */
  const fields = {};
  const allowed = new Set(['status']);

  const extra = Object.keys(body || {}).filter((k) => !allowed.has(k));
  if (extra.length > 0) {
    fields.body = fields.body || [];
    fields.body.push('Members may only send the "status" field.');
  }

  if (body.status === undefined || typeof body.status !== 'string' || !body.status.trim()) {
    fields.status = fields.status || [];
    fields.status.push('status is required.');
  } else if (!taskService.ALLOWED_STATUSES.has(body.status.trim())) {
    fields.status = fields.status || [];
    fields.status.push(`Must be one of: ${[...taskService.ALLOWED_STATUSES].join(', ')}.`);
  }

  return { fields, status: body.status ? body.status.trim() : '' };
}

async function create(req, res) {
  const parsed = collectCreateErrors(req.body);
  if (Object.keys(parsed.fields).length > 0) {
    throw new AppError('Validation failed.', 422, { fields: parsed.fields });
  }

  const task = await taskService.createTask(req.project.id, req.auth.userId, {
    title: parsed.title,
    description: parsed.description,
    status: parsed.status,
    priority: parsed.priority,
    assignee_id: parsed.assignee_id,
    due_at: parsed.due_at,
  });

  res.status(201).json({ task });
}

async function list(req, res) {
  const tasks = await taskService.listTasks(
    req.project.id,
    req.auth.userId,
    req.projectMembership.role
  );
  res.json({ tasks });
}

async function getById(req, res) {
  const taskId = req.params.taskId;
  if (!isUuid(taskId)) {
    throw new AppError('Invalid task ID.', 400);
  }

  const task = await taskService.getTaskById(req.project.id, taskId);
  if (!task) {
    throw new AppError('Task not found.', 404);
  }

  if (req.projectMembership.role === 'member') {
    if (task.assignee_id !== req.auth.userId) {
      throw new AppError('You can only view tasks assigned to you.', 403);
    }
  }

  res.json({ task });
}

async function update(req, res) {
  const taskId = req.params.taskId;
  if (!isUuid(taskId)) {
    throw new AppError('Invalid task ID.', 400);
  }

  if (req.projectMembership.role === 'admin') {
    const { fields, patch } = collectAdminPatchErrors(req.body);
    if (Object.keys(fields).length > 0) {
      throw new AppError('Validation failed.', 422, { fields });
    }
    if (Object.keys(patch).length === 0) {
      throw new AppError('No valid fields to update.', 422, {
        fields: { body: ['Provide at least one of: title, description, status, priority, assignee_id, due_at.'] },
      });
    }
    const task = await taskService.updateTaskAsAdmin(req.project.id, taskId, patch);
    res.json({ task });
    return;
  }

  const { fields, status } = collectMemberStatusPatch(req.body);
  if (Object.keys(fields).length > 0) {
    throw new AppError('Validation failed.', 422, { fields });
  }

  const task = await taskService.updateTaskAsMember(req.project.id, taskId, req.auth.userId, {
    status,
  });
  res.json({ task });
}

module.exports = {
  create,
  list,
  getById,
  update,
};

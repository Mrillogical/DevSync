const projectService = require('../services/projectService');
const { AppError } = require('../utils/AppError');

function collectCreateProjectErrors(body) {
  /** @type {Record<string, string[]>} */
  const fields = {};

  const nameRaw = typeof body.name === 'string' ? body.name.trim() : '';
  if (!nameRaw) {
    fields.name = fields.name || [];
    fields.name.push('Name is required.');
  } else if (nameRaw.length > 200) {
    fields.name = fields.name || [];
    fields.name.push('Name must be at most 200 characters.');
  }

  let description = null;
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string') {
      fields.description = fields.description || [];
      fields.description.push('Description must be a string.');
    } else {
      const trimmed = body.description.trim();
      description = trimmed.length === 0 ? null : trimmed;
    }
  }

  let deadline = null;
  if (body.deadline !== undefined && body.deadline !== null && body.deadline !== '') {
    if (typeof body.deadline !== 'string' && typeof body.deadline !== 'number') {
      fields.deadline = fields.deadline || [];
      fields.deadline.push('Deadline must be a date string or timestamp.');
    } else {
      const d = new Date(body.deadline);
      if (Number.isNaN(d.getTime())) {
        fields.deadline = fields.deadline || [];
        fields.deadline.push('Deadline is not a valid date.');
      } else if (d.getTime() < Date.now()) {
        fields.deadline = fields.deadline || [];
        fields.deadline.push('Deadline cannot be in the past.');
      } else {
        deadline = d;
      }
    }
  }

  return { fields, name: nameRaw, description, deadline };
}

async function create(req, res) {
  const { fields, name, description, deadline } = collectCreateProjectErrors(req.body);
  if (Object.keys(fields).length > 0) {
    throw new AppError('Validation failed.', 422, { fields });
  }

  const project = await projectService.createProject(req.auth.userId, {
    name,
    description,
    deadline,
  });

  res.status(201).json({ project });
}

async function listMine(req, res) {
  const projects = await projectService.listProjectsForUser(req.auth.userId);
  res.json({ projects });
}

async function getById(req, res) {
  const project = {
    ...req.project,
    role: req.projectMembership.role,
    joined_at: req.projectMembership.joined_at,
  };
  res.json({ project });
}

module.exports = {
  create,
  listMine,
  getById,
};

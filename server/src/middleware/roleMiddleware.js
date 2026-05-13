const { AppError } = require('../utils/AppError');
const projectService = require('../services/projectService');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}


async function attachProjectContext(req, res, next) {
  const projectId = req.params.projectId;
  if (!isUuid(projectId)) {
    next(new AppError('Invalid project ID.', 400));
    return;
  }
  try {
    const found = await projectService.findProjectWithMembership(
      req.auth.userId,
      projectId
    );
    if (!found) {
      next(new AppError('Project not found or access denied.', 403));
      return;
    }
    req.project = found.project;
    req.projectMembership = {
      role: found.role,
      joined_at: found.joined_at,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Factory: require the user to be a project member with one of the given roles.
 * Run after `attachProjectContext`.
 *
 * @param {...('admin' | 'member')} allowedRoles
 */
function requireProjectRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.projectMembership) {
      next(new AppError('Project membership context is missing.', 500));
      return;
    }
    if (!allowedRoles.includes(req.projectMembership.role)) {
      next(
        new AppError('You do not have permission to perform this action on the project.', 403)
      );
      return;
    }
    next();
  };
}

module.exports = {
  isUuid,
  attachProjectContext,
  requireProjectRole,
};

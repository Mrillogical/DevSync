const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');

const ROLES = new Set(['admin', 'member']);

function mapMemberRow(row) {
  return {
    user_id: row.user_id,
    email: row.email,
    display_name: row.display_name,
    role: row.role,
    joined_at: row.joined_at,
  };
}

/**
 * @param {string} projectId
 */
async function listMembers(projectId) {
  const { rows } = await query(
    `SELECT
       pm.user_id,
       pm.role,
       pm.joined_at,
       u.email,
       u.display_name
     FROM project_members pm
     INNER JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1
     ORDER BY pm.joined_at ASC`,
    [projectId]
  );
  return rows.map(mapMemberRow);
}

/**
 * @param {string} projectId
 * @param {string} userId
 */
async function getMembership(projectId, userId) {
  const { rows } = await query(
    `SELECT project_id, user_id, role, joined_at
     FROM project_members
     WHERE project_id = $1 AND user_id = $2
     LIMIT 1`,
    [projectId, userId]
  );
  return rows[0] || null;
}

/**
 * @param {string} projectId
 * @param {string} emailLower
 * @param {'admin' | 'member'} role
 */
async function addMemberByEmail(projectId, emailLower, role) {
  const { rows: userRows } = await query(
    `SELECT id, email, display_name FROM users WHERE email = $1 LIMIT 1`,
    [emailLower]
  );
  const user = userRows[0];
  if (!user) {
    throw new AppError('No user found with this email.', 404);
  }

  try {
    await query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [projectId, user.id, role]
    );
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError('User is already a member of this project.', 409);
    }
    throw err;
  }

  const membership = await getMembership(projectId, user.id);
  return {
    user_id: user.id,
    email: user.email,
    display_name: user.display_name,
    role: membership.role,
    joined_at: membership.joined_at,
  };
}

/**
 * @param {string} projectId
 * @param {string} targetUserId
 */
async function removeMember(projectId, targetUserId, requestingUserId) {
  const membership = await getMembership(projectId, targetUserId);
  if (!membership) {
    throw new AppError('Member not found in this project.', 404);
  }

  if (
    membership.role === 'admin' &&
    targetUserId === requestingUserId
  ) {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS admin_count
       FROM project_members
       WHERE project_id = $1 AND role = 'admin'`,
      [projectId]
    );
  
    const adminCount = rows[0]?.admin_count ?? 0;
  
    if (adminCount <= 1) {
      throw new AppError(
        'You cannot remove yourself as the last admin.',
        403
      );
    }
  }

  await query(
    `DELETE FROM project_members
     WHERE project_id = $1 AND user_id = $2`,
    [projectId, targetUserId]
  );
}

module.exports = {
  listMembers,
  addMemberByEmail,
  removeMember,
  ROLES,
};

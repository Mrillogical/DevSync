const { query, getPool } = require('../config/db');

function mapProjectRow(row, memberExtras) {
  if (!row) return null;
  const base = {
    id: row.id,
    name: row.name,
    description: row.description,
    deadline: row.deadline,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  if (memberExtras) {
    return {
      ...base,
      role: memberExtras.role,
      joined_at: memberExtras.joined_at,
    };
  }
  return base;
}

/**
 * @param {string} userId
 * @param {string} projectId
 * @returns {Promise<{ project: object; role: string; joined_at: Date } | null>}
 */
async function findProjectWithMembership(userId, projectId) {
  const { rows } = await query(
    `SELECT
       p.id,
       p.name,
       p.description,
       p.deadline,
       p.created_by,
       p.created_at,
       p.updated_at,
       pm.role,
       pm.joined_at
     FROM projects p
     INNER JOIN project_members pm
       ON pm.project_id = p.id AND pm.user_id = $2
     WHERE p.id = $1
     LIMIT 1`,
    [projectId, userId]
  );
  const row = rows[0];
  if (!row) return null;
  const { role, joined_at, ...projectCols } = row;
  return {
    project: mapProjectRow(projectCols),
    role,
    joined_at,
  };
}

/**
 * @param {string} userId
 */
async function listProjectsForUser(userId) {
  const { rows } = await query(
    `SELECT
       p.id,
       p.name,
       p.description,
       p.deadline,
       p.created_by,
       p.created_at,
       p.updated_at,
       pm.role,
       pm.joined_at
     FROM projects p
     INNER JOIN project_members pm
       ON pm.project_id = p.id AND pm.user_id = $1
     ORDER BY p.updated_at DESC`,
    [userId]
  );
  return rows.map((row) => {
    const { role, joined_at, ...projectCols } = row;
    return mapProjectRow(projectCols, { role, joined_at });
  });
}

/**
 * @param {string} userId
 * @param {{ name: string; description: string | null; deadline: Date | null }} input
 */
async function createProject(userId, input) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO projects (name, description, deadline, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, deadline, created_by, created_at, updated_at`,
      [input.name, input.description, input.deadline, userId]
    );
    const project = rows[0];
    const memberResult = await client.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, 'admin')
       RETURNING joined_at`,
      [project.id, userId]
    );
    const joined_at = memberResult.rows[0].joined_at;
    await client.query('COMMIT');
    return mapProjectRow(project, {
      role: 'admin',
      joined_at,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createProject,
  listProjectsForUser,
  findProjectWithMembership,
};

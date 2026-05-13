const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');

const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('Authentication is not configured on this server.', 500);
  }
  return secret;
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN, issuer: 'devsync', audience: 'devsync-api' }
  );
}

function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * @param {{ email: string; password: string; display_name: string }} input
 */
async function signup(input) {
  const email = input.email;
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  try {
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, created_at, updated_at`,
      [email, passwordHash, input.display_name]
    );
    const user = mapUserRow(rows[0]);
    const token = signToken(user);
    return { user, token };
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError('An account with this email already exists.', 409);
    }
    throw err;
  }
}

/**
 * @param {{ email: string; password: string }} input
 */
async function login(input) {
  const { rows } = await query(
    `SELECT id, email, password_hash, display_name, created_at, updated_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [input.email]
  );

  const row = rows[0];
  if (!row) {
    throw new AppError('Invalid email or password.', 401);
  }

  const match = await bcrypt.compare(input.password, row.password_hash);
  if (!match) {
    throw new AppError('Invalid email or password.', 401);
  }

  const user = mapUserRow(row);
  const token = signToken(user);
  return { user, token };
}

/**
 * @param {string} userId
 */
async function getProfileById(userId) {
  const { rows } = await query(
    `SELECT id, email, display_name, created_at, updated_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );
  return mapUserRow(rows[0]);
}

module.exports = {
  signup,
  login,
  getProfileById,
};

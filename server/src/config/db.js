const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function buildPoolConfig() {
  const max = parseInt(process.env.PGPOOL_MAX || '20', 10);
  const idleTimeoutMillis = parseInt(
    process.env.PGPOOL_IDLE_TIMEOUT_MS || '30000',
    10
  );
  const connectionTimeoutMillis = parseInt(
    process.env.PGPOOL_CONNECTION_TIMEOUT_MS || '10000',
    10
  );

  const base = {
    max: Number.isFinite(max) && max > 0 ? max : 20,
    idleTimeoutMillis:
      Number.isFinite(idleTimeoutMillis) && idleTimeoutMillis > 0
        ? idleTimeoutMillis
        : 30000,
    connectionTimeoutMillis:
      Number.isFinite(connectionTimeoutMillis) && connectionTimeoutMillis > 0
        ? connectionTimeoutMillis
        : 10000,
    allowExitOnIdle: process.env.PGPOOL_ALLOW_EXIT_ON_IDLE === 'true',
  };

  const connectionString = process.env.DATABASE_URL?.trim();
  if (connectionString) {
    const ssl =
      process.env.DATABASE_SSL === 'true' ||
      process.env.PGSSLMODE === 'require'
        ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : undefined;

    return {
      ...base,
      connectionString,
      ...(ssl ? { ssl } : {}),
    };
  }

  const database = process.env.PGDATABASE || process.env.DB_NAME;
  if (!database) {
    throw new Error(
      'Database configuration missing: set DATABASE_URL or PGDATABASE (or DB_NAME) with PGHOST/PGUSER/PGPASSWORD as needed.'
    );
  }

  return {
    ...base,
    host: process.env.PGHOST || '127.0.0.1',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || process.env.USER,
    password: process.env.PGPASSWORD,
    database,
    ssl:
      process.env.PGSSLMODE === 'require' || process.env.DATABASE_SSL === 'true'
        ? {
            rejectUnauthorized:
              process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
          }
        : false,
  };
}

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool(buildPoolConfig());

    pool.on('error', (err) => {
      console.error('[db] Unexpected error on idle PostgreSQL client', {
        message: err.message,
        code: err.code,
      });
    });
  }
  return pool;
}

function isConnectionFailure(err) {
  const code = err?.code;
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
    return true;
  }

  if (code === '57P01' || code === '57P02' || code === '57P03') {
    return true;
  }
  return false;
}

/**
 * Run a parameterized SQL statement against the shared pool.
 * @param {string} text SQL text (use $1, $2, ... for parameters)
 * @param {unknown[]} [params]
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const p = getPool();
  try {
    return await p.query(text, params);
  } catch (err) {
    const wrapped = new Error(
      isConnectionFailure(err)
        ? `Database connection failed: ${err.message}`
        : `Database query failed: ${err.message}`
    );
    wrapped.name = 'DatabaseError';
    wrapped.cause = err;
    if (err.code) wrapped.code = err.code;
    if (isConnectionFailure(err)) wrapped.isConnectionFailure = true;
    throw wrapped;
  }
}

/**
 * Verify connectivity (e.g. at startup or for health checks).
 * @returns {Promise<void>}
 */
async function ping() {
  await query('SELECT 1 AS ok');
}

/**
 * Close the pool gracefully (e.g. on SIGTERM before exit).
 * @returns {Promise<void>}
 */
async function closePool() {
  if (!pool) return;
  const current = pool;
  pool = undefined;
  await current.end();
}

module.exports = {
  getPool,
  query,
  ping,
  closePool,
};

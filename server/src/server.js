const path = require('path');
const http = require('http');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const { ping, closePool } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const memberRoutes = require('./routes/memberRoutes');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');

const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors({
    origin:
      corsOrigin === '*'
        ? true
        : corsOrigin
          ? corsOrigin.split(',').map((s) => s.trim())
          : true,
    credentials: process.env.CORS_CREDENTIALS === 'true',
  })
);

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));


app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
  });
});


app.get('/health/ready', async (req, res, next) => {
  try {
    await ping();
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/projects/:projectId/members', memberRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
  });
});

app.use(errorHandler);

const server = http.createServer(app);

startServer().catch((err) => {
  console.error('Fatal: server failed to start', err);
  process.exit(1);
});

async function startServer() {
  await verifyPostgresAtStartup();

  await new Promise((resolve, reject) => {
    const onListenError = (listenErr) => {
      reject(listenErr);
    };
    server.once('error', onListenError);
    server.listen(PORT, () => {
      server.removeListener('error', onListenError);
      console.log(
        `HTTP server listening on port ${PORT} (${isProd ? 'production' : 'development'})`
      );
      resolve();
    });
  });
}

async function verifyPostgresAtStartup() {
  try {
    await ping();
    console.log('[db] PostgreSQL connection successful (pool verified)');
  } catch (err) {
    const root = err.cause ?? err;
    console.error('[db] PostgreSQL connection failed at startup', {
      message: err.message,
      ...(root !== err && { causeMessage: root.message }),
      ...(root.code && { code: root.code }),
    });
  }
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (
    err.type === 'entity.parse.failed' ||
    (err instanceof SyntaxError && 'body' in err)
  ) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const status = resolveHttpStatus(err);
  const exposeMessage = !isProd || status < 500;

  const payload = {
    error: exposeMessage ? err.message : http.STATUS_CODES[status] || 'Error',
  };

  if (err.details !== undefined && err.details !== null) {
    payload.details = err.details;
  }

  if (!isProd && err.stack) {
    payload.stack = err.stack;
  }

  if (status >= 500) {
    console.error('[request error]', {
      status,
      path: req.originalUrl,
      method: req.method,
      message: err.message,
      ...(err.code && { code: err.code }),
    });
  }

  res.status(status).json(payload);
}

function resolveHttpStatus(err) {
  const n = Number(err.status ?? err.statusCode);
  if (Number.isFinite(n) && n >= 400 && n < 600) {
    return n;
  }
  if (err.name === 'DatabaseError') {
    return err.isConnectionFailure ? 503 : 500;
  }
  return 500;
}

async function shutdown(signal) {
  console.log(`${signal}: shutting down gracefully`);
  await new Promise((resolve, reject) => {
    server.close((closeErr) => (closeErr ? reject(closeErr) : resolve()));
  });
  await closePool();
  process.exit(0);
}

['SIGTERM', 'SIGINT'].forEach((signal) => {
  process.on(signal, () => {
    shutdown(signal).catch((err) => {
      console.error('Shutdown error', err);
      process.exit(1);
    });
  });
});

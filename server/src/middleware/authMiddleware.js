const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/AppError');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('Authentication is not configured on this server.', 500);
  }
  return secret;
}


function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(/\s+/);
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new AppError('Authentication required.', 401);
    }

    const payload = jwt.verify(token, getJwtSecret(), {
      issuer: 'devsync',
      audience: 'devsync-api',
    });

    const userId = payload.sub;
    if (!userId || typeof userId !== 'string') {
      throw new AppError('Invalid token payload.', 401);
    }

    req.auth = {
      userId,
      email: typeof payload.email === 'string' ? payload.email : undefined,
    };
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    if (err.name === 'TokenExpiredError') {
      next(new AppError('Token expired.', 401));
      return;
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
      next(new AppError('Invalid or malformed token.', 401));
      return;
    }
    next(err);
  }
}

module.exports = {
  requireAuth,
};

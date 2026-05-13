const authService = require('../services/authService');
const { AppError } = require('../utils/AppError');

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function collectSignupErrors(body) {
  /** @type {Record<string, string[]>} */
  const fields = {};

  const emailRaw = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!emailRaw) {
    fields.email = fields.email || [];
    fields.email.push('Email is required.');
  } else if (emailRaw.length > 320) {
    fields.email = fields.email || [];
    fields.email.push('Email must be at most 320 characters.');
  } else if (!EMAIL_RE.test(emailRaw)) {
    fields.email = fields.email || [];
    fields.email.push('Email format is invalid.');
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) {
    fields.password = fields.password || [];
    fields.password.push('Password is required.');
  } else if (password.length < 8) {
    fields.password = fields.password || [];
    fields.password.push('Password must be at least 8 characters.');
  } else if (password.length > 72) {
    fields.password = fields.password || [];
    fields.password.push('Password must be at most 72 characters.');
  }

  const displayRaw = typeof body.display_name === 'string' ? body.display_name.trim() : '';
  if (!displayRaw) {
    fields.display_name = fields.display_name || [];
    fields.display_name.push('Display name is required.');
  } else if (displayRaw.length > 120) {
    fields.display_name = fields.display_name || [];
    fields.display_name.push('Display name must be at most 120 characters.');
  }

  return { fields, emailRaw, password, display_name: displayRaw };
}

function collectLoginErrors(body) {
  /** @type {Record<string, string[]>} */
  const fields = {};

  const emailRaw = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!emailRaw) {
    fields.email = fields.email || [];
    fields.email.push('Email is required.');
  } else if (!EMAIL_RE.test(emailRaw)) {
    fields.email = fields.email || [];
    fields.email.push('Email format is invalid.');
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) {
    fields.password = fields.password || [];
    fields.password.push('Password is required.');
  }

  return { fields, emailRaw, password };
}

async function signup(req, res) {
  const { fields, emailRaw, password, display_name } = collectSignupErrors(req.body);
  if (Object.keys(fields).length > 0) {
    throw new AppError('Validation failed.', 422, { fields });
  }

  const result = await authService.signup({
    email: emailRaw,
    password,
    display_name,
  });

  res.status(201).json({
    user: result.user,
    token: result.token,
  });
}

async function login(req, res) {
  const { fields, emailRaw, password } = collectLoginErrors(req.body);
  if (Object.keys(fields).length > 0) {
    throw new AppError('Validation failed.', 422, { fields });
  }

  const result = await authService.login({
    email: emailRaw,
    password,
  });

  res.json({
    user: result.user,
    token: result.token,
  });
}

async function profile(req, res) {
  const user = await authService.getProfileById(req.auth.userId);
  if (!user) {
    throw new AppError('User not found.', 401);
  }
  res.json({ user });
}

module.exports = {
  signup,
  login,
  profile,
};

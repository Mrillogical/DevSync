const memberService = require('../services/memberService');
const { AppError } = require('../utils/AppError');
const { isUuid } = require('../middleware/roleMiddleware');

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function collectAddMemberErrors(body) {
  /** @type {Record<string, string[]>} */
  const fields = {};

  const emailRaw =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
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

  let role = 'member';
  if (body.role !== undefined && body.role !== null && body.role !== '') {
    if (typeof body.role !== 'string') {
      fields.role = fields.role || [];
      fields.role.push('role must be a string.');
    } else {
      const r = body.role.trim();
      if (!memberService.ROLES.has(r)) {
        fields.role = fields.role || [];
        fields.role.push(`role must be one of: ${[...memberService.ROLES].join(', ')}.`);
      } else {
        role = r;
      }
    }
  }

  return { fields, email: emailRaw, role };
}

async function list(req, res) {
  const members = await memberService.listMembers(req.project.id);
  res.json({ members });
}

async function add(req, res) {
  const parsed = collectAddMemberErrors(req.body);
  if (Object.keys(parsed.fields).length > 0) {
    throw new AppError('Validation failed.', 422, { fields: parsed.fields });
  }

  const member = await memberService.addMemberByEmail(
    req.project.id,
    parsed.email,
    parsed.role
  );

  res.status(201).json({ member });
}

async function remove(req, res) {
  const targetUserId = req.params.userId;
  if (!isUuid(targetUserId)) {
    throw new AppError('Invalid user ID.', 400);
  }

  await memberService.removeMember(
    req.project.id,
    targetUserId,
    req.auth.userId
  );
  res.status(204).send();
}

module.exports = {
  list,
  add,
  remove,
};

/**
 * ============================================================================
 * ADPOWRS DIGITAL ERP — AUTHENTICATION & 4-ROLE RBAC
 * Roles: ADMIN | ACCOUNTANT | MEDIA_BUYER | TEAM
 * ============================================================================
 */

const VALID_ROLES = ['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER', 'TEAM'];
const SESSION_TTL_HOURS = 24 * 30; // 30 days session persistence

function hashPassword_(password, salt) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + '::adpowrs::' + password,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b) {
    const v = b < 0 ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function sanitizeUser_(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone || '',
    active: u.active === true || String(u.active).toLowerCase() === 'true',
    createdAt: u.createdAt
  };
}

function createSession_(user) {
  const token = generateToken_();
  const payload = {
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    expiresAt: Date.now() + SESSION_TTL_HOURS * 3600 * 1000
  };
  const json = JSON.stringify(payload);
  // Store in ScriptProperties (persistent) + CacheService (fast)
  PropertiesService.getScriptProperties().setProperty('sess_' + token, json);
  CacheService.getScriptCache().put('sess_' + token, json, 21600);
  return token;
}

function verifySession_(token) {
  if (!token) return null;
  const key = 'sess_' + token;
  let raw = CacheService.getScriptCache().get(key);
  if (!raw) {
    raw = PropertiesService.getScriptProperties().getProperty(key);
    if (raw) {
      CacheService.getScriptCache().put(key, raw, 21600);
    }
  }
  if (!raw) return null;
  const sess = safeJsonParse_(raw, null);
  if (!sess || sess.expiresAt < Date.now()) {
    destroySession_(token);
    return null;
  }
  const user = dbGetById_('Users', sess.userId);
  if (!user || !(user.active === true || String(user.active).toLowerCase() === 'true')) {
    return null;
  }
  return sanitizeUser_(user);
}

function destroySession_(token) {
  if (!token) return;
  const key = 'sess_' + token;
  PropertiesService.getScriptProperties().deleteProperty(key);
  CacheService.getScriptCache().remove(key);
}

function requireRole_(user, allowedRoles) {
  if (!user) throw new Error('UNAUTHORIZED: Authentication required');
  if (allowedRoles.indexOf(user.role) === -1) {
    throw new Error('FORBIDDEN: Insufficient permissions for role ' + user.role);
  }
}

function handleLogin_(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  if (!email || !password) throw new Error('Email and password are required');

  const users = dbGetAll_('Users', true);
  const found = users.find(function(u) {
    return String(u.email || '').trim().toLowerCase() === email;
  });
  if (!found) throw new Error('Invalid email or password');

  const isActive = found.active === true || String(found.active).toLowerCase() === 'true';
  if (!isActive) throw new Error('Account is disabled. Contact Admin.');

  const expected = hashPassword_(password, String(found.salt || ''));
  if (expected !== String(found.passwordHash || '')) {
    throw new Error('Invalid email or password');
  }

  const safeUser = sanitizeUser_(found);
  const token = createSession_(safeUser);
  const settings = getPublicSettings_();
  return { token: token, user: safeUser, settings: settings };
}

function handleChangePassword_(user, payload) {
  const currentPassword = String(payload.currentPassword || '');
  const newPassword = String(payload.newPassword || '');
  if (newPassword.length < 6) throw new Error('New password must be at least 6 characters');

  const fullUser = dbGetById_('Users', user.id);
  if (!fullUser) throw new Error('User not found');

  const check = hashPassword_(currentPassword, String(fullUser.salt || ''));
  if (check !== String(fullUser.passwordHash || '')) {
    throw new Error('Current password is incorrect');
  }

  const nextSalt = Utilities.getUuid();
  const nextHash = hashPassword_(newPassword, nextSalt);
  dbUpdate_('Users', user.id, {
    salt: nextSalt,
    passwordHash: nextHash,
    updatedAt: new Date().toISOString()
  });
  return { updated: true };
}

function handleListUsers_(user) {
  // ADMIN sees full user list; MEDIA_BUYER & ACCOUNTANT & TEAM get lightweight directory for task assignment
  const users = dbGetAll_('Users').map(sanitizeUser_);
  if (user.role === 'ADMIN') return { users: users };
  return {
    users: users.filter(function(u) { return u.active; }).map(function(u) {
      return { id: u.id, name: u.name, role: u.role };
    })
  };
}

function handleCreateUser_(user, payload) {
  requireRole_(user, ['ADMIN']);
  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  const role = String(payload.role || 'TEAM').toUpperCase();

  if (!name || !email || password.length < 6) {
    throw new Error('Name, email, and password (min 6 chars) are required');
  }
  if (VALID_ROLES.indexOf(role) === -1) throw new Error('Invalid role');

  const exists = dbGetAll_('Users', true).some(function(u) {
    return String(u.email || '').trim().toLowerCase() === email;
  });
  if (exists) throw new Error('Email already exists');

  const now = new Date().toISOString();
  const salt = Utilities.getUuid();
  const record = {
    id: generateId_('usr'),
    name: name,
    email: email,
    passwordHash: hashPassword_(password, salt),
    salt: salt,
    role: role,
    phone: String(payload.phone || ''),
    active: true,
    createdAt: now,
    updatedAt: now
  };
  dbInsert_('Users', record);
  logActivity_('USER', record.id, '', 'USER_CREATED', 'Created user ' + name + ' (' + role + ')', user);
  return { user: sanitizeUser_(record) };
}

function handleUpdateUser_(user, payload) {
  const targetId = payload.id || user.id;
  if (targetId !== user.id) {
    requireRole_(user, ['ADMIN']);
  }
  const existing = dbGetById_('Users', targetId);
  if (!existing) throw new Error('User not found');

  const patch = { updatedAt: new Date().toISOString() };
  if (payload.name !== undefined) patch.name = String(payload.name).trim();
  if (payload.phone !== undefined) patch.phone = String(payload.phone).trim();

  if (user.role === 'ADMIN') {
    if (payload.role && VALID_ROLES.indexOf(payload.role) !== -1) patch.role = payload.role;
    if (payload.active !== undefined) patch.active = Boolean(payload.active);
    if (payload.password && String(payload.password).length >= 6) {
      const salt = Utilities.getUuid();
      patch.salt = salt;
      patch.passwordHash = hashPassword_(String(payload.password), salt);
    }
  }

  const updated = dbUpdate_('Users', targetId, patch);
  return { user: sanitizeUser_(updated) };
}

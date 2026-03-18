const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const roleService = require('./RoleServices');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PERMISSION_CATALOG = [
  { module: 'dashboard', permission_name: 'dashboard.view' },
  { module: 'dashboard', permission_name: 'analytics.view' },

  { module: 'categories', permission_name: 'categories.view' },
  { module: 'categories', permission_name: 'categories.create' },
  { module: 'categories', permission_name: 'categories.update' },
  { module: 'categories', permission_name: 'categories.delete' },

  { module: 'products', permission_name: 'products.view' },
  { module: 'products', permission_name: 'products.create' },
  { module: 'products', permission_name: 'products.update' },
  { module: 'products', permission_name: 'products.delete' },

  { module: 'inventory', permission_name: 'inventory.view' },
  { module: 'inventory', permission_name: 'inventory.update' },

  { module: 'suppliers', permission_name: 'suppliers.view' },
  { module: 'suppliers', permission_name: 'suppliers.create' },
  { module: 'suppliers', permission_name: 'suppliers.update' },
  { module: 'suppliers', permission_name: 'suppliers.delete' },

  { module: 'supplier-payments', permission_name: 'supplier-payments.view' },
  { module: 'supplier-payments', permission_name: 'supplier-payments.create' },

  { module: 'purchases', permission_name: 'purchases.view' },
  { module: 'purchases', permission_name: 'purchases.create' },
  { module: 'purchases', permission_name: 'purchases.update' },
  { module: 'purchases', permission_name: 'purchases.delete' },

  { module: 'customers', permission_name: 'customers.view' },
  { module: 'customers', permission_name: 'customers.create' },
  { module: 'customers', permission_name: 'customers.update' },
  { module: 'customers', permission_name: 'customers.delete' },

  { module: 'sponsors', permission_name: 'sponsors.view' },
  { module: 'sponsors', permission_name: 'sponsors.create' },
  { module: 'sponsors', permission_name: 'sponsors.update' },
  { module: 'sponsors', permission_name: 'sponsors.delete' },

  { module: 'customer-receipts', permission_name: 'customer-receipts.view' },
  { module: 'customer-receipts', permission_name: 'customer-receipts.create' },

  { module: 'sales', permission_name: 'sales.view' },
  { module: 'sales', permission_name: 'sales.create' },
  { module: 'sales', permission_name: 'sales.update' },
  { module: 'sales', permission_name: 'sales.delete' },

  { module: 'expense-types', permission_name: 'expense-types.view' },
  { module: 'expense-types', permission_name: 'expense-types.create' },
  { module: 'expense-types', permission_name: 'expense-types.update' },
  { module: 'expense-types', permission_name: 'expense-types.delete' },

  { module: 'expense-bills', permission_name: 'expense-bills.view' },
  { module: 'expense-bills', permission_name: 'expense-bills.create' },
  { module: 'expense-bills', permission_name: 'expense-bills.update' },
  { module: 'expense-bills', permission_name: 'expense-bills.delete' },

  { module: 'expense-payments', permission_name: 'expense-payments.view' },
  { module: 'expense-payments', permission_name: 'expense-payments.create' },
  { module: 'expense-payments', permission_name: 'expense-payments.update' },
  { module: 'expense-payments', permission_name: 'expense-payments.delete' },

  { module: 'company-profile', permission_name: 'company-profile.view' },
  { module: 'company-profile', permission_name: 'company-profile.update' },
  { module: 'transaction-closing', permission_name: 'transaction-closing.view' },
  { module: 'cash-deposits', permission_name: 'cash-deposits.view' },

  { module: 'users', permission_name: 'users.view' },
  { module: 'users', permission_name: 'users.create' },
  { module: 'users', permission_name: 'users.update' },
  { module: 'users', permission_name: 'users.delete' },

  { module: 'roles', permission_name: 'roles.view' },
  { module: 'roles', permission_name: 'roles.create' },
  { module: 'roles', permission_name: 'roles.update' },
  { module: 'roles', permission_name: 'roles.delete' },

  { module: 'permissions', permission_name: 'permissions.view' },
  { module: 'permissions', permission_name: 'permissions.update' },

  { module: 'reports', permission_name: 'reports.view' },
  { module: 'settings', permission_name: 'settings.view' },
];

const ROLE_DEFAULTS = {
  Admin: 'ALL',
  Finance: [
    'dashboard.view',
    'analytics.view',
    'reports.view',
    'purchases.view',
    'suppliers.view',
    'supplier-payments.view',
    'expense-types.view',
    'expense-types.create',
    'expense-types.update',
    'expense-bills.view',
    'expense-bills.create',
    'expense-bills.update',
    'expense-payments.view',
    'expense-payments.create',
    'expense-payments.update',
    'expense-payments.delete',
    'company-profile.view',
    'transaction-closing.view',
    'cash-deposits.view',
  ],
  Receipt: [
    'dashboard.view',
    'analytics.view',
    'customers.view',
    'customer-receipts.view',
    'customer-receipts.create',
    'sales.view',
    'sales.create',
    'expense-payments.view',
    'expense-payments.create',
  ],
};

const formatLabel = (key) => {
  const [resource, action] = String(key).split('.');
  const titleResource = resource
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  const titleAction = action
    ? action.charAt(0).toUpperCase() + action.slice(1)
    : 'Access';
  return `${titleAction} ${titleResource}`;
};

const ensureAccessControlSchema = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS user_permission_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      use_custom BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS user_permissions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      granted BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, permission_id)
    )
  `);
};

const ensurePermissionCatalog = async () => {
  for (const permission of PERMISSION_CATALOG) {
    await prisma.$executeRaw`
      INSERT INTO permissions (module, permission_name)
      SELECT ${permission.module}, ${permission.permission_name}
      WHERE NOT EXISTS (
        SELECT 1
        FROM permissions
        WHERE LOWER(permission_name) = LOWER(${permission.permission_name})
      )
    `;
  }
};

const getAllPermissions = async () => {
  return prisma.$queryRaw`
    SELECT id, module, permission_name
    FROM permissions
    ORDER BY module ASC, permission_name ASC, id ASC
  `;
};

const ensureRolePermissionDefaults = async () => {
  await roleService.ensureCoreRoles();
  await ensurePermissionCatalog();

  const roles = await prisma.$queryRaw`
    SELECT id, role_name
    FROM roles
  `;

  const permissions = await getAllPermissions();
  const permissionIdsByName = new Map(permissions.map((p) => [String(p.permission_name).toLowerCase(), Number(p.id)]));

  for (const role of roles) {
    const roleName = String(role.role_name || '');
    const defaults = ROLE_DEFAULTS[roleName];
    if (!defaults) {
      continue;
    }

    const desiredPermissionIds = defaults === 'ALL'
      ? permissions.map((permission) => Number(permission.id))
      : defaults
          .map((permissionName) => permissionIdsByName.get(String(permissionName).toLowerCase()))
          .filter((id) => Number.isFinite(id));

    for (const permissionId of desiredPermissionIds) {
      await prisma.$executeRaw`
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT ${Number(role.id)}, ${Number(permissionId)}
        WHERE NOT EXISTS (
          SELECT 1
          FROM role_permissions
          WHERE role_id = ${Number(role.id)}
            AND permission_id = ${Number(permissionId)}
        )
      `;
    }
  }
};

const getRolePermissionIds = async (roleId) => {
  const rows = await prisma.$queryRaw`
    SELECT permission_id
    FROM role_permissions
    WHERE role_id = ${Number(roleId)}
  `;

  return rows.map((row) => Number(row.permission_id)).filter((id) => Number.isFinite(id));
};

const getUserCustomProfile = async (userId) => {
  const rows = await prisma.$queryRaw`
    SELECT use_custom
    FROM user_permission_profiles
    WHERE user_id = ${Number(userId)}
    LIMIT 1
  `;

  return rows[0] || null;
};

const getUserCustomPermissionIds = async (userId) => {
  const rows = await prisma.$queryRaw`
    SELECT permission_id
    FROM user_permissions
    WHERE user_id = ${Number(userId)}
      AND granted = true
  `;

  return rows.map((row) => Number(row.permission_id)).filter((id) => Number.isFinite(id));
};

const getUserWithRole = async (userId) => {
  const rows = await prisma.$queryRaw`
    SELECT u.id, u.name, u.role_id, r.role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = ${Number(userId)}
    LIMIT 1
  `;

  return rows[0] || null;
};

const getEffectivePermissionDataForUser = async (userId) => {
  await ensureAccessControlSchema();
  await ensureRolePermissionDefaults();

  const user = await getUserWithRole(userId);
  if (!user) {
    return null;
  }

  const permissions = await getAllPermissions();
  const profile = await getUserCustomProfile(userId);
  const useCustom = Boolean(profile && profile.use_custom);

  let effectivePermissionIds = [];
  if (useCustom) {
    effectivePermissionIds = await getUserCustomPermissionIds(userId);
  } else {
    effectivePermissionIds = await getRolePermissionIds(user.role_id);
  }

  const effectiveIdSet = new Set(effectivePermissionIds);
  const effectivePermissionNames = permissions
    .filter((permission) => effectiveIdSet.has(Number(permission.id)))
    .map((permission) => String(permission.permission_name));

  return {
    user: {
      id: Number(user.id),
      name: String(user.name || ''),
      role_id: Number(user.role_id),
      role_name: String(user.role_name || ''),
    },
    use_custom: useCustom,
    permission_ids: [...effectiveIdSet],
    permission_names: effectivePermissionNames,
  };
};

const getPermissionMatrixForUser = async (userId) => {
  await ensureAccessControlSchema();
  await ensureRolePermissionDefaults();

  const user = await getUserWithRole(userId);
  if (!user) {
    return null;
  }

  const permissions = await getAllPermissions();
  const profile = await getUserCustomProfile(userId);
  const useCustom = Boolean(profile && profile.use_custom);

  const rolePermissionIds = new Set(await getRolePermissionIds(user.role_id));
  const customPermissionIds = new Set(await getUserCustomPermissionIds(userId));

  const selectedIds = useCustom ? customPermissionIds : rolePermissionIds;

  const groupedMap = new Map();
  for (const permission of permissions) {
    const moduleName = String(permission.module || 'general');
    if (!groupedMap.has(moduleName)) {
      groupedMap.set(moduleName, []);
    }

    const permissionId = Number(permission.id);
    const selected = selectedIds.has(permissionId);
    groupedMap.get(moduleName).push({
      id: permissionId,
      permission_name: String(permission.permission_name),
      label: formatLabel(permission.permission_name),
      selected,
      source: useCustom ? (customPermissionIds.has(permissionId) ? 'user' : 'none') : (rolePermissionIds.has(permissionId) ? 'role' : 'none'),
    });
  }

  const modules = Array.from(groupedMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([module, modulePermissions]) => ({
      module,
      permissions: modulePermissions,
    }));

  return {
    user: {
      id: Number(user.id),
      name: String(user.name || ''),
      role_id: Number(user.role_id),
      role_name: String(user.role_name || ''),
    },
    use_custom: useCustom,
    modules,
  };
};

const getPermissionCatalog = async () => {
  await ensureAccessControlSchema();
  await ensureRolePermissionDefaults();

  const permissions = await getAllPermissions();
  const groupedMap = new Map();

  for (const permission of permissions) {
    const moduleName = String(permission.module || 'general');
    if (!groupedMap.has(moduleName)) {
      groupedMap.set(moduleName, []);
    }

    groupedMap.get(moduleName).push({
      id: Number(permission.id),
      permission_name: String(permission.permission_name),
      label: formatLabel(permission.permission_name),
    });
  }

  return Array.from(groupedMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([module, modulePermissions]) => ({
      module,
      permissions: modulePermissions,
    }));
};

const saveUserCustomPermissions = async (userId, permissionIds, useCustom = true) => {
  await ensureAccessControlSchema();
  await ensureRolePermissionDefaults();

  const user = await getUserWithRole(userId);
  if (!user) {
    const error = new Error('User not found');
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  const sanitizedIds = Array.from(new Set((permissionIds || [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0)));

  const validRows = sanitizedIds.length > 0
    ? await prisma.$queryRaw`
      SELECT id
      FROM permissions
      WHERE id = ANY(${sanitizedIds})
    `
    : [];

  const validIdSet = new Set(validRows.map((row) => Number(row.id)));
  const validPermissionIds = sanitizedIds.filter((id) => validIdSet.has(id));

  await prisma.$executeRaw`
    INSERT INTO user_permission_profiles (user_id, use_custom, updated_at)
    VALUES (${Number(userId)}, ${Boolean(useCustom)}, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      use_custom = EXCLUDED.use_custom,
      updated_at = NOW()
  `;

  await prisma.$executeRaw`
    DELETE FROM user_permissions
    WHERE user_id = ${Number(userId)}
  `;

  if (Boolean(useCustom)) {
    for (const permissionId of validPermissionIds) {
      await prisma.$executeRaw`
        INSERT INTO user_permissions (user_id, permission_id, granted)
        VALUES (${Number(userId)}, ${Number(permissionId)}, true)
      `;
    }
  }

  return {
    user_id: Number(userId),
    use_custom: Boolean(useCustom),
    permission_ids: validPermissionIds,
  };
};

const getRolePermissionMatrix = async (roleId) => {
  await ensureAccessControlSchema();
  await ensureRolePermissionDefaults();

  const role = await roleService.getRoleById(roleId);
  if (!role) {
    return null;
  }

  const permissions = await getAllPermissions();
  const rolePermissionIds = new Set(await getRolePermissionIds(roleId));

  const groupedMap = new Map();
  for (const permission of permissions) {
    const moduleName = String(permission.module || 'general');
    if (!groupedMap.has(moduleName)) {
      groupedMap.set(moduleName, []);
    }

    const permissionId = Number(permission.id);
    groupedMap.get(moduleName).push({
      id: permissionId,
      permission_name: String(permission.permission_name),
      label: formatLabel(permission.permission_name),
      selected: rolePermissionIds.has(permissionId),
    });
  }

  const modules = Array.from(groupedMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([module, modulePermissions]) => ({
      module,
      permissions: modulePermissions,
    }));

  return {
    role: {
      id: Number(role.id),
      role_name: String(role.role_name || ''),
      description: role.description || null,
    },
    modules,
  };
};

const saveRolePermissions = async (roleId, permissionIds) => {
  await ensureAccessControlSchema();
  await ensureRolePermissionDefaults();

  const role = await roleService.getRoleById(roleId);
  if (!role) {
    const error = new Error('Role not found');
    error.code = 'ROLE_NOT_FOUND';
    throw error;
  }

  const roleName = String(role.role_name || '').toLowerCase();
  if (roleName === 'admin') {
    const error = new Error('Admin role always has all permissions and cannot be restricted');
    error.code = 'ADMIN_ROLE_LOCKED';
    throw error;
  }

  const sanitizedIds = Array.from(new Set((permissionIds || [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0)));

  const validRows = sanitizedIds.length > 0
    ? await prisma.$queryRaw`
      SELECT id
      FROM permissions
      WHERE id = ANY(${sanitizedIds})
    `
    : [];

  const validIdSet = new Set(validRows.map((row) => Number(row.id)));
  const validPermissionIds = sanitizedIds.filter((id) => validIdSet.has(id));

  await prisma.$executeRaw`
    DELETE FROM role_permissions
    WHERE role_id = ${Number(roleId)}
  `;

  for (const permissionId of validPermissionIds) {
    await prisma.$executeRaw`
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (${Number(roleId)}, ${Number(permissionId)})
    `;
  }

  return {
    role_id: Number(roleId),
    permission_ids: validPermissionIds,
  };
};

const createModulePermissions = async (payload) => {
  await ensureAccessControlSchema();
  await ensureRolePermissionDefaults();

  const moduleKey = String(payload?.module || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  if (!moduleKey) {
    const error = new Error('module is required');
    error.code = 'INVALID_MODULE';
    throw error;
  }

  const actions = Array.from(new Set((payload?.actions || [])
    .map((action) => String(action || '').trim().toLowerCase())
    .filter(Boolean)));

  if (actions.length === 0) {
    const error = new Error('actions are required');
    error.code = 'INVALID_ACTIONS';
    throw error;
  }

  const created = [];
  for (const action of actions) {
    const permissionName = `${moduleKey}.${action}`;
    await prisma.$executeRaw`
      INSERT INTO permissions (module, permission_name)
      SELECT ${moduleKey}, ${permissionName}
      WHERE NOT EXISTS (
        SELECT 1
        FROM permissions
        WHERE LOWER(permission_name) = LOWER(${permissionName})
      )
    `;
    created.push(permissionName);
  }

  return {
    module: moduleKey,
    created_permissions: created,
  };
};

module.exports = {
  ensureAccessControlSchema,
  ensurePermissionCatalog,
  ensureRolePermissionDefaults,
  getPermissionCatalog,
  getEffectivePermissionDataForUser,
  getPermissionMatrixForUser,
  saveUserCustomPermissions,
  getRolePermissionMatrix,
  saveRolePermissions,
  createModulePermissions,
};

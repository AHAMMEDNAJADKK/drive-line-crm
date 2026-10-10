/**
 * Role helpers.
 *
 * Active CRM roles are admin, hr, and employee.
 */

const SUPER_ADMIN_ROLES = ['superadmin'];
const ADMIN_ROLES = ['admin'];
const ALL_ADMIN_ROLES = ['superadmin', 'admin'];
const HR_ROLES = ['hr'];
const STAFF_ROLES = ['superadmin', 'admin', 'hr', 'employee'];
const PRIVILEGED_ROLES = ['superadmin', 'admin', 'hr'];

const isSuperAdmin = (user) => Boolean(user && user.role === 'superadmin');

const isAdmin = (user) => Boolean(user && ADMIN_ROLES.includes(user.role));

const isAnyAdmin = (user) =>
  Boolean(user && ALL_ADMIN_ROLES.includes(user.role));

const isHrStaff = (user) => Boolean(user && HR_ROLES.includes(user.role));

const isPrivileged = (user) =>
  Boolean(user && PRIVILEGED_ROLES.includes(user.role));

const isEmployee = (user) => Boolean(user && user.role === 'employee');

module.exports = {
  SUPER_ADMIN_ROLES,
  ADMIN_ROLES,
  ALL_ADMIN_ROLES,
  HR_ROLES,
  STAFF_ROLES,
  PRIVILEGED_ROLES,
  isSuperAdmin,
  isAdmin,
  isAnyAdmin,
  isHrStaff,
  isPrivileged,
  isEmployee
};

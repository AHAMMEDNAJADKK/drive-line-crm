/**
 * Role helpers.
 *
 * Active CRM roles are admin, hr, and employee.
 */

const ADMIN_ROLES = ['admin'];
const HR_ROLES = ['hr'];
const STAFF_ROLES = ['admin', 'hr', 'employee'];
const PRIVILEGED_ROLES = ['admin', 'hr'];

const isAdmin = (user) => Boolean(user && ADMIN_ROLES.includes(user.role));

const isHrStaff = (user) => Boolean(user && HR_ROLES.includes(user.role));

const isPrivileged = (user) =>
  Boolean(user && PRIVILEGED_ROLES.includes(user.role));

const isEmployee = (user) => Boolean(user && user.role === 'employee');

module.exports = {
  ADMIN_ROLES,
  HR_ROLES,
  STAFF_ROLES,
  PRIVILEGED_ROLES,
  isAdmin,
  isHrStaff,
  isPrivileged,
  isEmployee
};

const { isAdmin, isHrStaff, isEmployee } = require('./roles');

/**
 * Extract clean string representation of a branch ID from an ObjectId or populated branch object.
 */
const getBranchIdString = (branchRef) => {
  if (!branchRef) return null;
  if (typeof branchRef === 'object' && branchRef._id) {
    return branchRef._id.toString();
  }
  return branchRef.toString();
};

/**
 * Get the branch ID for a user.
 */
const getUserBranchId = (user) => {
  if (!user || !user.branchId) return null;
  return getBranchIdString(user.branchId);
};

/**
 * Check if user has access to a specific branch.
 * Admin has access to all branches.
 * HR and Employees only have access to their assigned branch.
 */
const hasBranchAccess = (branchRef, user) => {
  if (!user) return false;
  if (isAdmin(user)) return true;

  const userBranch = getUserBranchId(user);
  if (!userBranch) return false;

  const targetBranch = getBranchIdString(branchRef);
  return Boolean(targetBranch && targetBranch === userBranch);
};

/**
 * Assert that a user has access to a resource associated with a branch.
 * Throws 403 Error if access is denied.
 */
const assertBranchAccess = (branchRef, user, action = 'access') => {
  if (!user) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }

  // Admins have unrestricted access to all branch data
  if (isAdmin(user)) {
    return;
  }

  const userBranch = getUserBranchId(user);
  if (!userBranch) {
    const error = new Error('Your account is not assigned to any branch. Please contact an administrator.');
    error.statusCode = 403;
    throw error;
  }

  const targetBranch = getBranchIdString(branchRef);

  if (!targetBranch || targetBranch !== userBranch) {
    const error = new Error(`Forbidden: You are not authorized to ${action} data from another branch.`);
    error.statusCode = 403;
    throw error;
  }
};

/**
 * Helper to build a MongoDB branch filter condition based on user role and optional filter param.
 *
 * For Admin:
 *   - If requestedBranchId is provided and valid (not 'all', not empty), filters by that branch.
 *   - If requestedBranchId is 'unassigned', filters by { $or: [{ branchId: null }, { branchId: { $exists: false } }] }
 *   - Otherwise returns empty filter (all branches).
 *
 * For HR / Employee:
 *   - Enforces user's assigned branchId strictly, ignoring any requested branchId from client.
 */
const getBranchFilter = (user, requestedBranchId) => {
  if (!user) return { branchId: null };

  if (isAdmin(user)) {
    if (requestedBranchId === 'unassigned') {
      return { $or: [{ branchId: null }, { branchId: { $exists: false } }] };
    }
    if (requestedBranchId && requestedBranchId !== 'all' && requestedBranchId !== '') {
      return { branchId: requestedBranchId };
    }
    return {};
  }

  // HR and Employee are strictly scoped to their branch
  const userBranch = getUserBranchId(user);
  if (!userBranch) {
    // If not assigned to any branch, match nothing safe
    return { branchId: null };
  }

  return { branchId: userBranch };
};

module.exports = {
  getBranchIdString,
  getUserBranchId,
  hasBranchAccess,
  assertBranchAccess,
  getBranchFilter
};

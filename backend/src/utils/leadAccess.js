const { isEmployee, isAdmin, isHrStaff } = require('./roles');
const { assertBranchAccess } = require('./branchAccess');

const assignedToId = (lead) => {
  if (!lead || !lead.assignedTo) return null;
  if (typeof lead.assignedTo === 'object' && lead.assignedTo._id) {
    return lead.assignedTo._id.toString();
  }
  return lead.assignedTo.toString();
};

const employeeOwnsLead = (lead, user) => {
  if (!lead || !user) return false;
  const assignee = assignedToId(lead);
  return Boolean(assignee && assignee === user._id.toString());
};

/**
 * Access control for a lead:
 * 1. Admin has access across all branches.
 * 2. HR has access only to leads within their assigned branch.
 * 3. Employees have access only to leads within their assigned branch that are assigned to them.
 */
const assertLeadAccess = (lead, user, action = 'view') => {
  if (!lead || !user) {
    const error = new Error('Lead or user information missing');
    error.statusCode = 400;
    throw error;
  }

  // Branch level isolation check
  assertBranchAccess(lead.branchId, user, action);

  // Employee row-level assignment check
  if (isEmployee(user)) {
    if (!employeeOwnsLead(lead, user)) {
      const error = new Error(`Unauthorized to ${action} this lead`);
      error.statusCode = 403;
      throw error;
    }
  }
};

/**
 * Backward compatible alias for assertEmployeeLeadAccess
 */
const assertEmployeeLeadAccess = (lead, user, action = 'view') => {
  return assertLeadAccess(lead, user, action);
};

module.exports = {
  assignedToId,
  employeeOwnsLead,
  assertLeadAccess,
  assertEmployeeLeadAccess
};

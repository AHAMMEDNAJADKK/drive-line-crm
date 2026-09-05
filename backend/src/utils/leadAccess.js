const { isEmployee } = require('./roles');

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
 * Employees may only access leads assigned to them.
 * Admin keeps unrestricted lead access; employees are row-scoped.
 */
const assertEmployeeLeadAccess = (lead, user, action = 'view') => {
  if (!isEmployee(user)) return;

  if (!employeeOwnsLead(lead, user)) {
    const error = new Error(`Unauthorized to ${action} this lead`);
    error.statusCode = 403;
    throw error;
  }
};

module.exports = {
  assignedToId,
  employeeOwnsLead,
  assertEmployeeLeadAccess
};

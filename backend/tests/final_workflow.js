const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5001/api';

const request = async (path, options = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data };
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
};

const login = async (identifier, password) => {
  const result = await request('/auth/login', {
    method: 'POST',
    body: { identifier, password }
  });
  assert(result.status === 200 && result.data?.token, `${identifier} login`);
  return result.data;
};

const run = async () => {
  const admin = await login('admin@driveline.com', 'Admin@123');
  const hr = await login('hr@driveline.com', 'Hr@123456');
  const employeeA = await login('rahul@driveline.com', 'Employee@123');

  const adminToken = admin.token;
  const hrToken = hr.token;
  const employeeToken = employeeA.token;

  assert((await request('/dashboard/hr', { token: adminToken })).status === 403, 'Admin cannot open HR dashboard');
  assert((await request('/dashboard/hr', { token: employeeToken })).status === 403, 'Employee cannot open HR dashboard');
  assert((await request('/dashboard/hr', { token: hrToken })).status === 200, 'HR dashboard is available to HR');
  assert((await request('/dashboard', { token: hrToken })).status === 403, 'HR cannot open sales dashboard');

  const employeeAId = employeeA.user._id;
  const employeeAUpdate = await request(`/employees/${employeeAId}`, {
    method: 'PATCH',
    token: adminToken,
    body: { vehicleSpecialization: 'German', passportExpireDate: new Date(Date.now() + 15 * 86400000).toISOString() }
  });
  assert(employeeAUpdate.status === 200 && employeeAUpdate.data?.data?.vehicleSpecialization === 'German', 'Employee specialization persists');
  assert(Boolean(employeeAUpdate.data?.data?.passportExpireDate), 'Passport expiry persists as API date value');

  const employeeBEmail = `employee-b-${Date.now()}@driveline.test`;
  const employeeBResult = await request('/employees', {
    method: 'POST',
    token: adminToken,
    body: {
      name: 'Employee B Test',
      email: employeeBEmail,
      employeeId: `TESTB${Date.now()}`,
      password: 'EmployeeB@123',
      role: 'employee',
      vehicleSpecialization: 'Korean'
    }
  });
  assert(employeeBResult.status === 201, 'Admin can create Employee B');
  const employeeBId = employeeBResult.data.data._id;

  const supplierPrefix = Date.now();
  const testPhone = (prefix) => `${prefix}${String(supplierPrefix).slice(-6)}`;
  const germanSupplier = await request('/suppliers', {
    method: 'POST', token: adminToken,
    body: { name: `German Supplier ${supplierPrefix}`, phone: testPhone('9715'), vehicleSpecialization: 'German' }
  });
  const koreanSupplier = await request('/suppliers', {
    method: 'POST', token: adminToken,
    body: { name: `Korean Supplier ${supplierPrefix}`, phone: testPhone('9716'), vehicleSpecialization: 'Korean' }
  });
  const unclassifiedSupplier = await request('/suppliers', {
    method: 'POST', token: adminToken,
    body: { name: `Unclassified Supplier ${supplierPrefix}`, phone: testPhone('9717') }
  });
  assert(germanSupplier.status === 201 && koreanSupplier.status === 201 && unclassifiedSupplier.status === 201, 'Supplier specializations persist');

  const leadA = await request('/leads', {
    method: 'POST', token: adminToken,
    body: { mobileNumber: testPhone('9000'), customerName: 'Lead A Test' }
  });
  const leadB = await request('/leads', {
    method: 'POST', token: adminToken,
    body: { mobileNumber: testPhone('9001'), customerName: 'Lead B Test' }
  });
  assert(leadA.status === 201 && leadB.status === 201, 'Admin can create leads');
  const leadAId = leadA.data.data._id;
  const leadBId = leadB.data.data._id;

  assert((await request(`/leads/${leadAId}/assign`, { method: 'PATCH', token: adminToken, body: { assignedTo: employeeAId } })).status === 200, 'Admin assigns Lead A to Employee A');
  assert((await request(`/leads/${leadBId}/assign`, { method: 'PATCH', token: adminToken, body: { assignedTo: employeeBId } })).status === 200, 'Admin assigns Lead B to Employee B');

  const employeeLeads = await request('/leads', { token: employeeToken });
  assert(employeeLeads.status === 200 && employeeLeads.data.data.every((lead) => String(lead.assignedTo?._id || lead.assignedTo) === String(employeeAId)), 'Employee A sees only assigned leads');
  assert((await request(`/leads/${leadBId}`, { token: employeeToken })).status === 403, 'Employee A cannot view Employee B lead');
  assert((await request(`/leads/${leadBId}`, { method: 'PATCH', token: employeeToken, body: { customerName: 'Attack' } })).status === 403, 'Employee A cannot edit Employee B lead');
  assert((await request(`/leads/${leadBId}/status`, { method: 'PATCH', token: employeeToken, body: { status: 'Lost' } })).status === 403, 'Employee A cannot change Employee B status');
  assert((await request(`/leads/${leadBId}/activity`, { token: employeeToken })).status === 403, 'Employee A cannot view Employee B activity');
  assert((await request(`/leads/${leadBId}/followups`, { token: employeeToken })).status === 403, 'Employee A cannot view Employee B followups');

  for (const status of ['New', 'Contacted', 'Quotation', 'Followup', 'Converted', 'Lost']) {
    const statusResult = await request(`/leads/${leadAId}/status`, {
      method: 'PATCH', token: employeeToken, body: { status, lostReason: status === 'Lost' ? 'Test reason' : undefined }
    });
    assert(statusResult.status === 200 && statusResult.data.data.status === status, `Employee A can set own lead status to ${status}`);
  }
  assert((await request(`/leads/${leadAId}/activity`, { token: employeeToken })).status === 200, 'Lead activity remains available for owner');

  const employeeSupplierList = await request('/suppliers', { token: employeeToken });
  const supplierNames = (employeeSupplierList.data?.data || []).map((supplier) => supplier.name);
  assert(employeeSupplierList.status === 200 && supplierNames.includes(`German Supplier ${supplierPrefix}`), 'Employee sees matching German supplier');
  assert(!supplierNames.includes(`Korean Supplier ${supplierPrefix}`), 'Employee does not see unrelated Korean supplier');
  assert(supplierNames.includes(`Unclassified Supplier ${supplierPrefix}`), 'Existing unclassified supplier remains available');

  const notificationsFirst = await request('/notifications', { token: hrToken });
  const notificationsSecond = await request('/notifications', { token: hrToken });
  assert(notificationsFirst.status === 200 && notificationsFirst.data.data.some((item) => item.relatedEmployeeId === employeeAId), 'HR receives passport expiry notification');
  assert(notificationsSecond.status === 200 && notificationsSecond.data.data.length === notificationsFirst.data.data.length, 'Passport notification generation is idempotent');
  assert((await request('/notifications', { token: employeeToken })).status === 403, 'Employee cannot access HR notifications');

  assert((await request(`/leads/${leadAId}/status`, { method: 'PATCH', token: employeeToken, body: { status: 'Interested' } })).status === 400, 'Obsolete lead status is rejected');
  assert((await request('/leads', { token: employeeToken })).status === 200, 'Lead list API remains available to employee');

  console.log('FINAL_WORKFLOW_PASS');
};

run().catch((error) => {
  console.error(`FINAL_WORKFLOW_FAIL ${error.message}`);
  process.exitCode = 1;
});

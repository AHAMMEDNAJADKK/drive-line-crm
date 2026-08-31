const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.arrayBuffer();
  }

  return { status: response.status, ok: response.ok, data };
}

async function runTests() {
  console.log('🚀 Starting Full Drive Line CRM End-to-End Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health Check
    console.log('1. Testing Health Endpoint:');
    const health = await request('/health');
    assert(health.status === 200 && health.data.success === true, 'Health check returns success');

    // 2. Authentication
    console.log('\n2. Testing Authentication & RBAC Login:');
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { identifier: 'admin@driveline.com', password: 'Admin@123' },
    });
    assert(adminLogin.status === 200 && adminLogin.data.token, 'Admin login succeeds and returns JWT');
    const adminToken = adminLogin.data.token;

    const managerLogin = await request('/auth/login', {
      method: 'POST',
      body: { identifier: 'manager@driveline.com', password: 'Manager@123' },
    });
    assert(managerLogin.status === 200 && managerLogin.data.token, 'Manager login succeeds');
    const managerToken = managerLogin.data.token;

    const employeeLogin = await request('/auth/login', {
      method: 'POST',
      body: { identifier: 'rahul@driveline.com', password: 'Employee@123' },
    });
    assert(employeeLogin.status === 200 && employeeLogin.data.token, 'Employee login succeeds');
    const employeeToken = employeeLogin.data.token;
    const employeeUser = employeeLogin.data.user;

    const invalidLogin = await request('/auth/login', {
      method: 'POST',
      body: { identifier: 'admin@driveline.com', password: 'WrongPassword' },
    });
    assert(invalidLogin.status === 401, 'Invalid password is appropriately rejected with 401');

    // 3. Current User & Profile
    console.log('\n3. Testing User Profile:');
    const me = await request('/auth/me', { token: adminToken });
    assert(me.status === 200 && me.data.data.email === 'admin@driveline.com', 'GET /auth/me returns admin profile');

    // 4. RBAC Protection
    console.log('\n4. Testing RBAC Security Protections:');
    const empAccessEmployees = await request('/employees', { token: employeeToken });
    assert(empAccessEmployees.status === 403, 'Employee is forbidden (403) from accessing /employees list');

    // 5. Lead Lifecycle (Fast creation, Duplicate check, Full fields, Follow-up, Pipeline)
    console.log('\n5. Testing Lead Lifecycle & Duplicate Detection:');
    const testMobile = '9876500001';
    
    // Quick lead creation (mobile only)
    const quickLead = await request('/leads', {
      method: 'POST',
      token: employeeToken,
      body: { mobileNumber: testMobile },
    });
    assert(quickLead.status === 201 && quickLead.data.data._id, 'Quick lead created with mobile number only');
    const leadId = quickLead.data.data._id;

    // Check duplicate with different formatting: "+91 98765 00001"
    const dupCheck = await request(`/leads/check-duplicate?mobile=${encodeURIComponent('+91 98765 00001')}`, {
      token: employeeToken,
    });
    assert(
      dupCheck.status === 200 && dupCheck.data.isDuplicate === true,
      'Duplicate check successfully detects formatted mobile number (+91 98765 00001)'
    );

    // Update lead with complete specs
    const updateLead = await request(`/leads/${leadId}`, {
      method: 'PATCH',
      token: employeeToken,
      body: {
        customerName: 'Anil Auto Garage',
        vehicleMake: 'Toyota',
        vehicleModel: 'Innova Crysta',
        vehicleYear: '2021',
        partRequired: 'Front Brake Pads',
        partNumber: 'TYT-BP-881',
        priority: 'High',
        quantity: 2,
        remarks: 'Customer needs delivery by tomorrow afternoon',
      },
    });
    assert(updateLead.status === 200 && updateLead.data.data.vehicleMake === 'Toyota', 'Lead updated with vehicle and parts specs');

    // Lead assignment by Manager
    const assignLead = await request(`/leads/${leadId}/assign`, {
      method: 'PATCH',
      token: managerToken,
      body: { assignedTo: employeeUser._id },
    });
    assert(assignLead.status === 200, 'Manager can assign lead to Employee');

    // Add Follow-up
    const followup = await request(`/leads/${leadId}/followups`, {
      method: 'POST',
      token: employeeToken,
      body: {
        remarks: 'Called customer, sent quotation of Rs. 4,500 on WhatsApp',
        statusChangedTo: 'Quotation',
        nextFollowUpDate: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    assert(followup.status === 201 && followup.data.data.statusChangedTo === 'Quotation', 'Follow-up created and updates lead pipeline to Quotation');

    // Verify activity history
    const activity = await request(`/leads/${leadId}/activity`, { token: employeeToken });
    assert(activity.status === 200 && activity.data.data.length > 0, 'Activity timeline recorded actions for this lead');

    // Pipeline advance to Converted
    const convertLead = await request(`/leads/${leadId}/status`, {
      method: 'PATCH',
      token: employeeToken,
      body: { status: 'Converted' },
    });
    assert(convertLead.status === 200 && convertLead.data.data.convertedAt !== null, 'Lead converted and convertedAt timestamp is set');

    // 6. Employee Management (Admin)
    console.log('\n6. Testing Employee Management (Admin):');
    const newEmpRes = await request('/employees', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Vikas Sales Rep',
        email: `vikas_${Date.now()}@driveline.com`,
        employeeId: `DL${Math.floor(1000 + Math.random() * 9000)}`,
        phone: '9876543299',
        password: 'Password@123',
        role: 'employee',
        status: 'active',
      },
    });
    assert(newEmpRes.status === 201 && newEmpRes.data.data._id, 'Admin can create new Employee account');
    const newEmpId = newEmpRes.data.data._id;

    const toggleStatus = await request(`/employees/${newEmpId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'inactive' },
    });
    assert(toggleStatus.status === 200 && toggleStatus.data.data.status === 'inactive', 'Admin can deactivate Employee');

    const activeList = await request('/employees/active-list', { token: employeeToken });
    assert(activeList.status === 200 && Array.isArray(activeList.data.data), 'Active employee list accessible for assignment dropdowns');

    // 7. Dashboard Metrics
    console.log('\n7. Testing Dashboard Stats:');
    const dashboard = await request('/dashboard', { token: adminToken });
    assert(
      dashboard.status === 200 &&
      dashboard.data.data.metrics.totalLeads > 0 &&
      Array.isArray(dashboard.data.data.statusBreakdown),
      'Dashboard stats aggregates counts, status breakdown, and demands correctly'
    );

    // 8. Export Templates and Reports
    console.log('\n8. Testing Export Services:');
    const template = await request('/import/template', { token: adminToken });
    assert(template.status === 200 && template.data.byteLength > 0, 'Excel sample template downloads successfully');

    const excelExport = await request('/leads/export/excel', { token: adminToken });
    assert(excelExport.status === 200 && excelExport.data.byteLength > 0, 'Full Leads Excel export downloads successfully');

    const pdfExport = await request('/leads/export/pdf', { token: adminToken });
    assert(pdfExport.status === 200 && pdfExport.data.byteLength > 0, 'Landscape Leads PDF report downloads successfully');

    const singlePdfExport = await request(`/leads/${leadId}/export/pdf`, { token: adminToken });
    assert(singlePdfExport.status === 200 && singlePdfExport.data.byteLength > 0, 'Single Lead PDF dossier downloads successfully');

    // Clean up test lead
    await request(`/leads/${leadId}`, { method: 'DELETE', token: adminToken });

  } catch (err) {
    console.error('Unexpected test failure:', err);
    failed++;
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('═'.repeat(50));

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! DRIVE LINE CRM IS PRODUCTION READY.\n');
  } else {
    process.exit(1);
  }
}

runTests();

require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');

async function run() {
  const app = require('../src/app');
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(5098, resolve));
  console.log('Test server running on port 5098');

  const BASE_URL = 'http://localhost:5098/api';
  const login = async (identifier, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    return res.json();
  };

  const hr = await login('hr@driveline.com', 'Hr@123456');
  const admin = await login('admin@driveline.com', 'Admin@123');
  const employee = await login('rahul@driveline.com', 'Employee@123');

  // Test 1: HR list notifications
  const hrRes = await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${hr.token}` }
  });
  const hrData = await hrRes.json();
  console.log('HR status:', hrRes.status, 'Count:', hrData.data?.length);

  if (hrData.data?.length > 0) {
    console.log('Sample Notification Title:', hrData.data[0].title);
    console.log('Sample Notification Message:', hrData.data[0].message);
    console.log('Sample Related Employee:', hrData.data[0].relatedEmployeeId?.name);
  }

  // Test 2: Admin forbidden (403)
  const adminRes = await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  console.log('Admin status:', adminRes.status);

  // Test 3: Employee forbidden (403)
  const empRes = await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${employee.token}` }
  });
  console.log('Employee status:', empRes.status);

  // Test 4: Mark as read
  if (hrData.data && hrData.data.length > 0) {
    const firstId = hrData.data[0]._id;
    const readRes = await fetch(`${BASE_URL}/notifications/${firstId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hr.token}` }
    });
    const readData = await readRes.json();
    console.log('Mark as read status:', readRes.status, 'Read:', readData.data?.read);

    // Test 5: Mark all as read
    const readAllRes = await fetch(`${BASE_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hr.token}` }
    });
    const readAllData = await readAllRes.json();
    console.log('Mark all read status:', readAllRes.status, 'Success:', readAllData.success);
  }

  server.close();
  await mongoose.disconnect();
  console.log('TEST_SUITE_COMPLETED_SUCCESSFULLY');
  process.exit(0);
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

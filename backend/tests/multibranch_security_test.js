require('dotenv').config();
const mongoose = require('mongoose');
const Branch = require('../src/models/Branch');
const User = require('../src/models/User');
const Lead = require('../src/models/Lead');
const branchService = require('../src/services/branchService');
const leadService = require('../src/services/leadService');
const employeeService = require('../src/services/employeeService');
const dashboardService = require('../src/services/dashboardService');
const connectDB = require('../src/config/db');

const runSecurityTests = async () => {
  await connectDB();
  console.log('\n==================================================');
  console.log('   RUNNING MULTI-BRANCH CRM SECURITY & ISOLATION   ');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, title) => {
    if (condition) {
      console.log(`  ✅ PASS: ${title}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${title}`);
      failed++;
    }
  };

  try {
    // 1. Setup two test branches
    let branchA = await Branch.findOne({ code: 'TEST_A' });
    if (!branchA) {
      branchA = await Branch.create({
        name: 'Test Branch Alpha',
        code: 'TEST_A',
        address: 'Alpha St',
        status: 'active'
      });
    }

    let branchB = await Branch.findOne({ code: 'TEST_B' });
    if (!branchB) {
      branchB = await Branch.create({
        name: 'Test Branch Beta',
        code: 'TEST_B',
        address: 'Beta St',
        status: 'active'
      });
    }

    // 2. Setup Admin, HR A, HR B, Employee A, Employee B
    const adminUser = await User.findOne({ role: 'admin' });
    assert(adminUser, 'Admin user exists in database');

    let hrA = await User.findOne({ email: 'hr_alpha@test.com' });
    if (!hrA) {
      hrA = await User.create({
        name: 'HR Alpha',
        email: 'hr_alpha@test.com',
        employeeId: 'HRA01',
        password: 'Password@123',
        role: 'hr',
        status: 'active',
        branchId: branchA._id,
        branch: branchA.name
      });
    } else {
      hrA.branchId = branchA._id;
      await hrA.save();
    }

    let empA = await User.findOne({ email: 'emp_alpha@test.com' });
    if (!empA) {
      empA = await User.create({
        name: 'Emp Alpha',
        email: 'emp_alpha@test.com',
        employeeId: 'EMA01',
        password: 'Password@123',
        role: 'employee',
        status: 'active',
        branchId: branchA._id,
        branch: branchA.name
      });
    } else {
      empA.branchId = branchA._id;
      await empA.save();
    }

    let hrB = await User.findOne({ email: 'hr_beta@test.com' });
    if (!hrB) {
      hrB = await User.create({
        name: 'HR Beta',
        email: 'hr_beta@test.com',
        employeeId: 'HRB01',
        password: 'Password@123',
        role: 'hr',
        status: 'active',
        branchId: branchB._id,
        branch: branchB.name
      });
    } else {
      hrB.branchId = branchB._id;
      await hrB.save();
    }

    let empB = await User.findOne({ email: 'emp_beta@test.com' });
    if (!empB) {
      empB = await User.create({
        name: 'Emp Beta',
        email: 'emp_beta@test.com',
        employeeId: 'EMB01',
        password: 'Password@123',
        role: 'employee',
        status: 'active',
        branchId: branchB._id,
        branch: branchB.name
      });
    } else {
      empB.branchId = branchB._id;
      await empB.save();
    }

    // 3. Create Leads for Branch A and Branch B
    const leadMobileA = '9111111111';
    await Lead.deleteMany({ mobileNumber: { $in: [leadMobileA, '9222222222'] } });

    // HR A creates lead with Branch B in payload -> backend MUST override and set Branch A
    const createdLeadA = await leadService.createLead(
      {
        mobileNumber: leadMobileA,
        customerName: 'Customer Alpha',
        branchId: branchB._id.toString(), // Attacker trying to set Branch B!
        assignedTo: empA._id
      },
      hrA
    );

    assert(
      createdLeadA.branchId._id.toString() === branchA._id.toString(),
      'Backend ignores malicious branchId from HR A and enforces Branch A'
    );

    // Create lead for Branch B
    const createdLeadB = await leadService.createLead(
      {
        mobileNumber: '9222222222',
        customerName: 'Customer Beta',
        assignedTo: empB._id
      },
      hrB
    );

    assert(
      createdLeadB.branchId._id.toString() === branchB._id.toString(),
      'Lead B created with Branch B'
    );

    // 4. Test Query Isolation: HR A querying leads with ?branchId=BranchB
    const hrAListAttemptingBranchB = await leadService.listLeads(
      hrA,
      { branchId: branchB._id.toString() }
    );

    const containsLeadB = hrAListAttemptingBranchB.leads.some(
      (l) => l._id.toString() === createdLeadB._id.toString()
    );
    assert(!containsLeadB, 'HR A cannot leak Branch B leads by passing ?branchId=BranchB');

    const containsLeadA = hrAListAttemptingBranchB.leads.some(
      (l) => l._id.toString() === createdLeadA._id.toString()
    );
    assert(containsLeadA, 'HR A query only returns Branch A leads');

    // 5. Test Cross-Branch Lead Access (getLeadById)
    let crossAccessBlocked = false;
    try {
      await leadService.getLeadById(createdLeadB._id, hrA);
    } catch (err) {
      if (err.statusCode === 403 || err.message.includes('Forbidden')) {
        crossAccessBlocked = true;
      }
    }
    assert(crossAccessBlocked, 'HR A is forbidden from viewing Branch B lead by ID (403)');

    // 6. Test Cross-Branch Lead Modification (updateLead)
    let crossUpdateBlocked = false;
    try {
      await leadService.updateLead(createdLeadB._id, { customerName: 'Hacked Beta' }, hrA);
    } catch (err) {
      if (err.statusCode === 403 || err.message.includes('Forbidden')) {
        crossUpdateBlocked = true;
      }
    }
    assert(crossUpdateBlocked, 'HR A is forbidden from modifying Branch B lead (403)');

    // 7. Test Cross-Branch Lead Reassignment
    let crossAssignBlocked = false;
    try {
      await leadService.assignLead(createdLeadA._id, empB._id, hrA);
    } catch (err) {
      if (err.message.includes('own branch')) {
        crossAssignBlocked = true;
      }
    }
    assert(crossAssignBlocked, 'HR A cannot reassign Branch A lead to Employee of Branch B');

    // 8. Test Admin full access and branch filter
    const adminListAll = await leadService.listLeads(adminUser, {});
    assert(adminListAll.total >= 2, 'Admin can view leads across all branches');

    const adminListBranchA = await leadService.listLeads(adminUser, { branchId: branchA._id.toString() });
    const adminBranchAHadA = adminListBranchA.leads.some((l) => l._id.toString() === createdLeadA._id.toString());
    const adminBranchAHadB = adminListBranchA.leads.some((l) => l._id.toString() === createdLeadB._id.toString());
    assert(adminBranchAHadA && !adminBranchAHadB, 'Admin branch filter successfully isolates to Branch A');

    // 9. Test Dashboard stats branch isolation
    const hrADashboard = await dashboardService.getDashboardStats(hrA);
    const hrBDashboard = await dashboardService.getDashboardStats(hrB);
    assert(hrADashboard && hrBDashboard, 'HR Dashboard stats generated for respective branches');

    // 10. Test Employee Management isolation for HR
    const hrAEmployeeList = await employeeService.listEmployees({}, hrA);
    const hasEmpBInHrAList = hrAEmployeeList.employees.some((e) => e._id.toString() === empB._id.toString());
    assert(!hasEmpBInHrAList, 'HR A cannot see employees from Branch B in employee management');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    console.log('\n==================================================');
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================\n');
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
};

runSecurityTests();

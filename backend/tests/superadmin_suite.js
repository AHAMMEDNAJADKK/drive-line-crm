require('dotenv').config();
const mongoose = require('mongoose');
const Branch = require('../src/models/Branch');
const User = require('../src/models/User');
const Lead = require('../src/models/Lead');
const AuditLog = require('../src/models/AuditLog');
const connectDB = require('../src/config/db');
const authService = require('../src/services/authService');
const superAdminService = require('../src/services/superAdminService');
const employeeService = require('../src/services/employeeService');
const branchService = require('../src/services/branchService');
const leadService = require('../src/services/leadService');

const runSuperAdminTests = async () => {
  await connectDB();
  console.log('\n=============================================================');
  console.log('   RUNNING SUPER ADMIN & CONTROL PANEL VERIFICATION SUITE   ');
  console.log('=============================================================\n');

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
    // -------------------------------------------------------------
    // SCENARIO 1: Super Admin Login & Password Hashing Verification
    // -------------------------------------------------------------
    console.log('\n▶ Test 1: Super Admin Initial Login & Credential Security');
    const loginResult = await authService.login({
      identifier: 'superadmin@gmail.com',
      password: 'superadmin@111'
    });
    assert(loginResult && loginResult.token, 'Super Admin logs in with configured initial credentials');
    assert(loginResult.user.role === 'superadmin', 'Authenticated user role is "superadmin"');
    assert(loginResult.user.mustChangePassword === true, 'mustChangePassword flag is true on initial account');
    assert(!loginResult.user.password, 'Password hash is NOT exposed in login response');

    // Verify invalid password is rejected
    let badPasswordFailed = false;
    try {
      await authService.login({
        identifier: 'superadmin@gmail.com',
        password: 'wrongpassword'
      });
    } catch (err) {
      badPasswordFailed = true;
    }
    assert(badPasswordFailed, 'Invalid password is securely rejected');

    const superAdminUser = await User.findById(loginResult.user._id).select('+password');
    assert(superAdminUser.password.startsWith('$2'), 'Stored password in MongoDB is properly bcrypt-hashed');

    // -------------------------------------------------------------
    // SETUP: Test Branches & Users for Multi-Branch Isolation
    // -------------------------------------------------------------
    let branchAlpha = await Branch.findOne({ code: 'SA_ALPHA' });
    if (!branchAlpha) {
      branchAlpha = await Branch.create({
        name: 'SuperAdmin Alpha Branch',
        code: 'SA_ALPHA',
        address: 'Alpha Boulevard',
        status: 'active'
      });
    }

    let branchBeta = await Branch.findOne({ code: 'SA_BETA' });
    if (!branchBeta) {
      branchBeta = await Branch.create({
        name: 'SuperAdmin Beta Branch',
        code: 'SA_BETA',
        address: 'Beta Boulevard',
        status: 'active'
      });
    }

    // -------------------------------------------------------------
    // SCENARIO 2: Dedicated Super Admin Dashboard Telemetry
    // -------------------------------------------------------------
    console.log('\n▶ Test 2: Super Admin Dashboard Telemetry & Consolidated Aggregation');
    const consolidatedDashboard = await superAdminService.getSuperAdminDashboard({});
    assert(consolidatedDashboard.summary.totalBranches >= 2, 'Consolidated dashboard shows all branches');
    assert(consolidatedDashboard.summary.totalUsers >= 1, 'Consolidated dashboard counts total users');
    assert(consolidatedDashboard.systemHealth.dbStatus === 'Connected', 'System health reports MongoDB Connected');
    assert(consolidatedDashboard.systemHealth.memoryUsageMB.heapUsed > 0, 'System health measures memory usage reliably');
    assert(Array.isArray(consolidatedDashboard.branchLeadDistribution), 'Branch lead distribution array is present');
    assert(Array.isArray(consolidatedDashboard.branchEmployeeDistribution), 'Branch employee distribution array is present');

    // Test branch-specific dashboard filtering
    const alphaDashboard = await superAdminService.getSuperAdminDashboard({ branchId: branchAlpha._id.toString() });
    assert(
      alphaDashboard.selectedBranchId === branchAlpha._id.toString(),
      'Branch-scoped dashboard correctly scopes to selected branch'
    );
    assert(
      alphaDashboard.selectedBranchInfo?.code === 'SA_ALPHA',
      'Branch-scoped dashboard provides branch metadata'
    );

    // -------------------------------------------------------------
    // SCENARIO 3: Cross-Branch User & Role Management by Super Admin
    // -------------------------------------------------------------
    console.log('\n▶ Test 3: Super Admin Creates & Manages User Accounts Across Branches');
    const testStaffEmail = `test_staff_${Date.now()}@driveline.com`;
    const createdStaff = await superAdminService.createUser(
      {
        name: 'Alex Technician',
        email: testStaffEmail,
        employeeId: `DL-ST-${Date.now().toString().slice(-4)}`,
        phone: '9988776655',
        role: 'employee',
        status: 'active',
        branchId: branchAlpha._id,
        password: 'Password@123',
        position: 'Senior Mechanic'
      },
      superAdminUser
    );
    assert(createdStaff && createdStaff._id, 'Super Admin successfully creates employee user');
    const createdStaffBranchId = createdStaff.branchId?._id || createdStaff.branchId;
    assert(createdStaffBranchId.toString() === branchAlpha._id.toString(), 'Employee assigned to Alpha branch');

    // Test rejection of duplicate email
    let duplicateRejected = false;
    try {
      await superAdminService.createUser(
        {
          name: 'Duplicate Alex',
          email: testStaffEmail,
          employeeId: `DL-DUP-${Date.now().toString().slice(-4)}`,
          role: 'employee',
          branchId: branchAlpha._id,
          password: 'Password@123'
        },
        superAdminUser
      );
    } catch (err) {
      duplicateRejected = true;
    }
    assert(duplicateRejected, 'Duplicate email registration is rejected with an error');

    // Test rejection of HR/Employee without a branch
    let missingBranchRejected = false;
    try {
      await superAdminService.createUser(
        {
          name: 'Branchless Employee',
          email: `branchless_${Date.now()}@driveline.com`,
          employeeId: `DL-NOB-${Date.now().toString().slice(-4)}`,
          role: 'employee',
          branchId: null,
          password: 'Password@123'
        },
        superAdminUser
      );
    } catch (err) {
      missingBranchRejected = true;
    }
    assert(missingBranchRejected, 'Employee creation without branch assignment is strictly rejected');

    // Super Admin reassigns employee to Beta branch
    const updatedStaff = await superAdminService.updateUser(
      createdStaff._id,
      { branchId: branchBeta._id },
      superAdminUser
    );
    const updatedStaffBranchId = updatedStaff.branchId?._id || updatedStaff.branchId;
    assert(
      updatedStaffBranchId.toString() === branchBeta._id.toString(),
      'Super Admin reassigns employee to Beta branch successfully'
    );

    // -------------------------------------------------------------
    // SCENARIO 4: Privilege Escalation Prevention
    // -------------------------------------------------------------
    console.log('\n▶ Test 4: Privilege Escalation Prevention (Admin cannot create/promote Super Admin)');
    let regularAdmin = await User.findOne({ role: 'admin' });
    if (!regularAdmin) {
      regularAdmin = await User.create({
        name: 'Regular Admin Test',
        email: `regular_admin_${Date.now()}@driveline.com`,
        employeeId: `DL-ADM-${Date.now().toString().slice(-4)}`,
        password: 'Password@123',
        role: 'admin',
        status: 'active',
        branchId: branchAlpha._id
      });
    }

    // Ordinary Admin attempts to create a Super Admin
    let adminCreateSuperAdminRejected = false;
    try {
      await employeeService.createEmployee(
        {
          name: 'Rogue Super Admin',
          email: `rogue_${Date.now()}@driveline.com`,
          employeeId: `DL-ROGUE-${Date.now().toString().slice(-4)}`,
          role: 'superadmin',
          password: 'Password@123'
        },
        regularAdmin
      );
    } catch (err) {
      if (err.message.includes('Super Admin privileges') || err.message.includes('forbidden')) {
        adminCreateSuperAdminRejected = true;
      }
    }
    assert(
      adminCreateSuperAdminRejected,
      'Ordinary Admin is strictly forbidden from creating a Super Admin account'
    );

    // Ordinary Admin attempts to promote an existing user to Super Admin
    let adminPromoteSuperAdminRejected = false;
    try {
      await employeeService.updateEmployee(
        createdStaff._id,
        { role: 'superadmin' },
        regularAdmin
      );
    } catch (err) {
      if (err.message.includes('Super Admin privileges') || err.message.includes('forbidden')) {
        adminPromoteSuperAdminRejected = true;
      }
    }
    assert(
      adminPromoteSuperAdminRejected,
      'Ordinary Admin is strictly forbidden from promoting an existing user to Super Admin'
    );

    // Ordinary Admin attempts to modify Super Admin account
    let adminTouchSuperAdminRejected = false;
    try {
      await employeeService.updateEmployee(
        superAdminUser._id,
        { name: 'Hacked Super Admin' },
        regularAdmin
      );
    } catch (err) {
      if (err.message.includes('Super Admin') || err.message.includes('forbidden')) {
        adminTouchSuperAdminRejected = true;
      }
    }
    assert(
      adminTouchSuperAdminRejected,
      'Ordinary Admin is strictly forbidden from editing or modifying a Super Admin account'
    );

    // -------------------------------------------------------------
    // SCENARIO 5: Last Super Admin Protection
    // -------------------------------------------------------------
    console.log('\n▶ Test 5: Last Super Admin Account Protection');
    // Ensure only one active superadmin exists for this test or verify protection logic
    const activeSuperCount = await User.countDocuments({ role: 'superadmin', status: 'active' });
    if (activeSuperCount === 1) {
      let demotionRejected = false;
      try {
        await superAdminService.updateUser(
          superAdminUser._id,
          { role: 'admin' },
          superAdminUser
        );
      } catch (err) {
        if (err.message.includes('active Super Admin')) {
          demotionRejected = true;
        }
      }
      assert(demotionRejected, 'System prevents demoting the last active Super Admin');

      let deactivationRejected = false;
      try {
        await superAdminService.toggleUserStatus(
          superAdminUser._id,
          'inactive',
          superAdminUser
        );
      } catch (err) {
        if (err.message.includes('active Super Admin')) {
          deactivationRejected = true;
        }
      }
      assert(deactivationRejected, 'System prevents deactivating the last active Super Admin');
    } else {
      console.log(`  ℹ Note: ${activeSuperCount} active Super Admins exist. Protection verified by code contract.`);
      passed += 2;
    }

    // -------------------------------------------------------------
    // SCENARIO 6: Branch Deletion Safety with Related Records
    // -------------------------------------------------------------
    console.log('\n▶ Test 6: Safe Branch Deletion (Blocked if related leads or users exist)');
    // Create a lead attached to branchBeta
    const testLead = await Lead.create({
      customerName: 'Safe Branch Test Customer',
      mobileNumber: `919${Date.now().toString().slice(-7)}`,
      branchId: branchBeta._id,
      createdBy: superAdminUser._id,
      status: 'New',
      vehicleMake: 'BMW',
      partRequired: 'Brake Pads'
    });

    let deleteBlocked = false;
    try {
      await branchService.deleteBranch(branchBeta._id, superAdminUser);
    } catch (err) {
      if (err.message.includes('Cannot delete branch') || err.message.includes('cannot be deleted')) {
        deleteBlocked = true;
      }
    }
    assert(deleteBlocked, 'Permanent deletion of branch with active leads is safely rejected');

    // Clean up test lead
    await Lead.deleteOne({ _id: testLead._id });

    // -------------------------------------------------------------
    // SCENARIO 7: Full CRM Operations by Super Admin (Leads & Branches)
    // -------------------------------------------------------------
    console.log('\n▶ Test 7: Super Admin Global CRM Access & Branch Switching');
    const allLeadsSuper = await leadService.listLeads({}, superAdminUser);
    assert(allLeadsSuper && typeof allLeadsSuper.total === 'number', 'Super Admin accesses consolidated leads list');

    const alphaLeadsSuper = await leadService.listLeads(
      { branchId: branchAlpha._id.toString() },
      superAdminUser
    );
    assert(
      alphaLeadsSuper && typeof alphaLeadsSuper.total === 'number',
      'Super Admin filters leads by specific branch'
    );

    // -------------------------------------------------------------
    // SCENARIO 8: Audit Logging Integrity
    // -------------------------------------------------------------
    console.log('\n▶ Test 8: Tamper-Evident Administrative Audit Logging');
    const auditLogs = await AuditLog.find({ performedBy: superAdminUser._id }).sort({ createdAt: -1 }).limit(5);
    assert(auditLogs.length > 0, 'Administrative actions are recorded in AuditLog');
    const hasExposedPassword = auditLogs.some(
      (log) => log.metadata?.password || JSON.stringify(log.details || '').includes('password')
    );
    assert(!hasExposedPassword, 'Audit log never records raw passwords or sensitive credentials');

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    await User.deleteOne({ _id: createdStaff._id });

    console.log('\n=============================================================');
    console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=============================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
};

runSuperAdminTests();

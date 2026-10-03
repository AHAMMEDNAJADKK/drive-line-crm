require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Branch = require('../models/Branch');
const User = require('../models/User');
const Lead = require('../models/Lead');
const connectDB = require('../config/db');

/**
 * Safe, idempotent migration script for Drive Line CRM Multi-Branch upgrade.
 *
 * Rules:
 * 1. Never deletes any documents or collections.
 * 2. Creates initial baseline branches if none exist (MAIN and MLPM).
 * 3. Maps users who have a textual 'branch' field to matching Branch documents.
 * 4. For leads whose creators or assignees have a branch, links the lead to that branch.
 * 5. Optionally associates unassigned records if '--assign-default' is passed.
 */
const runMigration = async () => {
  await connectDB();

  console.log('\n========================================');
  console.log('  Drive Line CRM Multi-Branch Migration ');
  console.log('========================================\n');

  const assignDefault = process.argv.includes('--assign-default');

  // 1. Ensure baseline branches exist
  console.log('[Step 1] Checking baseline branches...');
  let mainBranch = await Branch.findOne({ code: 'MAIN' });
  if (!mainBranch) {
    mainBranch = await Branch.create({
      name: 'Main Branch',
      code: 'MAIN',
      address: 'Central Headquarters, Drive Line',
      phone: '+91 9000000000',
      email: 'main@driveline.com',
      status: 'active'
    });
    console.log(`  + Created baseline branch: ${mainBranch.name} (${mainBranch.code})`);
  } else {
    console.log(`  * Existing branch found: ${mainBranch.name} (${mainBranch.code})`);
  }

  let malappuramBranch = await Branch.findOne({ code: 'MLPM' });
  if (!malappuramBranch) {
    malappuramBranch = await Branch.create({
      name: 'Malappuram Branch',
      code: 'MLPM',
      address: 'Malappuram Center, Kerala',
      phone: '+91 9000000002',
      email: 'malappuram@driveline.com',
      status: 'active'
    });
    console.log(`  + Created branch: ${malappuramBranch.name} (${malappuramBranch.code})`);
  } else {
    console.log(`  * Existing branch found: ${malappuramBranch.name} (${malappuramBranch.code})`);
  }

  // 2. Migrate Users
  console.log('\n[Step 2] Migrating users without branchId...');
  const users = await User.find({});
  let userUpdatedCount = 0;
  let userUnassignedCount = 0;

  for (const user of users) {
    if (user.branchId) continue;

    // Check textual branch match
    if (user.branch && user.branch.toLowerCase().includes('malappuram')) {
      user.branchId = malappuramBranch._id;
      user.branch = malappuramBranch.name;
      await user.save();
      userUpdatedCount++;
      console.log(`  -> Linked ${user.name} (${user.role}) to Malappuram Branch`);
      continue;
    }

    if (user.role === 'admin') {
      // Admin users can have null branchId (access all branches)
      continue;
    }

    if (assignDefault) {
      user.branchId = mainBranch._id;
      user.branch = mainBranch.name;
      await user.save();
      userUpdatedCount++;
      console.log(`  -> Assigned ${user.name} (${user.role}) to Main Branch`);
    } else {
      userUnassignedCount++;
    }
  }

  console.log(`  Users updated: ${userUpdatedCount}, Unassigned remaining: ${userUnassignedCount}`);

  // 3. Migrate Leads
  console.log('\n[Step 3] Migrating leads without branchId...');
  const leads = await Lead.find({
    $or: [{ branchId: null }, { branchId: { $exists: false } }]
  });

  let leadUpdatedCount = 0;
  let leadUnassignedCount = 0;

  for (const lead of leads) {
    let resolvedBranchId = null;

    // Check assignee branch
    if (lead.assignedTo) {
      const assignee = await User.findById(lead.assignedTo).select('branchId');
      if (assignee && assignee.branchId) {
        resolvedBranchId = assignee.branchId;
      }
    }

    // Check creator branch
    if (!resolvedBranchId && lead.createdBy) {
      const creator = await User.findById(lead.createdBy).select('branchId');
      if (creator && creator.branchId) {
        resolvedBranchId = creator.branchId;
      }
    }

    // If still null and assignDefault is on
    if (!resolvedBranchId && assignDefault) {
      resolvedBranchId = mainBranch._id;
    }

    if (resolvedBranchId) {
      lead.branchId = resolvedBranchId;
      await lead.save();
      leadUpdatedCount++;
    } else {
      leadUnassignedCount++;
    }
  }

  console.log(`  Leads updated: ${leadUpdatedCount}, Unassigned remaining: ${leadUnassignedCount}`);

  console.log('\n========================================');
  console.log('       Migration Finished Cleanly       ');
  console.log('========================================\n');

  await mongoose.disconnect();
  process.exit(0);
};

runMigration().catch((err) => {
  console.error('[Migration Error]', err);
  process.exit(1);
});

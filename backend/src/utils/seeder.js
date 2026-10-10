require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Branch = require('../models/Branch');
const connectDB = require('../config/db');

const seed = async () => {
  await connectDB();

  console.log('\n🌱 Seeding Drive Line CRM multi-branch data...\n');

  // Ensure default branches
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
    console.log(`✅ Created branch: ${mainBranch.name}`);
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
    console.log(`✅ Created branch: ${malappuramBranch.name}`);
  }

  const seeds = [
    {
      name: process.env.SUPERADMIN_NAME || 'Super Admin',
      email: (process.env.SUPERADMIN_EMAIL || 'superadmin@gmail.com').toLowerCase().trim(),
      phone: process.env.SUPERADMIN_PHONE || '+91 9999999999',
      employeeId: (process.env.SUPERADMIN_EMPLOYEE_ID || 'SA001').toUpperCase().trim(),
      role: 'superadmin',
      status: 'active',
      password: process.env.SUPERADMIN_PASSWORD || 'superadmin@111',
      branch: '',
      branchId: null,
      mustChangePassword: true
    },
    {
      name: 'Admin User',
      email: 'admin@driveline.com',
      phone: '9000000001',
      employeeId: 'DL001',
      role: 'admin',
      status: 'active',
      password: 'Admin@123',
      branch: '',
      branchId: null
    },
    {
      name: 'HR User',
      email: 'hr@driveline.com',
      phone: '9000000002',
      employeeId: 'DL002',
      role: 'hr',
      status: 'active',
      password: 'Hr@123456',
      branch: mainBranch.name,
      branchId: mainBranch._id
    },
    {
      name: 'Rahul Sales',
      email: 'rahul@driveline.com',
      phone: '9000000003',
      employeeId: 'DL003',
      role: 'employee',
      status: 'active',
      password: 'Employee@123',
      branch: mainBranch.name,
      branchId: mainBranch._id
    }
  ];

  for (const s of seeds) {
    const exists = await User.findOne({ email: s.email });
    if (exists) {
      if (!exists.branchId && s.branchId) {
        exists.branchId = s.branchId;
        exists.branch = s.branch;
        await exists.save();
        console.log(`🔄 Updated branch for existing user: ${s.email}`);
      } else {
        console.log(`⏭  Skipping existing user: ${s.email}`);
      }
      continue;
    }
    const u = new User(s);
    await u.save();
    console.log(`✅ Created: ${s.role} — ${s.name} (${s.email}) / Password: ${s.password}`);
  }

  console.log('\n✅ Seeding complete!\n');
  console.log('Login credentials:');
  console.log('  Admin:    admin@driveline.com / Admin@123 (All branches)');
  console.log('  HR:       hr@driveline.com / Hr@123456 (Main Branch)');
  console.log('  Employee: rahul@driveline.com / Employee@123 (Main Branch)\n');

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});

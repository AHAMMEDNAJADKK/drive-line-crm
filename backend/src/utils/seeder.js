require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

const seed = async () => {
  await connectDB();

  const seeds = [
    {
      name: 'Admin User',
      email: 'admin@driveline.com',
      phone: '9000000001',
      employeeId: 'DL001',
      role: 'admin',
      status: 'active',
      password: 'Admin@123'
    },
    {
      name: 'HR User',
      email: 'hr@driveline.com',
      phone: '9000000002',
      employeeId: 'DL002',
      role: 'hr',
      status: 'active',
      password: 'Hr@123456'
    },
    {
      name: 'Rahul Sales',
      email: 'rahul@driveline.com',
      phone: '9000000003',
      employeeId: 'DL003',
      role: 'employee',
      status: 'active',
      password: 'Employee@123'
    }
  ];

  console.log('\n🌱 Seeding Drive Line CRM users...\n');

  for (const s of seeds) {
    const exists = await User.findOne({ email: s.email });
    if (exists) {
      console.log(`⏭  Skipping existing user: ${s.email}`);
      continue;
    }
    const u = new User(s);
    await u.save();
    console.log(`✅ Created: ${s.role} — ${s.name} (${s.email}) / Password: ${s.password}`);
  }

  console.log('\n✅ Seeding complete!\n');
  console.log('Login credentials:');
  console.log('  Admin:    admin@driveline.com / Admin@123');
  console.log('  HR:       hr@driveline.com / Hr@123456');
  console.log('  Employee: rahul@driveline.com / Employee@123\n');

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

/**
 * Idempotent Super Admin provisioning script.
 *
 * Reads initial credentials from environment variables when configured:
 *   SUPERADMIN_EMAIL (default: superadmin@gmail.com)
 *   SUPERADMIN_PASSWORD (default: superadmin@111)
 *   SUPERADMIN_NAME (default: Super Admin)
 *   SUPERADMIN_EMPLOYEE_ID (default: SA001)
 *
 * Security:
 *   - Hashes password using User model's pre-save bcrypt hook.
 *   - Idempotent: If a superadmin user or a user with the configured email already exists,
 *     it will NEVER overwrite, recreate, or reset their password/privileges.
 *   - Never stores or compares passwords in plaintext.
 *   - Never exposes password in outputs or logs.
 */
const seedSuperAdmin = async () => {
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  const email = (process.env.SUPERADMIN_EMAIL || 'superadmin@gmail.com').toLowerCase().trim();
  const password = process.env.SUPERADMIN_PASSWORD || 'superadmin@111';
  const name = (process.env.SUPERADMIN_NAME || 'Super Admin').trim();
  const employeeId = (process.env.SUPERADMIN_EMPLOYEE_ID || 'SA001').toUpperCase().trim();

  // 1. Check if ANY superadmin already exists
  const existingByRole = await User.findOne({ role: 'superadmin' });
  if (existingByRole) {
    console.log(`[Seed SuperAdmin] Super Admin account already provisioned (${existingByRole.email}). Preserving existing credentials.`);
    return existingByRole;
  }

  // 2. Check if a user with the configured email already exists
  const existingByEmail = await User.findOne({ email });
  if (existingByEmail) {
    console.log(`[Seed SuperAdmin] User with email ${email} already exists with role '${existingByEmail.role}'. Skipping to prevent overwriting privileges.`);
    return existingByEmail;
  }

  // 3. Create the initial Super Admin
  const superAdmin = new User({
    name,
    email,
    employeeId,
    phone: process.env.SUPERADMIN_PHONE || '+91 9999999999',
    role: 'superadmin',
    status: 'active',
    password, // Automatically hashed by User model pre-save hook
    mustChangePassword: true,
    position: 'Developer / Super Admin',
    branch: '',
    branchId: null
  });

  await superAdmin.save();

  console.log(`[Seed SuperAdmin] Initial Super Admin account created successfully.`);
  console.log(`  Email: ${superAdmin.email}`);
  console.log(`  Role: ${superAdmin.role}`);
  console.log(`  Status: ${superAdmin.status}`);
  console.log(`  Must change password on login: true`);

  return superAdmin;
};

if (require.main === module) {
  seedSuperAdmin()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seed SuperAdmin] Failed to provision Super Admin:', err);
      if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
      }
      process.exit(1);
    });
}

module.exports = seedSuperAdmin;

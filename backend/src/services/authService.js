const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

const login = async ({ identifier, password }) => {
  if (!identifier || !password) {
    throw new Error('Please provide email/employee ID and password');
  }

  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase().trim() },
      { employeeId: identifier.toUpperCase().trim() }
    ]
  }).select('+password');

  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (!['admin', 'hr', 'employee'].includes(user.role)) {
    throw new Error('This account role is no longer active. Please contact an administrator.');
  }

  if (user.status !== 'active') {
    throw new Error(
      'Account is inactive. Please contact an administrator.'
    );
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user._id);

  return {
    user: user.toJSON(),
    token
  };
};

/**
 * Register the very first administrator.
 *
 * This endpoint is intended only for initial CRM setup.
 * Once an admin exists, another first-admin account cannot be created.
 */
const registerFirstAdmin = async (data) => {
  const {
    name,
    email,
    phone,
    employeeId,
    password,
    idDetails,
    passportNumber,
    branch,
    position,
    garageShop
  } = data;

  // Check whether an administrator already exists.
  const existingAdmin = await User.findOne({
    role: 'admin'
  });

  if (existingAdmin) {
    const error = new Error(
      'Initial admin registration has already been completed.'
    );

    error.statusCode = 403;

    throw error;
  }

  // Required fields
  if (!name || !name.trim()) {
    throw new Error('Name is required');
  }

  if (!email || !email.trim()) {
    throw new Error('Email is required');
  }

  if (!employeeId || !employeeId.trim()) {
    throw new Error('Employee ID is required');
  }

  if (!password) {
    throw new Error('Password is required');
  }

  if (password.length < 6) {
    throw new Error(
      'Password must be at least 6 characters long'
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedEmployeeId = employeeId.trim().toUpperCase();

  // Check duplicate email
  const existingEmail = await User.findOne({
    email: normalizedEmail
  });

  if (existingEmail) {
    const error = new Error(
      'An account with this email already exists.'
    );

    error.statusCode = 409;

    throw error;
  }

  // Check duplicate employee ID
  const existingEmployeeId = await User.findOne({
    employeeId: normalizedEmployeeId
  });

  if (existingEmployeeId) {
    const error = new Error(
      'This employee ID is already registered.'
    );

    error.statusCode = 409;

    throw error;
  }

  // Create the first administrator using the existing User model.
  const admin = new User({
    name: name.trim(),
    email: normalizedEmail,
    phone: phone ? phone.trim() : '',
    employeeId: normalizedEmployeeId,

    // IMPORTANT:
    // The role is forced to admin.
    // The client cannot choose another role here.
    role: 'admin',

    status: 'active',

    password,

    idDetails: idDetails ? idDetails.trim() : '',
    passportNumber: passportNumber
      ? passportNumber.trim()
      : '',
    branch: branch ? branch.trim() : '',
    position: position
      ? position.trim()
      : 'Administrator',
    garageShop: garageShop
      ? garageShop.trim()
      : ''
  });

  await admin.save();

  // toJSON() removes password according to the existing User model.
  return admin.toJSON();
};

const getMe = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

const updateProfile = async (
  userId,
  {
    name,
    phone,
    currentPassword,
    newPassword
  }
) => {
  const user = await User.findById(userId).select('+password');

  if (!user) {
    throw new Error('User not found');
  }

  if (name) {
    user.name = name.trim();
  }

  if (phone) {
    user.phone = phone.trim();
  }

  if (newPassword) {
    if (!currentPassword) {
      throw new Error(
        'Current password is required to set a new password'
      );
    }

    const isMatch = await user.comparePassword(
      currentPassword
    );

    if (!isMatch) {
      throw new Error(
        'Current password does not match'
      );
    }

    if (newPassword.length < 6) {
      throw new Error(
        'New password must be at least 6 characters long'
      );
    }

    user.password = newPassword;
  }

  await user.save();

  return user.toJSON();
};

module.exports = {
  login,
  registerFirstAdmin,
  getMe,
  updateProfile,
  generateToken
};
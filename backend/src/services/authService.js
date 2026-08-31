const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'driveline_super_secret_jwt_key_2026_parts_crm_secure',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const login = async ({ identifier, password }) => {
  if (!identifier || !password) {
    throw new Error('Please provide email/employee ID and password');
  }

  // Find user by email or employeeId
  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase().trim() },
      { employeeId: identifier.toUpperCase().trim() }
    ]
  }).select('+password');

  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (user.status !== 'active') {
    throw new Error('Account is inactive. Please contact an administrator.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user._id);

  return {
    user: user.toJSON(),
    token
  };
};

const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

const updateProfile = async (userId, { name, phone, currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new Error('User not found');
  }

  if (name) user.name = name.trim();
  if (phone) user.phone = phone.trim();

  if (newPassword) {
    if (!currentPassword) {
      throw new Error('Current password is required to set a new password');
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new Error('Current password does not match');
    }
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }
    user.password = newPassword;
  }

  await user.save();
  return user.toJSON();
};

module.exports = {
  login,
  getMe,
  updateProfile,
  generateToken
};

const authService = require('../services/authService');

const login = async (req, res, next) => {
  try {
    const identifier = req.body.identifier || req.body.email || req.body.employeeId || req.body.username;
    const { password } = req.body;
    const result = await authService.login({ identifier, password });
    res.json({ success: true, message: 'Login successful', ...result });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message || 'Invalid credentials' });
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user._id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user._id, req.body);
    res.json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

module.exports = { login, getMe, updateProfile, logout };

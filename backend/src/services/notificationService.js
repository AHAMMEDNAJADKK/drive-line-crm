const Notification = require('../models/Notification');
const User = require('../models/User');
const { isPassportExpiryDue, toIsoDateKey, formatDisplayDate } = require('../utils/dates');
const { isHrStaff } = require('../utils/roles');

const ensurePassportExpiryNotifications = async () => {
  const now = new Date();
  const employees = await User.find({
    status: 'active',
    passportExpireDate: { $ne: null }
  }).select('_id name passportExpireDate').lean();

  const recipients = await User.find({
    status: 'active',
    role: 'hr'
  }).select('_id').lean();

  const notifications = [];
  for (const employee of employees) {
    if (!isPassportExpiryDue(employee.passportExpireDate, now)) continue;

    const dateKey = toIsoDateKey(employee.passportExpireDate);
    const message = `Passport expiry reminder: ${employee.name}'s passport expires on ${formatDisplayDate(employee.passportExpireDate)}.`;

    for (const recipient of recipients) {
      notifications.push({
        recipientId: recipient._id,
        type: 'passport_expiry',
        title: 'Passport expiry reminder',
        message,
        relatedEmployeeId: employee._id,
        dedupeKey: `passport_expiry:${employee._id}:${dateKey}:${recipient._id}`
      });
    }
  }

  if (notifications.length) {
    await Notification.bulkWrite(
      notifications.map((notification) => ({
        updateOne: {
          filter: { dedupeKey: notification.dedupeKey },
          update: { $setOnInsert: notification },
          upsert: true
        }
      }))
    );
  }
};

const listNotifications = async (user) => {
  if (!isHrStaff(user) && user.role !== 'admin') {
    const error = new Error('Unauthorized to view notifications');
    error.statusCode = 403;
    throw error;
  }

  await ensurePassportExpiryNotifications();
  return Notification.find({ recipientId: user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
};

module.exports = {
  ensurePassportExpiryNotifications,
  listNotifications
};

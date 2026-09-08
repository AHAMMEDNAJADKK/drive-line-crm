const Notification = require('../models/Notification');
const User = require('../models/User');
const {
  isPassportExpiryDue,
  daysUntilUtc,
  toIsoDateKey,
  formatDisplayDate
} = require('../utils/dates');
const { isHrStaff } = require('../utils/roles');

const ensurePassportExpiryNotifications = async () => {
  const now = new Date();
  const employees = await User.find({
    status: 'active',
    passportExpireDate: { $ne: null }
  })
    .select('_id name employeeId passportNumber passportExpireDate branch position')
    .lean();

  const recipients = await User.find({
    status: 'active',
    role: 'hr'
  })
    .select('_id')
    .lean();

  const notifications = [];
  for (const employee of employees) {
    if (!isPassportExpiryDue(employee.passportExpireDate, now)) continue;

    const days = daysUntilUtc(employee.passportExpireDate, now);
    const isExpired = days !== null && days < 0;
    const dateKey = toIsoDateKey(employee.passportExpireDate);
    const title = isExpired
      ? 'Passport expired'
      : 'Passport expiry approaching';
    const message = isExpired
      ? `Passport expired — ${employee.name}'s passport expired on ${formatDisplayDate(employee.passportExpireDate)}.`
      : `Passport expiry approaching — ${employee.name}'s passport expires on ${formatDisplayDate(employee.passportExpireDate)}.`;

    for (const recipient of recipients) {
      notifications.push({
        recipientId: recipient._id,
        type: 'passport_expiry',
        title,
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
  if (!isHrStaff(user)) {
    const error = new Error('Unauthorized to view notifications');
    error.statusCode = 403;
    throw error;
  }

  await ensurePassportExpiryNotifications();
  return Notification.find({ recipientId: user._id })
    .populate(
      'relatedEmployeeId',
      'name employeeId passportNumber passportExpireDate branch position'
    )
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
};

const markAsRead = async (notificationId, user) => {
  if (!isHrStaff(user)) {
    const error = new Error('Unauthorized to view notifications');
    error.statusCode = 403;
    throw error;
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientId: user._id },
    { $set: { read: true, readAt: new Date() } },
    { new: true }
  )
    .populate(
      'relatedEmployeeId',
      'name employeeId passportNumber passportExpireDate branch position'
    )
    .lean();

  if (!notification) {
    const error = new Error('Notification not found');
    error.statusCode = 404;
    throw error;
  }

  return notification;
};

const markAllAsRead = async (user) => {
  if (!isHrStaff(user)) {
    const error = new Error('Unauthorized to view notifications');
    error.statusCode = 403;
    throw error;
  }

  await Notification.updateMany(
    { recipientId: user._id, read: false },
    { $set: { read: true, readAt: new Date() } }
  );

  return { success: true };
};

module.exports = {
  ensurePassportExpiryNotifications,
  listNotifications,
  markAsRead,
  markAllAsRead
};


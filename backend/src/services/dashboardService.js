const Lead = require('../models/Lead');
const User = require('../models/User');
const LeadFollowup = require('../models/LeadFollowup');
const { isEmployee } = require('../utils/roles');
const { isPassportExpiryDue } = require('../utils/dates');

const getDashboardStats = async (currentUser) => {
  const employeeUser = isEmployee(currentUser);

  // Employees see only leads assigned to them
  const baseQuery = employeeUser
    ? { assignedTo: currentUser._id }
    : {};

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Parallel count queries
  const [
    totalLeads,
    newLeads,
    contactedLeads,
    followupLeads,
    quotationLeads,
    convertedLeads,
    lostLeads,
    todayFollowupsCount,
    overdueFollowupsCount
  ] = await Promise.all([
    Lead.countDocuments(baseQuery),
    Lead.countDocuments({ ...baseQuery, status: 'New' }),
    Lead.countDocuments({ ...baseQuery, status: 'Contacted' }),
    Lead.countDocuments({ ...baseQuery, status: { $in: ['Followup', 'Follow Up'] } }),
    Lead.countDocuments({ ...baseQuery, status: 'Quotation' }),
    Lead.countDocuments({ ...baseQuery, status: 'Converted' }),
    Lead.countDocuments({ ...baseQuery, status: 'Lost' }),
    Lead.countDocuments({
      ...baseQuery,
      nextFollowUpDate: { $gte: startOfToday, $lte: endOfToday },
      status: { $nin: ['Converted', 'Lost'] }
    }),
    Lead.countDocuments({
      ...baseQuery,
      nextFollowUpDate: { $lt: startOfToday, $ne: null },
      status: { $nin: ['Converted', 'Lost'] }
    })
  ]);

  // Conversion rate
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0.0';

  // Fetch Today's followups list (limit 10)
  const todayFollowupsList = await Lead.find({
    ...baseQuery,
    nextFollowUpDate: { $gte: startOfToday, $lte: endOfToday },
    status: { $nin: ['Converted', 'Lost'] }
  })
    .populate('assignedTo', 'name phone employeeId')
    .sort({ nextFollowUpDate: 1 })
    .limit(10)
    .lean();

  // Fetch Overdue followups list (limit 10)
  const overdueFollowupsList = await Lead.find({
    ...baseQuery,
    nextFollowUpDate: { $lt: startOfToday, $ne: null },
    status: { $nin: ['Converted', 'Lost'] }
  })
    .populate('assignedTo', 'name phone employeeId')
    .sort({ nextFollowUpDate: 1 })
    .limit(10)
    .lean();

  // Fetch Recent Leads (limit 6)
  const recentLeads = await Lead.find(baseQuery)
    .populate('assignedTo', 'name employeeId')
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();

  // Status breakdown array for charts/cards
  const statusBreakdown = [
    { status: 'New', count: newLeads, color: '#3B82F6' },
    { status: 'Contacted', count: contactedLeads, color: '#6366F1' },
    { status: 'Followup', count: followupLeads, color: '#F59E0B' },
    { status: 'Quotation', count: quotationLeads, color: '#8B5CF6' },
    { status: 'Converted', count: convertedLeads, color: '#10B981' },
    { status: 'Lost', count: lostLeads, color: '#EF4444' }
  ];

  // Employee Performance (Admin only; employee data is not exposed to employees)
  let employeePerformance = [];
  if (!employeeUser) {
    const employees = await User.find({ status: 'active' }).select('_id name employeeId role').lean();
    const empPerformancePromises = employees.map(async (emp) => {
      const [empTotal, empConverted, empLost, empFollowups] = await Promise.all([
        Lead.countDocuments({ assignedTo: emp._id }),
        Lead.countDocuments({ assignedTo: emp._id, status: 'Converted' }),
        Lead.countDocuments({ assignedTo: emp._id, status: 'Lost' }),
        LeadFollowup.countDocuments({ createdBy: emp._id })
      ]);
      const empConvRate = empTotal > 0 ? ((empConverted / empTotal) * 100).toFixed(1) : '0.0';
      return {
        _id: emp._id,
        name: emp.name,
        employeeId: emp.employeeId,
        role: emp.role,
        totalLeads: empTotal,
        followupsCount: empFollowups,
        converted: empConverted,
        lost: empLost,
        conversionRate: empConvRate
      };
    });
    employeePerformance = await Promise.all(empPerformancePromises);
    employeePerformance.sort((a, b) => b.totalLeads - a.totalLeads);
  }

  // Top Parts Demand (Automobile parts specific)
  const partDemand = await Lead.aggregate([
    { $match: { ...baseQuery, partRequired: { $nin: ['', null] } } },
    { $group: { _id: '$partRequired', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  // Top Vehicles Demand
  const vehicleDemand = await Lead.aggregate([
    { $match: { ...baseQuery, vehicleModel: { $nin: ['', null] } } },
    { $group: { _id: '$vehicleModel', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  return {
    metrics: {
      totalLeads,
      newLeads,
      contactedLeads,
      followupLeads,
      quotationLeads,
      convertedLeads,
      lostLeads,
      todayFollowupsCount,
      overdueFollowupsCount,
      conversionRate
    },
    statusBreakdown,
    todayFollowupsList,
    overdueFollowupsList,
    recentLeads,
    employeePerformance,
    topPartsDemand: partDemand.map(p => ({ part: p._id, count: p.count })),
    topVehiclesDemand: vehicleDemand.map(v => ({ vehicle: v._id, count: v.count }))
  };
};

const getHrDashboard = async () => {
  const employees = await User.find({})
    .select(
      'name email phone employeeId role status vehicleSpecialization passportNumber passportExpireDate lastLogin createdAt'
    )
    .sort({ name: 1 })
    .lean();

  const now = new Date();
  const activeEmployees = employees.filter((emp) => emp.status === 'active');
  const inactiveEmployees = employees.filter((emp) => emp.status === 'inactive');

  const passportWatch = employees
    .filter((emp) => emp.status === 'active' && emp.passportExpireDate)
    .map((emp) => {
      const due = isPassportExpiryDue(emp.passportExpireDate, now);
      const days = require('../utils/dates').daysUntilUtc(
        emp.passportExpireDate,
        now
      );
      return {
        _id: emp._id,
        name: emp.name,
        employeeId: emp.employeeId,
        passportExpireDate: emp.passportExpireDate,
        daysUntilExpiry: days,
        expired: days !== null && days < 0,
        dueSoon: due
      };
    })
    .filter((item) => item.dueSoon)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  return {
    totals: {
      totalEmployees: employees.length,
      activeEmployees: activeEmployees.length,
      inactiveEmployees: inactiveEmployees.length,
      passportAlerts: passportWatch.length
    },
    employees,
    activeEmployees,
    inactiveEmployees,
    passportAlerts: passportWatch
  };
};

module.exports = {
  getDashboardStats,
  getHrDashboard
};

const Lead = require('../models/Lead');
const User = require('../models/User');
const Branch = require('../models/Branch');
const LeadFollowup = require('../models/LeadFollowup');
const { isEmployee, isAdmin } = require('../utils/roles');
const { isPassportExpiryDue } = require('../utils/dates');
const { getBranchFilter } = require('../utils/branchAccess');

const getDashboardStats = async (currentUser, queryParams = {}) => {
  const employeeUser = isEmployee(currentUser);
  const branchFilter = getBranchFilter(currentUser, queryParams.branchId || queryParams.branch);

  // Employees see only leads assigned to them within their branch
  const baseQuery = employeeUser
    ? { ...branchFilter, assignedTo: currentUser._id, isDeleted: { $ne: true } }
    : { ...branchFilter, isDeleted: { $ne: true } };

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
    .populate('branchId', 'name code')
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
    .populate('branchId', 'name code')
    .populate('assignedTo', 'name phone employeeId')
    .sort({ nextFollowUpDate: 1 })
    .limit(10)
    .lean();

  // Fetch Recent Leads (limit 6)
  const recentLeads = await Lead.find(baseQuery)
    .populate('branchId', 'name code')
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

  // Employee Performance (Admin and HR only; employees see nothing here)
  let employeePerformance = [];
  if (!employeeUser) {
    const empUserFilter = { status: 'active', role: 'employee' };
    if (!isAdmin(currentUser)) {
      // HR sees only employees belonging to their branch
      if (currentUser.branchId) {
        empUserFilter.branchId = currentUser.branchId._id || currentUser.branchId;
      }
    } else if (queryParams.branchId && queryParams.branchId !== 'all') {
      if (queryParams.branchId === 'unassigned') {
        empUserFilter.$or = [{ branchId: null }, { branchId: { $exists: false } }];
      } else {
        empUserFilter.branchId = queryParams.branchId;
      }
    }

    const employees = await User.find(empUserFilter).select('_id name employeeId role').lean();
    const empPerformancePromises = employees.map(async (emp) => {
      const [empTotal, empConverted, empLost, empFollowups] = await Promise.all([
        Lead.countDocuments({ assignedTo: emp._id, isDeleted: { $ne: true } }),
        Lead.countDocuments({ assignedTo: emp._id, status: 'Converted', isDeleted: { $ne: true } }),
        Lead.countDocuments({ assignedTo: emp._id, status: 'Lost', isDeleted: { $ne: true } }),
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

  // 6-Month Monthly Trends (Total, Converted, Lost)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const rawMonthlyTrends = await Lead.aggregate([
    { $match: { ...baseQuery, createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        total: { $sum: 1 },
        converted: {
          $sum: { $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0] }
        },
        lost: {
          $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] }
        }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Build last 6 months array ensuring all 6 months are present
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyTrends = [];
  const curr = new Date(sixMonthsAgo);
  for (let i = 0; i < 6; i++) {
    const yr = curr.getFullYear();
    const mo = curr.getMonth() + 1; // 1-indexed for aggregation matching
    const match = rawMonthlyTrends.find(m => m._id.year === yr && m._id.month === mo);

    monthlyTrends.push({
      month: monthNames[curr.getMonth()],
      fullYear: yr,
      total: match ? match.total : 0,
      converted: match ? match.converted : 0,
      lost: match ? match.lost : 0
    });
    curr.setMonth(curr.getMonth() + 1);
  }

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
    monthlyTrends,
    todayFollowupsList,
    overdueFollowupsList,
    recentLeads,
    employeePerformance,
    topPartsDemand: partDemand.map(p => ({ part: p._id, count: p.count })),
    topVehiclesDemand: vehicleDemand.map(v => ({ vehicle: v._id, count: v.count }))
  };
};

const getHrDashboard = async (currentUser, queryParams = {}) => {
  const branchFilter = getBranchFilter(currentUser, queryParams?.branchId || queryParams?.branch);

  const employees = await User.find(branchFilter)
    .populate('branchId', 'name code')
    .select(
      'name email phone employeeId role status vehicleSpecialization passportNumber passportExpireDate lastLogin createdAt branchId'
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

/**
 * Consolidated Branch Overview for Admin Dashboard.
 * Returns aggregated lead counts, workflow distribution, and follow-ups per branch.
 */
const getBranchOverview = async (currentUser, queryParams = {}) => {
  if (!isAdmin(currentUser)) {
    const error = new Error('Forbidden: Only administrators can access consolidated branch analytics.');
    error.statusCode = 403;
    throw error;
  }

  // 1. Fetch all branches (active and inactive)
  const branches = await Branch.find().sort({ name: 1 }).lean();

  // 2. Base query for leads (match active leads)
  const baseMatch = { isDeleted: { $ne: true } };

  // Optional date filter support if queryParams has startDate/endDate
  if (queryParams.startDate || queryParams.endDate) {
    baseMatch.createdAt = {};
    if (queryParams.startDate) {
      baseMatch.createdAt.$gte = new Date(queryParams.startDate);
    }
    if (queryParams.endDate) {
      baseMatch.createdAt.$lte = new Date(queryParams.endDate);
    }
  }

  // 3. Aggregate leads by branchId and status, followups logged, and employees per branch
  const [leadAgg, followupAgg, userAgg] = await Promise.all([
    Lead.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            branchId: '$branchId',
            status: '$status'
          },
          count: { $sum: 1 },
          scheduledFollowups: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$nextFollowUpDate', null] },
                    { $not: [{ $in: ['$status', ['Converted', 'Lost']] }] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]),
    LeadFollowup.aggregate([
      {
        $lookup: {
          from: 'leads',
          localField: 'leadId',
          foreignField: '_id',
          as: 'lead'
        }
      },
      { $unwind: '$lead' },
      {
        $group: {
          _id: '$lead.branchId',
          count: { $sum: 1 }
        }
      }
    ]),
    User.aggregate([
      {
        $group: {
          _id: '$branchId',
          totalEmployees: { $sum: 1 },
          activeEmployees: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      }
    ])
  ]);

  // Map employee counts by branch ID
  const employeeCountMap = {};
  userAgg.forEach((item) => {
    const bId = item._id ? item._id.toString() : 'unassigned';
    employeeCountMap[bId] = item.totalEmployees || 0;
  });

  // Map follow-up counts by branch ID
  const followupsLoggedMap = {};
  followupAgg.forEach((item) => {
    const bId = item._id ? item._id.toString() : 'unassigned';
    followupsLoggedMap[bId] = item.count;
  });

  // Map leads by branch ID
  const branchStatsMap = {};
  const unassignedStats = {
    branchId: 'unassigned',
    branchName: 'Unassigned / Legacy',
    branchCode: 'N/A',
    status: 'active',
    totalLeads: 0,
    newLeads: 0,
    contacted: 0,
    followUp: 0,
    quotation: 0,
    interested: 0,
    converted: 0,
    lost: 0,
    scheduledFollowups: 0,
    followupsLogged: followupsLoggedMap['unassigned'] || 0,
    totalEmployees: employeeCountMap['unassigned'] || 0
  };

  leadAgg.forEach((item) => {
    const rawBranchId = item._id.branchId ? item._id.branchId.toString() : null;
    const status = item._id.status;
    const count = item.count;
    const scheduled = item.scheduledFollowups || 0;

    const target = rawBranchId
      ? (branchStatsMap[rawBranchId] = branchStatsMap[rawBranchId] || {
          totalLeads: 0,
          newLeads: 0,
          contacted: 0,
          followUp: 0,
          quotation: 0,
          interested: 0,
          converted: 0,
          lost: 0,
          scheduledFollowups: 0,
          followupsLogged: followupsLoggedMap[rawBranchId] || 0
        })
      : unassignedStats;

    target.totalLeads += count;
    target.scheduledFollowups += scheduled;

    if (status === 'New') target.newLeads += count;
    else if (status === 'Contacted') target.contacted += count;
    else if (status === 'Followup' || status === 'Follow Up') target.followUp += count;
    else if (status === 'Quotation') target.quotation += count;
    else if (status === 'Interested') target.interested += count;
    else if (status === 'Converted') target.converted += count;
    else if (status === 'Lost') target.lost += count;
    else {
      target.newLeads += count;
    }
  });

  const branchOverview = branches.map((b) => {
    const bId = b._id.toString();
    const stats = branchStatsMap[bId] || {
      totalLeads: 0,
      newLeads: 0,
      contacted: 0,
      followUp: 0,
      quotation: 0,
      interested: 0,
      converted: 0,
      lost: 0,
      scheduledFollowups: 0,
      followupsLogged: followupsLoggedMap[bId] || 0
    };

    const conversionRate =
      stats.totalLeads > 0
        ? ((stats.converted / stats.totalLeads) * 100).toFixed(1)
        : '0.0';

    return {
      branchId: bId,
      branchName: b.name,
      branchCode: b.code,
      status: b.status || 'active',
      phone: b.phone || '',
      email: b.email || '',
      totalLeads: stats.totalLeads,
      newLeads: stats.newLeads,
      contacted: stats.contacted,
      followUp: stats.followUp,
      quotation: stats.quotation,
      interested: stats.interested,
      converted: stats.converted,
      lost: stats.lost,
      scheduledFollowups: stats.scheduledFollowups,
      followupsLogged: stats.followupsLogged,
      totalEmployees: employeeCountMap[bId] || 0,
      conversionRate
    };
  });

  // Calculate totals across all branches
  const totalBranches = branches.length;
  const activeBranches = branches.filter((b) => b.status === 'active').length;
  const totalLeadsAcrossBranches =
    branchOverview.reduce((sum, b) => sum + b.totalLeads, 0) + unassignedStats.totalLeads;
  const totalConverted =
    branchOverview.reduce((sum, b) => sum + b.converted, 0) + unassignedStats.converted;
  const totalLost =
    branchOverview.reduce((sum, b) => sum + b.lost, 0) + unassignedStats.lost;
  const totalFollowups =
    branchOverview.reduce((sum, b) => sum + b.followUp, 0) + unassignedStats.followUp;
  const totalFollowupsLogged =
    branchOverview.reduce((sum, b) => sum + b.followupsLogged, 0) + unassignedStats.followupsLogged;
  const totalEmployeesAcrossBranches =
    branchOverview.reduce((sum, b) => sum + b.totalEmployees, 0) + unassignedStats.totalEmployees;

  const overallConversionRate =
    totalLeadsAcrossBranches > 0
      ? ((totalConverted / totalLeadsAcrossBranches) * 100).toFixed(1)
      : '0.0';

  if (unassignedStats.totalLeads > 0) {
    unassignedStats.conversionRate = (
      (unassignedStats.converted / unassignedStats.totalLeads) *
      100
    ).toFixed(1);
  }

  return {
    summary: {
      totalBranches,
      activeBranches,
      totalLeads: totalLeadsAcrossBranches,
      totalConverted,
      totalLost,
      totalFollowups,
      totalFollowupsLogged,
      totalEmployees: totalEmployeesAcrossBranches,
      overallConversionRate
    },
    branches: branchOverview,
    unassigned: unassignedStats.totalLeads > 0 ? unassignedStats : null
  };
};

module.exports = {
  getDashboardStats,
  getHrDashboard,
  getBranchOverview
};

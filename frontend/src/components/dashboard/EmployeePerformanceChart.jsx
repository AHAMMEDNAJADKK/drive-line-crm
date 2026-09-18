import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Award } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const emp = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 rounded-xl shadow-lg text-xs space-y-1">
        <p className="font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-1 mb-1">
          {label} ({emp.role || 'Sales'})
        </p>
        <div className="flex justify-between gap-4 text-gray-600 dark:text-gray-300">
          <span>Total Leads:</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{emp.totalLeads}</span>
        </div>
        <div className="flex justify-between gap-4 text-emerald-600 dark:text-emerald-400 font-medium">
          <span>Converted:</span>
          <span className="font-semibold">{emp.converted}</span>
        </div>
        <div className="flex justify-between gap-4 text-red-600 dark:text-red-400 font-medium">
          <span>Lost:</span>
          <span className="font-semibold">{emp.lost}</span>
        </div>
        <div className="flex justify-between gap-4 text-indigo-600 dark:text-indigo-400 font-bold pt-1 border-t border-gray-100 dark:border-gray-700">
          <span>Conversion Rate:</span>
          <span>{emp.conversionRate}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function EmployeePerformanceChart({ employeePerformance = [] }) {
  if (!employeePerformance || employeePerformance.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
        No employee performance data available
      </div>
    );
  }

  const chartData = employeePerformance.slice(0, 6).map(emp => ({
    name: emp.name.split(' ')[0],
    fullName: emp.name,
    role: emp.role,
    totalLeads: emp.totalLeads,
    converted: emp.converted,
    lost: emp.lost,
    conversionRate: emp.conversionRate
  }));

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            Employee Performance Overview
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Leads assigned vs converted per team member
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.15} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} formatter={(value) => (
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mr-2">{value}</span>
            )} />
            <Bar dataKey="totalLeads" name="Total Assigned" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={16} />
            <Bar dataKey="converted" name="Converted" fill="#10B981" radius={[4, 4, 0, 0]} barSize={16} />
            <Bar dataKey="lost" name="Lost" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

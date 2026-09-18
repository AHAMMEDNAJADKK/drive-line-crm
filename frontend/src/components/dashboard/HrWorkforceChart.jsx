import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Users } from 'lucide-react';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-2.5 rounded-xl shadow-lg text-xs font-semibold">
        <span style={{ color: data.payload.fill }}>{data.name}: </span>
        <span className="text-gray-900 dark:text-gray-100">{data.value} employees</span>
      </div>
    );
  }
  return null;
};

export default function HrWorkforceChart({ activeCount = 0, inactiveCount = 0 }) {
  const total = activeCount + inactiveCount;
  const data = [
    { name: 'Active Employees', value: activeCount, fill: '#10B981' },
    { name: 'Inactive Employees', value: inactiveCount, fill: '#6B7280' },
  ].filter(item => item.value > 0);

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500" />
          Workforce Status Ratio
        </h3>
        <span className="text-xs font-medium text-gray-500">Total: {total}</span>
      </div>

      {total === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          No employee records available
        </div>
      ) : (
        <div className="relative h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} formatter={(value) => (
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{value}</span>
              )} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 top-[-20px] pointer-events-none flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{total}</span>
            <span className="text-[10px] uppercase font-semibold text-gray-400">Total</span>
          </div>
        </div>
      )}
    </div>
  );
}

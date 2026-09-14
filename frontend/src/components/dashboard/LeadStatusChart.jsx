import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

const STATUS_COLOR_MAP = {
  New: '#3B82F6',
  Contacted: '#6366F1',
  Followup: '#F59E0B',
  Quotation: '#8B5CF6',
  Converted: '#10B981',
  Lost: '#EF4444',
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-2.5 rounded-xl shadow-lg text-xs">
        <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.payload.fill || data.color }} />
          <span>{data.name}</span>
        </div>
        <div className="mt-1 text-gray-600 dark:text-gray-300 font-semibold">
          {data.value} leads ({data.payload.percentage}%)
        </div>
      </div>
    );
  }
  return null;
};

export default function LeadStatusChart({ statusBreakdown, totalLeads, onSelectStatus }) {
  if (!statusBreakdown || statusBreakdown.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
        No status data available
      </div>
    );
  }

  const chartData = statusBreakdown
    .filter(item => item.count > 0)
    .map(item => ({
      name: item.status,
      value: item.count,
      percentage: totalLeads > 0 ? ((item.count / totalLeads) * 100).toFixed(1) : '0',
      fill: STATUS_COLOR_MAP[item.status] || item.color || '#6B7280'
    }));

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <PieChartIcon className="w-4 h-4 text-indigo-500" />
          Lead Pipeline Breakdown
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          Total: {totalLeads}
        </span>
      </div>

      {chartData.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
          No active leads in pipeline
        </div>
      ) : (
        <div className="relative h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                onClick={(entry) => onSelectStatus && onSelectStatus(entry.name)}
                cursor="pointer"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer">
                    {value}
                  </span>
                )}
                onClick={(e) => onSelectStatus && onSelectStatus(e.value)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 top-[-28px] pointer-events-none flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalLeads}</span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-400 dark:text-gray-500">Leads</span>
          </div>
        </div>
      )}
    </div>
  );
}

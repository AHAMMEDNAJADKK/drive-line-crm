import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 rounded-xl shadow-lg text-xs space-y-1">
        <p className="font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-1 mb-1">
          {label}
        </p>
        {payload.map((item, index) => (
          <div key={index} className="flex items-center justify-between gap-4 text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}:
            </span>
            <span className="font-bold text-gray-900 dark:text-gray-100">{item.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function LeadTrendChart({ monthlyTrends }) {
  if (!monthlyTrends || monthlyTrends.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
        No monthly trend data available
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Lead Acquisition & Conversion Trend
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Last 6 months growth performance
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="convertedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.15} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} formatter={(value) => (
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mr-2">{value}</span>
            )} />
            <Area
              type="monotone"
              dataKey="total"
              name="Total Leads"
              stroke="#6366F1"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#totalGradient)"
            />
            <Area
              type="monotone"
              dataKey="converted"
              name="Converted"
              stroke="#10B981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#convertedGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

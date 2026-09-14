import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Wrench, Car } from 'lucide-react';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-2.5 rounded-xl shadow-lg text-xs">
        <p className="font-semibold text-gray-900 dark:text-gray-100">{data.payload.name}</p>
        <p className="text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
          {data.value} requests
        </p>
      </div>
    );
  }
  return null;
};

export default function PartsDemandChart({ topPartsDemand = [], topVehiclesDemand = [] }) {
  const [activeTab, setActiveTab] = useState('parts');

  const partsData = topPartsDemand.map(item => ({
    name: item.part,
    count: item.count
  }));

  const vehiclesData = topVehiclesDemand.map(item => ({
    name: item.vehicle,
    count: item.count
  }));

  const currentData = activeTab === 'parts' ? partsData : vehiclesData;

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          {activeTab === 'parts' ? (
            <Wrench className="w-4 h-4 text-indigo-500" />
          ) : (
            <Car className="w-4 h-4 text-purple-500" />
          )}
          Demand Analytics
        </h3>

        <div className="flex bg-gray-100 dark:bg-gray-700/60 p-0.5 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveTab('parts')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              activeTab === 'parts'
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Parts ({topPartsDemand.length})
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              activeTab === 'vehicles'
                ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Vehicles ({topVehiclesDemand.length})
          </button>
        </div>
      </div>

      {currentData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
          No {activeTab} demand data recorded
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={currentData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={18}>
                {currentData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={activeTab === 'parts' ? '#6366F1' : '#8B5CF6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

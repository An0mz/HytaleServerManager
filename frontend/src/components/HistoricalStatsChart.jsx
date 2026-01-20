import React from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export function HistoricalStatsChart({ title, data, dataKey, color, unit = '', maxValue }) {
  const formatValue = (value) => {
    if (unit === '%') {
      return `${value.toFixed(1)}${unit}`;
    } else if (unit === 'MB') {
      return `${Math.round(value)} ${unit}`;
    }
    return value;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {label}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {title}: <span className="font-bold" style={{ color }}>{formatValue(payload[0].value)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>Last 100 data points (approx. 8 minutes)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis 
              dataKey="timestamp" 
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              }}
            />
            <YAxis 
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              domain={maxValue ? [0, maxValue] : ['auto', 'auto']}
              tickFormatter={formatValue}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${dataKey})`}
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CombinedStatsChart({ cpuData, memoryData }) {
  const formatValue = (value, type) => {
    if (type === 'cpu') return `${value.toFixed(1)}%`;
    if (type === 'memory') return `${Math.round(value)} MB`;
    return value;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            {new Date(label).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
              {entry.name}: <span className="font-bold" style={{ color: entry.color }}>
                {formatValue(entry.value, entry.dataKey)}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Combine data by timestamp
  const combinedData = cpuData.map((cpu, index) => ({
    timestamp: cpu.timestamp,
    cpu: cpu.cpu,
    memory: memoryData[index]?.memory || 0
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Combined Server Stats</CardTitle>
        <CardDescription>CPU and Memory usage over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={combinedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis
              dataKey="timestamp"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              }}
            />
            <YAxis
              yAxisId="left"
              stroke="#10B981"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#3B82F6"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `${Math.round(value)} MB`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="cpu"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              name="CPU"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="memory"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              name="Memory"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

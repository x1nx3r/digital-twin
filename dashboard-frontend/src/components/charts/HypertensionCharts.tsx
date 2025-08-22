"use client";

import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, TrendingUp, Users, Activity } from "lucide-react";

interface HypertensionChartsProps {
  ageDistribution: Record<string, number>;
  trends: Array<{
    dates: string[];
    values: number[];
    metric_name: string;
  }>;
  metrics: {
    total_adults: number;
    adults_on_treatment: number;
    participation_rate: number;
    avg_bp_reduction: number;
    program_cost: number;
    cost_per_participant: number;
  };
}

export function HypertensionCharts({ ageDistribution, trends, metrics }: HypertensionChartsProps) {
  // Prepare age distribution data
  const ageData = Object.entries(ageDistribution).map(([range, count]) => ({
    range,
    count,
    percentage: metrics.total_adults > 0 ? ((count / metrics.total_adults) * 100).toFixed(1) : "0",
  }));

  // Prepare BP trend data
  const bpTrend = trends.find(t => t.metric_name === "avg_blood_pressure");
  const bpData = bpTrend ? bpTrend.dates.map((date, index) => ({
    date: new Date(date).toLocaleDateString(),
    bp: bpTrend.values[index],
  })) : [];

  // Prepare participation data
  const participationData = [
    { name: 'On Treatment', value: metrics.adults_on_treatment, color: '#10B981' },
    { name: 'Not on Treatment', value: metrics.total_adults - metrics.adults_on_treatment, color: '#EF4444' },
  ];

  // Prepare participation trend data
  const participationTrend = trends.find(t => t.metric_name === "htn_participation_rate");
  const participationTrendData = participationTrend ? participationTrend.dates.map((date, index) => ({
    date: new Date(date).toLocaleDateString(),
    rate: (participationTrend.values[index] * 100).toFixed(1),
  })) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center space-x-3"
      >
        <div className="p-3 bg-red-50 rounded-lg">
          <Heart className="h-6 w-6 text-red-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hypertension Program Analytics</h2>
          <p className="text-gray-600">Adult blood pressure management and treatment outcomes</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Distribution Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-red-600" />
                <span>Age Distribution</span>
                <span className="text-sm text-gray-500">({metrics.total_adults} adults)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ageData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={{ stroke: '#E5E7EB' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <p className="font-medium text-gray-900">{data.range} years</p>
                            <p className="text-red-600">Count: <span className="font-semibold">{data.count}</span></p>
                            <p className="text-gray-600">Percentage: {data.percentage}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#EF4444" 
                    radius={[4, 4, 0, 0]}
                    className="drop-shadow-sm"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Treatment Participation Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-red-600" />
                <span>Treatment Participation</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={participationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {participationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <p className="font-medium text-gray-900">{data.name}</p>
                            <p style={{ color: data.color }}>
                              Count: <span className="font-semibold">{data.value}</span>
                            </p>
                            <p className="text-gray-600">
                              Rate: {((data.value / metrics.total_adults) * 100).toFixed(1)}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center space-x-6 mt-4">
                {participationData.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    <span className="text-sm text-gray-500">({item.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Blood Pressure and Participation Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blood Pressure Trend */}
        {bpData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-red-600" />
                  <span>Blood Pressure Trends</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={bpData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      tickLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      tickLine={{ stroke: '#E5E7EB' }}
                      axisLine={{ stroke: '#E5E7EB' }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload[0]) {
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                              <p className="font-medium text-gray-900">{label}</p>
                              <p className="text-red-600">
                                Avg BP: <span className="font-semibold">{payload[0].value?.toFixed(1)} mmHg</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bp"
                      stroke="#EF4444"
                      strokeWidth={3}
                      dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#EF4444', strokeWidth: 2, fill: '#fff' }}
                      className="drop-shadow-sm"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Participation Rate Trend */}
        {participationTrendData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  <span>Participation Rate Trends</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={participationTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      tickLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      tickLine={{ stroke: '#E5E7EB' }}
                      axisLine={{ stroke: '#E5E7EB' }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload[0]) {
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                              <p className="font-medium text-gray-900">{label}</p>
                              <p className="text-green-600">
                                Participation: <span className="font-semibold">{payload[0].value}%</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2, fill: '#fff' }}
                      className="drop-shadow-sm"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

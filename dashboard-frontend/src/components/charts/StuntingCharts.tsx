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
import { Baby, TrendingUp, Users, Activity } from "lucide-react";

interface StuntingChartsProps {
  ageDistribution: Record<string, number>;
  trends: Array<{
    dates: string[];
    values: number[];
    metric_name: string;
  }>;
  metrics: {
    total_children: number;
    children_on_program: number;
    participation_rate: number;
    avg_haz_improvement: number;
    program_cost: number;
    cost_per_participant: number;
  };
}

export function StuntingCharts({ ageDistribution, trends, metrics }: StuntingChartsProps) {
  // Prepare age distribution data
  const ageData = Object.entries(ageDistribution).map(([range, count]) => ({
    range,
    count,
    percentage: metrics.total_children > 0 ? ((count / metrics.total_children) * 100).toFixed(1) : "0",
  }));

  // Prepare HAZ trend data
  const hazTrend = trends.find(t => t.metric_name === "avg_haz_score");
  const hazData = hazTrend ? hazTrend.dates.map((date, index) => ({
    date: new Date(date).toLocaleDateString(),
    haz: hazTrend.values[index],
  })) : [];

  // Prepare participation data
  const participationData = [
    { name: 'On Program', value: metrics.children_on_program, color: '#3B82F6' },
    { name: 'Not on Program', value: metrics.total_children - metrics.children_on_program, color: '#F59E0B' },
  ];

  // Prepare participation trend data
  const participationTrend = trends.find(t => t.metric_name === "stunting_participation_rate");
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
        <div className="p-3 bg-blue-50 rounded-lg">
          <Baby className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Child Stunting Program Analytics</h2>
          <p className="text-gray-600">Child nutrition and growth monitoring outcomes</p>
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
                <Users className="h-5 w-5 text-blue-600" />
                <span>Age Distribution</span>
                <span className="text-sm text-gray-500">({metrics.total_children} children)</span>
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
                            <p className="font-medium text-gray-900">{data.range}</p>
                            <p className="text-blue-600">Count: <span className="font-semibold">{data.count}</span></p>
                            <p className="text-gray-600">Percentage: {data.percentage}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#3B82F6" 
                    radius={[4, 4, 0, 0]}
                    className="drop-shadow-sm"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Program Participation Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <span>Program Participation</span>
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
                              Rate: {((data.value / metrics.total_children) * 100).toFixed(1)}%
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

      {/* HAZ Score and Participation Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HAZ Score Trend */}
        {hazData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span>HAZ Score Trends</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={hazData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                              <p className="text-blue-600">
                                Avg HAZ: <span className="font-semibold">{payload[0].value?.toFixed(2)}</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="haz"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2, fill: '#fff' }}
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

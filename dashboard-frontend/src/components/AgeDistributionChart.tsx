import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface AgeDistributionChartProps {
  data: Record<string, number> | undefined
}

export default function AgeDistributionChart({ data }: AgeDistributionChartProps) {
  // Handle undefined or empty data
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No age distribution data available
      </div>
    )
  }

  const chartData = Object.entries(data).map(([range, count]) => ({
    range,
    count,
  }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="range" 
          fontSize={12}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis fontSize={12} />
        <Tooltip />
        <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface ProgramsCardProps {
  data: Record<string, number> | undefined
}

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#F97316']

export default function ProgramsCard({ data }: ProgramsCardProps) {
  // Handle undefined or empty data
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No program distribution data available
      </div>
    )
  }

  const chartData = Object.entries(data).map(([program, count]) => ({
    name: program.replace(/_/g, ' ').toUpperCase(),
    value: count,
  }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}

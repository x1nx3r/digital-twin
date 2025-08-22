import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface TrendData {
  dates: string[]
  values: number[]
  metric_name: string
}

interface TrendsChartProps {
  data: TrendData[]
}

export default function TrendsChart({ data }: TrendsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No trend data available
      </div>
    )
  }

  // Combine all trend data into a single chart dataset
  const allDates = data[0]?.dates || []
  
  const chartData = allDates.map((date, index) => {
    const dataPoint: Record<string, string | number> = { date }
    
    data.forEach((trend) => {
      const key = trend.metric_name.replace(/\s+/g, '_').toLowerCase()
      dataPoint[key] = trend.values[index] || 0
    })
    
    return dataPoint
  })

  // Define colors for different metrics
  const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444']

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          fontSize={12}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis fontSize={12} />
        <Tooltip />
        {data.map((trend, index) => {
          const key = trend.metric_name.replace(/\s+/g, '_').toLowerCase()
          return (
            <Line 
              key={key}
              type="monotone" 
              dataKey={key} 
              stroke={colors[index % colors.length]} 
              strokeWidth={2}
              name={trend.metric_name}
            />
          )
        })}
      </LineChart>
    </ResponsiveContainer>
  )
}

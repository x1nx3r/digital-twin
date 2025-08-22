import { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  children: ReactNode
}

export default function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-64">
        {children}
      </div>
    </div>
  )
}

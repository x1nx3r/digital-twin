import { LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'

interface MetricCardProps {
  title: string
  value: number
  icon: LucideIcon
  color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'emerald'
  format: 'number' | 'percentage' | 'currency'
  subtitle?: string
}

const colorVariants = {
  blue: 'bg-blue-500 text-blue-50',
  green: 'bg-green-500 text-green-50',
  purple: 'bg-purple-500 text-purple-50',
  orange: 'bg-orange-500 text-orange-50',
  indigo: 'bg-indigo-500 text-indigo-50',
  emerald: 'bg-emerald-500 text-emerald-50',
}

const formatValue = (value: number, format: string) => {
  switch (format) {
    case 'percentage':
      return `${value.toFixed(1)}%`
    case 'currency':
      return `Rp ${value.toLocaleString('id-ID')}`
    case 'number':
    default:
      return value.toLocaleString()
  }
}

export default function MetricCard({ title, value, icon: Icon, color, format, subtitle }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-1">
            {formatValue(value, format)}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={clsx(
          'p-3 rounded-lg',
          colorVariants[color]
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

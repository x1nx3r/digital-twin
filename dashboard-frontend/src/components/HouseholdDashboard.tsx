'use client'

import { useState, useEffect } from 'react'
import { Users, TrendingUp, DollarSign } from 'lucide-react'
import MetricCard from './MetricCard'
import ChartCard from './ChartCard'
import { LoadingState, ErrorState } from './LoadingStates'

interface HouseholdData {
  summary_metrics: {
    household_members: number
    program_participants: number
    participation_rate: number
    avg_outcome_improvement: number
    total_program_cost: number
    household_income: number
  }
  members: Array<{
    person_id: string
    name: string
    age: number
    gender: string
    health_condition: string
    programs: string[]
  }>
}

interface HouseholdDashboardProps {
  householdId: string
}

export default function HouseholdDashboard({ householdId }: HouseholdDashboardProps) {
  const [data, setData] = useState<HouseholdData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`http://localhost:8091/dashboard/household/${householdId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch household data')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (householdId) {
      fetchData()
    }
  }, [householdId])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={fetchData} />
  if (!data) return <ErrorState message="No household data available" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Household {householdId}
        </h2>
      </div>

      {/* Household Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Household Members"
          value={data.summary_metrics.household_members}
          icon={Users}
          color="blue"
          format="number"
        />
        <MetricCard
          title="Program Participants"
          value={data.summary_metrics.program_participants}
          icon={TrendingUp}
          color="green"
          format="number"
        />
        <MetricCard
          title="Participation Rate"
          value={data.summary_metrics.participation_rate}
          icon={TrendingUp}
          color="purple"
          format="percentage"
        />
        <MetricCard
          title="Monthly Income"
          value={data.summary_metrics.household_income}
          icon={DollarSign}
          color="emerald"
          format="currency"
        />
      </div>

      {/* Household Members */}
      <ChartCard title="Household Members">
        <div className="space-y-4 max-h-64 overflow-y-auto">
          {data.members?.map((member) => (
            <div key={member.person_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{member.name}</h4>
                <p className="text-sm text-gray-600">
                  Age: {member.age} • {member.gender} • {member.health_condition}
                </p>
                {member.programs.length > 0 && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {member.programs.map((program, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          {program.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  )
}

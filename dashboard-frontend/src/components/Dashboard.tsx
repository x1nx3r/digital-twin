'use client'

import { useState, useEffect } from 'react'
import { Activity, Users, TrendingUp, AlertTriangle, Heart } from 'lucide-react'
import MetricCard from './MetricCard'
import ChartCard from './ChartCard'
import ProgramsCard from './ProgramsCard'
import AgeDistributionChart from './AgeDistributionChart'
import TrendsChart from './TrendsChart'
import { apiFetch, API_ENDPOINTS } from '@/lib/api'

interface DashboardData {
  summary_metrics: {
    total_participants: number
    program_participants: number
    participation_rate: number
    avg_outcome_improvement: number
    total_program_cost: number
    cost_per_participant: number
  }
  distribution_data: {
    age_distribution?: Record<string, number>
    program_distribution?: Record<string, number>
    household_income_stats?: Record<string, number>
  }
  trends: Array<{
    dates: string[]
    values: number[]
    metric_name: string
  }>
  alerts: string[]
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDusun, setSelectedDusun] = useState<string>('overall')
  const [dusuns, setDusuns] = useState<string[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const endpoint = selectedDusun === 'overall' 
          ? API_ENDPOINTS.DASHBOARD_OVERALL()
          : API_ENDPOINTS.DASHBOARD_DUSUN(selectedDusun)
        
        const response = await apiFetch(endpoint)
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchDusuns = async () => {
      try {
        const response = await apiFetch(API_ENDPOINTS.DUSUNS())
        const result = await response.json()
        setDusuns(['overall', ...result.dusuns])
      } catch (error) {
        console.error('Failed to fetch dusuns:', error)
      }
    }

    fetchData()
    fetchDusuns()
  }, [selectedDusun])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat dasbor...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Gagal memuat data dasbor</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Digital Twin Kesehatan Desa
              </h1>
              <p className="text-gray-600">
                Dasbor Manajemen Program Kesehatan Desa
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
      <select
                value={selectedDusun}
                onChange={(e) => setSelectedDusun(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {dusuns.map((dusun) => (
                  <option key={dusun} value={dusun}>
        {dusun === 'overall' ? 'Seluruh Dusun' : dusun}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
            title="Total Partisipan"
            value={data.summary_metrics.total_participants}
            icon={Users}
            color="blue"
            format="number"
          />
          <MetricCard
            title="Partisipan Program"
            value={data.summary_metrics.program_participants}
            icon={Heart}
            color="green"
            format="number"
          />
          <MetricCard
            title="Tingkat Partisipasi"
            value={data.summary_metrics.participation_rate}
            icon={TrendingUp}
            color="purple"
            format="percentage"
          />
          <MetricCard
            title="Rata-rata Perbaikan"
            value={data.summary_metrics.avg_outcome_improvement}
            icon={Activity}
            color="orange"
            format="percentage"
          />
        </div>

        {/* Cost Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <MetricCard
            title="Total Biaya Program"
            value={data.summary_metrics.total_program_cost}
            icon={TrendingUp}
            color="indigo"
            format="currency"
            subtitle="Total investasi dalam program kesehatan"
          />
          <MetricCard
            title="Biaya per Partisipan"
            value={data.summary_metrics.cost_per_participant}
            icon={Users}
            color="emerald"
            format="currency"
            subtitle="Rata-rata efektivitas biaya"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartCard title="Distribusi Usia">
            <AgeDistributionChart data={data.distribution_data.age_distribution} />
          </ChartCard>
          
          <ChartCard title="Distribusi Program">
            <ProgramsCard data={data.distribution_data.program_distribution} />
          </ChartCard>
        </div>

        {/* Trends Chart */}
        {data.trends && data.trends.length > 0 && (
          <div className="mb-8">
            <ChartCard title="Tren Hasil Kesehatan">
              <TrendsChart data={data.trends} />
            </ChartCard>
          </div>
        )}

        {/* Alerts */}
        {data.alerts && data.alerts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              Peringatan Kesehatan
            </h3>
            <div className="space-y-3">
              {data.alerts.map((alert, index) => {
                // Determine severity based on alert content
                const getSeverity = (alertText: string) => {
                  if (alertText.includes('🔴') || alertText.includes('High cost')) return 'high'
                  if (alertText.includes('⚠️') || alertText.includes('Low participation')) return 'medium'
                  return 'low'
                }
                
                const severity = getSeverity(alert)
                
                return (
                  <div
                    key={`alert-${index}`}
                    className={`p-4 rounded-lg border-l-4 ${
                      severity === 'high'
                        ? 'bg-red-50 border-red-400 text-red-700'
                        : severity === 'medium'
                        ? 'bg-yellow-50 border-yellow-400 text-yellow-700'
                        : 'bg-blue-50 border-blue-400 text-blue-700'
                    }`}
                  >
                    <p className="font-medium">{alert}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

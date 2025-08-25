"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/ui/MetricCard";
import { HypertensionCharts } from "@/components/charts/HypertensionCharts";
import { StuntingCharts } from "@/components/charts/StuntingCharts";
import { RiskFactorsAnalysis } from "@/components/RiskFactorsAnalysis";
import PredictionDashboard from "@/components/PredictionDashboard";
import { TimePeriodSelector } from "@/components/TimePeriodSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiFetch, API_ENDPOINTS } from "@/lib/api";
import {
  Heart,
  Baby,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  AlertCircle,
  Building2,
  Home,
  Shield,
  Brain,
} from "lucide-react";

// Types
interface DashboardData {
  hypertension_section: {
    metrics: {
      total_adults: number;
      adults_on_treatment: number;
      participation_rate: number;
      avg_bp_reduction: number;
      program_cost: number;
      cost_per_participant: number;
    };
    age_distribution: Record<string, number>;
    trends: Array<{
      dates: string[];
      values: number[];
      metric_name: string;
    }>;
    cost_analysis: {
      total_cost: number;
      cost_per_participant: number;
      cost_effectiveness: number;
    };
  };
  stunting_section: {
    metrics: {
      total_children: number;
      children_on_program: number;
      participation_rate: number;
      avg_haz_improvement: number;
      program_cost: number;
      cost_per_participant: number;
    };
    age_distribution: Record<string, number>;
    trends: Array<{
      dates: string[];
      values: number[];
      metric_name: string;
    }>;
    cost_analysis: {
      total_cost: number;
      cost_per_participant: number;
      cost_effectiveness: number;
    };
  };
  combined_metrics: {
    total_participants: number;
    total_program_participants: number;
    overall_participation_rate: number;
    total_program_cost: number;
    program_distribution: Record<string, number>;
    cost_trends: Array<{
      dates: string[];
      values: number[];
      metric_name: string;
    }>;
  };
  alerts: string[];
  time_info: {
    period_months: number;
    start_date: string;
    end_date: string;
    current_date: string;
    period_label: string;
    dusun_id?: string;
    household_id?: string;
  };
}

interface Household {
  household_id: string;
  pendapatan_rt: number;
  jumlah_anggota: number;
}

export default function ModernDashboard() {
  const [activeView, setActiveView] = useState<"overall" | "dusun" | "household">("overall");
  const [selectedDusun, setSelectedDusun] = useState<string>("Dusun_A");
  const [selectedHousehold, setSelectedHousehold] = useState<string>("HH001");
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>("12");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dusuns = ["Dusun_A", "Dusun_B", "Dusun_C", "Dusun_D"];

  // Mengambil daftar rumah tangga
  const fetchHouseholds = async () => {
    try {
      const response = await apiFetch(API_ENDPOINTS.HOUSEHOLDS_DATA());
      if (response.ok) {
        const data = await response.json();
        setHouseholds(data.households || []);
      }
    } catch (err) {
      console.error("Gagal mengambil data rumah tangga:", err);
    }
  };

  useEffect(() => {
    fetchHouseholds();
  }, []);

  // Set first available household if current selection doesn't exist
  useEffect(() => {
    if (households.length > 0 && !households.find(h => h.household_id === selectedHousehold)) {
      setSelectedHousehold(households[0].household_id);
    }
  }, [households, selectedHousehold]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let endpoint = "";
        
        switch (activeView) {
          case "overall":
            endpoint = API_ENDPOINTS.DASHBOARD_OVERALL() + `&time_period=${selectedTimePeriod}`;
            break;
          case "dusun":
            endpoint = API_ENDPOINTS.DASHBOARD_DUSUN(selectedDusun) + `&time_period=${selectedTimePeriod}`;
            break;
          case "household":
            endpoint = API_ENDPOINTS.DASHBOARD_HOUSEHOLD(selectedHousehold) + `&time_period=${selectedTimePeriod}`;
            break;
        }

        const response = await apiFetch(endpoint);
        if (!response.ok) {
          throw new Error(`API error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal mengambil data dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeView, selectedDusun, selectedHousehold, selectedTimePeriod]);

  const handleViewChange = (view: "overall" | "dusun" | "household") => {
    setActiveView(view);
  };

  if (loading) {
    return (
      <DashboardLayout 
        activeView={activeView} 
        onViewChange={handleViewChange}
        selectedDusun={selectedDusun}
        selectedHousehold={selectedHousehold}
        alerts={[]}
      >
        <div className="flex items-center justify-center h-full min-h-screen">
          <div className="text-center bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-blue-200/50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-blue-800 font-medium">Memuat data dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout 
        activeView={activeView} 
        onViewChange={handleViewChange}
        selectedDusun={selectedDusun}
        selectedHousehold={selectedHousehold}
        alerts={[]}
      >
        <div className="flex items-center justify-center h-full min-h-screen">
          <div className="text-center bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-red-200/50">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Gagal memuat dashboard</p>
            <p className="text-gray-600 text-sm mt-2">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!dashboardData) return null;

  return (
    <DashboardLayout 
      activeView={activeView} 
      onViewChange={handleViewChange}
      selectedDusun={selectedDusun}
      selectedHousehold={selectedHousehold}
      alerts={dashboardData.alerts}
    >
      <div className="min-h-screen p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between bg-white/70 backdrop-blur-lg rounded-3xl p-6 shadow-xl border border-blue-200/50"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-800 to-indigo-800 bg-clip-text text-transparent">
              {activeView === "overall" && "Tinjauan Sistem"}
              {activeView === "dusun" && `Analisis Dusun ${selectedDusun}`}
              {activeView === "household" && `Profil Rumah Tangga ${selectedHousehold}`}
            </h1>
            <p className="text-blue-600 mt-1 font-medium">
              {activeView === "overall" && "Pemantauan lengkap program kesehatan di semua wilayah"}
              {activeView === "dusun" && "Metrik kesehatan terperinci untuk wilayah desa ini"}
              {activeView === "household" && "Partisipasi program kesehatan rumah tangga individual"}
            </p>
          </div>

          {/* View-specific controls */}
          <div className="flex space-x-4 mt-4 lg:mt-0">
            {activeView === "dusun" && (
              <Select value={selectedDusun} onValueChange={setSelectedDusun}>
                <SelectTrigger className="w-[180px] bg-white/80 backdrop-blur-sm border-blue-200 hover:border-blue-300 transition-colors">
                  <Building2 className="h-4 w-4 mr-2 text-blue-600" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-lg border-blue-200">
                  {dusuns.map((dusun) => (
                    <SelectItem key={dusun} value={dusun} className="hover:bg-blue-50">
                      {dusun}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {activeView === "household" && (
              <Select value={selectedHousehold} onValueChange={setSelectedHousehold}>
                <SelectTrigger className="w-[180px] bg-white/80 backdrop-blur-sm border-blue-200 hover:border-blue-300 transition-colors">
                  <Home className="h-4 w-4 mr-2 text-blue-600" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-lg border-blue-200">
                  {households.map((household) => (
                    <SelectItem key={household.household_id} value={household.household_id} className="hover:bg-blue-50">
                      <div className="flex items-center justify-between w-full">
                        <span>{household.household_id}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {household.jumlah_anggota} anggota
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </motion.div>

        {/* Time Period Selector */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-xl border border-blue-200/50">
          <TimePeriodSelector
            selectedPeriod={selectedTimePeriod}
            onPeriodChange={setSelectedTimePeriod}
            currentDate={dashboardData.time_info?.current_date}
            startDate={dashboardData.time_info?.start_date}
            endDate={dashboardData.time_info?.end_date}
          />
        </div>

        {/* Combined Overview Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="bg-white/70 backdrop-blur-lg shadow-xl border border-blue-200/50">
            <CardHeader className=" border-blue-200/50">
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <span className="bg-gradient-to-r from-blue-800 to-indigo-800 bg-clip-text text-transparent">Ringkasan Program Keseluruhan</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Peserta"
                  value={dashboardData.combined_metrics.total_participants}
                  icon={Users}
                  color="blue"
                  delay={0}
                />
                <MetricCard
                  title="Peserta Program"
                  value={dashboardData.combined_metrics.total_program_participants}
                  icon={Heart}
                  color="green"
                  delay={0.1}
                />
                <MetricCard
                  title="Tingkat Partisipasi"
                  value={`${(dashboardData.combined_metrics.overall_participation_rate * 100).toFixed(1)}%`}
                  icon={TrendingUp}
                  color="purple"
                  delay={0.2}
                />
                <MetricCard
                  title="Total Biaya Program"
                  value={`Rp ${(dashboardData.combined_metrics.total_program_cost / 1000000).toFixed(1)}M`}
                  icon={DollarSign}
                  color="orange"
                  delay={0.3}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Program-specific sections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Tabs defaultValue="hypertension" className="w-full">
            <TabsList className={`grid w-full ${activeView === "overall" ? "grid-cols-4" : "grid-cols-2"} bg-white/70 backdrop-blur-lg rounded-2xl border border-blue-200/50 p-1`}>
              <TabsTrigger value="hypertension" className="flex items-center space-x-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all duration-300">
                <Heart className="h-4 w-4" />
                <span>Hipertensi</span>
              </TabsTrigger>
              <TabsTrigger value="stunting" className="flex items-center space-x-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all duration-300">
                <Baby className="h-4 w-4" />
                <span>Stunting Anak</span>
              </TabsTrigger>
              {activeView === "overall" && (
                <>
                  <TabsTrigger value="risk-factors" className="flex items-center space-x-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all duration-300">
                    <Shield className="h-4 w-4" />
                    <span>Faktor Risiko</span>
                  </TabsTrigger>
                  <TabsTrigger value="predictions" className="flex items-center space-x-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all duration-300">
                    <Brain className="h-4 w-4" />
                    <span>Prediksi AI</span>
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="hypertension" className="space-y-6">
              {/* Hypertension Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="Total Dewasa"
                  value={dashboardData.hypertension_section.metrics.total_adults}
                  icon={Users}
                  color="red"
                  delay={0}
                />
                <MetricCard
                  title="Dalam Pengobatan"
                  value={dashboardData.hypertension_section.metrics.adults_on_treatment}
                  icon={Heart}
                  color="red"
                  delay={0.1}
                />
                <MetricCard
                  title="Penurunan TD"
                  value={`${dashboardData.hypertension_section.metrics.avg_bp_reduction.toFixed(1)} mmHg`}
                  icon={TrendingUp}
                  color="red"
                  delay={0.2}
                />
              </div>

              {/* Hypertension Charts */}
              <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-xl border border-blue-200/50 p-6">
                <HypertensionCharts
                  ageDistribution={dashboardData.hypertension_section.age_distribution}
                  trends={dashboardData.hypertension_section.trends}
                  metrics={dashboardData.hypertension_section.metrics}
                />
              </div>
            </TabsContent>

            <TabsContent value="stunting" className="space-y-6">
              {/* Stunting Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="Total Anak"
                  value={dashboardData.stunting_section.metrics.total_children}
                  icon={Baby}
                  color="blue"
                  delay={0}
                />
                <MetricCard
                  title="Dalam Program"
                  value={dashboardData.stunting_section.metrics.children_on_program}
                  icon={Users}
                  color="blue"
                  delay={0.1}
                />
                <MetricCard
                  title="Perbaikan HAZ"
                  value={`${dashboardData.stunting_section.metrics.avg_haz_improvement.toFixed(3)}`}
                  icon={TrendingUp}
                  color="blue"
                  delay={0.2}
                />
              </div>

              {/* Stunting Charts */}
              <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-xl border border-blue-200/50 p-6">
                <StuntingCharts
                  ageDistribution={dashboardData.stunting_section.age_distribution}
                  trends={dashboardData.stunting_section.trends}
                  metrics={dashboardData.stunting_section.metrics}
                />
              </div>
            </TabsContent>

            {activeView === "overall" && (
              <>
                <TabsContent value="risk-factors" className="space-y-6">
                  {/* Risk Factors Analysis */}
                  <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-xl border border-blue-200/50 p-6">
                    <RiskFactorsAnalysis selectedTimePeriod={selectedTimePeriod} />
                  </div>
                </TabsContent>

                <TabsContent value="predictions" className="space-y-6">
                  {/* AI Predictions */}
                  <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-xl border border-blue-200/50 p-6">
                    <PredictionDashboard />
                  </div>
                </TabsContent>
              </>
            )}
          </Tabs>
        </motion.div>

     

      </div>
    </DashboardLayout>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/ui/MetricCard";
import { HypertensionCharts } from "@/components/charts/HypertensionCharts";
import { StuntingCharts } from "@/components/charts/StuntingCharts";
import { TimePeriodSelector } from "@/components/TimePeriodSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>("1");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dusuns = ["Dusun_A", "Dusun_B", "Dusun_C", "Dusun_D"];

  // Fetch households list
  const fetchHouseholds = async () => {
    try {
      const response = await fetch("https://pyserver.x1nx3r.uk/data/households");
      if (response.ok) {
        const data = await response.json();
        setHouseholds(data.households || []);
      }
    } catch (err) {
      console.error("Failed to fetch households:", err);
    }
  };

  useEffect(() => {
    fetchHouseholds();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let endpoint = "";
        const timeParam = `?time_period=${selectedTimePeriod}`;
        
        switch (activeView) {
          case "overall":
            endpoint = `https://pyserver.x1nx3r.uk/dashboard/overall${timeParam}`;
            break;
          case "dusun":
            endpoint = `https://pyserver.x1nx3r.uk/dashboard/dusun/${selectedDusun}${timeParam}`;
            break;
          case "household":
            endpoint = `https://pyserver.x1nx3r.uk/dashboard/household/${selectedHousehold}${timeParam}`;
            break;
        }

        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`https error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch dashboard data");
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
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard data...</p>
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
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Error loading dashboard</p>
            <p className="text-gray-600 text-sm mt-2">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {activeView === "overall" && "System Overview"}
              {activeView === "dusun" && `Dusun ${selectedDusun} Analysis`}
              {activeView === "household" && `Household ${selectedHousehold} Profile`}
            </h1>
            <p className="text-gray-600 mt-1">
              {activeView === "overall" && "Complete health program monitoring across all areas"}
              {activeView === "dusun" && "Detailed health metrics for this village area"}
              {activeView === "household" && "Individual household health program participation"}
            </p>
          </div>

          {/* View-specific controls */}
          <div className="flex space-x-4 mt-4 lg:mt-0">
            {activeView === "dusun" && (
              <Select value={selectedDusun} onValueChange={setSelectedDusun}>
                <SelectTrigger className="w-[180px]">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dusuns.map((dusun) => (
                    <SelectItem key={dusun} value={dusun}>
                      {dusun}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {activeView === "household" && (
              <Select value={selectedHousehold} onValueChange={setSelectedHousehold}>
                <SelectTrigger className="w-[180px]">
                  <Home className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {households.slice(0, 20).map((household) => (
                    <SelectItem key={household.household_id} value={household.household_id}>
                      {household.household_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </motion.div>

        {/* Time Period Selector */}
        <TimePeriodSelector
          selectedPeriod={selectedTimePeriod}
          onPeriodChange={setSelectedTimePeriod}
          currentDate={dashboardData.time_info?.current_date}
          startDate={dashboardData.time_info?.start_date}
          endDate={dashboardData.time_info?.end_date}
        />

        {/* Combined Overview Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <span>Overall Program Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Participants"
                  value={dashboardData.combined_metrics.total_participants}
                  icon={Users}
                  color="blue"
                  delay={0}
                />
                <MetricCard
                  title="Program Participants"
                  value={dashboardData.combined_metrics.total_program_participants}
                  icon={Heart}
                  color="green"
                  delay={0.1}
                />
                <MetricCard
                  title="Participation Rate"
                  value={`${(dashboardData.combined_metrics.overall_participation_rate * 100).toFixed(1)}%`}
                  icon={TrendingUp}
                  color="purple"
                  delay={0.2}
                />
                <MetricCard
                  title="Total Program Cost"
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="hypertension" className="flex items-center space-x-2">
                <Heart className="h-4 w-4" />
                <span>Hypertension</span>
              </TabsTrigger>
              <TabsTrigger value="stunting" className="flex items-center space-x-2">
                <Baby className="h-4 w-4" />
                <span>Child Stunting</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hypertension" className="space-y-6">
              {/* Hypertension Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="Total Adults"
                  value={dashboardData.hypertension_section.metrics.total_adults}
                  icon={Users}
                  color="red"
                  delay={0}
                />
                <MetricCard
                  title="On Treatment"
                  value={dashboardData.hypertension_section.metrics.adults_on_treatment}
                  icon={Heart}
                  color="red"
                  delay={0.1}
                />
                <MetricCard
                  title="BP Reduction"
                  value={`${dashboardData.hypertension_section.metrics.avg_bp_reduction.toFixed(1)} mmHg`}
                  icon={TrendingUp}
                  color="red"
                  delay={0.2}
                />
              </div>

              {/* Hypertension Charts */}
              <HypertensionCharts
                ageDistribution={dashboardData.hypertension_section.age_distribution}
                trends={dashboardData.hypertension_section.trends}
                metrics={dashboardData.hypertension_section.metrics}
              />
            </TabsContent>

            <TabsContent value="stunting" className="space-y-6">
              {/* Stunting Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="Total Children"
                  value={dashboardData.stunting_section.metrics.total_children}
                  icon={Baby}
                  color="blue"
                  delay={0}
                />
                <MetricCard
                  title="On Program"
                  value={dashboardData.stunting_section.metrics.children_on_program}
                  icon={Users}
                  color="blue"
                  delay={0.1}
                />
                <MetricCard
                  title="HAZ Improvement"
                  value={`${dashboardData.stunting_section.metrics.avg_haz_improvement.toFixed(3)}`}
                  icon={TrendingUp}
                  color="blue"
                  delay={0.2}
                />
              </div>

              {/* Stunting Charts */}
              <StuntingCharts
                ageDistribution={dashboardData.stunting_section.age_distribution}
                trends={dashboardData.stunting_section.trends}
                metrics={dashboardData.stunting_section.metrics}
              />
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Alerts Section */}
        {dashboardData.alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-orange-800">
                  <AlertCircle className="h-5 w-5" />
                  <span>System Alerts</span>
                  <Badge variant="destructive">{dashboardData.alerts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboardData.alerts.map((alert, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 * index }}
                      className="p-3 bg-white rounded-lg border border-orange-200 text-orange-800"
                    >
                      {alert}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}

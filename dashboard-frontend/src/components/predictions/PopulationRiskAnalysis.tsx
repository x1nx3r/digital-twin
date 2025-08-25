"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { apiFetch, API_ENDPOINTS } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { AlertTriangle, Users, TrendingUp, MapPin, Target, Bell } from "lucide-react";

interface HighRiskAlert {
  person_id: string;
  risk_score: number;
  risk_factors: string[];
  urgency: "high" | "medium" | "low";
  current_bp?: string;
  recommendations: string[];
}

interface PopulationRiskData {
  population_type: "adults" | "children";
  analysis_parameters: {
    risk_threshold: number;
    time_period_months: number;
    total_population: number;
  };
  risk_stratification: {
    error?: string;
  } | null;
  high_risk_alerts: HighRiskAlert[];
  intervention_recommendations: string[];
  indikator_peringatan_dini: string[];
}

interface RiskGroup {
  category: string;
  count: number;
  percentage: number;
  riskLevel: "high" | "medium" | "low";
}

interface RegionData {
  region: string;
  population: number;
  riskScore: number;
  prevalence: number;
  interventionNeeded: boolean;
}

interface PopulationRiskAnalysisProps {
  selectedRegion?: string;
  populationType?: "adults" | "children";
}

const RISK_COLORS = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

export function PopulationRiskAnalysis({ selectedRegion = "all", populationType = "adults" }: PopulationRiskAnalysisProps) {
  const [populationData, setPopulationData] = useState<PopulationRiskData | null>(null);
  const [riskGroups, setRiskGroups] = useState<RiskGroup[]>([]);
  const [regionData, setRegionData] = useState<RegionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    const fetchPopulationRisk = async () => {
      try {
        setLoading(true);
        
        // Fetch real data from the API
        const response = await apiFetch(API_ENDPOINTS.POPULATION_RISK(populationType));
        if (!response.ok) {
          throw new Error('Failed to fetch population risk data');
        }
        
        const apiData: PopulationRiskData = await response.json();
        setPopulationData(apiData);
        
        // Transform API data to component format
        const totalPopulation = apiData.analysis_parameters.total_population;
        const highRiskCount = apiData.high_risk_alerts.filter(alert => alert.urgency === "high").length;
        const mediumRiskCount = apiData.high_risk_alerts.filter(alert => alert.urgency === "medium").length;
        const lowRiskCount = totalPopulation - highRiskCount - mediumRiskCount;
        
        const transformedRiskGroups: RiskGroup[] = [
          { 
            category: populationType === "adults" ? "Risiko Tinggi Hipertensi" : "Risiko Tinggi Stunting", 
            count: highRiskCount, 
            percentage: (highRiskCount / totalPopulation) * 100, 
            riskLevel: "high" 
          },
          { 
            category: populationType === "adults" ? "Risiko Sedang Hipertensi" : "Risiko Sedang Stunting", 
            count: mediumRiskCount, 
            percentage: (mediumRiskCount / totalPopulation) * 100, 
            riskLevel: "medium" 
          },
          { 
            category: populationType === "adults" ? "Risiko Rendah Hipertensi" : "Risiko Rendah Stunting", 
            count: lowRiskCount, 
            percentage: (lowRiskCount / totalPopulation) * 100, 
            riskLevel: "low" 
          },
        ];

        setRiskGroups(transformedRiskGroups);
        
        // Transform high risk alerts to region-like data for visualization
        const transformedRegionData: RegionData[] = apiData.high_risk_alerts.map((alert) => ({
          region: `Pasien ${alert.person_id}`,
          population: 1, // Individual person
          riskScore: alert.risk_score * 100,
          prevalence: alert.risk_score * 100,
          interventionNeeded: alert.urgency === "high" || alert.urgency === "medium",
        }));
        
        setRegionData(transformedRegionData);
        
        // Set alerts from API recommendations and early warnings
        const combinedAlerts = [
          ...apiData.intervention_recommendations.slice(0, 3), // Limit to 3 recommendations
          ...apiData.indikator_peringatan_dini,
        ];
        setAlerts(combinedAlerts);
        
      } catch (error) {
        console.error("Error fetching population risk data:", error);
        // Fallback to mock data if API fails
        setPopulationData({
          population_type: populationType,
          analysis_parameters: {
            risk_threshold: 0.7,
            time_period_months: 3,
            total_population: 50,
          },
          risk_stratification: null,
          high_risk_alerts: [],
          intervention_recommendations: ["Data tidak tersedia - menggunakan mode offline"],
          indikator_peringatan_dini: ["Tidak dapat terhubung ke server prediksi"],
        });
        setAlerts(["Tidak dapat terhubung ke server prediksi - menggunakan data contoh"]);
      } finally {
        setLoading(false);
      }
    };

    fetchPopulationRisk();
  }, [selectedRegion, populationType]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Analisis Risiko Populasi</h2>
          <Badge variant="outline" className="text-sm">
            <Users className="w-4 h-4 mr-1" />
            Total: {populationData?.analysis_parameters?.total_population?.toLocaleString()} jiwa
          </Badge>
        </div>

        {/* Early Warning Alerts */}
        {alerts.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-amber-800">
                <Bell className="w-5 h-5 mr-2" />
                Peringatan Dini
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.map((alert, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-amber-800">{alert}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Risk Distribution Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Distribusi Risiko Populasi
            </CardTitle>
            <CardDescription>
              Stratifikasi risiko berdasarkan kondisi kesehatan utama
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk Categories Bar Chart */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Kategori Risiko</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={riskGroups}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="category" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar 
                      dataKey="count" 
                      fill="#8884d8"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Risk Level Pie Chart */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Distribusi Tingkat Risiko</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Tinggi", value: riskGroups.filter(g => g.riskLevel === "high").reduce((sum, g) => sum + g.count, 0), color: RISK_COLORS.high },
                        { name: "Sedang", value: riskGroups.filter(g => g.riskLevel === "medium").reduce((sum, g) => sum + g.count, 0), color: RISK_COLORS.medium },
                        { name: "Rendah", value: riskGroups.filter(g => g.riskLevel === "low").reduce((sum, g) => sum + g.count, 0), color: RISK_COLORS.low },
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : '0'}%`}
                    >
                      {[RISK_COLORS.high, RISK_COLORS.medium, RISK_COLORS.low].map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Regional Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Regional Risk Scores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Skor Risiko Regional
            </CardTitle>
            <CardDescription>
              Perbandingan tingkat risiko antar wilayah
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={regionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="population" name="Populasi" />
                <YAxis dataKey="riskScore" name="Skor Risiko" />
                <Tooltip 
                  formatter={(value, name) => [
                    name === "riskScore" ? `${value}%` : value,
                    name === "riskScore" ? "Skor Risiko" : "Populasi"
                  ]}
                />
                <Scatter 
                  dataKey="riskScore" 
                  fill="#8884d8"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Analysis Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Ringkasan Analisis Risiko
            </CardTitle>
            <CardDescription>
              Parameter dan hasil analisis risiko populasi saat ini
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Ambang Batas Risiko:</span>
                  <div className="text-lg font-semibold">
                    {((populationData?.analysis_parameters?.risk_threshold || 0) * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Periode Analisis:</span>
                  <div className="text-lg font-semibold">
                    {populationData?.analysis_parameters?.time_period_months} bulan
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Total Populasi:</span>
                  <div className="text-lg font-semibold">
                    {populationData?.analysis_parameters?.total_population} orang
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Peringatan Risiko Tinggi:</span>
                  <div className="text-lg font-semibold text-red-600">
                    {populationData?.high_risk_alerts?.length || 0} orang
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Intervention Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Rekomendasi Intervensi</CardTitle>
            <CardDescription>
              Prioritas program berdasarkan analisis risiko populasi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {regionData
                .filter(region => region.interventionNeeded)
                .map((region) => (
                  <div key={region.region} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{region.region}</h4>
                      <Badge variant={region.riskScore > 75 ? "destructive" : "secondary"}>
                        Skor Risiko: {region.riskScore}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Populasi:</span>
                        <span className="ml-2 font-medium">{region.population.toLocaleString()}</span>
                      </div>

                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Prioritas Intervensi</span>
                        <span>{region.riskScore > 75 ? "Tinggi" : "Sedang"}</span>
                      </div>
                      <Progress value={region.riskScore} className="h-2" />
                    </div>
                    {region.riskScore > 75 && (
                      <div className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
                        Memerlukan intervensi segera dengan fokus pada pencegahan dan edukasi intensif
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
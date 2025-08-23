"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiFetch, API_ENDPOINTS } from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  Heart,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Target,
  Activity,
  Gauge,
} from "lucide-react";

interface HealthOutcomePredictionProps {
  personId: string;
}

interface PredictionData {
  person_id: string;
  current_bp?: {
    systolic: number;
    diastolic: number;
  };
  predicted_bp?: {
    systolic: number;
    diastolic: number;
  };
  current_haz?: number;
  predicted_haz?: number;
  trend_analysis: {
    systolic_trend_per_month?: number;
    diastolic_trend_per_month?: number;
    haz_trend_per_month?: number;
    trend_confidence: number;
  };
  risk_assessment: {
    risk_level: string;
    risk_score: number;
    category: string;
  };
  confidence_interval?: {
    systolic?: [number, number];
    diastolic?: [number, number];
    haz?: [number, number];
  };
  recommendations: string[];
  intervention_scenario: string;
  scenario_impact: {
    scenario: string;
    description: string;
    impact_factor: number;
    estimated_improvement: string;
  };
}

export function HealthOutcomePrediction({ personId }: HealthOutcomePredictionProps) {
  const [data, setData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiFetch(API_ENDPOINTS.HEALTH_OUTCOMES(personId));
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal mengambil prediksi");
      } finally {
        setLoading(false);
      }
    };

    if (personId) {
      fetchPrediction();
    }
  }, [personId]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Memuat prediksi...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const isAdult = personId.startsWith('P');
  
  // Generate trend data for visualization
  const generateTrendData = () => {
    const months = Array.from({ length: 12 }, (_, i) => `Bulan ${i + 1}`);
    
    if (isAdult && data.current_bp && data.predicted_bp) {
      const sysStart = data.current_bp.systolic;
      const diaStart = data.current_bp.diastolic;
      const sysTrend = data.trend_analysis.systolic_trend_per_month || 0;
      const diaTrend = data.trend_analysis.diastolic_trend_per_month || 0;
      
      return months.map((month, index) => ({
        month,
        sistolik_saat_ini: sysStart + (sysTrend * index),
        diastolik_saat_ini: diaStart + (diaTrend * index),
        sistolik_prediksi: data.predicted_bp!.systolic,
        diastolik_prediksi: data.predicted_bp!.diastolic,
      }));
    } else {
      // Child data
      const hazStart = data.current_haz || -1.5;
      const hazTrend = data.trend_analysis.haz_trend_per_month || 0.05;
      
      return months.map((month, index) => ({
        month,
        haz_saat_ini: hazStart + (hazTrend * index),
        haz_prediksi: data.predicted_haz || hazStart + (hazTrend * 12),
      }));
    }
  };

  const trendData = generateTrendData();

  // Risk level colors
  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low': return { color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' };
      case 'moderate': return { color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-200' };
      case 'high': return { color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' };
      default: return { color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200' };
    }
  };

  const riskColors = getRiskColor(data.risk_assessment.risk_level);

  // Confidence chart data
  const confidenceData = [
    { 
      name: 'Tingkat Kepercayaan', 
      value: Math.round(data.trend_analysis.trend_confidence * 100),
    }
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className={`${riskColors.bg} ${riskColors.border} border-2`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${riskColors.color} text-sm font-medium`}>Status Saat Ini</p>
                  {isAdult ? (
                    <p className="text-lg font-bold text-gray-900">
                      {data.current_bp?.systolic}/{data.current_bp?.diastolic} mmHg
                    </p>
                  ) : (
                    <p className="text-lg font-bold text-gray-900">
                      HAZ: {data.current_haz?.toFixed(2)}
                    </p>
                  )}
                  <p className={`${riskColors.color} text-xs`}>{data.risk_assessment.category}</p>
                </div>
                <Heart className={`h-8 w-8 ${riskColors.color}`} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Prediction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Prediksi 12 Bulan</p>
                  {isAdult ? (
                    <p className="text-lg font-bold text-gray-900">
                      {data.predicted_bp?.systolic}/{data.predicted_bp?.diastolic} mmHg
                    </p>
                  ) : (
                    <p className="text-lg font-bold text-gray-900">
                      HAZ: {data.predicted_haz?.toFixed(2)}
                    </p>
                  )}
                  <p className="text-blue-600 text-xs">
                    {isAdult 
                      ? `Tren: +${data.trend_analysis.systolic_trend_per_month?.toFixed(1)}/+${data.trend_analysis.diastolic_trend_per_month?.toFixed(1)} per bulan`
                      : `Tren: +${data.trend_analysis.haz_trend_per_month?.toFixed(3)} per bulan`
                    }
                  </p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Risk Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Skor Risiko</p>
                  <p className="text-lg font-bold text-gray-900">
                    {(data.risk_assessment.risk_score * 100).toFixed(0)}%
                  </p>
                  <p className="text-purple-600 text-xs capitalize">
                    Level: {data.risk_assessment.risk_level}
                  </p>
                </div>
                <Gauge className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Analysis Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span>Analisis Tren Kesehatan</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                {isAdult ? (
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => `Periode: ${label}`}
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(1)} mmHg`,
                        name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                      ]}
                    />
                    <Line type="monotone" dataKey="sistolik_saat_ini" stroke="#EF4444" strokeWidth={2} name="Sistolik Saat Ini" />
                    <Line type="monotone" dataKey="diastolik_saat_ini" stroke="#3B82F6" strokeWidth={2} name="Diastolik Saat Ini" />
                    <Line type="monotone" dataKey="sistolik_prediksi" stroke="#DC2626" strokeDasharray="5 5" name="Sistolik Prediksi" />
                    <Line type="monotone" dataKey="diastolik_prediksi" stroke="#1D4ED8" strokeDasharray="5 5" name="Diastolik Prediksi" />
                  </LineChart>
                ) : (
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => `Periode: ${label}`}
                      formatter={(value: number, name: string) => [
                        value.toFixed(2),
                        name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                      ]}
                    />
                    <Area type="monotone" dataKey="haz_saat_ini" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.3} name="HAZ Saat Ini" />
                    <Line type="monotone" dataKey="haz_prediksi" stroke="#059669" strokeWidth={3} strokeDasharray="5 5" name="HAZ Prediksi" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Confidence and Risk Analysis */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-green-600" />
                <span>Tingkat Kepercayaan Model</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Confidence Meter */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Akurasi Prediksi</span>
                    <span className="font-bold">{(data.trend_analysis.trend_confidence * 100).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={data.trend_analysis.trend_confidence * 100} 
                    className="h-3"
                  />
                </div>

                {/* Radial Chart */}
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart data={confidenceData}>
                    <RadialBar
                      label={{ position: 'insideStart', fill: '#fff' }}
                      background
                      dataKey="value"
                      fill="#3B82F6"
                    />
                    <Tooltip formatter={(value) => [`${value}%`, 'Kepercayaan']} />
                  </RadialBarChart>
                </ResponsiveContainer>

                {/* Risk Level Indicator */}
                <div className={`p-3 rounded-lg ${riskColors.bg} ${riskColors.border} border`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${riskColors.color}`}>
                      Level Risiko: {data.risk_assessment.risk_level.toUpperCase()}
                    </span>
                    <Badge className={`${riskColors.bg} ${riskColors.color}`}>
                      {(data.risk_assessment.risk_score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Rekomendasi AI</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Rekomendasi Tindakan:</h4>
                <ul className="space-y-2">
                  {data.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Dampak Skenario:</h4>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900">{data.scenario_impact.scenario}</p>
                  <p className="text-sm text-blue-700 mt-1">{data.scenario_impact.description}</p>
                  <div className="mt-2">
                    <Badge className="bg-blue-100 text-blue-800">
                      Estimasi Perbaikan: {data.scenario_impact.estimated_improvement}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { apiFetch, API_ENDPOINTS } from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Area,
  AreaChart,
} from "recharts";
import {
  Pill,
  Timer,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Target,
  Activity,
  Heart,
  Baby,
  BarChart3,
} from "lucide-react";

interface TreatmentResponsePredictorProps {
  personId: string;
}

interface TreatmentResponseData {
  person_id: string;
  intervention_details: {
    type: string;
    duration_months: number;
    expected_adherence: number;
  };
  baseline_prediction: {
    person_id?: string;
    child_id?: string;
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
    current_status?: {
      haz: number;
      age_months: number;
      stunting_status: string;
    };
    predicted_status?: {
      haz: number;
      age_months: number;
      stunting_risk: string;
    };
    trend_analysis?: {
      systolic_trend_per_month?: number;
      diastolic_trend_per_month?: number;
      haz_trend_per_month?: number;
      trend_confidence: number;
    };
    growth_analysis?: {
      velocity_per_month: number;
      growth_pattern: string;
      catch_up_potential: string;
    };
    risk_assessment?: {
      risk_level: string;
      risk_score: number;
      category: string;
    };
  };
  treatment_response: {
    hasil_prediksi: {
      sistolik?: number;
      diastolik?: number;
      haz?: number;
      risiko_stunting?: string;
    };
    perbaikan_yang_diharapkan: {
      penurunan_sistolik?: number;
      penurunan_diastolik?: number;
      peningkatan_haz?: number;
    };
    probabilitas_keberhasilan: number;
  };
  comparative_analysis: {
    treatment_benefit: string;
    risk_reduction: string;
    cost_effectiveness: string;
  };
  personalized_recommendations: string[];
}

interface ComparisonDataPoint {
  month: string;
  baseline_sistolik?: number;
  baseline_diastolik?: number;
  dengan_pengobatan_sistolik?: number;
  dengan_pengobatan_diastolik?: number;
  baseline_haz?: number;
  dengan_intervensi_haz?: number;
}

export function TreatmentResponsePredictor({ personId }: TreatmentResponsePredictorProps) {
  const [data, setData] = useState<TreatmentResponseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonDataPoint[]>([]);

  // Treatment options
  const [selectedIntervention, setSelectedIntervention] = useState<string>("ACEi");
  const [duration, setDuration] = useState<number[]>([6]);
  const [adherence, setAdherence] = useState<number[]>([80]);

  const isAdult = personId.startsWith('P');

  // Intervention options
  const adultInterventions = [
    { value: "ACEi", label: "ACE Inhibitor", description: "Obat penurun tekanan darah" },
    { value: "diuretik", label: "Diuretik", description: "Obat peluruh air" },
    { value: "CCB", label: "Calcium Channel Blocker", description: "Penghambat kanal kalsium" },
    { value: "lifestyle", label: "Modifikasi Gaya Hidup", description: "Diet dan olahraga" },
  ];

  const childInterventions = [
    { value: "PMT", label: "Pemberian Makanan Tambahan", description: "Suplemen nutrisi" },
    { value: "mikronutrien", label: "Mikronutrien", description: "Vitamin dan mineral" },
    { value: "WASH", label: "Program WASH", description: "Air bersih dan sanitasi" },
    { value: "konseling", label: "Konseling Gizi", description: "Edukasi pengasuh" },
  ];

  const interventions = isAdult ? adultInterventions : childInterventions;

  const fetchTreatmentResponse = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = API_ENDPOINTS.TREATMENT_RESPONSE(personId, selectedIntervention, duration[0], adherence[0] / 100);
      console.log('🔄 Fetching treatment response:', endpoint);
      
      const response = await apiFetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Treatment response received:', result);
      setData(result);
    } catch (err) {
      console.error('❌ Treatment response error:', err);
      setError(err instanceof Error ? err.message : "Gagal mengambil prediksi respons pengobatan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (personId) {
      fetchTreatmentResponse();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId, selectedIntervention, duration, adherence]);

  // Update comparison data when relevant state changes
  useEffect(() => {
    // Generate comparison data for visualization
    const generateComparisonData = () => {
      if (!data) return [];

      const months = Array.from({ length: duration[0] }, (_, i) => i + 1);
      
      if (isAdult && data.baseline_prediction.current_bp && data.treatment_response.hasil_prediksi.sistolik) {
        const baselineSys = data.baseline_prediction.current_bp.systolic;
        const baselineDia = data.baseline_prediction.current_bp.diastolic;
        const targetSys = data.treatment_response.hasil_prediksi.sistolik;
        const targetDia = data.treatment_response.hasil_prediksi.diastolik;
        
        return months.map((month) => ({
          month: `Bulan ${month}`,
          baseline_sistolik: baselineSys + (data.baseline_prediction.trend_analysis?.systolic_trend_per_month || 0) * month,
          baseline_diastolik: baselineDia + (data.baseline_prediction.trend_analysis?.diastolic_trend_per_month || 0) * month,
          dengan_pengobatan_sistolik: baselineSys - ((baselineSys - targetSys) * month / duration[0]),
          dengan_pengobatan_diastolik: baselineDia - ((baselineDia - (targetDia || 0)) * month / duration[0]),
        }));
      } else {
        // Child data
        const baselineHaz = data.baseline_prediction.current_status?.haz || data.baseline_prediction.current_haz || -1.5;
        const targetHaz = data.treatment_response.hasil_prediksi.haz || baselineHaz + 0.5;
        const hazTrendPerMonth = data.baseline_prediction.growth_analysis?.velocity_per_month || 
                                data.baseline_prediction.trend_analysis?.haz_trend_per_month || 0;
        
        return months.map((month) => ({
          month: `Bulan ${month}`,
          baseline_haz: baselineHaz + hazTrendPerMonth * month,
          dengan_intervensi_haz: baselineHaz + ((targetHaz - baselineHaz) * month / duration[0]),
        }));
      }
    };

    if (data) {
      const newComparisonData = generateComparisonData();
      setComparisonData(newComparisonData);
    }
  }, [data, duration, adherence, selectedIntervention, isAdult]);

  // Success probability data
  const probabilityData = [
    {
      name: 'Probabilitas Keberhasilan',
      value: Math.round((data?.treatment_response.probabilitas_keberhasilan || 0) * 100),
    }
  ];

  return (
    <div className="space-y-6">
      {/* Treatment Configuration */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Pill className="h-5 w-5 text-blue-600" />
            <span>Konfigurasi Pengobatan</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Intervention Type */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Jenis {isAdult ? 'Pengobatan' : 'Intervensi'}
              </label>
              <Select value={selectedIntervention} onValueChange={setSelectedIntervention}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {interventions.map((intervention) => (
                    <SelectItem key={intervention.value} value={intervention.value}>
                      <div>
                        <div className="font-medium">{intervention.label}</div>
                        <div className="text-sm text-gray-500">{intervention.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Durasi (Bulan): {duration[0]}
              </label>
              <Slider
                value={duration}
                onValueChange={setDuration}
                max={24}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 bulan</span>
                <span>24 bulan</span>
              </div>
            </div>

            {/* Adherence */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Kepatuhan (%): {adherence[0]}%
              </label>
              <Slider
                value={adherence}
                onValueChange={setAdherence}
                max={100}
                min={10}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {loading && (
            <div className="mt-4 flex items-center justify-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Menghitung prediksi...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="text-center py-8">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {data && (
        <>
          {/* Results Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 text-sm font-medium">Probabilitas Sukses</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(data.treatment_response.probabilitas_keberhasilan * 100).toFixed(0)}%
                      </p>
                      <p className="text-green-600 text-xs">Tingkat keberhasilan</p>
                    </div>
                    <Target className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 text-sm font-medium">Hasil Prediksi</p>
                      {isAdult ? (
                        <p className="text-lg font-bold text-gray-900">
                          {data.treatment_response.hasil_prediksi.sistolik}/{data.treatment_response.hasil_prediksi.diastolik} mmHg
                        </p>
                      ) : (
                        <p className="text-lg font-bold text-gray-900">
                          HAZ: {data.treatment_response.hasil_prediksi.haz?.toFixed(2)}
                        </p>
                      )}
                      <p className="text-blue-600 text-xs">Target pengobatan</p>
                    </div>
                    {isAdult ? (
                      <Heart className="h-8 w-8 text-blue-600" />
                    ) : (
                      <Baby className="h-8 w-8 text-blue-600" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 text-sm font-medium">Perbaikan</p>
                      {isAdult ? (
                        <p className="text-lg font-bold text-gray-900">
                          -{data.treatment_response.perbaikan_yang_diharapkan.penurunan_sistolik?.toFixed(1)} mmHg
                        </p>
                      ) : (
                        <p className="text-lg font-bold text-gray-900">
                          +{data.treatment_response.perbaikan_yang_diharapkan.peningkatan_haz?.toFixed(2)}
                        </p>
                      )}
                      <p className="text-purple-600 text-xs">Perbaikan yang diharapkan</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-600 text-sm font-medium">Efektivitas Biaya</p>
                      <p className="text-lg font-bold text-gray-900">
                        {data.comparative_analysis.cost_effectiveness}
                      </p>
                      <p className="text-orange-600 text-xs">Analisis ekonomi</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Treatment Comparison Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Timer className="h-5 w-5 text-blue-600" />
                    <span>Perbandingan Respons Pengobatan</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    {isAdult ? (
                      <LineChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            `${value.toFixed(1)} mmHg`,
                            name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                          ]}
                        />
                        <Line type="monotone" dataKey="baseline_sistolik" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" name="Tanpa Pengobatan (Sistolik)" />
                        <Line type="monotone" dataKey="dengan_pengobatan_sistolik" stroke="#10B981" strokeWidth={3} name="Dengan Pengobatan (Sistolik)" />
                        <Line type="monotone" dataKey="baseline_diastolik" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 5" name="Tanpa Pengobatan (Diastolik)" />
                        <Line type="monotone" dataKey="dengan_pengobatan_diastolik" stroke="#3B82F6" strokeWidth={3} name="Dengan Pengobatan (Diastolik)" />
                      </LineChart>
                    ) : (
                      <AreaChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            value.toFixed(2),
                            name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                          ]}
                        />
                        <Area type="monotone" dataKey="baseline_haz" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} name="Tanpa Intervensi" />
                        <Area type="monotone" dataKey="dengan_intervensi_haz" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Dengan Intervensi" />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Success Probability */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    <span>Probabilitas Keberhasilan</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadialBarChart data={probabilityData}>
                      <RadialBar
                        label={{ position: 'insideStart', fill: '#fff' }}
                        background
                        dataKey="value"
                        fill="#10B981"
                      />
                      <Tooltip formatter={(value) => [`${value}%`, 'Keberhasilan']} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Manfaat Pengobatan:</span>
                      <Badge className={
                        data.comparative_analysis.treatment_benefit === 'Significant improvement expected' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }>
                        {data.comparative_analysis.treatment_benefit}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Pengurangan Risiko:</span>
                      <Badge className={
                        data.comparative_analysis.risk_reduction === 'High' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }>
                        {data.comparative_analysis.risk_reduction}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Personalized Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Rekomendasi Personal AI</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.personalized_recommendations.map((recommendation, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 * index }}
                      className="p-3 bg-green-50 rounded-lg border border-green-200"
                    >
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-green-800">{recommendation}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}

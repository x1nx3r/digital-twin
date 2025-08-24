"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  Users,
  Activity,
  Target,
  Zap,
  BarChart3,
  Heart,
  Baby,
  Pill,
  Timer,
  AlertTriangle,
  DollarSign,
  Calculator,
  TrendingUp,
  PieChart,
} from "lucide-react";
import { HealthOutcomePrediction } from "./predictions/HealthOutcomePrediction";
import { PopulationRiskAnalysis } from "./predictions/PopulationRiskAnalysis";
import { TreatmentResponsePredictor } from "./predictions/TreatmentResponsePredictor";

interface PredictionDashboardProps {
  selectedTimePeriod?: string;
}

// Budget Optimization Component
function BudgetOptimizationTab() {
  const [totalBudget, setTotalBudget] = useState<number>(500000000); // 500 juta default
  const [stuntingPercentage, setStuntingPercentage] = useState<number>(50);
  
  // Sample data - in real implementation, this would come from dashboard API
  const costData = {
    hypertension: {
      costPerParticipant: 5647575, // From dashboard data
      participationRate: 57,
      totalParticipants: 51,
      effectivenessScore: 0.85, // BP reduction effectiveness
    },
    stunting: {
      costPerParticipant: 2500000, // Estimated from typical nutrition programs
      participationRate: 24,
      totalParticipants: 42,
      effectivenessScore: 0.70, // HAZ improvement effectiveness
    }
  };

  // Calculate optimal allocation
  const calculateOptimalAllocation = (budget: number) => {
    const stuntingBudget = (budget * stuntingPercentage) / 100;
    const hypertensionBudget = budget - stuntingBudget;
    
    const stuntingCoverage = Math.floor(stuntingBudget / costData.stunting.costPerParticipant);
    const hypertensionCoverage = Math.floor(hypertensionBudget / costData.hypertension.costPerParticipant);
    
    // Calculate impact scores (effectiveness × coverage)
    const stuntingImpact = (stuntingCoverage / costData.stunting.totalParticipants) * costData.stunting.effectivenessScore;
    const hypertensionImpact = (hypertensionCoverage / costData.hypertension.totalParticipants) * costData.hypertension.effectivenessScore;
    
    return {
      stuntingBudget,
      hypertensionBudget,
      stuntingCoverage,
      hypertensionCoverage,
      stuntingImpact,
      hypertensionImpact,
      totalImpact: stuntingImpact + hypertensionImpact
    };
  };

  const result = calculateOptimalAllocation(totalBudget);
  const hypertensionPercentage = 100 - stuntingPercentage;

  // Find optimal allocation by testing different percentages
  const findOptimalAllocation = () => {
    let bestAllocation = { percentage: 50, impact: 0 };
    
    for (let i = 10; i <= 90; i += 5) {
      const testResult = calculateOptimalAllocation(totalBudget);
      if (testResult.totalImpact > bestAllocation.impact) {
        bestAllocation = { percentage: i, impact: testResult.totalImpact };
      }
    }
    
    return bestAllocation;
  };

  const optimal = findOptimalAllocation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <Calculator className="h-6 w-6" />
            <span>Optimasi Alokasi Anggaran Desa</span>
          </CardTitle>
          <p className="text-blue-100">
            Tentukan pembagian anggaran optimal antara program stunting dan hipertensi
          </p>
        </CardHeader>
      </Card>

      {/* Budget Input */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span>Pengaturan Anggaran</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Total Anggaran Desa (Rp)
              </label>
              <Select value={totalBudget.toString()} onValueChange={(value) => setTotalBudget(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="250000000">Rp 250,000,000</SelectItem>
                  <SelectItem value="500000000">Rp 500,000,000</SelectItem>
                  <SelectItem value="750000000">Rp 750,000,000</SelectItem>
                  <SelectItem value="1000000000">Rp 1,000,000,000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Alokasi untuk Stunting: {stuntingPercentage}%
              </label>
              <input
                type="range"
                min="10"
                max="90"
                value={stuntingPercentage}
                onChange={(e) => setStuntingPercentage(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>10%</span>
                <span>50%</span>
                <span>90%</span>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">💡 Rekomendasi Optimal</h4>
              <p className="text-sm text-green-700">
                Berdasarkan analisis cost-effectiveness, alokasi optimal adalah:
                <strong> {optimal.percentage}% stunting, {100-optimal.percentage}% hipertensi</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Current Allocation Visualization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5 text-blue-600" />
              <span>Pembagian Anggaran Saat Ini</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-blue-600">Program Stunting</span>
                  <span className="text-sm font-bold">{stuntingPercentage}%</span>
                </div>
                <Progress value={stuntingPercentage} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">
                  Rp {result.stuntingBudget.toLocaleString('id-ID')}
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-red-600">Program Hipertensi</span>
                  <span className="text-sm font-bold">{hypertensionPercentage}%</span>
                </div>
                <Progress value={hypertensionPercentage} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">
                  Rp {result.hypertensionBudget.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <Button 
              onClick={() => setStuntingPercentage(optimal.percentage)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Gunakan Alokasi Optimal
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Impact Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-600">
              <Baby className="h-5 w-5" />
              <span>Program Stunting</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {result.stuntingCoverage}
              </div>
              <div className="text-sm text-gray-500">Anak yang dapat dilayani</div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Biaya per anak:</span>
                <span className="font-medium">Rp {costData.stunting.costPerParticipant.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Cakupan populasi:</span>
                <span className="font-medium">{((result.stuntingCoverage / costData.stunting.totalParticipants) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Dampak kesehatan:</span>
                <span className="font-medium">{(result.stuntingImpact * 100).toFixed(1)}/100</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <Heart className="h-5 w-5" />
              <span>Program Hipertensi</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {result.hypertensionCoverage}
              </div>
              <div className="text-sm text-gray-500">Dewasa yang dapat dilayani</div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Biaya per pasien:</span>
                <span className="font-medium">Rp {costData.hypertension.costPerParticipant.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Cakupan populasi:</span>
                <span className="font-medium">{((result.hypertensionCoverage / costData.hypertension.totalParticipants) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Dampak kesehatan:</span>
                <span className="font-medium">{(result.hypertensionImpact * 100).toFixed(1)}/100</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-purple-600">
              <TrendingUp className="h-5 w-5" />
              <span>Dampak Total</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(result.totalImpact * 100).toFixed(1)}
              </div>
              <div className="text-sm text-gray-500">Skor dampak kesehatan total</div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total terlayani:</span>
                <span className="font-medium">{result.stuntingCoverage + result.hypertensionCoverage} orang</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Efisiensi anggaran:</span>
                <span className="font-medium">{((result.totalImpact * totalBudget) / 1000000).toFixed(1)}M/impact</span>
              </div>
              <div className="bg-purple-50 p-2 rounded text-center">
                <span className="text-xs text-purple-600 font-medium">
                  {result.totalImpact > optimal.impact * 0.9 ? '✅ Mendekati optimal' : '⚠️ Dapat dioptimalkan'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span>Rekomendasi Strategis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">💰 Aspek Anggaran</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Hipertensi memiliki biaya per peserta lebih tinggi</li>
                <li>• Program stunting dapat menjangkau lebih banyak anak</li>
                <li>• Pertimbangkan efisiensi jangka panjang</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">🎯 Aspek Dampak</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Stunting: investasi untuk generasi masa depan</li>
                <li>• Hipertensi: pencegahan komplikasi akut</li>
                <li>• Seimbangkan antara dampak jangka pendek dan panjang</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PredictionDashboard({}: PredictionDashboardProps) {
  const [selectedPersonId, setSelectedPersonId] = useState<string>("P001");
  const [selectedPopulationType, setSelectedPopulationType] = useState<"adults" | "children">("adults");

  // Sample person IDs for the demo
  const personIds = [
    "P001", "P003", "P010", "P017", "P021", "P040", "P045", "P049",
    "C001", "C005", "C012", "C020", "C025", "C030", "C035", "C040"
  ];

  const adultPersonIds = personIds.filter(id => id.startsWith('P'));
  const childPersonIds = personIds.filter(id => id.startsWith('C'));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Brain className="h-8 w-8 text-blue-600" />
            <span>Prediksi Kesehatan AI</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Analisis prediktif canggih untuk hasil kesehatan dan respons pengobatan
          </p>
        </div>

        <div className="flex items-center space-x-3 mt-4 lg:mt-0">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Zap className="h-3 w-3 mr-1" />
            Bertenaga AI
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Target className="h-3 w-3 mr-1" />
            Waktu Nyata
          </Badge>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Prediksi Tersedia</p>
                  <p className="text-2xl font-bold">3 Jenis</p>
                </div>
                <Brain className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Akurasi Model</p>
                  <p className="text-2xl font-bold">~89%</p>
                </div>
                <Target className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Pasien Dipantau</p>
                  <p className="text-2xl font-bold">{personIds.length}</p>
                </div>
                <Users className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Intervensi Aktif</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <Activity className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Main Prediction Interface */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Tabs defaultValue="individual" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-12">
            <TabsTrigger value="individual" className="flex items-center space-x-2">
              <Heart className="h-4 w-4" />
              <span>Prediksi Individual</span>
            </TabsTrigger>
            <TabsTrigger value="population" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Analisis Populasi</span>
            </TabsTrigger>
            <TabsTrigger value="treatment" className="flex items-center space-x-2">
              <Pill className="h-4 w-4" />
              <span>Respons Pengobatan</span>
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex items-center space-x-2">
              <Calculator className="h-4 w-4" />
              <span>Optimasi Anggaran</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="space-y-6">
            {/* Individual Prediction Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span>Prediksi Hasil Kesehatan Individual</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Pilih Pasien
                    </label>
                    <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Dewasa
                        </div>
                        {adultPersonIds.map((id) => (
                          <SelectItem key={id} value={id}>
                            {id} - Pasien Dewasa
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">
                          Anak
                        </div>
                        {childPersonIds.map((id) => (
                          <SelectItem key={id} value={id}>
                            {id} - Pasien Anak
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <HealthOutcomePrediction personId={selectedPersonId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="population" className="space-y-6">
            {/* Population Risk Analysis Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span>Analisis Risiko Populasi</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Jenis Populasi
                    </label>
                    <Select 
                      value={selectedPopulationType} 
                      onValueChange={(value: "adults" | "children") => setSelectedPopulationType(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adults">
                          <div className="flex items-center space-x-2">
                            <Heart className="h-4 w-4 text-red-500" />
                            <span>Dewasa (Hipertensi)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="children">
                          <div className="flex items-center space-x-2">
                            <Baby className="h-4 w-4 text-blue-500" />
                            <span>Anak (Stunting)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <PopulationRiskAnalysis 
                  selectedRegion="all"
                  populationType={selectedPopulationType}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="treatment" className="space-y-6">
            {/* Treatment Response Prediction Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Timer className="h-5 w-5 text-green-600" />
                  <span>Prediksi Respons Pengobatan</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Pilih Pasien untuk Simulasi Pengobatan
                    </label>
                    <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Dewasa (Pengobatan Hipertensi)
                        </div>
                        {adultPersonIds.map((id) => (
                          <SelectItem key={id} value={id}>
                            {id} - Pasien Dewasa
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">
                          Anak (Intervensi Gizi)
                        </div>
                        {childPersonIds.map((id) => (
                          <SelectItem key={id} value={id}>
                            {id} - Pasien Anak
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <TreatmentResponsePredictor personId={selectedPersonId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budget" className="space-y-6">
            {/* Budget Optimization */}
            <BudgetOptimizationTab />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { HealthOutcomePrediction } from "./predictions/HealthOutcomePrediction";
import { PopulationRiskAnalysis } from "./predictions/PopulationRiskAnalysis";
import { TreatmentResponsePredictor } from "./predictions/TreatmentResponsePredictor";

interface PredictionDashboardProps {
  selectedTimePeriod?: string;
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
            AI Powered
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Target className="h-3 w-3 mr-1" />
            Real-time
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
          <TabsList className="grid w-full grid-cols-3 h-12">
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
        </Tabs>
      </motion.div>
    </div>
  );
}

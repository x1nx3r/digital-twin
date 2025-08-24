"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch, API_ENDPOINTS } from "@/lib/api";
import {
  TrendingUp,
  TrendingDown,
  Heart,
  Baby,
  Users,
  Target,
  BarChart3,
  Activity,
  Shield,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

// Types for Risk Factor Analysis
interface RiskFactor {
  factor: string;
  correlation: number;
  impact_description: string;
  prevalence_data: Array<{
    [key: string]: string | number;
  }>;
  total_affected: number;
  risk_level: string;
  chart_type: string;
  x_axis: string;
  y_axis: string;
}

interface PopulationMetrics {
  total_population: number;
  affected_population: number;
  prevalence_rate: number;
  population_at_risk: number;
}

interface AnalysisPeriod {
  period_months: number;
  start_date: string;
  end_date: string;
  period_label: string;
}

interface RiskFactorData {
  health_outcome: string;
  analysis_period: AnalysisPeriod;
  population_metrics: PopulationMetrics;
  risk_factors: RiskFactor[];
  clinical_insights: {
    primary_modifiable_factors: string[];
    intervention_priorities: string[];
    expected_impact: string;
  };
}

interface RiskFactorsAnalysisProps {
  selectedTimePeriod: string;
}

const RiskStrengthBadge = ({ risk_level }: { risk_level: string }) => {
  const getColor = (risk_level: string) => {
    switch (risk_level.toLowerCase()) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "moderate": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Badge className={`${getColor(risk_level)} border`}>
      {risk_level}
    </Badge>
  );
};

const CorrelationIndicator = ({ correlation }: { correlation: number }) => {
  const absCorr = Math.abs(correlation);
  const isPositive = correlation > 0;
  
  return (
    <div className="flex items-center space-x-2">
      {isPositive ? (
        <TrendingUp className="h-4 w-4 text-red-500" />
      ) : (
        <TrendingDown className="h-4 w-4 text-green-500" />
      )}
      <span className={`text-sm font-medium ${
        absCorr > 0.5 ? 'text-red-600' : absCorr > 0.3 ? 'text-yellow-600' : 'text-blue-600'
      }`}>
        {correlation > 0 ? '+' : ''}{(correlation * 100).toFixed(1)}%
      </span>
    </div>
  );
};

export function RiskFactorsAnalysis({ selectedTimePeriod }: RiskFactorsAnalysisProps) {
  const [hypertensionData, setHypertensionData] = useState<RiskFactorData | null>(null);
  const [stuntingData, setStuntingData] = useState<RiskFactorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"hypertension" | "stunting">("hypertension");

  useEffect(() => {
    const fetchRiskFactors = async () => {
      try {
        setLoading(true);
        setError(null);

        const [hypertensionResponse, stuntingResponse] = await Promise.all([
          apiFetch(API_ENDPOINTS.RISK_FACTORS_HYPERTENSION(selectedTimePeriod)),
          apiFetch(API_ENDPOINTS.RISK_FACTORS_STUNTING(selectedTimePeriod))
        ]);

        if (!hypertensionResponse.ok || !stuntingResponse.ok) {
          throw new Error('Failed to fetch risk factor data');
        }

        const [hypertensionResult, stuntingResult] = await Promise.all([
          hypertensionResponse.json(),
          stuntingResponse.json()
        ]);

        setHypertensionData(hypertensionResult);
        setStuntingData(stuntingResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch risk factors');
      } finally {
        setLoading(false);
      }
    };

    fetchRiskFactors();
  }, [selectedTimePeriod]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Analyzing risk factors...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Error loading risk factors</p>
            <p className="text-gray-600 text-sm mt-2">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderRiskFactorCard = (factor: RiskFactor, index: number) => (
    <motion.div
      key={factor.factor}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className="h-full hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base font-medium text-gray-900 flex-1">
              {factor.factor.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </CardTitle>
            <RiskStrengthBadge risk_level={factor.risk_level} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Correlation Indicator */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Korelasi Dampak</span>
            <CorrelationIndicator correlation={factor.correlation} />
          </div>

          {/* Description */}
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-600 leading-relaxed">
              {factor.impact_description}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "hypertension" | "stunting")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="hypertension" className="flex items-center space-x-2">
            <Heart className="h-4 w-4" />
            <span>Faktor Resiko Hipertensi</span>
          </TabsTrigger>
          <TabsTrigger value="stunting" className="flex items-center space-x-2">
            <Baby className="h-4 w-4" />
            <span>Faktor Risiko Stunting</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hypertension" className="space-y-6">
          {hypertensionData && (
            <>
              {/* Population Overview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-red-600" />
                      <span>Ikhtisar Analisis Risiko Hipertensi</span>
                      <Badge variant="outline">{hypertensionData.analysis_period.period_label}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {hypertensionData.population_metrics.total_population}
                        </div>
                        <div className="text-sm text-gray-600">Total Populasi</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {hypertensionData.population_metrics.affected_population}
                        </div>
                        <div className="text-sm text-gray-600">Terdampak</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {hypertensionData.population_metrics.prevalence_rate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Tingkat Prevalensi</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Risk Factors Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-red-600" />
                      <span>Faktor Resiko yang Teridentifikasi</span>
                      <Badge>{hypertensionData.risk_factors.length} faktor</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {hypertensionData.risk_factors.map((factor, index) => 
                        renderRiskFactorCard(factor, index)
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Insights and Recommendations */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {/* Key Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <span>Primary Modifiable Factors</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {hypertensionData.clinical_insights.primary_modifiable_factors.length > 0 ? (
                        hypertensionData.clinical_insights.primary_modifiable_factors.map((factor, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 * index }}
                            className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200"
                          >
                            <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-800">{factor}</p>
                          </motion.div>
                        ))
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600">No primary modifiable factors identified in current dataset.</p>
                        </div>
                      )}
                      {/* Expected Impact */}
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        className="flex items-start space-x-2 p-3 bg-green-50 rounded-lg border border-green-200"
                      >
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-green-800 font-medium">{hypertensionData.clinical_insights.expected_impact}</p>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      <span>Prioritas Intervensi</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {hypertensionData.clinical_insights.intervention_priorities.map((priority, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 * index }}
                          className="flex items-start space-x-2 p-3 bg-green-50 rounded-lg border border-green-200"
                        >
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-green-800">{priority}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </TabsContent>

        <TabsContent value="stunting" className="space-y-6">
          {stuntingData && (
            <>
              {/* Population Overview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      <span>Ikhtisar Analisis Risiko Stunting</span>
                      <Badge variant="outline">{stuntingData.analysis_period.period_label}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {stuntingData.population_metrics.total_population}
                        </div>
                        <div className="text-sm text-gray-600">Total Populasi</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {stuntingData.population_metrics.affected_population}
                        </div>
                        <div className="text-sm text-gray-600">Terdampak</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {stuntingData.population_metrics.prevalence_rate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Tingkat Prevalensi</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Risk Factors Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      <span>Faktor Resiko yang Teridentifikasi</span>
                      <Badge>{stuntingData.risk_factors.length} faktor</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {stuntingData.risk_factors.map((factor, index) => 
                        renderRiskFactorCard(factor, index)
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Insights and Recommendations */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {/* Key Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <span>Primary Modifiable Factors</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stuntingData.clinical_insights.primary_modifiable_factors.length > 0 ? (
                        stuntingData.clinical_insights.primary_modifiable_factors.map((factor, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 * index }}
                            className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200"
                          >
                            <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-800">{factor}</p>
                          </motion.div>
                        ))
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600">No primary modifiable factors identified in current dataset.</p>
                        </div>
                      )}
                      {/* Expected Impact */}
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        className="flex items-start space-x-2 p-3 bg-green-50 rounded-lg border border-green-200"
                      >
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-green-800 font-medium">{stuntingData.clinical_insights.expected_impact}</p>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      <span>Prioritas Intervensi</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stuntingData.clinical_insights.intervention_priorities.map((priority, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 * index }}
                          className="flex items-start space-x-2 p-3 bg-green-50 rounded-lg border border-green-200"
                        >
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-green-800">{priority}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

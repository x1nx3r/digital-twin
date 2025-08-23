"use client";

import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";

interface TimePeriodSelectorProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  currentDate?: string;
  startDate?: string;
  endDate?: string;
}

export function TimePeriodSelector({ 
  selectedPeriod, 
  onPeriodChange, 
  currentDate,
  startDate,
  endDate 
}: TimePeriodSelectorProps) {
  const periodOptions = [
    { value: "1", label: "1 Bulan", description: "30 hari terakhir" },
    { value: "3", label: "3 Bulan", description: "90 hari terakhir" },
    { value: "12", label: "12 Bulan", description: "Tahun terakhir" },
  ];

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('id-ID', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-200/50 shadow-xl"
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200 rounded-xl">
          <Clock className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-blue-800">Periode Waktu</h3>
          <p className="text-xs text-blue-600">Pilih kerangka waktu analisis</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-full sm:w-48 bg-white/80 backdrop-blur-sm border-blue-200 hover:border-blue-300 transition-colors">
            <SelectValue placeholder="Pilih periode" />
          </SelectTrigger>
          <SelectContent className="bg-white/95 backdrop-blur-lg border-blue-200">
            {periodOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="hover:bg-blue-50">
                <div className="flex flex-col">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-blue-600">{option.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {startDate && endDate && (
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center space-x-1 bg-white/80 backdrop-blur-sm border-blue-200 text-blue-700">
              <Calendar className="h-3 w-3" />
              <span className="text-xs">
                {formatDate(startDate)} - {formatDate(endDate)}
              </span>
            </Badge>
          </div>
        )}
      </div>

      {currentDate && (
        <div className="text-xs text-blue-600 flex items-center space-x-1 font-medium">
          <Clock className="h-3 w-3" />
          <span>Diperbarui: {formatDate(currentDate)}</span>
        </div>
      )}
    </motion.div>
  );
}

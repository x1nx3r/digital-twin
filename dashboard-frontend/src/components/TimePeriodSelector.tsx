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
    { value: "1", label: "1 Month", description: "Last 30 days" },
    { value: "3", label: "3 Months", description: "Last 90 days" },
    { value: "12", label: "12 Months", description: "Last year" },
  ];

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { 
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
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Clock className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-900">Time Period</h3>
          <p className="text-xs text-gray-500">Select analysis timeframe</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-gray-500">{option.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {startDate && endDate && (
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span className="text-xs">
                {formatDate(startDate)} - {formatDate(endDate)}
              </span>
            </Badge>
          </div>
        )}
      </div>

      {currentDate && (
        <div className="text-xs text-gray-500 flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>Updated: {formatDate(currentDate)}</span>
        </div>
      )}
    </motion.div>
  );
}

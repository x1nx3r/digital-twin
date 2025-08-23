"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    direction: "up" | "down" | "neutral";
  };
  color?: "blue" | "green" | "red" | "orange" | "purple";
  delay?: number;
}

const colorVariants = {
  blue: {
    icon: "text-blue-600 bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200",
    card: "border-blue-200/50 bg-gradient-to-br from-blue-50/80 to-white/80 backdrop-blur-lg",
    trend: {
      up: "text-green-600 bg-green-50",
      down: "text-red-600 bg-red-50",
      neutral: "text-gray-600 bg-gray-50",
    },
  },
  green: {
    icon: "text-green-600 bg-gradient-to-br from-green-100 to-green-50 border border-green-200",
    card: "border-green-200/50 bg-gradient-to-br from-green-50/80 to-white/80 backdrop-blur-lg",
    trend: {
      up: "text-green-600 bg-green-50",
      down: "text-red-600 bg-red-50",
      neutral: "text-gray-600 bg-gray-50",
    },
  },
  red: {
    icon: "text-red-600 bg-gradient-to-br from-red-100 to-red-50 border border-red-200",
    card: "border-red-200/50 bg-gradient-to-br from-red-50/80 to-white/80 backdrop-blur-lg",
    trend: {
      up: "text-green-600 bg-green-50",
      down: "text-red-600 bg-red-50",
      neutral: "text-gray-600 bg-gray-50",
    },
  },
  orange: {
    icon: "text-orange-600 bg-gradient-to-br from-orange-100 to-orange-50 border border-orange-200",
    card: "border-orange-200/50 bg-gradient-to-br from-orange-50/80 to-white/80 backdrop-blur-lg",
    trend: {
      up: "text-green-600 bg-green-50",
      down: "text-red-600 bg-red-50",
      neutral: "text-gray-600 bg-gray-50",
    },
  },
  purple: {
    icon: "text-purple-600 bg-gradient-to-br from-purple-100 to-purple-50 border border-purple-200",
    card: "border-purple-200/50 bg-gradient-to-br from-purple-50/80 to-white/80 backdrop-blur-lg",
    trend: {
      up: "text-green-600 bg-green-50",
      down: "text-red-600 bg-red-50",
      neutral: "text-gray-600 bg-gray-50",
    },
  },
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "blue",
  delay = 0,
}: MetricCardProps) {
  const colorConfig = colorVariants[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className={cn("cursor-pointer hover:shadow-xl transition-all duration-300 shadow-lg", colorConfig.card)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">
            {title}
          </CardTitle>
          <div className={cn("p-2 rounded-xl shadow-sm", colorConfig.icon)}>
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: delay + 0.2 }}
              className="text-2xl font-bold text-gray-900"
            >
              {typeof value === "number" ? value.toLocaleString() : value}
            </motion.div>
            
            {subtitle && (
              <div className="text-xs text-gray-500">{subtitle}</div>
            )}
            
            {trend && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: delay + 0.4 }}
              >
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs font-medium",
                    colorConfig.trend[trend.direction]
                  )}
                >
                  {trend.direction === "up" && "↗"}
                  {trend.direction === "down" && "↘"}
                  {trend.direction === "neutral" && "→"}
                  {" "}
                  {trend.value}% {trend.label}
                </Badge>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

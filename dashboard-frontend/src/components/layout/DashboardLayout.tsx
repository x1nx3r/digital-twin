"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Baby,
  Heart,
  Home,
  Building2,
  Menu,
  X,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeView: "overall" | "dusun" | "household";
  onViewChange: (view: "overall" | "dusun" | "household") => void;
  selectedDusun?: string;
  selectedHousehold?: string;
  alerts?: string[];
}

export function DashboardLayout({
  children,
  activeView,
  onViewChange,
  selectedDusun,
  selectedHousehold,
  alerts = [],
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sidebarVariants = {
    open: { width: "280px", opacity: 1 },
    closed: { width: "80px", opacity: 0.8 },
  };

  const contentVariants = {
    open: { marginLeft: "280px" },
    closed: { marginLeft: "80px" },
  };

  const menuItems = [
    {
      id: "overall",
      label: "Overview",
      icon: BarChart3,
      description: "System-wide metrics",
      active: activeView === "overall",
    },
    {
      id: "dusun",
      label: "Dusun Analysis",
      icon: Building2,
      description: selectedDusun || "Select dusun",
      active: activeView === "dusun",
    },
    {
      id: "household",
      label: "Household View",
      icon: Home,
      description: selectedHousehold || "Select household",
      active: activeView === "household",
    },
  ];

  const healthPrograms = [
    {
      id: "hypertension",
      label: "Hypertension",
      icon: Heart,
      color: "bg-red-100 text-red-700",
      description: "Adult blood pressure management",
    },
    {
      id: "stunting",
      label: "Child Stunting",
      icon: Baby,
      color: "bg-blue-100 text-blue-700",
      description: "Child nutrition and growth",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <motion.div
        className="fixed left-0 top-0 z-50 h-full bg-white border-r border-gray-200 shadow-lg"
        variants={sidebarVariants}
        animate={sidebarOpen ? "open" : "closed"}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <AnimatePresence mode="wait">
            {sidebarOpen ? (
              <motion.div
                key="title"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center space-x-2"
              >
                <Activity className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    Digital Twin
                  </h1>
                  <p className="text-xs text-gray-500">Kesehatan Desa</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="icon"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Activity className="h-6 w-6 text-blue-600 mx-auto" />
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8 p-0"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <div className="p-4 space-y-2">
          <AnimatePresence mode="wait">
            {sidebarOpen && (
              <motion.div
                key="nav-title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Dashboard Views
                </h2>
              </motion.div>
            )}
          </AnimatePresence>

          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={item.active ? "default" : "ghost"}
              className={cn(
                "w-full justify-start h-auto p-3",
                item.active && "bg-blue-50 text-blue-700 border-blue-200",
                !sidebarOpen && "justify-center"
              )}
              onClick={() => onViewChange(item.id as "overall" | "dusun" | "household")}
            >
              <item.icon className={cn("h-4 w-4", sidebarOpen && "mr-3")} />
              <AnimatePresence mode="wait">
                {sidebarOpen && (
                  <motion.div
                    key="item-content"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 text-left"
                  >
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          ))}
        </div>

        <Separator />

        {/* Health Programs */}
        <div className="p-4 space-y-2">
          <AnimatePresence mode="wait">
            {sidebarOpen && (
              <motion.div
                key="programs-title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Health Programs
                </h2>
              </motion.div>
            )}
          </AnimatePresence>

          {healthPrograms.map((program) => (
            <div
              key={program.id}
              className={cn(
                "flex items-center p-3 rounded-lg border",
                program.color,
                !sidebarOpen && "justify-center"
              )}
            >
              <program.icon className={cn("h-4 w-4", sidebarOpen && "mr-3")} />
              <AnimatePresence mode="wait">
                {sidebarOpen && (
                  <motion.div
                    key="program-content"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1"
                  >
                    <div className="font-medium text-sm">{program.label}</div>
                    <div className="text-xs opacity-70">{program.description}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <>
            <Separator />
            <div className="p-4">
              <AnimatePresence mode="wait">
                {sidebarOpen && (
                  <motion.div
                    key="alerts-title"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Alerts
                      </h2>
                      <Badge variant="destructive" className="text-xs">
                        {alerts.length}
                      </Badge>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                {alerts.slice(0, 3).map((alert, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className={cn(
                      "flex items-start p-2 bg-orange-50 border border-orange-200 rounded-lg text-orange-800",
                      !sidebarOpen && "justify-center"
                    )}
                  >
                    <AlertTriangle className={cn("h-3 w-3 mt-0.5 flex-shrink-0", sidebarOpen && "mr-2")} />
                    <AnimatePresence mode="wait">
                      {sidebarOpen && (
                        <motion.div
                          key="alert-content"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-xs"
                        >
                          {alert}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Main Content */}
      <motion.div
        className="flex-1 overflow-hidden"
        variants={contentVariants}
        animate={sidebarOpen ? "open" : "closed"}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="h-full overflow-auto bg-gray-50">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

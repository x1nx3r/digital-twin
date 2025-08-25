"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  Database,
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
  const router = useRouter();

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
      label: "Tinjauan Umum",
      icon: BarChart3,
      description: "Metrik seluruh sistem",
      active: activeView === "overall",
    },
    {
      id: "dusun",
      label: "Analisis Dusun",
      icon: Building2,
      description: selectedDusun || "Pilih dusun",
      active: activeView === "dusun",
    },
    {
      id: "household",
      label: "Tampilan Rumah Tangga",
      icon: Home,
      description: selectedHousehold || "Pilih rumah tangga",
      active: activeView === "household",
    },
  ];

  const healthPrograms = [
    {
      id: "hypertension",
      label: "Hipertensi",
      icon: Heart,
      color: "bg-red-100/80 text-red-700 backdrop-blur-sm",
      description: "Manajemen tekanan darah dewasa",
    },
    {
      id: "stunting",
      label: "Stunting Anak",
      icon: Baby,
      color: "bg-blue-100/80 text-blue-700 backdrop-blur-sm",
      description: "Nutrisi dan pertumbuhan anak",
    },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-sky-50">
      {/* Sidebar */}
      <motion.div
        className="fixed left-0 top-0 z-50 h-full bg-white/80 backdrop-blur-xl border-r border-blue-200/50 shadow-2xl"
        variants={sidebarVariants}
        animate={sidebarOpen ? "open" : "closed"}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-blue-200/50 bg-gradient-to-r from-blue-600/5 to-indigo-600/5">
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
                  <h1 className="text-lg font-bold bg-gradient-to-r from-blue-800 to-indigo-800 bg-clip-text text-transparent">
                    Digital Twin
                  </h1>
                  <p className="text-xs text-blue-600 font-medium">Kesehatan Desa</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="icon"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-2"
              >
                <Activity className="h-6 w-6 text-white mx-auto" />
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8 p-0 hover:bg-blue-100/80 text-blue-600"
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
                <h2 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">
                  Tampilan Dashboard
                </h2>
              </motion.div>
            )}
          </AnimatePresence>

          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={item.active ? "default" : "ghost"}
              className={cn(
                "w-full justify-start h-auto p-3 transition-all duration-300",
                item.active && "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:from-blue-700 hover:to-indigo-700",
                !item.active && "hover:bg-blue-50/80 text-blue-700",
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
                    <div className="text-xs opacity-80">{item.description}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          ))}
        </div>

        <Separator className="bg-blue-200/50" />

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
                <h2 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">
                  Program Kesehatan
                </h2>
              </motion.div>
            )}
          </AnimatePresence>

          {healthPrograms.map((program) => (
            <div
              key={program.id}
              className={cn(
                "flex items-center p-3 rounded-xl border border-opacity-50 shadow-sm transition-all duration-300 hover:shadow-md",
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

        <Separator className="bg-blue-200/50" />

        {/* Data Management */}
        <div className="p-4 space-y-2">
          <AnimatePresence mode="wait">
            {sidebarOpen && (
              <motion.div
                key="management-title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-3">
                  Manajemen Data
                </h2>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start h-auto p-3 transition-all duration-300 hover:bg-green-50/80 text-green-700 border border-green-200/50",
              !sidebarOpen && "justify-center"
            )}
            onClick={() => router.push('/crud')}
          >
            <Database className={cn("h-4 w-4", sidebarOpen && "mr-3")} />
            <AnimatePresence mode="wait">
              {sidebarOpen && (
                <motion.div
                  key="crud-content"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 text-left"
                >
                  <div className="font-medium">Kelola Data</div>
                  <div className="text-xs opacity-80">Kelola data kesehatan</div>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </div>

        <Separator className="bg-blue-200/50" />

        {/* Alerts */}
        {alerts.length > 0 && (
          <>
            <Separator className="bg-blue-200/50" />
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
                    
                  </motion.div>
                )}
              </AnimatePresence>

              
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
        <div className="h-full overflow-auto bg-gradient-to-br from-blue-50 via-blue-100 to-sky-50">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

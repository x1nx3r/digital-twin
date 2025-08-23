"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CRUDManagement from "@/components/CRUDManagement";

export default function CRUDPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header with Navigation */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-blue-200/50 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Dashboard</span>
              </Button>
              
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Manajemen Data CRUD
                </h1>
                <p className="text-sm text-gray-600">
                  Kelola data kesehatan digital twin
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CRUD Component */}
      <div className="p-6">
        <CRUDManagement />
      </div>
    </div>
  );
}

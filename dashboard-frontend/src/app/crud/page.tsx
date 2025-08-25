"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SpreadsheetCRUD } from "@/components/SpreadsheetCRUD";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPage } from "@/components/auth/AuthPage";

export default function CRUDPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useAuth();

  const handleAuth = (success: boolean) => {
    if (success) {
      login();
    }
  };

  if (!isAuthenticated) {
    return <AuthPage onAuth={handleAuth} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-sky-50">
      {/* Header with Navigation */}
      <div className="sticky top-0 z-20 w-full bg-white/90 backdrop-blur-xl border-b border-blue-200/40 shadow-md rounded-b-xl">
        <div className="py-4 px-8 flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/')}
            className="flex items-center gap-2 border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-colors rounded-lg px-3 py-2 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-blue-700" />
            <span className="font-medium text-blue-900">Kembali ke Dashboard</span>
          </Button>
        </div>
      </div>

      {/* Spreadsheet CRUD Component */}
      <SpreadsheetCRUD />
    </div>
  );
}

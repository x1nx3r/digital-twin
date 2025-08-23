"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, BarChart3 } from "lucide-react";

export default function NavigationCard() {
  return (
    <Card className="mb-6 bg-white/80 backdrop-blur-sm border-blue-200/50 shadow-lg">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/">
            <Button variant="outline" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          
          <Link href="/crud">
            <Button variant="default" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Manajemen Data
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

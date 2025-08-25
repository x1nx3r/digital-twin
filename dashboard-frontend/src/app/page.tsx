"use client";

import { useAuth } from '@/contexts/AuthContext';
import { AuthPage } from '@/components/auth/AuthPage';
import ModernDashboard from '@/components/ModernDashboard';

export default function Home() {
  const { isAuthenticated, login } = useAuth();

  const handleAuth = (success: boolean) => {
    if (success) {
      login();
    }
  };

  if (!isAuthenticated) {
    return <AuthPage onAuth={handleAuth} />;
  }

  return <ModernDashboard />;
}

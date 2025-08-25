"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, User, Activity, Heart, Baby, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthPageProps {
  onAuth: (success: boolean) => void;
}

export function AuthPage({ onAuth }: AuthPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (username === "admin" && password === "admin") {
      onAuth(true);
    } else {
      setError("Username atau password salah");
      onAuth(false);
    }
    
    setIsLoading(false);
  };

  const floatingIcons = [
    { icon: Activity, delay: 0, x: "10%", y: "20%" },
    { icon: Heart, delay: 0.5, x: "80%", y: "30%" },
    { icon: Baby, delay: 1, x: "15%", y: "70%" },
    { icon: Shield, delay: 1.5, x: "85%", y: "80%" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-sky-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Floating Background Icons */}
      {floatingIcons.map((item, index) => (
        <motion.div
          key={index}
          className="absolute opacity-10 text-blue-600"
          style={{ left: item.x, top: item.y }}
          initial={{ opacity: 0, scale: 0, rotate: -180 }}
          animate={{ 
            opacity: 0.1, 
            scale: 1, 
            rotate: 0,
            y: [0, -20, 0],
          }}
          transition={{ 
            duration: 2,
            delay: item.delay,
            y: {
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
        >
          <item.icon size={60} />
        </motion.div>
      ))}

      {/* Main Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="bg-white/80 backdrop-blur-lg shadow-2xl  border border-blue-200/50 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <CardHeader className="text-center  border-b border-blue-200/50 pb-8">
              <div className="flex justify-center mb-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full p-4 shadow-lg"
                >
                  <Activity className="h-8 w-8 text-white" />
                </motion.div>
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-800 to-indigo-800 bg-clip-text text-transparent">
                Digital Twin Kesehatan Desa
              </CardTitle>
              <CardDescription className="text-blue-600 font-medium mt-2">
                Masuk ke dashboard pemantauan kesehatan
              </CardDescription>
            </CardHeader>
          </motion.div>

          <CardContent className="">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Username Field */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-blue-800 font-medium">
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-500" />
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan username"
                      className="pl-10 bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-blue-800 font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-500" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password"
                      className="pl-10 pr-10 bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-300"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-700 transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-red-600 text-sm bg-red-50/80 border border-red-200 rounded-lg p-3 text-center"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Login Button */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-5 w-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      "Masuk Dashboard"
                    )}
                  </Button>
                </motion.div>

              </form>
            </motion.div>
          </CardContent>
        </Card>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-6 text-blue-600/70"
        >
          <p className="text-sm">
            Sistem Pemantauan Kesehatan Digital untuk Desa
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

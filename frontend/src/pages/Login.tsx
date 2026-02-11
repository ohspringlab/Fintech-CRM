import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success("Login successful!");
      // Redirect based on user role will be handled by ProtectedRoute
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Full Screen Background - Real Estate/Finance Theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-blue-900 to-indigo-900">
        {/* Real Estate Building Silhouettes Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-slate-900/50 to-transparent">
            {/* Building silhouettes */}
            <svg className="w-full h-full" viewBox="0 0 1200 400" preserveAspectRatio="none">
              <path d="M0,400 L0,300 L50,300 L50,250 L100,250 L100,200 L150,200 L150,280 L200,280 L200,150 L250,150 L250,320 L300,320 L300,180 L350,180 L350,260 L400,260 L400,140 L450,140 L450,300 L500,300 L500,200 L550,200 L550,350 L600,350 L600,220 L650,220 L650,280 L700,280 L700,160 L750,160 L750,240 L800,240 L800,300 L850,300 L850,180 L900,180 L900,320 L950,320 L950,200 L1000,200 L1000,360 L1050,360 L1050,240 L1100,240 L1100,300 L1150,300 L1150,180 L1200,180 L1200,400 Z" fill="currentColor" className="text-white/30" />
            </svg>
          </div>
        </div>

        {/* Financial/Investment Pattern Overlay */}
        <div className="absolute inset-0">
          {/* Grid pattern representing financial markets */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* Abstract Blur Shapes - Financial Theme */}
        <div className="absolute inset-0">
          {/* Large Abstract Shapes - representing growth and flow */}
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-3xl -translate-x-1/4 -translate-y-1/4 animate-pulse" />
          <div className="absolute top-1/4 right-0 w-[350px] h-[500px] bg-indigo-500/15 rounded-full blur-3xl translate-x-1/4 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-0 left-1/4 w-[450px] h-[400px] bg-slate-500/20 rounded-full blur-3xl -translate-y-1/4 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/3 right-1/4 w-[300px] h-[350px] bg-blue-400/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
          
          {/* Medium Abstract Shapes */}
          <div className="absolute top-1/2 left-1/2 w-[250px] h-[250px] bg-cyan-400/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute top-1/3 right-1/3 w-[200px] h-[200px] bg-blue-400/10 rounded-full blur-2xl" />
          <div className="absolute bottom-1/4 left-1/3 w-[220px] h-[220px] bg-indigo-400/10 rounded-full blur-2xl" />
        </div>

        {/* Glass Overlay Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/3 backdrop-blur-sm" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.06)_0%,transparent_50%)]" />
        
        {/* Subtle shine effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/20" />
      </div>

      {/* Centered Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-xs">
        <div className="bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30 shadow-2xl p-5 sm:p-6">
          {/* Logo */}
          <div className="flex justify-center mb-3">
            <img 
              src="/logo-icon.png" 
              alt="Riverside Park Capital Logo" 
              className="h-8 w-auto drop-shadow-lg"
            />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-5 text-center drop-shadow-lg">
            Login
          </h1>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-white drop-shadow-md">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="username@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-10 text-sm border border-gray-300/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 bg-white/95 backdrop-blur-sm transition-all duration-300 rounded-lg text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-white drop-shadow-md">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-10 text-sm border border-gray-300/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 bg-white/95 backdrop-blur-sm transition-all duration-300 rounded-lg pr-9 text-gray-900 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-blue-200 hover:text-blue-100 transition-colors drop-shadow-md">
                Forgot Password?
              </Link>
            </div>
            <Button 
              type="submit" 
              className="w-full h-10 text-sm bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* Separator */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/30"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white/20 backdrop-blur-sm text-white/80 rounded-full">or continue with</span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button
              type="button"
              className="flex items-center justify-center h-10 w-10 bg-white rounded-full hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 mx-auto"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </button>
            <button
              type="button"
              className="flex items-center justify-center h-10 w-10 bg-white rounded-full hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 mx-auto"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </button>
            <button
              type="button"
              className="flex items-center justify-center h-10 w-10 bg-white rounded-full hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 mx-auto"
            >
              <svg className="w-4 h-4" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="text-center text-xs">
            <span className="text-white/80 drop-shadow-md">Don't have an account yet? </span>
            <Link to="/register" className="text-blue-200 hover:text-blue-100 font-semibold hover:underline transition-colors drop-shadow-md">
              Register for free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

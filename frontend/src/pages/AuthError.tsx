import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { useUser } from "@clerk/clerk-react";

export default function AuthError() {
  const navigate = useNavigate();

  const handleGoBack = () => {
    // Clear any invalid tokens
    localStorage.removeItem('rpc_token');
    // Navigate to home/landing page
    navigate('/', { replace: true });
  };

  const handleGoToLogin = () => {
    // Clear any invalid tokens
    localStorage.removeItem('rpc_token');
    // Navigate to login
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/30 to-indigo-50/20">
      {isSignedIn ? <AppNavbar variant="borrower" /> : <Navbar variant="light" />}
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card className="bg-white border-border shadow-sm">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-serif font-bold">Invalid Authentication Request</CardTitle>
              <CardDescription className="mt-2">
                Your session has expired or the authentication request is invalid.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Please try logging in again or return to the home page.
              </p>
              
              <div className="flex flex-col gap-3 pt-4">
                <Button 
                  onClick={handleGoToLogin}
                  variant="default"
                  className="w-full"
                >
                  Go to Login
                </Button>
                <Button 
                  onClick={handleGoBack}
                  variant="outline"
                  className="w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Return to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}




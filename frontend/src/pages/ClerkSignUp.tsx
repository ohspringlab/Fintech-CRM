import { SignUp, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api";

export default function ClerkSignUp() {
  const { isSignedIn, isLoaded } = useUser();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const redirectBasedOnRole = async () => {
      if (isSignedIn && isLoaded && !isRedirecting) {
        console.log('🔄 User is signed in, fetching role for redirect...');
        setIsRedirecting(true);
        try {
          const response = await authApi.me();
          const userRole = response.user.role;
          console.log('✅ User role:', userRole);
          
          // Redirect based on role
          if (userRole === 'admin') {
            console.log('➡️ Redirecting admin to /admin');
            navigate('/admin', { replace: true });
          } else if (userRole === 'operations') {
            console.log('➡️ Redirecting operations to /ops');
            navigate('/ops', { replace: true });
          } else {
            console.log('➡️ Redirecting borrower to /dashboard');
            navigate('/dashboard', { replace: true });
          }
        } catch (error) {
          console.error('❌ Failed to fetch user role:', error);
          navigate('/dashboard', { replace: true });
        }
      }
    };

    redirectBasedOnRole();
  }, [isSignedIn, isLoaded, navigate, isRedirecting]);

  // Show loading while redirecting
  if (isSignedIn && isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-gray-400">Start your lending journey with RPC</p>
        </div>
        
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-white shadow-xl rounded-lg",
              headerTitle: "text-navy-900",
              headerSubtitle: "text-gray-600",
              socialButtonsBlockButton: "border-gray-300 hover:bg-gray-50",
              formButtonPrimary: "bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold",
              footerActionLink: "text-gold-500 hover:text-gold-600",
              formFieldInput: "border-gray-300 focus:border-gold-500 focus:ring-gold-500",
              identityPreviewEditButton: "text-gold-500 hover:text-gold-600",
            },
          }}
          signInUrl="/clerk-signin"
        />
      </div>
    </div>
  );
}

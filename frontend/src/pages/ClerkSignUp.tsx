import { SignUp, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api";

export default function ClerkSignUp() {
  const { isSignedIn, isLoaded } = useUser();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Intercept network errors for better debugging
  useEffect(() => {
    // Monitor fetch requests for Clerk API errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Check if this is a Clerk signup request that failed
        if (args[0]?.toString().includes('sign_ups') && response.status === 422) {
          try {
            const errorData = await response.clone().json();
            console.error('🚨 Clerk 422 Error Details:', errorData);
            
            // Extract error message
            if (errorData.errors && errorData.errors.length > 0) {
              const firstError = errorData.errors[0];
              const errorCode = firstError.code || 'unknown_error';
              const errorMessage = firstError.message || 'Signup failed';
              
              setError(`Signup failed: ${errorMessage}`);
              setErrorDetails(`Error code: ${errorCode}. See Network tab (F12) for full details.`);
              
              // Provide specific guidance based on error code
              if (errorCode === 'captcha_invalid' || errorCode.includes('captcha')) {
                setErrorDetails('Bot protection (CAPTCHA) failed. Disable bot protection in Clerk Dashboard → Attack Protection.');
              } else if (errorCode === 'form_identifier_exists') {
                setErrorDetails('Email already exists. Use a different email address.');
              } else if (errorCode === 'form_password_pwned') {
                setErrorDetails('Password found in data breach. Use a stronger, unique password.');
              } else if (errorCode === 'restriction_failed') {
                setErrorDetails('Email domain restricted. Remove restrictions in Clerk Dashboard → Restrictions.');
              }
            } else {
              setError('Signup failed with 422 error');
              setErrorDetails('Check Network tab (F12) → Response tab for details.');
            }
          } catch (parseError) {
            setError('Signup failed. Unable to parse error details.');
            setErrorDetails('Open DevTools (F12) → Network tab → Find failed request → Check Response tab.');
          }
        }
        
        return response;
      } catch (error) {
        throw error;
      }
    };
    
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

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
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm font-semibold mb-2">⚠️ Signup Error</p>
            <p className="text-red-600 text-xs mb-2">{error}</p>
            {errorDetails && (
              <p className="text-red-500 text-xs mb-2">
                💡 <strong>Solution:</strong> {errorDetails}
              </p>
            )}
            <div className="mt-3 pt-3 border-t border-red-200">
              <p className="text-red-600 text-xs font-semibold mb-1">Quick Fix Steps:</p>
              <ol className="text-red-500 text-xs list-decimal list-inside space-y-1">
                <li>Go to <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" className="underline">Clerk Dashboard</a></li>
                <li>User & Authentication → Attack Protection</li>
                <li>Turn OFF bot protection toggles</li>
                <li>User & Authentication → Restrictions → Remove all restrictions</li>
                <li>Save and try again</li>
              </ol>
            </div>
          </div>
        )}
        
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
          routing="path"
          path="/clerk-signup"
        />
      </div>
    </div>
  );
}

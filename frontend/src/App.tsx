import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClerkProvider, useUser, useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { setClerkTokenGetter } from "@/lib/api";
import { authApi } from "@/lib/api";
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ClerkSignIn from "./pages/ClerkSignIn";
import ClerkSignUp from "./pages/ClerkSignUp";
import VerifyEmail from "./pages/VerifyEmail";
import LoanRequest from "./pages/LoanRequest";
import BorrowerDashboard from "./pages/BorrowerDashboard";
import LoanDetail from "./pages/LoanDetail";
import OperationsDashboard from "./pages/OperationsDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import BrokerDashboard from "./pages/BrokerDashboard";
import InvestorDashboard from "./pages/InvestorDashboard";
import LoanPrograms from "./pages/LoanPrograms";
import Contact from "./pages/Contact";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import AuthError from "./pages/AuthError";

const queryClient = new QueryClient();
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

// Protected route wrapper using Clerk with role-based access control
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isSignedIn, isLoaded, signOut } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  // Handle auto-logout on 401 errors
  useEffect(() => {
    const handleLogout = async (event: CustomEvent) => {
      console.log('🔒 Auto-logout triggered:', event.detail);
      try {
        await signOut();
      } catch (error) {
        console.error('Error during sign out:', error);
      }
    };

    window.addEventListener('auth:logout', handleLogout as EventListener);
    return () => {
      window.removeEventListener('auth:logout', handleLogout as EventListener);
    };
  }, [signOut]);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (isSignedIn && isLoaded) {
        try {
          const response = await authApi.me();
          const role = response.user?.role;
          console.log('✅ ProtectedRoute: User role fetched:', role);
          setUserRole(role || 'borrower'); // Default to borrower if role is missing
        } catch (error: any) {
          // If 401 and user is signed in with Clerk, it might be a token issue
          // Don't immediately logout - let Clerk handle authentication state
          if (error?.status === 401 || error?.code === 'AUTH_REQUIRED') {
            console.warn('🔒 401 error in ProtectedRoute - user may need to re-authenticate');
            // Only logout if user is not actually signed in with Clerk
            // Otherwise, set role to null and let the route handle it
            setUserRole(null);
          } else {
            console.error('Failed to fetch user role:', error);
            // For borrower routes, default to borrower role if fetch fails
            // This allows borrower dashboard to work even if API is temporarily down
            if (allowedRoles?.includes('borrower')) {
              console.warn('⚠️ Role fetch failed, but allowing borrower access');
              setUserRole('borrower');
            } else {
              setUserRole(null);
            }
          }
        } finally {
          setIsCheckingRole(false);
        }
      } else {
        setIsCheckingRole(false);
      }
    };

    if (isLoaded) {
      fetchUserRole();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, isLoaded]);

  if (!isLoaded || isCheckingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/clerk-signin" replace />;
  }

  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0) {
    // If userRole is null but user is signed in, try to fetch role again or redirect appropriately
    if (!userRole) {
      if (allowedRoles.includes('borrower')) {
        // Allow access to borrower dashboard even if role fetch failed
        return <>{children}</>;
      }
      // For admin/ops/broker/investor roles, we need the role to be fetched
      // If role fetch failed, try to fetch it one more time, otherwise redirect to sign in
      // This prevents admin from accessing borrower dashboard when role fetch fails
      console.warn('Role fetch failed for protected route, redirecting to sign in');
      return <Navigate to="/clerk-signin" replace />;
    }
    
    // If userRole doesn't match allowed roles, redirect to appropriate dashboard
    if (!allowedRoles.includes(userRole)) {
      // Redirect to appropriate dashboard based on role
      if (userRole === 'admin') {
        return <Navigate to="/admin" replace />;
      } else if (userRole === 'operations') {
        return <Navigate to="/ops" replace />;
      } else if (userRole === 'broker') {
        return <Navigate to="/broker" replace />;
      } else if (userRole === 'investor') {
        return <Navigate to="/investor" replace />;
      } else {
        // Default to borrower dashboard for unknown roles
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  // Additional check: Block admin from borrower dashboard explicitly
  if (allowedRoles?.includes('borrower') && userRole === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

// Initialize Clerk token getter for API calls
function ClerkTokenInitializer() {
  const { getToken } = useAuth();
  
  useEffect(() => {
    console.log('🔑 Initializing Clerk token getter');
    setClerkTokenGetter(getToken);
  }, [getToken]);
  
  return null;
}

function AppRoutes() {
  const { isSignedIn, user: clerkUser } = useUser();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/loan-programs" element={<LoanPrograms />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      
      {/* Legacy authentication routes - redirect to Clerk */}
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify-email" element={<Navigate to="/clerk-signup" replace />} />
      
      {/* Clerk authentication routes */}
      <Route path="/clerk-signin" element={<ClerkSignIn />} />
      <Route path="/clerk-signin/*" element={<ClerkSignIn />} />
      <Route path="/clerk-signup" element={<ClerkSignUp />} />
      <Route path="/clerk-signup/*" element={<ClerkSignUp />} />
      
      {/* Loan Request - requires auth */}
      <Route path="/loan-request" element={
        <ProtectedRoute>
          <LoanRequest />
        </ProtectedRoute>
      } />
      <Route path="/loan-request/:loanId" element={
        <ProtectedRoute>
          <LoanRequest />
        </ProtectedRoute>
      } />
      
      {/* Borrower Dashboard */}
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['borrower']}>
          <BorrowerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/loans/:loanId" element={
        <ProtectedRoute allowedRoles={['borrower']}>
          <LoanDetail />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/*" element={
        <ProtectedRoute allowedRoles={['borrower']}>
          <BorrowerDashboard />
        </ProtectedRoute>
      } />
      
      {/* Operations Dashboard */}
      <Route path="/ops" element={
        <ProtectedRoute allowedRoles={['operations', 'admin']}>
          <OperationsDashboard />
        </ProtectedRoute>
      } />
      <Route path="/ops/loans/:loanId" element={
        <ProtectedRoute allowedRoles={['operations', 'admin']}>
          <LoanDetail />
        </ProtectedRoute>
      } />
      <Route path="/ops/*" element={
        <ProtectedRoute allowedRoles={['operations', 'admin']}>
          <OperationsDashboard />
        </ProtectedRoute>
      } />
      
      {/* Admin Dashboard */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      
      {/* Broker Dashboard */}
      <Route path="/broker" element={
        <ProtectedRoute allowedRoles={['broker']}>
          <BrokerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/broker/loans/:loanId" element={
        <ProtectedRoute allowedRoles={['broker']}>
          <LoanDetail />
        </ProtectedRoute>
      } />
      <Route path="/broker/*" element={
        <ProtectedRoute allowedRoles={['broker']}>
          <BrokerDashboard />
        </ProtectedRoute>
      } />
      
      {/* Investor Dashboard */}
      <Route path="/investor" element={
        <ProtectedRoute allowedRoles={['investor']}>
          <InvestorDashboard />
        </ProtectedRoute>
      } />
      <Route path="/investor/loans/:loanId" element={
        <ProtectedRoute allowedRoles={['investor']}>
          <LoanDetail />
        </ProtectedRoute>
      } />
      <Route path="/investor/*" element={
        <ProtectedRoute allowedRoles={['investor']}>
          <InvestorDashboard />
        </ProtectedRoute>
      } />
      
      {/* Auth Error Page */}
      <Route path="/auth-error" element={<AuthError />} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Missing Clerk Publishable Key</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <ClerkTokenInitializer />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </ClerkProvider>
    </QueryClientProvider>
  );
};

export default App;

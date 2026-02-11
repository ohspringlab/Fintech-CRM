import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { authApi } from "@/lib/api";
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Login from "./pages/Login";
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
import ResidentialLanding from "./pages/ResidentialLanding";
import CommercialLanding from "./pages/CommercialLanding";

const queryClient = new QueryClient();

// Protected route wrapper using JWT with role-based access control
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading, logout } = useAuth();
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  // Handle auto-logout on 401 errors
  useEffect(() => {
    const handleLogout = async (event: CustomEvent) => {
      console.log('🔒 Auto-logout triggered:', event.detail);
      logout();
    };

    window.addEventListener('auth:logout', handleLogout as EventListener);
    return () => {
      window.removeEventListener('auth:logout', handleLogout as EventListener);
    };
  }, [logout]);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user && !isLoading) {
        try {
          const response = await authApi.me();
          const role = response.user?.role;
          console.log('✅ ProtectedRoute: User role fetched:', role);
          setIsCheckingRole(false);
        } catch (error: any) {
          if (error?.status === 401 || error?.code === 'AUTH_REQUIRED') {
            console.warn('🔒 401 error in ProtectedRoute - user may need to re-authenticate');
            logout();
          } else {
            console.error('Failed to fetch user role:', error);
            if (allowedRoles?.includes('borrower')) {
              console.warn('⚠️ Role fetch failed, but allowing borrower access');
            }
          }
          setIsCheckingRole(false);
        }
      } else if (!isLoading) {
        setIsCheckingRole(false);
      }
    };

    if (!isLoading) {
      fetchUserRole();
    }
  }, [user, isLoading, logout, allowedRoles]);

  if (isLoading || isCheckingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role;
    
    if (!userRole) {
      if (allowedRoles.includes('borrower')) {
        return <>{children}</>;
      }
      console.warn('Role fetch failed for protected route, redirecting to login');
      return <Navigate to="/login" replace />;
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
  if (allowedRoles?.includes('borrower') && user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/loan-programs" element={<LoanPrograms />} />
      <Route path="/residential" element={<ResidentialLanding />} />
      <Route path="/commercial" element={<CommercialLanding />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      
      {/* Authentication routes */}
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      
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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

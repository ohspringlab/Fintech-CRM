import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { LoanCard } from "@/components/dashboard/LoanCard";
import { LoanTrackerFull, statusConfig, LoanStatus } from "@/components/loan/LoanTracker";
import { useAuth } from "@/contexts/AuthContext";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { loansApi, documentsApi, profileApi, Loan, NeedsListItem, Notification } from "@/lib/api";
import { 
  ArrowRight, Building2, DollarSign, FileText, Plus, User, Bell, Settings, LogOut, 
  Clock, Upload, FolderOpen, Download, CheckCircle2, AlertCircle, Mail, XCircle, RefreshCw, Search, Filter
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";

export default function BorrowerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [loans, setLoans] = useState<Loan[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [needsList, setNeedsList] = useState<NeedsListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active"); // Default to showing only active loans
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const loadData = useCallback(async (showLoading = true, forceRefresh = false) => {
    try {
      if (showLoading) setIsLoading(true);
      
      // Add cache busting timestamp for force refresh
      const cacheBuster = forceRefresh ? `?t=${Date.now()}` : '';
      
      const [loansRes, notifRes, profileRes] = await Promise.all([
        loansApi.list(),
        profileApi.getNotifications(),
        profileApi.get().catch(() => ({ profile: null })) // Load profile, but don't fail if it doesn't exist
      ]);
      
      // Store profile data
      if (profileRes.profile) {
        setProfile(profileRes.profile);
      }
      
      // Sort loans by created_at DESC (most recent first)
      const sortedLoans = [...loansRes.loans].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
      
      setLoans(sortedLoans);
      setNotifications(notifRes.notifications);
      setUnreadCount(notifRes.unreadCount);
      
      // Always select the most recent loan when data is refreshed
      if (sortedLoans.length > 0) {
        const mostRecentLoan = sortedLoans[0];
        setSelectedLoan(mostRecentLoan);
        try {
          const needsRes = await documentsApi.getNeedsList(mostRecentLoan.id);
          setNeedsList(needsRes.needsList);
        } catch (error) {
          console.error('Failed to load needs list:', error);
          setNeedsList([]);
        }
      } else {
        setSelectedLoan(null);
        setNeedsList([]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []); // Remove selectedLoan from deps to avoid unnecessary re-renders

  // Load data on mount and when location changes (user navigates back)
  useEffect(() => {
    // Always force refresh when pathname changes to ensure we have latest loans
    // This handles navigation from loan creation, loan detail pages, etc.
    loadData(true, true);
  }, [location.pathname]); // Refresh when pathname changes

  // Handle URL tab parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['overview', 'loans', 'documents', 'profile'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  // Also refresh when window gains focus (user switches back to tab)
  useEffect(() => {
    const handleFocus = () => {
      // Only refresh if we're on the dashboard
      if (location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/')) {
        loadData(false, true); // Force refresh but don't show loading spinner on focus refresh
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [location.pathname]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Force refresh with cache busting
    await loadData(false, true);
    toast.success('Dashboard refreshed');
  };

  const handleLoanSelect = async (loan: Loan) => {
    setSelectedLoan(loan);
    try {
      const needsRes = await documentsApi.getNeedsList(loan.id);
      setNeedsList(needsRes.needsList);
    } catch (error) {
      console.error('Failed to load needs list:', error);
      setNeedsList([]);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, needsListItemId?: string) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLoan) return;

    try {
      await documentsApi.upload(selectedLoan.id, file, needsListItemId);
      toast.success('Document uploaded successfully');
      // Refresh needs list
      const needsRes = await documentsApi.getNeedsList(selectedLoan.id);
      setNeedsList(needsRes.needsList);
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    }
  };

  const getFolderColor = (color: string) => {
    switch (color) {
      case 'red': return 'bg-red-100 border-red-300 text-red-700';
      case 'blue': return 'bg-blue-100 border-blue-300 text-blue-700';
      default: return 'bg-amber-50 border-amber-200 text-amber-700';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalRequested = loans.reduce((sum, loan) => sum + (Number(loan.loan_amount) || 0), 0);
  const pendingDocs = needsList.filter(n => n.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 text-foreground relative">
      {/* Background Pattern Overlay */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(99,102,241,0.03)_0%,transparent_50%)] pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.03)_0%,transparent_50%)] pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(59,130,246,0.01)_50%,transparent_100%)] pointer-events-none z-0" />
      {/* Email Verification Banner */}
      {user && !user.email_verified && (
        <div className="bg-slate-50 border-b border-slate-200">
          <div className="container mx-auto px-4 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-slate-600" />
                <p className="text-sm text-slate-800">
                  Please verify your email address to submit loan requests.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/verify-email')}
                className="border-slate-300 text-slate-800 hover:bg-slate-100"
              >
                <Mail className="w-4 h-4 mr-2" />
                Verify Email
              </Button>
            </div>
          </div>
        </div>
      )}

      <AppNavbar variant="operations" notifications={notifications} unreadCount={unreadCount} />

      <main className="relative container mx-auto px-4 lg:px-8 py-10 lg:py-14 space-y-10 z-10">
        <Card className="relative bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 border-slate-200/50 shadow-lg rounded-xl overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-200/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-200/10 rounded-full -ml-24 -mb-24 blur-3xl" />
          <CardContent className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-display font-semibold text-slate-900 mb-2">
                Welcome back, <span className="text-blue-700">{user?.fullName.split(' ')[0]}</span>
              </h1>
              <p className="text-slate-600 text-sm sm:text-base">Here's an overview of your loan activity</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="border-slate-200 text-slate-700 hover:bg-white/80 backdrop-blur-sm w-full sm:w-auto shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Link to="/loan-request?new=true" className="w-full sm:w-auto">
                <Button className="gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-300 w-full sm:w-auto">
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Loan Request</span><span className="sm:hidden">New Loan</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Active Loans Card */}
          <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <Card className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200/50 shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-300/50 group overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200/20 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-blue-300/30 transition-all duration-500" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-purple-200/20 rounded-full -ml-10 -mb-10 blur-2xl group-hover:bg-purple-300/30 transition-all duration-500" />
              <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-blue-700/80">Active Loans</CardTitle>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/80 backdrop-blur-sm border border-blue-200/50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10 px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-1">{loans.length}</div>
                <CardDescription className="text-xs text-blue-600/70">In progress</CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Total Requested Card */}
          <div className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <Card className="relative bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200/50 shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-300/50 group overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/20 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-emerald-300/30 transition-all duration-500" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-cyan-200/20 rounded-full -ml-10 -mb-10 blur-2xl group-hover:bg-cyan-300/30 transition-all duration-500" />
              <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-emerald-700/80">Total Requested</CardTitle>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/80 backdrop-blur-sm border border-emerald-200/50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10 px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-1 break-words">{formatCurrency(totalRequested)}</div>
                <CardDescription className="text-xs text-emerald-600/70">Across all loans</CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Pending Documents Card */}
          <div className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <Card className="relative bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-amber-200/50 shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-amber-300/50 group overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200/20 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-amber-300/30 transition-all duration-500" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-orange-200/20 rounded-full -ml-10 -mb-10 blur-2xl group-hover:bg-orange-300/30 transition-all duration-500" />
              <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-amber-700/80">Pending Documents</CardTitle>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/80 backdrop-blur-sm border border-amber-200/50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10 px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-1">{pendingDocs}</div>
                <CardDescription className="text-xs text-amber-600/70">Action required</CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Avg. Processing Card */}
          <div className="animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <Card className="relative bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 border-slate-200/50 shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-slate-300/50 group overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-200/20 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-slate-300/30 transition-all duration-500" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-gray-200/20 rounded-full -ml-10 -mb-10 blur-2xl group-hover:bg-gray-300/30 transition-all duration-500" />
              <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-slate-700/80">Avg. Processing</CardTitle>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200/50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10 px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-1">12 days</div>
                <CardDescription className="text-xs text-slate-600/70">From application</CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="loans">My Loans</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {loans.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Loans</h3>
                  <p className="text-muted-foreground mb-4">Start your first loan request to get a soft quote</p>
                  <Link to="/loan-request">
                    <Button className="bg-slate-700 hover:bg-slate-800 text-white">Start Loan Request</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 drop-shadow-sm">My Loans</h2>
                        <Badge variant="outline" className="text-xs bg-white/80 backdrop-blur-sm border-slate-300/50 shadow-sm">
                          {(() => {
                            const activeLoans = loans.filter(l => l.status !== 'funded');
                            return `${activeLoans.length} active, ${loans.length} total`;
                          })()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Toggle between 'active' (hide completed) and 'all' (show all)
                            setStatusFilter(statusFilter === 'active' ? 'all' : 'active');
                          }}
                          className="text-xs bg-white/80 backdrop-blur-sm border-slate-300/50 hover:bg-white shadow-sm hover:shadow-md transition-all duration-300"
                        >
                          {statusFilter === 'active' ? 'Show All' : 'Hide Completed'}
                        </Button>
                      </div>
                    </div>
                    {(() => {
                      const activeLoans = statusFilter === 'active' 
                        ? loans.filter(l => l.status !== 'funded')
                        : loans;
                      const loansToSign = activeLoans.filter(l => l.status === 'soft_quote_issued' && !l.term_sheet_signed);
                      
                      return loansToSign.length > 0 && (
                        <Card className="relative mb-4 border-amber-200/50 bg-gradient-to-r from-amber-50/80 via-orange-50/60 to-yellow-50/80 backdrop-blur-xl shadow-lg rounded-xl overflow-hidden group transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                          <div className="absolute inset-0 bg-gradient-to-r from-amber-100/20 via-transparent to-orange-100/20" />
                          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-300/15 rounded-full -mr-16 -mt-16 blur-2xl" />
                          <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-300/15 rounded-full -ml-12 -mb-12 blur-2xl" />
                          <CardContent className="relative z-10 p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="p-1.5 bg-amber-100/50 rounded-lg backdrop-blur-sm border border-amber-200/50">
                                    <AlertCircle className="w-4 h-4 text-amber-700" />
                                  </div>
                                  <p className="font-semibold text-slate-900 text-base">Action Required</p>
                                </div>
                                <p className="text-sm text-slate-700 ml-8">
                                  You have {loansToSign.length} loan(s) with approved quotes ready to sign
                                </p>
                              </div>
                              <Button
                                className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white shadow-md hover:shadow-lg transition-all duration-300 whitespace-nowrap"
                                onClick={() => {
                                  const loanToSign = loansToSign[0];
                                  if (loanToSign) {
                                    navigate(`/dashboard/loans/${loanToSign.id}`);
                                  }
                                }}
                              >
                                Sign Term Sheet
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()}
                    <div className="grid gap-4">
                      {(() => {
                        // Filter out funded loans when statusFilter is 'active', show all when 'all'
                        const filteredLoans = statusFilter === 'active'
                          ? loans.filter(l => l.status !== 'funded')
                          : loans;
                        
                        if (filteredLoans.length === 0) {
                          return (
                            <Card>
                              <CardContent className="py-12 text-center">
                                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Active Loans</h3>
                                <p className="text-muted-foreground mb-4">
                                  {loans.length === 0 
                                    ? "Start your first loan request to get a soft quote"
                                    : "All your loans are completed. Click 'Show All' to view completed loans."}
                                </p>
                                {loans.length === 0 ? (
                                  <Link to="/loan-request">
                                    <Button variant="gold">Start Loan Request</Button>
                                  </Link>
                                ) : (
                                  <Button variant="outline" onClick={() => setStatusFilter('all')}>
                                    Show All Loans
                                  </Button>
                                )}
                              </CardContent>
                            </Card>
                          );
                        }
                        
                        return filteredLoans.map((loan, index) => {
                          // Highlight the most recent loan (first in list)
                          const isNew = index === 0;
                          const daysSinceCreated = Math.floor((Date.now() - new Date(loan.created_at).getTime()) / (1000 * 60 * 60 * 24));
                          const isRecentlyCreated = daysSinceCreated <= 7;
                          const isCompleted = loan.status === 'funded';
                          
                          return (
                            <div key={loan.id} className="relative">
                              {isNew && isRecentlyCreated && (
                                <div className="absolute -top-2 -right-2 z-10">
                                  <Badge className="bg-green-500 text-white text-xs animate-pulse">
                                    New
                                  </Badge>
                                </div>
                              )}
                              {isCompleted && (
                                <div className="absolute -top-2 -left-2 z-10">
                                  <Badge variant="outline" className="bg-gray-100 text-gray-600 text-xs">
                                    Completed
                                  </Badge>
                                </div>
                              )}
                              <LoanCard 
                                id={loan.id}
                                loanNumber={loan.loan_number}
                                propertyAddress={loan.property_address}
                                city={loan.property_city}
                                state={loan.property_state}
                                loanAmount={loan.loan_amount}
                                propertyType={loan.property_type === 'residential' ? `SFR - ${loan.residential_units || 1} Unit${(loan.residential_units || 1) > 1 ? 's' : ''}` : loan.commercial_type || 'Commercial'}
                                transactionType={loan.transaction_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
                                status={loan.status as LoanStatus}
                                createdAt={loan.created_at}
                              />
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                {/* Loan Tracker Sidebar */}
                <div>
                  <Card
                    className="relative rounded-xl border-slate-200/50 bg-gradient-to-br from-white/90 via-blue-50/40 to-indigo-50/30 backdrop-blur-xl shadow-xl overflow-visible transition-all duration-300 hover:shadow-2xl"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-100/10 via-transparent to-indigo-100/10 rounded-xl" />
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-200/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-200/10 rounded-full -ml-16 -mb-16 blur-3xl" />
                    <CardHeader className="relative z-10">
                      <CardTitle className="text-lg font-serif font-bold text-slate-900 drop-shadow-sm">Loan Progress</CardTitle>
                      <CardDescription className="text-slate-600 font-medium">
                        {selectedLoan?.loan_number || 'Select a loan'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      {selectedLoan && (
                        <LoanTrackerFull currentStatus={selectedLoan.status as LoanStatus} />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="loans">
            <div className="space-y-4">
              {/* Search and Filter Controls */}
              {loans.length > 0 && (
                <Card className="relative bg-gradient-to-br from-white/90 via-blue-50/40 to-indigo-50/30 backdrop-blur-xl border-slate-200/50 shadow-lg rounded-xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-100/10 via-transparent to-indigo-100/10" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <CardContent className="relative z-10 p-4 sm:p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
                        <Input
                          placeholder="Search by loan number, address, or city..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 bg-white/80 backdrop-blur-sm border-slate-300/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                        />
                      </div>
                      <div className="w-full md:w-48">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="bg-white/80 backdrop-blur-sm border-slate-300/50 shadow-sm">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active Loans Only</SelectItem>
                            <SelectItem value="all">All Loans</SelectItem>
                            <SelectItem value="new_request">New Request</SelectItem>
                            <SelectItem value="quote_requested">Quote Requested</SelectItem>
                            <SelectItem value="soft_quote_issued">Soft Quote Issued</SelectItem>
                            <SelectItem value="term_sheet_signed">Term Sheet Signed</SelectItem>
                            <SelectItem value="needs_list_sent">Needs List Sent</SelectItem>
                            <SelectItem value="submitted_to_underwriting">Underwriting</SelectItem>
                            <SelectItem value="conditionally_approved">Conditionally Approved</SelectItem>
                            <SelectItem value="clear_to_close">Clear to Close</SelectItem>
                            <SelectItem value="funded">Funded (Completed)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Filtered Loans List */}
              {(() => {
                const filteredLoans = loans.filter(loan => {
                  const matchesSearch = !searchQuery || 
                    loan.loan_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    loan.property_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    loan.property_city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    loan.property_state?.toLowerCase().includes(searchQuery.toLowerCase());
                  
                  // Handle status filter - 'active' means exclude funded loans
                  let matchesStatus = true;
                  if (statusFilter === 'active') {
                    matchesStatus = loan.status !== 'funded';
                  } else if (statusFilter !== 'all') {
                    matchesStatus = loan.status === statusFilter;
                  }
                  
                  return matchesSearch && matchesStatus;
                });

                if (filteredLoans.length === 0) {
                  return (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Loans Found</h3>
                        <p className="text-muted-foreground mb-4">
                          {loans.length === 0 
                            ? "Start a new loan request to get started"
                            : "No loans match your search criteria"}
                        </p>
                        {loans.length === 0 && (
                          <Link to="/loan-request?new=true">
                            <Button className="bg-slate-700 hover:bg-slate-800 text-white">Start Loan Request</Button>
                          </Link>
                        )}
                        {(loans.length > 0 && (searchQuery || statusFilter !== 'all')) && (
                          <Button variant="outline" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>
                            Clear Filters
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                }

                return filteredLoans.map((loan, index) => {
                  const daysSinceCreated = Math.floor((Date.now() - new Date(loan.created_at).getTime()) / (1000 * 60 * 60 * 24));
                  const isRecentlyCreated = daysSinceCreated <= 7;
                  const isNew = index === 0 && !searchQuery && statusFilter === 'all';
                  
                  return (
                    <div key={loan.id} className="relative">
                      {isNew && isRecentlyCreated && (
                        <div className="absolute -top-2 -right-2 z-10">
                          <Badge className="bg-green-500 text-white text-xs animate-pulse">
                            New
                          </Badge>
                        </div>
                      )}
                      <LoanCard 
                        id={loan.id}
                        loanNumber={loan.loan_number}
                        propertyAddress={loan.property_address}
                        city={loan.property_city}
                        state={loan.property_state}
                        loanAmount={loan.loan_amount}
                        propertyType={loan.property_type === 'residential' ? `SFR - ${loan.residential_units || 1} Units` : loan.commercial_type || 'Commercial'}
                        transactionType={loan.transaction_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
                        status={loan.status as LoanStatus}
                        createdAt={loan.created_at}
                      />
                    </div>
                  );
                });
              })()}
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Document Center</CardTitle>
                <CardDescription>Upload and manage your loan documents. Folder colors indicate status.</CardDescription>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200"></span> Pending</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-300"></span> Has Documents</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-300"></span> New Upload (24h)</span>
                </div>
              </CardHeader>
              <CardContent>
                {needsList.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No documents requested yet</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {needsList.map((item) => (
                      <div 
                        key={item.id} 
                        className={`p-4 rounded-lg border-2 ${getFolderColor(item.folder_color)}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <FolderOpen className="w-5 h-5" />
                          {item.status === 'reviewed' && <CheckCircle2 className="w-4 h-4 text-success" />}
                          {item.status === 'rejected' && <AlertCircle className="w-4 h-4 text-destructive" />}
                        </div>
                        <h4 className="font-medium text-sm mb-1">{item.document_type}</h4>
                        <p className="text-xs opacity-75 mb-3">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{item.document_count} file(s)</span>
                          <label className="cursor-pointer">
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => handleFileUpload(e, item.id)}
                            />
                            <span className="text-xs font-medium hover:underline">Upload</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Manage your account information and KYC details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                    <p className="text-lg">{profile?.full_name || user?.fullName || "Not set"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-lg">{user?.email || "Not set"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="text-lg">{profile?.phone || user?.phone || "Not set"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                    <p className="text-lg capitalize">{user?.role || "borrower"}</p>
                  </div>
                  {profile?.city && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">City</label>
                      <p className="text-lg">{profile.city}</p>
                    </div>
                  )}
                  {profile?.state && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">State</label>
                      <p className="text-lg">{profile.state}</p>
                    </div>
                  )}
                  {profile?.address_line1 && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Address</label>
                      <p className="text-lg">
                        {profile.address_line1}
                        {profile.address_line2 && `, ${profile.address_line2}`}
                      </p>
                      {profile.zip_code && (
                        <p className="text-sm text-muted-foreground">
                          {profile.city}, {profile.state} {profile.zip_code}
                        </p>
                      )}
                    </div>
                  )}
                  {profile?.employment_status && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Employment Status</label>
                      <p className="text-lg capitalize">{profile.employment_status.replace("_", " ")}</p>
                    </div>
                  )}
                  {profile?.annual_income && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Annual Income</label>
                      <p className="text-lg">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          minimumFractionDigits: 0,
                        }).format(profile.annual_income)}
                      </p>
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowProfileEdit(true)}>
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Downloads Section */}
        {selectedLoan?.term_sheet_url && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Available Downloads</CardTitle>
              {selectedLoan.soft_quote_generated && (
                <p className="text-xs text-muted-foreground mt-1">
                  Generated: {new Date(selectedLoan.updated_at).toLocaleDateString()}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {selectedLoan.term_sheet_url && (
                  <a href={`${import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001')}${selectedLoan.term_sheet_url}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="w-4 h-4" /> Term Sheet
                    </Button>
                  </a>
                )}
                {selectedLoan.commitment_letter_url && (
                  <a href={`${import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001')}${selectedLoan.commitment_letter_url}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="w-4 h-4" /> Commitment Letter
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Edit Dialog */}
        <ProfileEditDialog
          open={showProfileEdit}
          onOpenChange={setShowProfileEdit}
          onUpdate={() => {
            // Reload profile data
            profileApi.get()
              .then((res) => setProfile(res.profile))
              .catch(() => {});
          }}
        />
      </main>
    </div>
  );
}

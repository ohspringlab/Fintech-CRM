import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { LoanCard } from "@/components/dashboard/LoanCard";
import { LoanTrackerFull, statusConfig, LoanStatus } from "@/components/loan/LoanTracker";
import { useUser, useClerk } from "@clerk/clerk-react";
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
  const { user } = useUser();
  const { signOut } = useClerk();
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
    signOut();
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
    <div className="min-h-screen bg-background text-foreground">
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
        <Card className="bg-white/98 backdrop-blur-xl border-slate-200 shadow-sm rounded-lg">
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-display font-semibold text-slate-900 mb-2">
                Welcome back, <span className="text-slate-900">{user?.fullName.split(' ')[0]}</span>
              </h1>
              <p className="text-slate-600 text-sm sm:text-base">Here's an overview of your loan activity</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="border-slate-200 text-slate-700 hover:bg-slate-50 w-full sm:w-auto"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Link to="/loan-request?new=true" className="w-full sm:w-auto">
                <Button className="gap-2 bg-slate-700 text-white hover:bg-slate-800 shadow-sm w-full sm:w-auto">
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Loan Request</span><span className="sm:hidden">New Loan</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <StatsCard title="Active Loans" value={loans.length} icon={FileText} description="In progress" className="bg-white border-slate-200 shadow-sm rounded-lg" />
          </div>
          <div className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <StatsCard title="Total Requested" value={formatCurrency(totalRequested)} icon={DollarSign} description="Across all loans" className="bg-white border-slate-200 shadow-sm rounded-lg" />
          </div>
          <div className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <StatsCard title="Pending Documents" value={pendingDocs} icon={Upload} description="Action required" className="bg-white border-slate-200 shadow-sm rounded-lg" />
          </div>
          <div className="animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <StatsCard title="Avg. Processing" value="12 days" icon={Clock} description="From application" className="bg-white border-slate-200 shadow-sm rounded-lg" />
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
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-serif font-bold">My Loans</h2>
                        <Badge variant="outline" className="text-xs">
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
                          className="text-xs"
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
                        <Card className="mb-4 border-slate-200 bg-slate-50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-slate-900">Action Required</p>
                                <p className="text-sm text-slate-700">
                                  You have {loansToSign.length} loan(s) with approved quotes ready to sign
                                </p>
                              </div>
                              <Button
                                className="bg-slate-700 hover:bg-slate-800 text-white"
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
                    className="relative rounded-lg border border-slate-200 bg-white shadow-sm"
                    style={{ overflow: 'visible' }}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg font-serif font-bold text-slate-900">Loan Progress</CardTitle>
                      <CardDescription className="text-slate-600">
                        {selectedLoan?.loan_number || 'Select a loan'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
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
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Search by loan number, address, or city..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="w-full md:w-48">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger>
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

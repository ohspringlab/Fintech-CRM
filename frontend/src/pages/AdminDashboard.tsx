import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { DealsCRMView } from "@/components/admin/DealsCRMView";
import { ReportsView } from "@/components/admin/ReportsView";
import { LeadSubmissionsView } from "@/components/admin/LeadSubmissionsView";
import { QuarantineView } from "@/components/admin/QuarantineView";
import { PeopleView } from "@/components/admin/PeopleView";
import { AgentsView } from "@/components/admin/AgentsView";
import { CompaniesView } from "@/components/admin/CompaniesView";
import { LoanPricingView } from "@/components/admin/LoanPricingView";
import { QuoteApprovalView } from "@/components/admin/QuoteApprovalView";
import { LandingPagesView } from "@/components/admin/LandingPagesView";
import { ReachoutView } from "@/components/admin/ReachoutView";
import { ShortLinksView } from "@/components/admin/ShortLinksView";
import { AIArticlesView } from "@/components/admin/AIArticlesView";
import { ResourcesView } from "@/components/admin/ResourcesView";
import { CaseStudiesView } from "@/components/admin/CaseStudiesView";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { opsApi, PipelineStats, RecentClosing, Loan, StatusOption } from "@/lib/api";
import {
  DollarSign,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowRight,
  Circle,
  User,
  Home,
  Calendar,
  FileText,
  Users,
  UserCheck,
  Building2,
  BarChart3,
  Globe,
  BookOpen,
  PenTool,
  FolderOpen,
  ChevronDown,
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserAvatarImage } from "@/components/user/UserAvatarImage";

function AdminDashboardContent() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [recentClosings, setRecentClosings] = useState<RecentClosing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [monthlyHistory, setMonthlyHistory] = useState<{
    monthly: Array<{ month: string; value: number; count: number }>;
    daily: Array<{ day: string; sales: number }>;
  } | null>(null);

  // Determine current page from location
  const currentPath = location.pathname;
  const isMainDashboard = currentPath === "/admin" || currentPath === "/admin/";

  useEffect(() => {
    loadData();
    // Auto-refresh recent closings every 30 seconds
    const interval = setInterval(() => {
      if (activeTab === "closings") {
        loadRecentClosings();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Star rain effect on scroll - COMMENTED OUT
  /*
  useEffect(() => {
    if (!isMainDashboard) return;

    const starContainer = document.querySelector('.star-rain-container');
    if (!starContainer) return;

    let starId = 0;
    let lastScrollY = window.scrollY;
    let scrollTimeout: NodeJS.Timeout;

    const createStar = () => {
      const star = document.createElement('div');
      star.className = 'star-rain-star';
      const leftPosition = Math.random() * 100;
      const drift = (Math.random() - 0.5) * 2; // -1 to 1
      star.style.left = `${leftPosition}%`;
      star.style.top = '-20px';
      star.style.setProperty('--star-drift', drift.toString());
      const duration = 8 + Math.random() * 12;
      star.style.animation = `star-rain-fall ${duration}s linear forwards`;
      star.style.width = `${4 + Math.random() * 4}px`;
      star.style.height = star.style.width;
      starContainer.appendChild(star);

      // Remove star after animation
      setTimeout(() => {
        if (star.parentNode) {
          star.parentNode.removeChild(star);
        }
      }, duration * 1000 + 1000);
    };

    const createGhostStar = () => {
      const ghost = document.createElement('div');
      ghost.className = 'star-rain-ghost';
      ghost.style.left = `${Math.random() * 100}%`;
      ghost.style.top = `${Math.random() * 100}%`;
      ghost.style.animationDelay = `${Math.random() * 5}s`;
      starContainer.appendChild(ghost);
    };

    // Create initial ghost stars
    for (let i = 0; i < 20; i++) {
      setTimeout(() => createGhostStar(), i * 150);
    }

    // Continuous subtle star rain
    const continuousRain = setInterval(() => {
      if (Math.random() > 0.5) {
        createStar();
      }
    }, 3000);

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = Math.abs(currentScrollY - lastScrollY);

      // Create stars based on scroll speed
      if (scrollDelta > 5) {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          // Create 1-3 stars randomly on scroll
          const starCount = Math.floor(Math.random() * 3) + 1;
          for (let i = 0; i < starCount; i++) {
            setTimeout(() => createStar(), i * 100);
          }
        }, 50);
      }

      lastScrollY = currentScrollY;
    };

    // Also create stars periodically
    const starInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        createStar();
      }
    }, 2000);

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(starInterval);
      clearInterval(continuousRain);
      clearTimeout(scrollTimeout);
    };
  }, [isMainDashboard]);
  */

  const loadData = async () => {
    try {
      const [statsRes, closingsRes, historyRes] = await Promise.all([
        opsApi.getStats(),
        opsApi.getRecentClosings(50),
        opsApi.getMonthlyHistory().catch(() => ({ monthly: [], daily: [] })) // Fallback if endpoint fails
      ]);
      setStats(statsRes);
      setRecentClosings(closingsRes.closings);
      setMonthlyHistory(historyRes);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentClosings = async () => {
    try {
      const closingsRes = await opsApi.getRecentClosings(50);
      console.log("Recent closings data:", closingsRes.closings);
      setRecentClosings(closingsRes.closings);
    } catch (error) {
      console.error("Failed to load recent closings:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || !isFinite(amount)) {
      return "$0";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const pipelineValue = stats?.byStatus && Array.isArray(stats.byStatus)
    ? stats.byStatus.reduce((sum, s) => {
        const amount = typeof s.total_amount === 'string' 
          ? parseFloat(s.total_amount) 
          : (s.total_amount || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0)
    : 0;
  const openDeals = stats?.totalLoans || 0;
  const winRate = stats?.totalLoans > 0 ? ((stats?.fundedLoans || 0) / stats.totalLoans) * 100 : 0;
  const wonThisMonth = stats?.monthlyVolume || 0;
  const pendingApprovals = stats?.needsAttention?.pendingQuotes || 0;
  const totalPipeline = stats?.totalLoans || 0;

  // Use real monthly data from database, fallback to calculated if not available
  const monthlyData = useMemo(() => {
    if (monthlyHistory?.monthly && monthlyHistory.monthly.length > 0) {
      return monthlyHistory.monthly;
    }
    
    // Fallback: Generate data based on current pipeline if no history available
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const baseValue = pipelineValue / 12 || 38500;
    
    return months.map((month) => ({
      month,
      value: Math.max(0, Math.round(baseValue)),
      count: 0,
    }));
  }, [monthlyHistory, pipelineValue]);

  const avgValue = useMemo(() => {
    const values = monthlyData.map(d => d.value).filter(v => v > 0);
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }, [monthlyData]);
  
  const medianValue = useMemo(() => {
    const values = monthlyData.map(d => d.value).filter(v => v > 0).sort((a, b) => a - b);
    if (values.length === 0) return 0;
    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 0 
      ? (values[mid - 1] + values[mid]) / 2 
      : values[mid];
  }, [monthlyData]);

  // Use real daily sales data from database, fallback to calculated if not available
  const dailySalesData = useMemo(() => {
    if (monthlyHistory?.daily && monthlyHistory.daily.length > 0) {
      return monthlyHistory.daily;
    }
    
    // Fallback: Generate data based on current month volume
    const days = Array.from({ length: 11 }, (_, i) => i + 1);
    const baseDaily = (wonThisMonth || 0) / 11;
    
    return days.map((day) => ({
      day: day.toString(),
      sales: Math.max(0, Math.round(baseDaily)),
    }));
  }, [monthlyHistory, wonThisMonth]);

  const totalThisMonth = useMemo(() => {
    return dailySalesData.reduce((sum, d) => sum + d.sales, 0);
  }, [dailySalesData]);
  
  // Calculate month change (compare with previous month)
  const monthChange = useMemo(() => {
    if (monthlyData.length < 2) return 0;
    const currentMonth = monthlyData[monthlyData.length - 1]?.value || 0;
    const previousMonth = monthlyData[monthlyData.length - 2]?.value || 0;
    if (previousMonth === 0) return 0;
    return ((currentMonth - previousMonth) / previousMonth) * 100;
  }, [monthlyData]);

  // Prepare data for Total Pipeline circle chart (breakdown by status)
  const pipelineStatusData = useMemo(() => {
    if (!stats?.byStatus || !Array.isArray(stats.byStatus)) {
      return [{ name: 'Active', value: totalPipeline, color: '#8b5cf6' }];
    }
    
    const statusColors: Record<string, string> = {
      'new_request': '#94a3b8',
      'quote_requested': '#f59e0b',
      'soft_quote_issued': '#3b82f6',
      'term_sheet_issued': '#8b5cf6',
      'term_sheet_signed': '#6366f1',
      'needs_list_sent': '#06b6d4',
      'needs_list_complete': '#10b981',
      'submitted_to_underwriting': '#14b8a6',
      'appraisal_ordered': '#22c55e',
      'appraisal_received': '#84cc16',
      'conditionally_approved': '#a855f7',
      'clear_to_close': '#ec4899',
      'closing_scheduled': '#f43f5e',
    };

    return stats.byStatus
      .filter(s => s.status !== 'funded' && parseInt(s.count || 0) > 0)
      .map(s => ({
        name: s.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: parseInt(s.count || 0),
        color: statusColors[s.status] || '#8b5cf6',
      }))
      .slice(0, 5); // Limit to top 5 statuses for readability
  }, [stats?.byStatus, totalPipeline]);

  // Prepare data for This Month circle chart (funded vs target)
  const monthlyProgressData = useMemo(() => {
    const funded = stats?.monthlyFunded || 0;
    const target = 10; // You can make this dynamic based on business goals
    const remaining = Math.max(0, target - funded);
    
    return [
      { name: 'Funded', value: funded, color: '#10b981' },
      { name: 'Remaining', value: remaining, color: '#e5e7eb' },
    ];
  }, [stats?.monthlyFunded]);

  // Render content based on current route
  const renderRouteContent = () => {
    if (currentPath.startsWith("/admin/deals")) {
      return <DealsCRMView />;
    }

    if (currentPath.startsWith("/admin/reports")) {
      return <ReportsView />;
    }

    // LEADS section
    if (currentPath.startsWith("/admin/leads/submissions")) {
      return <LeadSubmissionsView />;
    }

    if (currentPath.startsWith("/admin/leads/quarantine")) {
      return <QuarantineView />;
    }

    // CONTACTS section
    if (currentPath.startsWith("/admin/contacts/people")) {
      return <PeopleView />;
    }

    if (currentPath.startsWith("/admin/contacts/agents")) {
      return <AgentsView />;
    }

    if (currentPath.startsWith("/admin/contacts/companies")) {
      return <CompaniesView />;
    }

    // PRICING section
    if (currentPath.startsWith("/admin/pricing/loans")) {
      return <LoanPricingView />;
    }

    if (currentPath.startsWith("/admin/pricing/approval")) {
      return <QuoteApprovalView />;
    }

    // MARKETING section
    if (currentPath.startsWith("/admin/marketing/landing-pages")) {
      return <LandingPagesView />;
    }

    if (currentPath.startsWith("/admin/marketing/reachout")) {
      return <ReachoutView />;
    }

    if (currentPath.startsWith("/admin/marketing/short-links")) {
      return <ShortLinksView />;
    }

    // CONTENT section
    if (currentPath.startsWith("/admin/content/ai-articles")) {
      return <AIArticlesView />;
    }

    if (currentPath.startsWith("/admin/content/resources")) {
      return <ResourcesView />;
    }

    if (currentPath.startsWith("/admin/content/case-studies")) {
      return <CaseStudiesView />;
    }

    if (currentPath.startsWith("/admin/manual")) {
      return (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2 font-display font-semibold">
              <BookOpen className="w-5 h-5" />
              User Manual
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Documentation and user guide
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <p className="text-muted-foreground mb-4">User manual coming soon</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Default: show coming soon message
    return (
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground font-display font-semibold">Page Not Found</CardTitle>
          <CardDescription className="text-muted-foreground">
            This page is under development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">This feature is coming soon</p>
            <Button onClick={() => navigate('/admin')} variant="outline" className="border-slate-200 text-foreground hover:bg-slate-50">
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      <SidebarInset className={cn(
        "flex-1 transition-all duration-200",
        state === "expanded" ? "md:ml-[16rem]" : "md:ml-[3rem]"
      )}>
          <header className="sticky top-0 z-10 flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
            <SidebarTrigger className="text-foreground" />
            <div className="flex-1" />
            {user && (
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="text-xs sm:text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-none">{user.fullName}</span>
              </div>
            )}
          </header>

          <main className="flex-1 p-4 sm:p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 relative overflow-hidden">
            {/* Background Pattern Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(99,102,241,0.05)_0%,transparent_50%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.05)_0%,transparent_50%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(59,130,246,0.02)_50%,transparent_100%)] pointer-events-none" />
            
            {/* Star Rain Container - COMMENTED OUT */}
            {/*
            <div className="star-rain-container fixed inset-0 pointer-events-none z-0 overflow-hidden">
              Stars will be dynamically generated via CSS
            </div>
            */}
            
            {isMainDashboard ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 relative z-10">
                <TabsList className="bg-white border-slate-200">
                  <TabsTrigger value="dashboard" className="data-[state=active]:bg-slate-100 data-[state=active]:text-foreground">
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="closings" className="data-[state=active]:bg-slate-100 data-[state=active]:text-foreground">
                    Recent Closings
                  </TabsTrigger>
                </TabsList>

              <TabsContent value="dashboard" className="space-y-6 mt-6">
              {/* Top Row Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Pipeline Card */}
                <Card className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200/50 shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-300/50 group overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-300/30 transition-all duration-500" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-200/20 rounded-full -ml-12 -mb-12 blur-2xl group-hover:bg-purple-300/30 transition-all duration-500" />
                  <CardContent className="relative z-10 p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-blue-700/80 font-medium mb-1">Total Pipeline</p>
                        <p className="text-xl sm:text-2xl font-display font-semibold text-slate-900">{totalPipeline}</p>
                        <p className="text-xs text-blue-600/70 mt-1">Active loans</p>
                      </div>
                      <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 relative">
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-full border border-blue-200/50 shadow-sm" />
                        <ChartContainer
                          config={{
                            active: { label: "Active", color: "#8b5cf6" },
                          }}
                          className="w-full h-full relative z-10"
                        >
                          <PieChart>
                            <Pie
                              data={pipelineStatusData}
                              cx="50%"
                              cy="50%"
                              innerRadius="60%"
                              outerRadius="90%"
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {pipelineStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <ChartTooltip 
                              content={<ChartTooltipContent />}
                              formatter={(value: number) => `${value} loans`}
                            />
                          </PieChart>
                        </ChartContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pipeline Value Card */}
                <Card className="relative bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200/50 shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-300/50 group overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-300/30 transition-all duration-500" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-200/20 rounded-full -ml-12 -mb-12 blur-2xl group-hover:bg-cyan-300/30 transition-all duration-500" />
                  <CardContent className="relative z-10 p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-emerald-700/80 font-medium mb-1">Pipeline Value</p>
                        <p className="text-xl sm:text-2xl font-display font-semibold text-slate-900 truncate">{formatCurrency(pipelineValue)}</p>
                      </div>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/80 backdrop-blur-sm border border-emerald-200/50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                        <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pending Approvals Card */}
                <Card className="relative bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-amber-200/50 shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-amber-300/50 group overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-amber-300/30 transition-all duration-500" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-200/20 rounded-full -ml-12 -mb-12 blur-2xl group-hover:bg-orange-300/30 transition-all duration-500" />
                  <CardContent className="relative z-10 p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-amber-700/80 font-medium mb-1">Pending Approvals</p>
                        <p className="text-xl sm:text-2xl font-display font-semibold text-slate-900">{pendingApprovals}</p>
                        <p className="text-xs text-amber-600/70 mt-1">Quote requests</p>
                      </div>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/80 backdrop-blur-sm border border-amber-200/50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* This Month Card */}
                <Card className="relative bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 border-slate-200/50 shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-slate-300/50 group overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-200/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-slate-300/30 transition-all duration-500" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-gray-200/20 rounded-full -ml-12 -mb-12 blur-2xl group-hover:bg-gray-300/30 transition-all duration-500" />
                  <CardContent className="relative z-10 p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-slate-700/80 font-medium mb-1">This Month</p>
                        <p className="text-xl sm:text-2xl font-display font-semibold text-slate-900 truncate">{formatCurrency(wonThisMonth)}</p>
                        <p className="text-xs text-slate-600/70 mt-1">{stats?.monthlyFunded || 0} loans funded</p>
                      </div>
                      <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 relative">
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-full border border-slate-200/50 shadow-sm" />
                        <ChartContainer
                          config={{
                            funded: { label: "Funded", color: "#10b981" },
                            remaining: { label: "Remaining", color: "#e5e7eb" },
                          }}
                          className="w-full h-full relative z-10"
                        >
                          <PieChart>
                            <Pie
                              data={monthlyProgressData}
                              cx="50%"
                              cy="50%"
                              innerRadius="60%"
                              outerRadius="90%"
                              paddingAngle={2}
                              dataKey="value"
                              startAngle={90}
                              endAngle={-270}
                            >
                              {monthlyProgressData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <ChartTooltip 
                              content={<ChartTooltipContent />}
                              formatter={(value: number, name: string) => {
                                if (name === 'Funded') return `${value} loans funded`;
                                return `${value} remaining`;
                              }}
                            />
                          </PieChart>
                        </ChartContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Monthly Average Bar Chart */}
                <Card className="relative bg-gradient-to-br from-purple-50/80 via-indigo-50/60 to-blue-50/80 backdrop-blur-xl border-purple-200/50 shadow-xl rounded-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-100/20 via-transparent to-indigo-100/20" />
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-300/20 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-300/20 rounded-full -ml-24 -mb-24 blur-3xl" />
                  <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-blue-200/15 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
                  <CardHeader className="relative z-10 pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-foreground font-display font-semibold text-base sm:text-lg">Avg. per month</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                      <div>
                        <p className="text-lg sm:text-xl lg:text-2xl font-display font-semibold text-foreground">{formatCurrency(avgValue)}</p>
                        <div className="flex items-center gap-1 sm:gap-2 mt-1">
                          <TrendingUp className="w-3 h-3 text-green-600 flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">Median {formatCurrency(medianValue)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                      <ChartContainer
                        config={{
                          value: {
                            label: "Value",
                            color: "hsl(var(--chart-1))",
                          },
                        }}
                        className="h-[200px] sm:h-[250px] lg:h-[300px] w-full min-w-[500px] sm:min-w-0"
                      >
                        <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            tickLine={{ stroke: '#cbd5e1' }}
                            interval="preserveStartEnd"
                            className="text-[10px] sm:text-xs"
                          />
                          <YAxis 
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            tickLine={{ stroke: '#cbd5e1' }}
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                            width={50}
                            className="text-[10px] sm:text-xs"
                          />
                          <ChartTooltip 
                            content={<ChartTooltipContent />}
                            formatter={(value: number) => formatCurrency(value)}
                          />
                          <Bar 
                            dataKey="value" 
                            fill="#8b5cf6" 
                            radius={[4, 4, 0, 0]}
                            stroke="#7c3aed"
                            strokeWidth={1}
                          />
                        </BarChart>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Sales Line Chart */}
                <Card className="relative bg-gradient-to-br from-blue-50/80 via-cyan-50/60 to-teal-50/80 backdrop-blur-xl border-blue-200/50 shadow-xl rounded-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 via-transparent to-cyan-100/20" />
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-300/20 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-300/20 rounded-full -ml-24 -mb-24 blur-3xl" />
                  <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-teal-200/15 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
                  <CardHeader className="relative z-10 pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-foreground font-display font-semibold text-base sm:text-lg">Monthly Sales</CardTitle>
                      <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                        <span>January</span>
                        <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total this month</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-lg sm:text-xl lg:text-2xl font-display font-semibold text-foreground">{formatCurrency(totalThisMonth)}</p>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded whitespace-nowrap">{monthChange >= 0 ? '+' : ''}{monthChange.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                      <ChartContainer
                        config={{
                          sales: {
                            label: "Sales",
                            color: "hsl(217, 91%, 60%)",
                          },
                        }}
                        className="h-[200px] sm:h-[250px] lg:h-[300px] w-full min-w-[400px] sm:min-w-0"
                      >
                        <LineChart data={dailySalesData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="day" 
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            tickLine={{ stroke: '#cbd5e1' }}
                            interval="preserveStartEnd"
                            className="text-[10px] sm:text-xs"
                          />
                          <YAxis 
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            tickLine={{ stroke: '#cbd5e1' }}
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                            width={50}
                            className="text-[10px] sm:text-xs"
                          />
                          <ChartTooltip 
                            content={<ChartTooltipContent />}
                            formatter={(value: number) => formatCurrency(value)}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="sales" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pipeline Profit Card */}
                <Card className="relative bg-gradient-to-br from-emerald-50/80 via-green-50/60 to-teal-50/80 backdrop-blur-xl border-emerald-200/50 shadow-xl rounded-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/20 via-transparent to-green-100/20" />
                  <div className="absolute top-0 right-0 w-56 h-56 bg-emerald-300/20 rounded-full -mr-28 -mt-28 blur-3xl animate-pulse" />
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-green-300/20 rounded-full -ml-20 -mb-20 blur-3xl" />
                  <CardHeader className="relative z-10 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-100/50 rounded-lg backdrop-blur-sm border border-emerald-200/50 shadow-sm group-hover:shadow-md transition-shadow">
                          <DollarSign className="w-5 h-5 text-emerald-700" />
                        </div>
                        <CardTitle className="text-foreground font-display font-semibold">Pipeline Profit</CardTitle>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-muted-foreground hover:text-foreground hover:bg-slate-50"
                        onClick={() => navigate('/ops')}
                      >
                        Full Report <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 space-y-4">
                    <div>
                      <p className="text-3xl font-display font-semibold text-foreground mb-1 drop-shadow-sm">
                        {formatCurrency(stats?.pipelineProfit?.totalPotential || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground font-medium">Total Potential Profit</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-emerald-200/50">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1 font-medium">Weighted Profit</p>
                        <p className="text-lg font-display font-semibold text-foreground">
                          {formatCurrency(stats?.pipelineProfit?.weightedProfit || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Adjusted by deal probability</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-emerald-200/50">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {stats?.pipelineProfit?.openDeals || 0} Open Deals
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency((stats?.pipelineProfit?.avgProfitPerDeal || 0) / 1000)}K Avg Profit/Deal
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Won Profit This Month {formatCurrency(stats?.pipelineProfit?.wonThisMonth || 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          Deals Won {stats?.pipelineProfit?.dealsWonThisMonth || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pipeline Forecast Card */}
                <Card className="relative bg-gradient-to-br from-amber-50/80 via-orange-50/60 to-yellow-50/80 backdrop-blur-xl border-amber-200/50 shadow-xl rounded-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-100/20 via-transparent to-orange-100/20" />
                  <div className="absolute top-0 right-0 w-56 h-56 bg-amber-300/20 rounded-full -mr-28 -mt-28 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-orange-300/20 rounded-full -ml-20 -mb-20 blur-3xl" />
                  <CardHeader className="relative z-10 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-100/50 rounded-lg backdrop-blur-sm border border-amber-200/50 shadow-sm group-hover:shadow-md transition-shadow">
                          <TrendingUp className="w-5 h-5 text-amber-700" />
                        </div>
                        <CardTitle className="text-foreground font-display font-semibold">Pipeline Forecast</CardTitle>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-muted-foreground hover:text-foreground hover:bg-slate-50"
                        onClick={() => navigate('/ops')}
                      >
                        View Details <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-white/40 backdrop-blur-sm rounded-lg border border-amber-200/30 shadow-sm">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">THIS QUARTER</p>
                        <p className="text-lg font-display font-semibold text-foreground drop-shadow-sm">
                          {formatCurrency(stats?.forecast?.thisQuarter || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          +{formatCurrency(stats?.forecast?.expectedProfit || 0)} profit
                        </p>
                      </div>
                      <div className="p-3 bg-white/40 backdrop-blur-sm rounded-lg border border-amber-200/30 shadow-sm">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">PIPELINE</p>
                        <p className="text-lg font-display font-semibold text-foreground drop-shadow-sm">
                          {formatCurrency((stats?.forecast?.pipeline || 0) / 1000)}K
                        </p>
                        <p className="text-xs text-muted-foreground">weighted value</p>
                      </div>
                      <div className="p-3 bg-white/40 backdrop-blur-sm rounded-lg border border-amber-200/30 shadow-sm">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">EXPECTED PROFIT</p>
                        <p className="text-lg font-display font-semibold text-foreground drop-shadow-sm">
                          {formatCurrency(stats?.forecast?.expectedProfit || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">probability-adjusted</p>
                      </div>
                    </div>
                    <div className="space-y-2 pt-3 border-t border-amber-200/50">
                      {["January", "February", "March", "April", "May", "June"].map((month, idx) => {
                        const monthProfit = (stats?.forecast?.expectedProfit || 0) / 6; // Distribute evenly for now
                        return (
                          <div key={month} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{month} 2026</span>
                            <div className="flex items-center gap-4">
                              <span className="text-muted-foreground">
                                {Math.round((stats?.pipelineProfit?.openDeals || 0) / 6)} deals expected
                              </span>
                              <span className="text-foreground font-medium">{formatCurrency(monthProfit)}</span>
                              <span className="text-muted-foreground">+{formatCurrency(monthProfit)} profit</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Needs Attention Card */}
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-slate-700" />
                        <CardTitle className="text-foreground font-display font-semibold">Needs Attention</CardTitle>
                        <Badge variant="destructive" className="ml-2">
                          {stats?.needsAttention?.total || 0}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stats?.needsAttention?.staleLoans > 0 && (
                      <div 
                        className="flex items-center justify-between p-3 rounded-sm hover:bg-slate-50 cursor-pointer transition-colors border border-slate-200"
                        onClick={() => navigate('/ops')}
                      >
                        <div className="flex items-center gap-3">
                          <Circle className="w-2 h-2 fill-slate-600 text-slate-600" />
                          <span className="text-sm text-foreground">
                            {stats.needsAttention.staleLoans} stale loan{stats.needsAttention.staleLoans !== 1 ? 's' : ''} (3+ days)
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    {stats?.needsAttention?.pendingQuotes > 0 && (
                      <div 
                        className="flex items-center justify-between p-3 rounded-sm hover:bg-slate-50 cursor-pointer transition-colors border border-slate-200"
                        onClick={() => navigate('/ops')}
                      >
                        <div className="flex items-center gap-3">
                          <Circle className="w-2 h-2 fill-slate-600 text-slate-600" />
                          <span className="text-sm text-foreground">
                            {stats.needsAttention.pendingQuotes} quote{stats.needsAttention.pendingQuotes !== 1 ? 's' : ''} pending approval
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    {stats?.needsAttention?.pendingDocs > 0 && (
                      <div 
                        className="flex items-center justify-between p-3 rounded-sm hover:bg-slate-50 cursor-pointer transition-colors border border-slate-200"
                        onClick={() => navigate('/ops')}
                      >
                        <div className="flex items-center gap-3">
                          <Circle className="w-2 h-2 fill-slate-600 text-slate-600" />
                          <span className="text-sm text-foreground">
                            {stats.needsAttention.pendingDocs} document{stats.needsAttention.pendingDocs !== 1 ? 's' : ''} pending review
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    {(!stats?.needsAttention || stats.needsAttention.total === 0) && (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">All caught up! No items need attention.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Activity Card */}
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-slate-700" />
                        <CardTitle className="text-foreground font-display font-semibold">Recent Activity</CardTitle>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-muted-foreground hover:text-foreground hover:bg-slate-50"
                        onClick={() => navigate('/ops')}
                      >
                        View All <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                      stats.recentActivity.slice(0, 5).map((activity) => {
                        const timeAgo = new Date(activity.timestamp);
                        const hoursAgo = Math.floor((Date.now() - timeAgo.getTime()) / (1000 * 60 * 60));
                        const timeText = hoursAgo < 1 ? 'Just now' : 
                                         hoursAgo === 1 ? '1 hour ago' : 
                                         `${hoursAgo} hours ago`;
                        
                        return (
                          <div 
                            key={activity.id}
                            className="flex items-center justify-between p-3 rounded-sm hover:bg-slate-50 cursor-pointer transition-colors border border-slate-200"
                            onClick={() => navigate(`/ops/loans/${activity.id}`)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-sm bg-slate-100 border border-slate-200 flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-700" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{activity.description}</p>
                                <p className="text-xs text-muted-foreground">{timeText}</p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/ops/loans/${activity.id}`);
                              }}
                            >
                              View
                            </Button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">No recent activity</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              </TabsContent>

              <TabsContent value="closings" className="mt-6">
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-foreground font-display font-semibold">Recent Closings</CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Automatically updated list of funded loans
                        </CardDescription>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={loadRecentClosings}
                        className="border-slate-200 text-foreground hover:bg-slate-50"
                      >
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {recentClosings.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">No closings found</p>
                      </div>
                    ) : (
                      <div className="rounded-sm border border-slate-200 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50 border-slate-200">
                              <TableHead className="text-foreground font-semibold">Loan #</TableHead>
                              <TableHead className="text-foreground font-semibold">Borrower</TableHead>
                              <TableHead className="text-foreground font-semibold">Property</TableHead>
                              <TableHead className="text-foreground font-semibold">Type</TableHead>
                              <TableHead className="text-foreground font-semibold">Loan Amount</TableHead>
                              <TableHead className="text-foreground font-semibold">Funded Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recentClosings.map((closing) => {
                              const getInitials = (name: string) => {
                                if (!name) return "U";
                                return name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2);
                              };
                              
                              // Debug: Log borrower_id
                              if (process.env.NODE_ENV !== 'production') {
                                console.log("Closing borrower data:", {
                                  loan_number: closing.loan_number,
                                  borrower_id: closing.borrower_id,
                                  borrower_name: closing.borrower_name
                                });
                              }
                              
                              return (
                                <TableRow key={closing.loan_number} className="border-slate-200 hover:bg-slate-50">
                                  <TableCell className="font-mono text-sm text-foreground">{closing.loan_number}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <Avatar className="w-8 h-8">
                                        {closing.borrower_id ? (
                                          <UserAvatarImage userId={closing.borrower_id} />
                                        ) : null}
                                        <AvatarFallback className="bg-slate-700 text-white text-xs font-semibold">
                                          {getInitials(closing.borrower_name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="font-medium text-foreground">{closing.borrower_name}</p>
                                        {closing.borrower_email && (
                                          <p className="text-xs text-muted-foreground">{closing.borrower_email}</p>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Home className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-foreground text-sm">
                                      {closing.property_address}, {closing.property_city}, {closing.property_state}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="border-slate-200 text-foreground">
                                    {closing.transaction_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || closing.property_type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-foreground font-medium">
                                  {formatCurrency(closing.funded_amount || closing.loan_amount)}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(closing.funded_date).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </div>
                                </TableCell>
                              </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            ) : (
              <div className="space-y-6">
                {renderRouteContent()}
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
  );
}

export default function AdminDashboard() {
  return (
    <SidebarProvider defaultOpen={true}>
      <AdminDashboardContent />
    </SidebarProvider>
  );
}


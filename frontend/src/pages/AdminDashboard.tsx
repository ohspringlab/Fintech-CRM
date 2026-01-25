import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/clerk-react";
import { opsApi, PipelineStats, RecentClosing } from "@/lib/api";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserAvatarImage } from "@/components/user/UserAvatarImage";

function AdminDashboardContent() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [recentClosings, setRecentClosings] = useState<RecentClosing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

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
      const [statsRes, closingsRes] = await Promise.all([
        opsApi.getStats(),
        opsApi.getRecentClosings(50)
      ]);
      setStats(statsRes);
      setRecentClosings(closingsRes.closings);
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

  // Render content based on current route
  const renderRouteContent = () => {
    if (currentPath.startsWith("/admin/deals")) {
      return (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2 font-display font-semibold">
              <Briefcase className="w-5 h-5" />
              Deals CRM
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage all loan deals and customer relationships
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <p className="text-muted-foreground mb-4">Deals CRM functionality coming soon</p>
              <Button onClick={() => navigate('/ops')} variant="outline" className="border-slate-200 text-foreground hover:bg-slate-50">
                View Operations Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (currentPath.startsWith("/admin/reports")) {
      return (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2 font-display font-semibold">
              <BarChart3 className="w-5 h-5" />
              Reports
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              View detailed reports and analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <p className="text-muted-foreground mb-4">Reports functionality coming soon</p>
              <Button onClick={() => navigate('/ops')} variant="outline" className="border-slate-200 text-foreground hover:bg-slate-50">
                View Operations Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (currentPath.startsWith("/admin/leads")) {
      const isQuarantine = currentPath.includes("/quarantine");
      return (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2 font-display font-semibold">
              <FileText className="w-5 h-5" />
              {isQuarantine ? "Quarantine" : "Lead Submissions"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isQuarantine ? "Review submissions in quarantine" : "Manage lead submissions"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <p className="text-muted-foreground mb-4">Lead management functionality coming soon</p>
              <Button onClick={() => navigate('/ops')} variant="outline" className="border-slate-200 text-foreground hover:bg-slate-50">
                View Operations Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (currentPath.startsWith("/admin/contacts")) {
      const contactType = currentPath.split("/").pop() || "people";
      const icons = {
        people: Users,
        agents: UserCheck,
        companies: Building2,
      };
      const labels = {
        people: "People",
        agents: "Agents",
        companies: "Companies",
      };
      const Icon = icons[contactType as keyof typeof icons] || Users;
      const label = labels[contactType as keyof typeof labels] || "Contacts";
      
      return (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2 font-display font-semibold">
              <Icon className="w-5 h-5" />
              {label}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage {label.toLowerCase()} in your CRM
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Icon className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <p className="text-muted-foreground mb-4">{label} management functionality coming soon</p>
              <Button onClick={() => navigate('/ops')} variant="outline" className="border-slate-200 text-foreground hover:bg-slate-50">
                View Operations Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (currentPath.startsWith("/admin/pricing")) {
      const pricingType = currentPath.split("/").pop() || "loans";
      const isApproval = pricingType === "approval";
      
      return (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2 font-display font-semibold">
              <DollarSign className="w-5 h-5" />
              {isApproval ? "Quote Approval" : "Loan Pricing"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isApproval ? "Review and approve loan quotes" : "Manage loan pricing settings"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <p className="text-muted-foreground mb-4">Pricing functionality coming soon</p>
              <Button onClick={() => navigate('/ops')} variant="outline" className="border-slate-200 text-foreground hover:bg-slate-50">
                View Operations Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (currentPath.startsWith("/admin/marketing")) {
      const marketingType = currentPath.split("/").pop() || "landing-pages";
      const labels: Record<string, string> = {
        "landing-pages": "Landing Pages",
        "reachout": "Reachout",
        "short-links": "Short Links",
      };
      const label = labels[marketingType] || "Marketing";
      
      return (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2 font-display font-semibold">
              <Globe className="w-5 h-5" />
              {label}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage {label.toLowerCase()} for marketing campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Globe className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <p className="text-muted-foreground mb-4">{label} functionality coming soon</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (currentPath.startsWith("/admin/content")) {
      const contentType = currentPath.split("/").pop() || "ai-articles";
      const icons = {
        "ai-articles": PenTool,
        "resources": FolderOpen,
        "case-studies": FileText,
      };
      const labels = {
        "ai-articles": "AI Articles",
        "resources": "Resources",
        "case-studies": "Case Studies",
      };
      const Icon = icons[contentType as keyof typeof icons] || FileText;
      const label = labels[contentType as keyof typeof labels] || "Content";
      
      return (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2 font-display font-semibold">
              <Icon className="w-5 h-5" />
              {label}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage {label.toLowerCase()} for your website
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Icon className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <p className="text-muted-foreground mb-4">{label} management functionality coming soon</p>
            </div>
          </CardContent>
        </Card>
      );
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

          <main className="flex-1 p-4 sm:p-6 bg-background relative overflow-hidden">
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
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Pipeline Value</p>
                        <p className="text-xl sm:text-2xl font-display font-semibold text-foreground truncate">{formatCurrency(pipelineValue)}</p>
                      </div>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-sm bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Open Deals</p>
                        <p className="text-xl sm:text-2xl font-display font-semibold text-foreground">{openDeals}</p>
                      </div>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-sm bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Win Rate (90d)</p>
                        <p className="text-xl sm:text-2xl font-display font-semibold text-foreground">{winRate.toFixed(1)}%</p>
                      </div>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-sm bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Won This Month</p>
                        <p className="text-xl sm:text-2xl font-display font-semibold text-foreground truncate">{formatCurrency(wonThisMonth)}</p>
                      </div>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-sm bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pipeline Profit Card */}
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-slate-700" />
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
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-3xl font-display font-semibold text-foreground mb-1">
                        {formatCurrency(stats?.pipelineProfit?.totalPotential || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Potential Profit</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Weighted Profit</p>
                        <p className="text-lg font-display font-semibold text-foreground">
                          {formatCurrency(stats?.pipelineProfit?.weightedProfit || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Adjusted by deal probability</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200">
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
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-slate-700" />
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
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">THIS QUARTER</p>
                        <p className="text-lg font-display font-semibold text-foreground">
                          {formatCurrency(stats?.forecast?.thisQuarter || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          +{formatCurrency(stats?.forecast?.expectedProfit || 0)} profit
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">PIPELINE</p>
                        <p className="text-lg font-display font-semibold text-foreground">
                          {formatCurrency((stats?.forecast?.pipeline || 0) / 1000)}K
                        </p>
                        <p className="text-xs text-muted-foreground">weighted value</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">EXPECTED PROFIT</p>
                        <p className="text-lg font-display font-semibold text-foreground">
                          {formatCurrency(stats?.forecast?.expectedProfit || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">probability-adjusted</p>
                      </div>
                    </div>
                    <div className="space-y-2 pt-3 border-t border-slate-200">
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


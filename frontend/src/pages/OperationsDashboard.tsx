import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { statusConfig, LoanStatus } from "@/components/loan/LoanTracker";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { opsApi, capitalApi, Loan, StatusOption, PipelineStats, LenderPerformance } from "@/lib/api";
import { 
  Search, Filter, DollarSign, Users, Clock, TrendingUp, FileText, Eye, 
  MoreVertical, Home, RefreshCw, AlertTriangle, CheckCircle2, Trash2, Star
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserAvatarImage } from "@/components/user/UserAvatarImage";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";

export default function OperationsDashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loans, setLoans] = useState<Loan[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [lenderPerformance, setLenderPerformance] = useState<LenderPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");

  useEffect(() => {
    loadData();
  }, [statusFilter, searchQuery]);

  const loadData = async () => {
    try {
      const [pipelineRes, statsRes, statusRes, performanceRes] = await Promise.all([
        opsApi.getPipeline({ status: statusFilter !== 'all' ? statusFilter : undefined, search: searchQuery || undefined }),
        opsApi.getStats(),
        opsApi.getStatusOptions(),
        capitalApi.getPerformance('month').catch(() => ({ performance: [] }))
      ]);
      setLoans(pipelineRes.loans);
      setStats(statsRes);
      setStatusOptions(statusRes.statuses);
      setLenderPerformance(performanceRes.performance);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load pipeline data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedLoan || !newStatus) return;
    
    try {
      await opsApi.updateStatus(selectedLoan.id, newStatus, statusNotes);
      toast.success('Status updated successfully');
      setShowStatusDialog(false);
      setSelectedLoan(null);
      setNewStatus("");
      setStatusNotes("");
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", minimumFractionDigits: 0,
    }).format(amount);
  };

  const pendingQuotes = loans.filter((l) => l.status === 'quote_requested');
  const totalPipelineValue = formatCurrency(
    stats?.byStatus?.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0) || 0
  );

  // Prepare data for Total Pipeline circle chart (breakdown by status)
  const pipelineStatusData = useMemo(() => {
    if (!stats?.byStatus || !Array.isArray(stats.byStatus)) {
      return [{ name: 'Active', value: stats?.totalLoans || 0, color: '#8b5cf6' }];
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
  }, [stats?.byStatus, stats?.totalLoans]);

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

  // Map loan status to star progress (0-5 stars)
  const getStarProgress = (status: string): number => {
    const statusOrder: Record<string, number> = {
      "new_request": 0,
      "quote_requested": 1,
      "soft_quote_issued": 1,
      "term_sheet_issued": 1,
      "term_sheet_signed": 2,
      "needs_list_sent": 2,
      "needs_list_complete": 2,
      "submitted_to_underwriting": 3,
      "appraisal_ordered": 3,
      "appraisal_received": 3,
      "conditionally_approved": 4,
      "conditional_items_needed": 4,
      "conditional_commitment_issued": 4,
      "closing_checklist_issued": 4,
      "clear_to_close": 5,
      "closing_scheduled": 5,
      "funded": 5,
    };
    return statusOrder[status] || 0;
  };

  // Star progress component
  const StarProgress = ({ progress }: { progress: number }) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= progress
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-200 text-gray-200"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <AppNavbar variant="borrower" />

      <main className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14 space-y-6 sm:space-y-10 z-10">
        <section className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] items-stretch">
          <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="px-3 py-1 text-xs uppercase tracking-wide bg-slate-100 border border-slate-200 rounded-full text-muted-foreground flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Live Ops
              </span>
              <span className="text-sm text-muted-foreground">Realtime view of the lending pipeline</span>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3 max-w-2xl">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-semibold leading-tight text-foreground">
                  Operations Command Center
                </h1>
                <p className="text-muted-foreground text-lg">
                  Track every loan with institutional precision: clean cards, professional typography, and clear status indicators.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={loadData}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Sync pipeline
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-200 text-foreground hover:bg-slate-50"
                  onClick={() => navigate('/dashboard')}
                >
                  Borrower view
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="rounded-sm bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Pipeline</p>
                <div className="text-2xl font-display font-semibold mt-2 flex items-center gap-2 text-foreground">
                  <FileText className="w-5 h-5 text-slate-700" />
                  {stats?.totalLoans || 0}
                </div>
                <p className="text-muted-foreground text-sm">Active loans</p>
              </div>
              <div className="rounded-sm bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Pipeline Value</p>
                <div className="text-2xl font-display font-semibold mt-2 flex items-center gap-2 text-foreground">
                  <DollarSign className="w-5 h-5 text-slate-700" />
                  {totalPipelineValue}
                </div>
                <p className="text-muted-foreground text-sm">Blended total</p>
              </div>
              <div className="rounded-sm bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending Quotes</p>
                <div className="text-2xl font-display font-semibold mt-2 flex items-center gap-2 text-foreground">
                  <AlertTriangle className="w-5 h-5 text-slate-700" />
                  {pendingQuotes.length}
                </div>
                <p className="text-muted-foreground text-sm">Awaiting approval</p>
              </div>
              <div className="rounded-sm bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">This Month</p>
                <div className="text-2xl font-display font-semibold mt-2 flex items-center gap-2 text-foreground">
                  <TrendingUp className="w-5 h-5 text-slate-700" />
                  {formatCurrency(stats?.monthlyVolume || 0)}
                </div>
                <p className="text-muted-foreground text-sm">{stats?.monthlyFunded || 0} funded</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white border border-slate-200 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Quote queue</p>
                <h3 className="text-2xl font-display font-semibold text-foreground">{pendingQuotes.length} pending approvals</h3>
              </div>
              <span className="px-3 py-1 rounded-full text-xs bg-slate-100 border border-slate-200 text-muted-foreground">Fast lane</span>
            </div>
            <div className="space-y-3">
              {pendingQuotes.slice(0, 4).map((loan) => (
                <div key={loan.id} className="rounded-sm border border-slate-200 bg-white p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{loan.loan_number}</p>
                    <p className="text-lg font-display font-semibold leading-tight text-foreground">{loan.borrower_name}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(loan.loan_amount || 0)}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button 
                      size="sm"
                      variant="outline"
                      className="border-slate-200 text-foreground hover:bg-slate-50"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/ops/loans/${loan.id}`);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" /> Review
                    </Button>
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            await opsApi.approveQuote(loan.id);
                            toast.success(`Quote approved for ${loan.loan_number}`);
                            loadData();
                          } catch (error: any) {
                            toast.error(error.message || 'Failed to approve quote');
                          }
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                      </Button>
                      <Button 
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const reason = prompt('Enter reason for disapproval (optional):');
                          if (reason !== null) {
                            try {
                              await opsApi.disapproveQuote(loan.id, reason || undefined);
                              toast.success(`Quote disapproved for ${loan.loan_number}`);
                              await loadData();
                            } catch (error: any) {
                              toast.error(error.message || 'Failed to disapprove quote');
                            }
                          }
                        }}
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" /> Decline
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {pendingQuotes.length === 0 && (
                <div className="rounded-sm border border-slate-200 bg-white p-4 text-muted-foreground text-center">
                  All quotes are cleared. Great work!
                </div>
              )}

              {pendingQuotes.length > 4 && (
                <p className="text-sm text-muted-foreground text-right">and {pendingQuotes.length - 4} more in queue…</p>
              )}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Pipeline Card with Circle Chart */}
          <Card className="bg-white border-slate-200 shadow-elegant-lg rounded-2xl transition-all duration-300 hover:shadow-elegant-lg hover:-translate-y-1 hover:border-primary/30 group">
            <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate flex-1 min-w-0 pr-2">Total Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 break-words overflow-wrap-anywhere">{stats?.totalLoans || 0}</div>
                  <CardDescription className="text-xs">Active loans</CardDescription>
                </div>
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
                  <ChartContainer
                    config={{
                      active: { label: "Active", color: "#8b5cf6" },
                    }}
                    className="w-full h-full"
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

          <StatsCard 
            title="Pipeline Value" 
            value={totalPipelineValue} 
            icon={DollarSign} 
            className="bg-white border-slate-200 shadow-elegant-lg rounded-2xl"
          />
          <StatsCard 
            title="Pending Approvals" 
            value={pendingQuotes.length} 
            icon={AlertTriangle} 
            description="Quote requests" 
            className="bg-white border-slate-200 shadow-elegant-lg rounded-2xl"
          />

          {/* This Month Card with Circle Chart */}
          <Card className="bg-white border-slate-200 shadow-elegant-lg rounded-2xl transition-all duration-300 hover:shadow-elegant-lg hover:-translate-y-1 hover:border-primary/30 group">
            <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate flex-1 min-w-0 pr-2">This Month</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 break-words overflow-wrap-anywhere">{formatCurrency(stats?.monthlyVolume || 0)}</div>
                  <CardDescription className="text-xs">{stats?.monthlyFunded || 0} loans funded</CardDescription>
                </div>
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
                  <ChartContainer
                    config={{
                      funded: { label: "Funded", color: "#10b981" },
                      remaining: { label: "Remaining", color: "#e5e7eb" },
                    }}
                    className="w-full h-full"
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

        <Card className="bg-white border-slate-200 shadow-sm rounded-lg">
          <CardHeader className="border-b border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="font-display font-semibold text-foreground">Loan Pipeline</CardTitle>
                <CardDescription className="text-muted-foreground">View and manage all active applications</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                <div className="relative flex-1 w-full sm:w-auto sm:min-w-[200px] sm:max-w-[256px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search borrower, loan #, property..."
                    className="pl-9 w-full bg-white border-slate-200"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48 border-slate-200">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-slate-200">
                      <TableHead className="text-foreground font-semibold">Loan #</TableHead>
                      <TableHead className="text-foreground font-semibold">Borrower</TableHead>
                      <TableHead className="text-foreground font-semibold">Property</TableHead>
                      <TableHead className="text-foreground font-semibold">Loan Amount</TableHead>
                      <TableHead className="text-foreground font-semibold">Status</TableHead>
                      <TableHead className="text-foreground font-semibold">Days</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No loans found
                        </TableCell>
                      </TableRow>
                    ) : (
                      loans.map((loan) => {
                        const config = statusConfig[loan.status as LoanStatus] || { label: loan.status, color: "bg-gray-100 text-gray-700" };
                        return (
                          <TableRow key={loan.id} className="hover:bg-slate-50 border-slate-200">
                            <TableCell className="font-mono text-sm text-foreground">{loan.loan_number}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8">
                                  {loan.borrower_id && (
                                    <UserAvatarImage userId={loan.borrower_id} />
                                  )}
                                  <AvatarFallback className="bg-slate-700 text-white text-xs font-semibold">
                                    {loan.borrower_name
                                      ? loan.borrower_name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .toUpperCase()
                                          .slice(0, 2)
                                      : "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-foreground">{loan.borrower_name}</p>
                                  <p className="text-xs text-muted-foreground">{loan.borrower_email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-foreground">
                                <Home className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm truncate max-w-[200px]">
                                  {loan.property_address}, {loan.property_city}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-foreground">{formatCurrency(loan.loan_amount || 0)}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                                  {config.label}
                                </span>
                                <StarProgress progress={getStarProgress(loan.status)} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`text-sm ${(loan.days_in_status || 0) > 3 ? "text-destructive font-medium" : "text-foreground"}`}>
                                {loan.days_in_status || 0}d
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate(`/ops/loans/${loan.id}`)}>
                                    <Eye className="w-4 h-4 mr-2" /> View Details
                                  </DropdownMenuItem>
                                  {loan.status === 'quote_requested' && (
                                    <>
                                      <DropdownMenuItem 
                                        onClick={async () => {
                                          try {
                                            await opsApi.approveQuote(loan.id);
                                            toast.success('Quote approved and generated successfully');
                                            loadData();
                                          } catch (error: any) {
                                            toast.error(error.message || 'Failed to approve quote');
                                          }
                                        }}
                                        className="text-green-600 focus:text-green-600"
                                      >
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Approve Quote
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={async () => {
                                          const reason = prompt('Enter reason for disapproval (optional):');
                                          if (reason !== null) {
                                            try {
                                              await opsApi.disapproveQuote(loan.id, reason || undefined);
                                              toast.success('Quote disapproved successfully');
                                              await loadData();
                                            } catch (error: any) {
                                              toast.error(error.message || 'Failed to disapprove quote');
                                            }
                                          }
                                        }}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <AlertTriangle className="w-4 h-4 mr-2" /> Disapprove Quote
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuItem onClick={() => { setSelectedLoan(loan); setNewStatus(loan.status); setShowStatusDialog(true); }}>
                                    <RefreshCw className="w-4 h-4 mr-2" /> Update Status
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <Users className="w-4 h-4 mr-2" /> Contact Borrower
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      if (window.confirm(`Are you sure you want to delete loan ${loan.loan_number}? This action cannot be undone.`)) {
                                        try {
                                          await opsApi.deleteLoan(loan.id);
                                          toast.success(`Loan ${loan.loan_number} deleted successfully`);
                                          await loadData();
                                        } catch (error: any) {
                                          toast.error(error.message || 'Failed to delete loan');
                                        }
                                      }
                                    }}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete Loan
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display font-semibold">Update Loan Status</DialogTitle>
            <DialogDescription>
              {selectedLoan?.loan_number} - {selectedLoan?.borrower_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions
                    .filter(opt => !opt.label.includes('(Internal)')) // Filter out internal statuses from main dropdown
                    .map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  {/* Internal statuses grouped separately */}
                  {statusOptions.some(opt => opt.label.includes('(Internal)')) && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t border-slate-200 mt-1">
                        Internal Statuses
                      </div>
                      {statusOptions
                        .filter(opt => opt.label.includes('(Internal)'))
                        .map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea 
                placeholder="Add notes about this status change..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                className="border-slate-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)} className="border-slate-200">Cancel</Button>
            <Button onClick={handleStatusUpdate}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

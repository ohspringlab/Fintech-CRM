import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { opsApi, PipelineStats, RecentClosing } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Users,
  FileText,
  Download,
  RefreshCw,
  Calendar,
  PieChart as PieChartIcon,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export function ReportsView() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [monthlyHistory, setMonthlyHistory] = useState<{
    monthly: Array<{ month: string; value: number; count: number }>;
    daily: Array<{ day: string; sales: number }>;
  } | null>(null);
  const [recentClosings, setRecentClosings] = useState<RecentClosing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>("12months");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, historyRes, closingsRes] = await Promise.all([
        opsApi.getStats(),
        opsApi.getMonthlyHistory(),
        opsApi.getRecentClosings(10)
      ]);
      setStats(statsRes);
      setMonthlyHistory(historyRes);
      setRecentClosings(closingsRes.closings);
    } catch (error) {
      console.error('Failed to load reports data:', error);
      toast.error('Failed to load reports data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", minimumFractionDigits: 0,
    }).format(amount);
  };

  // Prepare chart data
  const statusDistribution = useMemo(() => {
    if (!stats?.byStatus) return [];
    return stats.byStatus.map((s: any) => ({
      name: s.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: parseInt(s.count || 0),
      amount: parseFloat(s.total_amount || 0)
    }));
  }, [stats]);

  const monthlyData = useMemo(() => {
    if (!monthlyHistory?.monthly) return [];
    return monthlyHistory.monthly.map(m => ({
      month: m.month,
      value: m.value,
      count: m.count
    }));
  }, [monthlyHistory]);

  const dailyData = useMemo(() => {
    if (!monthlyHistory?.daily) return [];
    return monthlyHistory.daily.map(d => ({
      day: `Day ${d.day}`,
      sales: d.sales
    }));
  }, [monthlyHistory]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  const handleExport = (type: string) => {
    toast.info(`Exporting ${type} report...`);
    // In a real implementation, this would generate and download a PDF/CSV
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <Card className="relative bg-gradient-to-br from-white/95 via-blue-50/40 to-indigo-50/30 backdrop-blur-xl border-slate-200/50 shadow-xl rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/10 via-transparent to-indigo-100/10" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-200/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-200/10 rounded-full -ml-24 -mb-24 blur-3xl" />
          <CardHeader className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-display font-semibold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  Reports & Analytics
                </CardTitle>
                <CardDescription className="text-slate-600 mt-1">
                  View detailed reports and analytics
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="bg-white/80 backdrop-blur-sm border-slate-300/50 shadow-sm w-40">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                    <SelectItem value="6months">Last 6 Months</SelectItem>
                    <SelectItem value="12months">Last 12 Months</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadData}
                  className="bg-white/80 backdrop-blur-sm border-slate-300/50 shadow-sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('full')}
                  className="bg-white/80 backdrop-blur-sm border-slate-300/50 shadow-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-purple-50/80 border-blue-200/50 shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200/20 rounded-full -mr-12 -mt-12 blur-2xl" />
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-blue-700/80">Total Loans</CardTitle>
            <FileText className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent className="relative z-10 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-1">{stats?.totalLoans || 0}</div>
            <CardDescription className="text-xs text-blue-600/70">All time</CardDescription>
          </CardContent>
        </Card>

        <Card className="relative bg-gradient-to-br from-emerald-50/80 via-teal-50/60 to-cyan-50/80 border-emerald-200/50 shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/20 rounded-full -mr-12 -mt-12 blur-2xl" />
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-emerald-700/80">Funded Amount</CardTitle>
            <DollarSign className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent className="relative z-10 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-1 break-words">{formatCurrency(stats?.fundedAmount || 0)}</div>
            <CardDescription className="text-xs text-emerald-600/70 flex items-center gap-1">
              {stats?.fundedLoans || 0} loans funded
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="relative bg-gradient-to-br from-amber-50/80 via-orange-50/60 to-yellow-50/80 border-amber-200/50 shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200/20 rounded-full -mr-12 -mt-12 blur-2xl" />
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-amber-700/80">This Month</CardTitle>
            <TrendingUp className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent className="relative z-10 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-1 break-words">{formatCurrency(stats?.monthlyVolume || 0)}</div>
            <CardDescription className="text-xs text-amber-600/70 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              {stats?.monthlyFunded || 0} loans
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="relative bg-gradient-to-br from-purple-50/80 via-pink-50/60 to-red-50/80 border-purple-200/50 shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-200/20 rounded-full -mr-12 -mt-12 blur-2xl" />
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-purple-700/80">Avg. Loan Size</CardTitle>
            <Activity className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent className="relative z-10 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-1 break-words">
              {formatCurrency(stats?.fundedAmount && stats?.fundedLoans ? stats.fundedAmount / stats.fundedLoans : 0)}
            </div>
            <CardDescription className="text-xs text-purple-600/70">Per funded loan</CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-sm">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="status">Status Breakdown</TabsTrigger>
          <TabsTrigger value="closings">Recent Closings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Volume Chart */}
            <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-100/10 rounded-full -mr-20 -mt-20 blur-3xl" />
              <CardHeader className="relative z-10">
                <CardTitle className="text-lg font-display font-semibold text-slate-900">Monthly Volume</CardTitle>
                <CardDescription className="text-slate-600">Funded amount over time</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <ChartContainer
                  config={{
                    value: { label: "Volume", color: "hsl(var(--chart-1))" },
                  }}
                  className="h-[300px]"
                >
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <ChartTooltip content={<ChartTooltipContent />} formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-purple-100/10 rounded-full -mr-20 -mt-20 blur-3xl" />
              <CardHeader className="relative z-10">
                <CardTitle className="text-lg font-display font-semibold text-slate-900">Status Distribution</CardTitle>
                <CardDescription className="text-slate-600">Loans by status</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <ChartContainer
                  config={{
                    value: { label: "Count", color: "hsl(var(--chart-2))" },
                  }}
                  className="h-[300px]"
                >
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-100/10 rounded-full -mr-20 -mt-20 blur-3xl" />
            <CardHeader className="relative z-10">
              <CardTitle className="text-lg font-display font-semibold text-slate-900">Funding Trends</CardTitle>
              <CardDescription className="text-slate-600">Monthly and daily funding patterns</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <ChartContainer
                config={{
                  sales: { label: "Sales", color: "hsl(217, 91%, 60%)" },
                }}
                className="h-[400px]"
              >
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} formatter={(value: number) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-100/10 rounded-full -mr-20 -mt-20 blur-3xl" />
            <CardHeader className="relative z-10">
              <CardTitle className="text-lg font-display font-semibold text-slate-900">Status Breakdown</CardTitle>
              <CardDescription className="text-slate-600">Detailed status analysis</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="space-y-4">
                {statusDistribution.map((status, index) => (
                  <div key={status.name} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-medium text-slate-900">{status.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-700">{status.value} loans</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(status.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closings" className="space-y-6">
          <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-100/10 rounded-full -mr-20 -mt-20 blur-3xl" />
            <CardHeader className="relative z-10">
              <CardTitle className="text-lg font-display font-semibold text-slate-900">Recent Closings</CardTitle>
              <CardDescription className="text-slate-600">Latest funded loans</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              {recentClosings.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recent closings</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentClosings.map((closing) => (
                    <div key={closing.loan_id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-lg hover:bg-slate-100/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{closing.borrower_name}</p>
                          <p className="text-sm text-muted-foreground">{closing.property_type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{formatCurrency(closing.loan_amount)}</p>
                        <p className="text-sm text-muted-foreground">{new Date(closing.closing_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


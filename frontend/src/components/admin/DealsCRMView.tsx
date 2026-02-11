import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserAvatarImage } from "@/components/user/UserAvatarImage";
import { opsApi, Loan, StatusOption, PipelineStats } from "@/lib/api";
import { statusConfig, LoanStatus } from "@/components/loan/LoanTracker";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  DollarSign,
  Clock,
  TrendingUp,
  Search,
  Filter,
  Home,
  Eye,
  MoreVertical,
  RefreshCw,
  Calendar,
  MapPin,
  FileText,
} from "lucide-react";

export function DealsCRMView() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, [statusFilter, searchQuery, propertyTypeFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [pipelineRes, statsRes, statusRes] = await Promise.all([
        opsApi.getPipeline({ 
          status: statusFilter !== 'all' ? statusFilter : undefined, 
          search: searchQuery || undefined 
        }),
        opsApi.getStats(),
        opsApi.getStatusOptions()
      ]);
      
      let filteredLoans = pipelineRes.loans;
      if (propertyTypeFilter !== 'all') {
        filteredLoans = filteredLoans.filter(loan => loan.property_type === propertyTypeFilter);
      }
      
      setLoans(filteredLoans);
      setStats(statsRes);
      setStatusOptions(statusRes.statuses);
    } catch (error) {
      console.error('Failed to load deals data:', error);
      toast.error('Failed to load deals data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", minimumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const activeDeals = loans.filter(l => l.status !== 'funded').length;
  const totalValue = loans.reduce((sum, loan) => sum + (Number(loan.loan_amount) || 0), 0);
  const pendingQuotes = loans.filter(l => l.status === 'quote_requested').length;
  const avgLoanAmount = loans.length > 0 ? totalValue / loans.length : 0;

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
                  <Briefcase className="w-6 h-6 text-blue-600" />
                  Deals CRM
                </CardTitle>
                <CardDescription className="text-slate-600 mt-1">
                  Manage all loan deals and customer relationships
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                className="bg-white/80 backdrop-blur-sm border-slate-300/50 shadow-sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-purple-50/80 border-blue-200/50 shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200/20 rounded-full -mr-12 -mt-12 blur-2xl" />
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-blue-700/80">Active Deals</CardTitle>
            <Briefcase className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent className="relative z-10 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-1">{activeDeals}</div>
            <CardDescription className="text-xs text-blue-600/70">In progress</CardDescription>
          </CardContent>
        </Card>

        <Card className="relative bg-gradient-to-br from-emerald-50/80 via-teal-50/60 to-cyan-50/80 border-emerald-200/50 shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/20 rounded-full -mr-12 -mt-12 blur-2xl" />
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-emerald-700/80">Total Value</CardTitle>
            <DollarSign className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent className="relative z-10 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-1 break-words">{formatCurrency(totalValue)}</div>
            <CardDescription className="text-xs text-emerald-600/70">All deals</CardDescription>
          </CardContent>
        </Card>

        <Card className="relative bg-gradient-to-br from-amber-50/80 via-orange-50/60 to-yellow-50/80 border-amber-200/50 shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200/20 rounded-full -mr-12 -mt-12 blur-2xl" />
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-amber-700/80">Pending Quotes</CardTitle>
            <Clock className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent className="relative z-10 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-1">{pendingQuotes}</div>
            <CardDescription className="text-xs text-amber-600/70">Awaiting approval</CardDescription>
          </CardContent>
        </Card>

        <Card className="relative bg-gradient-to-br from-purple-50/80 via-pink-50/60 to-red-50/80 border-purple-200/50 shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-200/20 rounded-full -mr-12 -mt-12 blur-2xl" />
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-purple-700/80">Avg. Loan Amount</CardTitle>
            <TrendingUp className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent className="relative z-10 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-1 break-words">{formatCurrency(avgLoanAmount)}</div>
            <CardDescription className="text-xs text-purple-600/70">Per deal</CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        <CardContent className="relative z-10 p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
              <Input
                placeholder="Search by loan number, borrower name, or address..."
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
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                <SelectTrigger className="bg-white/80 backdrop-blur-sm border-slate-300/50 shadow-sm">
                  <Home className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Property Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Property Types</SelectItem>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deals Table */}
      <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-100/10 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-100/10 rounded-full -ml-16 -mb-16 blur-3xl" />
        <CardHeader className="relative z-10">
          <CardTitle className="text-lg font-display font-semibold text-slate-900">All Deals</CardTitle>
          <CardDescription className="text-slate-600">{loans.length} deal{loans.length !== 1 ? 's' : ''} found</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
            </div>
          ) : loans.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No deals found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead>Borrower</TableHead>
                    <TableHead>Loan Number</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Loan Amount</TableHead>
                    <TableHead>Property Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => {
                    const config = statusConfig[loan.status as LoanStatus] || { label: loan.status, color: "bg-gray-100 text-gray-700" };
                    return (
                      <TableRow key={loan.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <UserAvatarImage userId={loan.user_id} />
                              <AvatarFallback className="bg-slate-700 text-white text-xs font-semibold">
                                {getInitials(loan.borrower_name || 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-slate-900">{loan.borrower_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{loan.borrower_email || ''}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-slate-700">{loan.loan_number || 'N/A'}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <span className="text-slate-700">
                              {loan.property_city && loan.property_state 
                                ? `${loan.property_city}, ${loan.property_state}`
                                : loan.property_address || 'N/A'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-slate-900">{formatCurrency(Number(loan.loan_amount) || 0)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-700 capitalize">
                            {loan.property_type === 'residential' 
                              ? `SFR - ${loan.residential_units || 1} Unit${(loan.residential_units || 1) > 1 ? 's' : ''}`
                              : loan.commercial_type || 'Commercial'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", config.color)}>
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {new Date(loan.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/ops/loans/${loan.id}`)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => navigate(`/admin/deals/${loan.id}`)}>
                                <FileText className="w-4 h-4 mr-2" />
                                Manage Deal
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
    </div>
  );
}


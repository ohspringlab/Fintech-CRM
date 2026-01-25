import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { loansApi, Loan } from "@/lib/api";
import { statusConfig, LoanStatus } from "@/components/loan/LoanTracker";
import { 
  DollarSign, FileText, TrendingUp, Clock, Search, Filter,
  Download, Eye, BarChart3, PieChart
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function InvestorDashboard() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [loanTypeFilter, setLoanTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, [loanTypeFilter, statusFilter, searchQuery]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const loansRes = await loansApi.list();
      
      // Filter loans available for investors (typically pending/funded loans)
      const availableLoans = loansRes.loans.filter(loan => {
        // Show loans that are available for purchase (pending, approved, funded)
        const availableStatuses = ['pending', 'approved', 'funded', 'clear_to_close', 'conditionally_approved'];
        if (statusFilter !== "all" && loan.status !== statusFilter) return false;
        if (loanTypeFilter !== "all" && loan.transaction_type !== loanTypeFilter) return false;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            loan.loan_number?.toLowerCase().includes(query) ||
            loan.borrower_name?.toLowerCase().includes(query) ||
            loan.property_address?.toLowerCase().includes(query)
          );
        }
        return true;
      });
      
      setLoans(availableLoans);
    } catch (error) {
      console.error('Failed to load loan tape:', error);
      toast.error('Failed to load loan tape');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate statistics
  const totalVolume = loans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);
  const pendingLoans = loans.filter(l => ['quote_requested', 'needs_list_sent', 'needs_list_complete', 'submitted_to_underwriting'].includes(l.status));
  const closedLoans = loans.filter(l => l.status === 'funded');
  const closedVolume = closedLoans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);
  
  // Group by loan type
  const loansByType: Record<string, number> = {};
  loans.forEach(loan => {
    const type = loan.transaction_type || 'Other';
    loansByType[type] = (loansByType[type] || 0) + 1;
  });

  const exportLoanTape = () => {
    // In production, this would export to CSV/Excel
    const csv = [
      ['Loan Number', 'Borrower', 'Property Address', 'Loan Amount', 'Status', 'Loan Type', 'LTV', 'DSCR'].join(','),
      ...loans.map(loan => [
        loan.loan_number || '',
        loan.borrower_name || '',
        `${loan.property_address}, ${loan.property_city}, ${loan.property_state}`,
        loan.loan_amount || 0,
        loan.status || '',
        loan.transaction_type || '',
        loan.ltv_requested || '',
        loan.dscr || ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loan-tape-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Loan tape exported successfully');
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <AppNavbar variant="borrower" />

      <main className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14 space-y-6 sm:space-y-8 z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-semibold text-foreground">
              Investor Portal
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              View loan tape, volume closed, pending loans, and available loan types
            </p>
          </div>
          <Button
            size="lg"
            variant="outline"
            onClick={exportLoanTape}
            className="gap-2 w-full sm:w-auto"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Loan Tape</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard 
            title="Total Volume" 
            value={formatCurrency(totalVolume)} 
            icon={DollarSign}
            description="All loans"
          />
          <StatsCard 
            title="Volume Closed" 
            value={formatCurrency(closedVolume)} 
            icon={TrendingUp}
            description={`${closedLoans.length} loans funded`}
          />
          <StatsCard 
            title="Pending Loans" 
            value={pendingLoans.length} 
            icon={Clock}
            description="In pipeline"
          />
          <StatsCard 
            title="Loan Types" 
            value={Object.keys(loansByType).length} 
            icon={FileText}
            description="Available types"
          />
        </div>

        {/* Loan Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Loan Type Distribution
            </CardTitle>
            <CardDescription>Breakdown of available loans by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(loansByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-4 border rounded-lg">
                  <span className="font-medium text-foreground">{type}</span>
                  <Badge variant="secondary">{count} loans</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Loan Tape */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Loan Tape
                </CardTitle>
                <CardDescription>Available loans for purchase</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search loans..."
                    className="pl-9 w-48"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={loanTypeFilter} onValueChange={setLoanTypeFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Loan Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="dscr_rental">DSCR Rental</SelectItem>
                    <SelectItem value="fix_flip">Fix & Flip</SelectItem>
                    <SelectItem value="ground_up">Ground-Up Construction</SelectItem>
                    <SelectItem value="rate_term">Rate & Term</SelectItem>
                    <SelectItem value="cash_out">Cash-Out</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="funded">Funded</SelectItem>
                    <SelectItem value="clear_to_close">Clear to Close</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : loans.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No loans available</p>
                <p className="text-sm">Check back later for new loan opportunities</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loan #</TableHead>
                      <TableHead>Borrower</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Loan Amount</TableHead>
                      <TableHead>Loan Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>LTV</TableHead>
                      <TableHead>DSCR</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.map((loan) => {
                      const config = statusConfig[loan.status as LoanStatus] || { label: loan.status, color: "bg-gray-100 text-gray-700" };
                      return (
                        <TableRow key={loan.id}>
                          <TableCell className="font-mono text-sm">{loan.loan_number}</TableCell>
                          <TableCell>{loan.borrower_name}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {loan.property_address}, {loan.property_city}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(loan.loan_amount || 0)}
                          </TableCell>
                          <TableCell>{loan.transaction_type || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge className={config.color}>{config.label}</Badge>
                          </TableCell>
                          <TableCell>{loan.ltv_requested ? `${loan.ltv_requested}%` : 'N/A'}</TableCell>
                          <TableCell>{loan.dscr ? loan.dscr.toFixed(2) : 'N/A'}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/dashboard/loans/${loan.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
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
      </main>
    </div>
  );
}


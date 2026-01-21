import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { LoanCard } from "@/components/dashboard/LoanCard";
import { statusConfig, LoanStatus } from "@/components/loan/LoanTracker";
import { useUser, useClerk } from "@clerk/clerk-react";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { loansApi, Loan } from "@/lib/api";
import { 
  ArrowRight, Building2, DollarSign, FileText, Plus, User, 
  Clock, Search, Filter, Eye, TrendingUp, CheckCircle2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function BrokerDashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  useEffect(() => {
    loadData();
  }, [statusFilter, searchQuery]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const loansRes = await loansApi.list();
      
      // Filter loans for broker (in a real system, backend would filter by broker_id)
      const brokerLoans = loansRes.loans.filter(loan => {
        // For now, show all loans. In production, filter by broker_id
        if (statusFilter !== "all" && loan.status !== statusFilter) return false;
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
      
      setLoans(brokerLoans);
    } catch (error) {
      console.error('Failed to load broker loans:', error);
      toast.error('Failed to load loans');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalLoans = loans.length;
  const totalValue = loans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);
  const pendingLoans = loans.filter(l => ['quote_requested', 'needs_list_sent', 'needs_list_complete'].includes(l.status)).length;
  const approvedLoans = loans.filter(l => ['conditionally_approved', 'clear_to_close', 'closing_scheduled', 'funded'].includes(l.status)).length;

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <AppNavbar variant="borrower" />

      <main className="relative container mx-auto px-4 lg:px-8 py-10 lg:py-14 space-y-8 z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-semibold text-foreground">
              Broker Portal
            </h1>
            <p className="text-muted-foreground mt-2">
              Submit loan requests and track your clients' applications
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => navigate('/loan-request')}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Submit New Loan Request
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard 
            title="Total Loans" 
            value={totalLoans} 
            icon={FileText} 
            description="All client loans"
          />
          <StatsCard 
            title="Total Value" 
            value={formatCurrency(totalValue)} 
            icon={DollarSign}
            description="Portfolio value"
          />
          <StatsCard 
            title="Pending" 
            value={pendingLoans} 
            icon={Clock}
            description="Awaiting processing"
          />
          <StatsCard 
            title="Approved" 
            value={approvedLoans} 
            icon={CheckCircle2}
            description="Approved loans"
          />
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Your Loan Requests</CardTitle>
            <CardDescription>Track all loan requests submitted for your clients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by loan #, client name, property..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="quote_requested">Quote Requested</SelectItem>
                  <SelectItem value="soft_quote_issued">Soft Quote Issued</SelectItem>
                  <SelectItem value="needs_list_sent">Needs List Sent</SelectItem>
                  <SelectItem value="needs_list_complete">Needs List Complete</SelectItem>
                  <SelectItem value="submitted_to_underwriting">In Underwriting</SelectItem>
                  <SelectItem value="conditionally_approved">Conditionally Approved</SelectItem>
                  <SelectItem value="clear_to_close">Clear to Close</SelectItem>
                  <SelectItem value="funded">Funded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Loan List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : loans.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No loans found</p>
                <p className="text-sm">Submit your first loan request to get started</p>
                <Button
                  className="mt-4"
                  onClick={() => navigate('/loan-request')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Loan Request
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {loans.map((loan) => {
                  const config = statusConfig[loan.status as LoanStatus] || { label: loan.status, color: "bg-gray-100 text-gray-700" };
                  return (
                    <Card key={loan.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-mono text-sm font-medium text-foreground">
                                {loan.loan_number}
                              </span>
                              <Badge className={config.color}>
                                {config.label}
                              </Badge>
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-1">
                              {loan.borrower_name}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {loan.property_address}, {loan.property_city}, {loan.property_state}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {formatCurrency(loan.loan_amount || 0)}
                              </span>
                              <span>•</span>
                              <span>{loan.transaction_type || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              onClick={() => navigate(`/dashboard/loans/${loan.id}`)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


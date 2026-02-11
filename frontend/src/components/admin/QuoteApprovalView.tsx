import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserAvatarImage } from "@/components/user/UserAvatarImage";
import { opsApi, Loan } from "@/lib/api";
import { statusConfig, LoanStatus } from "@/components/loan/LoanTracker";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Search,
  RefreshCw,
  Eye,
  XCircle,
  Clock,
  DollarSign,
} from "lucide-react";

export function QuoteApprovalView() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, [searchQuery]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const pipelineRes = await opsApi.getPipeline({ status: 'quote_requested' });
      let filteredLoans = pipelineRes.loans;
      if (searchQuery) {
        filteredLoans = filteredLoans.filter(loan => 
          loan.loan_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loan.borrower_name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      setLoans(filteredLoans);
    } catch (error) {
      console.error('Failed to load quotes:', error);
      toast.error('Failed to load quotes for approval');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (loanId: string) => {
    try {
      await opsApi.approveQuote(loanId);
      toast.success('Quote approved successfully');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve quote');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", minimumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  return (
    <div className="space-y-6">
      <Card className="relative bg-gradient-to-br from-white/95 via-blue-50/40 to-indigo-50/30 backdrop-blur-xl border-slate-200/50 shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-display font-semibold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
                Quote Approval
              </CardTitle>
              <CardDescription className="text-slate-600 mt-1">
                Review and approve loan quotes
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm px-3 py-1">
                {loans.length} Pending
              </Badge>
              <Button variant="outline" size="sm" onClick={loadData} className="bg-white/80 backdrop-blur-sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl">
        <CardContent className="p-4 sm:p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by loan number or borrower name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Pending Quotes</CardTitle>
          <CardDescription>{loans.length} quote{loans.length !== 1 ? 's' : ''} awaiting approval</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
            </div>
          ) : loans.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pending quotes</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Loan Number</TableHead>
                  <TableHead>Loan Amount</TableHead>
                  <TableHead>Property Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <UserAvatarImage userId={loan.user_id} />
                          <AvatarFallback>{getInitials(loan.borrower_name || '')}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{loan.borrower_name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{loan.loan_number || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{formatCurrency(Number(loan.loan_amount) || 0)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {loan.property_type === 'residential' 
                          ? `SFR - ${loan.residential_units || 1} Unit${(loan.residential_units || 1) > 1 ? 's' : ''}`
                          : loan.commercial_type || 'Commercial'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-yellow-100 text-yellow-700">Pending Approval</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/ops/loans/${loan.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                        <Button size="sm" onClick={() => handleApprove(loan.id)} className="bg-green-600 text-white hover:bg-green-700">
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


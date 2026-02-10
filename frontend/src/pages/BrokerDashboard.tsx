import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { brokersApi, Loan } from "@/lib/api";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { DollarSign, FileText, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Badge } from "@/components/ui/badge";
import { statusConfig } from "@/components/loan/LoanTracker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function BrokerDashboard() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [loansRes, statsRes] = await Promise.all([
        brokersApi.getMyLoans(),
        brokersApi.getStats()
      ]);
      setLoans(loansRes.loans);
      setStats(statsRes.stats);
    } catch (error) {
      console.error('Failed to load broker data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar variant="borrower" />
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Broker Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track your referred loans and earnings
          </p>
        </div>
        
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
              <StatsCard
                title="Total Loans"
                value={stats?.total_loans || 0}
                description="Loans referred"
                icon={FileText}
              />
              <StatsCard
                title="Funded Loans"
                value={stats?.funded_loans || 0}
                description="Successfully funded"
                icon={CheckCircle2}
              />
              <StatsCard
                title="Total Volume"
                value={formatCurrency(stats?.total_volume || 0)}
                description="Funded loan volume"
                icon={DollarSign}
              />
              <StatsCard
                title="Fees Earned"
                value={formatCurrency(stats?.total_fees_earned || 0)}
                description={`${formatCurrency(stats?.fees_paid || 0)} paid`}
                icon={TrendingUp}
              />
            </div>

            {/* Loans List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">My Referred Loans</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Track all loans you've referred to RPC
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loans.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No loans referred yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Loan #</TableHead>
                          <TableHead className="text-xs sm:text-sm">Borrower</TableHead>
                          <TableHead className="text-xs sm:text-sm">Property</TableHead>
                          <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                          <TableHead className="text-xs sm:text-sm">Status</TableHead>
                          <TableHead className="text-xs sm:text-sm">Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loans.map((loan) => {
                          const statusInfo = statusConfig[loan.status as keyof typeof statusConfig] || statusConfig.new_request;
                          return (
                            <TableRow 
                              key={loan.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => navigate(`/dashboard/loans/${loan.id}`)}
                            >
                              <TableCell className="text-xs sm:text-sm font-medium">
                                {loan.loan_number || 'N/A'}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {loan.borrower_name || loan.borrower_email || 'N/A'}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                <div className="max-w-[200px] truncate">
                                  {loan.property_address}, {loan.property_city}, {loan.property_state}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {formatCurrency(loan.loan_amount || 0)}
                              </TableCell>
                              <TableCell>
                                <Badge className={statusInfo.color}>
                                  {statusInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm text-muted-foreground">
                                {new Date(loan.created_at).toLocaleDateString()}
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
          </>
        )}
      </main>
    </div>
  );
}

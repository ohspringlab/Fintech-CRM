import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoanTracker, LoanTrackerHorizontal, statusConfig, type LoanStatus } from "@/components/loan/LoanTracker";
import { ArrowRight, Building2, DollarSign, MapPin } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LoanCardProps {
  id: string;
  loanNumber?: string;
  propertyAddress: string;
  city: string;
  state: string;
  loanAmount: number;
  propertyType: string;
  transactionType: string;
  status: LoanStatus;
  createdAt: string;
  compact?: boolean;
}

export function LoanCard({
  id,
  loanNumber,
  propertyAddress,
  city,
  state,
  loanAmount,
  propertyType,
  transactionType,
  status,
  createdAt,
  compact = false,
}: LoanCardProps) {
  const navigate = useNavigate();
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const config = statusConfig[status] || { label: status, color: "bg-gray-100 text-gray-700" };

  if (compact) {
    return (
      <div 
        onClick={() => navigate(`/dashboard/loans/${id}`)}
        className="block group cursor-pointer"
      >
        <Card className="hover:shadow-elegant hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border-2 hover:border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {loanNumber && (
                  <p className="text-xs text-muted-foreground mb-1 font-mono">{loanNumber}</p>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <p className="font-medium truncate">{propertyAddress}</p>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {city}, {state}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-lg">{formatCurrency(loanAmount)}</p>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                  {config.label}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <LoanTracker currentStatus={status} compact />
            </div>
            <div className="mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full gap-1 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/dashboard/loans/${id}`);
                }}
              >
                View Details <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      onClick={() => navigate(`/dashboard/loans/${id}`)}
      className="block group cursor-pointer"
    >
      <Card className="relative overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full border-2 border-slate-200/50 hover:border-blue-300/50 bg-white/95 backdrop-blur-sm rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-indigo-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/10 rounded-full -mr-16 -mt-16 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white pb-3 sm:pb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full -ml-16 -mb-16 blur-3xl"></div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {loanNumber && (
                <p className="text-slate-300 text-[10px] sm:text-xs font-mono mb-1 truncate">{loanNumber}</p>
              )}
              <p className="text-slate-300 text-xs sm:text-sm font-medium mb-1 truncate">{transactionType}</p>
              <CardTitle className="text-sm sm:text-lg truncate">{propertyAddress}</CardTitle>
              <p className="text-white/60 text-[10px] sm:text-sm flex items-center gap-1 mt-1 truncate">
                <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                {city}, {state}
              </p>
            </div>
            <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-medium ${config.color} flex-shrink-0 ml-2`}>
              {config.label}
            </span>
          </div>
        </CardHeader>
        <CardContent className="relative z-10 p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
            <div className="relative bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-purple-50/80 backdrop-blur-sm border border-blue-200/50 p-2 sm:p-3 rounded-lg overflow-visible shadow-sm hover:shadow-md transition-all duration-300 group/item">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 via-transparent to-indigo-100/20 rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-medium relative z-10">Loan Amount</p>
              <p className="font-bold text-sm sm:text-lg flex items-center gap-1 text-foreground relative z-10">
                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                {formatCurrency(loanAmount)}
              </p>
            </div>
            <div className="relative bg-gradient-to-br from-emerald-50/80 via-teal-50/60 to-cyan-50/80 backdrop-blur-sm border border-emerald-200/50 p-2 sm:p-3 rounded-lg overflow-visible shadow-sm hover:shadow-md transition-all duration-300 group/item">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/20 via-transparent to-teal-100/20 rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-medium relative z-10">Property Type</p>
              <p className="font-semibold text-xs sm:text-base text-foreground relative z-10 truncate">{propertyType}</p>
            </div>
          </div>
          
          <div className="w-full -mx-4 sm:-mx-6 px-4 sm:px-6">
            <LoanTrackerHorizontal currentStatus={status} />
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mt-4 pt-4 border-t">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Created {new Date(createdAt).toLocaleDateString()}
            </p>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
              {status === "soft_quote_issued" && (
                <Link to={`/dashboard/loans/${id}`} onClick={(e) => e.stopPropagation()} className="flex-1 sm:flex-none">
                  <Button variant="default" size="sm" className="gap-1 bg-slate-700 hover:bg-slate-800 text-white w-full sm:w-auto text-xs sm:text-sm">
                    Sign Term Sheet <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </Link>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1 flex-1 sm:flex-none text-xs sm:text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/dashboard/loans/${id}`);
                }}
              >
                View Details <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

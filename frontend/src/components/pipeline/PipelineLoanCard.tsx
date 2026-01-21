import { Loan, LoanStatus } from "@/lib/api";
import { statusConfig } from "@/components/loan/LoanTracker";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  DollarSign,
  MoreVertical,
  Eye,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PipelineLoanCardProps {
  loan: Loan;
  onView?: (loan: Loan) => void;
  onUpdateStatus?: (loan: Loan) => void;
}

export function PipelineLoanCard({ loan, onView, onUpdateStatus }: PipelineLoanCardProps) {
  const navigate = useNavigate();
  const status = loan.status as LoanStatus;
  const config = statusConfig[status] || { label: status, color: "bg-gray-100 text-gray-700" };
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: loan.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const daysInStatus = loan.days_in_status || 0;
  const isStale = daysInStatus > 3;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "mb-3 cursor-move hover:shadow-md transition-all border-l-4",
        isStale && "border-l-red-500",
        !isStale && "border-l-transparent",
        isDragging && "ring-2 ring-primary"
      )}
      onClick={() => onView?.(loan)}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs font-semibold text-muted-foreground mb-1">
                {loan.loan_number}
              </p>
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(loan.borrower_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{loan.borrower_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {loan.borrower_email}
                  </p>
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/ops/loans/${loan.id}`)}>
                  <Eye className="w-4 h-4 mr-2" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateStatus?.(loan)}>
                  <Clock className="w-4 h-4 mr-2" /> Update Status
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Property Info */}
          <div className="flex items-start gap-2">
            <Home className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground truncate">
                {loan.property_address}
              </p>
              <p className="text-xs text-muted-foreground">
                {loan.property_city}, {loan.property_state}
              </p>
            </div>
          </div>

          {/* Loan Amount */}
          <div className="flex items-center gap-2">
            <DollarSign className="w-3 h-3 text-muted-foreground" />
            <p className="text-sm font-semibold">
              {formatCurrency(loan.loan_amount || 0)}
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={cn("text-xs", config.color)}
            >
              {config.label}
            </Badge>
            {daysInStatus > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span className={cn(isStale && "text-red-600 font-medium")}>
                  {daysInStatus}d
                </span>
              </div>
            )}
          </div>

          {/* Last Updated */}
          {loan.updated_at && (
            <p className="text-xs text-muted-foreground">
              Updated {formatDistanceToNow(new Date(loan.updated_at), { addSuffix: true })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


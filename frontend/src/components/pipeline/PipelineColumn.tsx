import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Loan, LoanStatus } from "@/lib/api";
import { PipelineLoanCard } from "./PipelineLoanCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PipelineColumnProps {
  status: LoanStatus;
  label: string;
  loans: Loan[];
  onView?: (loan: Loan) => void;
  onUpdateStatus?: (loan: Loan) => void;
}

export function PipelineColumn({
  status,
  label,
  loans,
  onView,
  onUpdateStatus,
}: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const totalValue = loans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex-shrink-0 w-80">
      <Card
        ref={setNodeRef}
        className={cn(
          "h-full flex flex-col border-2 transition-colors",
          isOver && "border-primary border-dashed bg-primary/5"
        )}
      >
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{label}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {loans.length}
            </Badge>
          </div>
          {totalValue > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(totalValue)}
            </p>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-3">
          <SortableContext
            items={loans.map((loan) => loan.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {loans.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No loans
                </div>
              ) : (
                loans.map((loan) => (
                  <PipelineLoanCard
                    key={loan.id}
                    loan={loan}
                    onView={onView}
                    onUpdateStatus={onUpdateStatus}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </CardContent>
      </Card>
    </div>
  );
}


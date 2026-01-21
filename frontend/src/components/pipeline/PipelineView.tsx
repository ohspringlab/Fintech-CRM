import { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Loan, LoanStatus, StatusOption, opsApi } from "@/lib/api";
import { PipelineColumn } from "./PipelineColumn";
import { PipelineLoanCard } from "./PipelineLoanCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, Filter, RefreshCw, Table2, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { statusConfig } from "@/components/loan/LoanTracker";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PipelineViewProps {
  onViewLoan?: (loanId: string) => void;
}

export function PipelineView({ onViewLoan }: PipelineViewProps) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [processorFilter, setProcessorFilter] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadData();
  }, [searchQuery, processorFilter]);

  const loadData = async () => {
    try {
      const [pipelineRes, statusRes] = await Promise.all([
        opsApi.getPipeline({
          search: searchQuery || undefined,
          processor: processorFilter !== "all" ? processorFilter : undefined,
        }),
        opsApi.getStatusOptions(),
      ]);
      setLoans(pipelineRes.loans);
      setStatusOptions(statusRes.statuses);
    } catch (error) {
      console.error("Failed to load pipeline data:", error);
      toast.error("Failed to load pipeline data");
    } finally {
      setIsLoading(false);
    }
  };

  // Group loans by status
  const loansByStatus = useMemo(() => {
    const grouped: Record<string, Loan[]> = {};
    statusOptions.forEach((option) => {
      grouped[option.value] = loans.filter((loan) => loan.status === option.value);
    });
    return grouped;
  }, [loans, statusOptions]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const loanId = active.id as string;
    const newStatus = over.id as LoanStatus;

    const loan = loans.find((l) => l.id === loanId);
    if (!loan || loan.status === newStatus) {
      return;
    }

    // Optimistic update
    const updatedLoans = loans.map((l) =>
      l.id === loanId ? { ...l, status: newStatus } : l
    );
    setLoans(updatedLoans);

    try {
      await opsApi.updateStatus(loanId, newStatus);
      toast.success("Status updated successfully");
      // Reload to get fresh data
      loadData();
    } catch (error: any) {
      // Revert on error
      setLoans(loans);
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedLoan || !newStatus) return;

    try {
      await opsApi.updateStatus(selectedLoan.id, newStatus, statusNotes);
      toast.success("Status updated successfully");
      setShowStatusDialog(false);
      setSelectedLoan(null);
      setNewStatus("");
      setStatusNotes("");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const activeLoan = activeId ? loans.find((l) => l.id === activeId) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search borrower, loan #, property..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={processorFilter} onValueChange={setProcessorFilter}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Processors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Processors</SelectItem>
            {/* Add processor options here */}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={loadData}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Pipeline Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4 min-w-max">
            {statusOptions.map((option) => (
              <PipelineColumn
                key={option.value}
                status={option.value as LoanStatus}
                label={option.label}
                loans={loansByStatus[option.value] || []}
                onView={(loan) => onViewLoan?.(loan.id)}
                onUpdateStatus={(loan) => {
                  setSelectedLoan(loan);
                  setNewStatus(loan.status);
                  setShowStatusDialog(true);
                }}
              />
            ))}
          </div>
        </ScrollArea>

        <DragOverlay>
          {activeLoan ? (
            <div className="w-80 opacity-90">
              <PipelineLoanCard loan={activeLoan} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Loan Status</DialogTitle>
            <DialogDescription>
              {selectedLoan?.loan_number} - {selectedLoan?.borrower_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Add notes about this status change..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


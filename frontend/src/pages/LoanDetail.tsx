import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoanTrackerFull, LoanTrackerDominos, statusConfig, LoanStatus } from "@/components/loan/LoanTracker";
import { FullApplicationForm } from "@/components/loan/FullApplicationForm";
import { loansApi, documentsApi, paymentsApi, opsApi, Loan, NeedsListItem, SoftQuote } from "@/lib/api";
import { 
  ArrowLeft, ArrowRight, Building2, DollarSign, FileText, Download, CreditCard, 
  CheckCircle2, AlertCircle, Upload, Shield, FileCheck, Calendar, ClipboardCheck, RefreshCw,
  Search, XCircle, Clock
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/clerk-react";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { StripePaymentForm } from "@/components/payment/StripePaymentForm";

export default function LoanDetail() {
  const { loanId } = useParams<{ loanId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [needsList, setNeedsList] = useState<NeedsListItem[]>([]);
  const [closingChecklist, setClosingChecklist] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreditAuth, setShowCreditAuth] = useState(false);
  const [showAppraisalPayment, setShowAppraisalPayment] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [creditConsent, setCreditConsent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCommitmentUpload, setShowCommitmentUpload] = useState(false);
  const [commitmentLetterUrl, setCommitmentLetterUrl] = useState("");
  const [conditionalItems, setConditionalItems] = useState("");
  const [showAddChecklistItem, setShowAddChecklistItem] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState({ itemName: "", description: "", category: "general", required: true });
  const [showScheduleClosing, setShowScheduleClosing] = useState(false);
  const [closingDate, setClosingDate] = useState("");
  const [showFundLoan, setShowFundLoan] = useState(false);
  const [fundedAmount, setFundedAmount] = useState("");

  // Determine if this is an operations/admin view
  const isOpsView = location.pathname.startsWith('/ops') || (user?.role === 'operations' || user?.role === 'admin');

  useEffect(() => {
    if (loanId) {
      loadLoanData();
    }
  }, [loanId]);

  const loadLoanData = async () => {
    try {
      if (isOpsView) {
        // Use operations API for ops/admin users
        const [loanRes, checklistRes] = await Promise.all([
          opsApi.getLoan(loanId!),
          opsApi.getClosingChecklist(loanId!).catch(() => ({ checklist: [] }))
        ]);
        setLoan(loanRes.loan);
        setNeedsList(loanRes.needsList || []);
        setClosingChecklist(checklistRes.checklist || []);
      } else {
        // Use borrower API for regular users
        const [loanRes, needsRes, checklistRes] = await Promise.all([
          loansApi.get(loanId!),
          documentsApi.getNeedsList(loanId!).catch((err) => {
            console.error('Failed to load needs list:', err);
            return { needsList: [] }; // Return empty array on error
          }),
          loansApi.getClosingChecklist(loanId!).catch(() => ({ checklist: [] }))
        ]);
        setLoan(loanRes.loan);
        setNeedsList(needsRes.needsList || []);
        setClosingChecklist(checklistRes.checklist || []);
        
        // Auto-generate needs list if status is needs_list_sent but no items exist
        if (loanRes.loan.status === 'needs_list_sent' && (!needsRes.needsList || needsRes.needsList.length === 0)) {
          try {
            await loansApi.generateNeedsList(loanId!);
            // Reload needs list after generation
            const updatedNeedsRes = await documentsApi.getNeedsList(loanId!).catch(() => ({ needsList: [] }));
            setNeedsList(updatedNeedsRes.needsList || []);
            toast.success("Document needs list has been generated");
          } catch (genError: any) {
            console.error('Failed to auto-generate needs list:', genError);
            // Don't show error toast, just log it - user can manually generate if needed
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load loan details");
      if (isOpsView) {
        navigate("/ops");
      } else {
        navigate("/dashboard");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreditAuth = async () => {
    if (!creditConsent) {
      toast.error("Please provide consent to proceed");
      return;
    }

    setIsProcessing(true);
    try {
      await loansApi.creditAuth(loanId!);
      toast.success("Credit authorization completed");
      setShowCreditAuth(false);
      await loadLoanData();
      
      // Quote should already be generated by admin approval, just reload
      await loadLoanData();
    } catch (error: any) {
      toast.error(error.message || "Credit authorization failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignTermSheet = async () => {
    setIsProcessing(true);
    try {
      await loansApi.signTermSheet(loanId!);
      toast.success("Term sheet signed! Needs list will be sent to your email.");
      await loadLoanData();
    } catch (error: any) {
      toast.error(error.message || "Failed to sign term sheet");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAppraisalPayment = async () => {
    setIsProcessing(true);
    try {
      const paymentRes = await paymentsApi.createAppraisalIntent(loanId!);
      
      if (paymentRes.mockMode) {
        // Mock payment for development (when Stripe is not configured)
        await paymentsApi.confirmPayment(loanId!, paymentRes.clientSecret.split('_')[2]);
        toast.success("Appraisal payment completed (mock mode)");
        setShowAppraisalPayment(false);
        await loadLoanData();
      } else {
        // Real Stripe payment
        setPaymentClientSecret(paymentRes.clientSecret);
        setPaymentAmount(paymentRes.amount);
      }
    } catch (error: any) {
      toast.error(error.message || "Payment failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setIsProcessing(true);
    try {
      // Extract payment intent ID from client secret
      const paymentIntentId = paymentClientSecret?.split('_secret_')[0] || '';
      await paymentsApi.confirmPayment(loanId!, paymentIntentId);
      toast.success("Appraisal payment completed!");
      setShowAppraisalPayment(false);
      setPaymentClientSecret(null);
      await loadLoanData();
    } catch (error: any) {
      toast.error(error.message || "Failed to confirm payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentCancel = () => {
    setShowAppraisalPayment(false);
    setPaymentClientSecret(null);
    setPaymentAmount(0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  if (!loan) {
    return null;
  }

  const statusConfigItem = statusConfig[loan.status as LoanStatus] || { label: loan.status, color: "bg-gray-100 text-gray-700" };
  const quote: SoftQuote | null = loan.soft_quote_data || null;

  const baseBackground = isOpsView ? "min-h-screen bg-background text-foreground" : "min-h-screen bg-gradient-to-br from-background via-slate-50/30 to-slate-50/20";
  const useOpsSurface = isOpsView || location.pathname.startsWith('/dashboard/loans');

  return (
    <div className={baseBackground}>
      <AppNavbar variant={isOpsView ? "operations" : "borrower"} />
      
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 relative z-10">
        <Button variant="ghost" onClick={() => navigate(isOpsView ? "/ops" : "/dashboard")} className="mb-4 sm:mb-6 text-sm sm:text-base">
          <ArrowLeft className="w-4 h-4 mr-2" /> {isOpsView ? 'Back to Pipeline' : 'Back to Dashboard'}
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Loan Tracker */}
            <Card 
              className={useOpsSurface 
                ? "relative rounded-lg border border-slate-200 bg-white shadow-sm" 
                : "relative loan-progress-card-ghost loan-progress-card-blue"}
              style={useOpsSurface ? { overflow: 'hidden' } : { overflow: 'visible', backgroundColor: 'transparent' }}
            >
              {!useOpsSurface && (
                <div className="absolute inset-0 pointer-events-none z-0" style={{ overflow: 'visible' }}>
                  <div className="absolute card-bg-circle card-bg-circle-1" style={{ top: '0%', left: '60%' }} />
                  <div className="absolute card-bg-circle card-bg-circle-2" style={{ top: '0%', left: '10%' }} />
                  <div className="absolute card-bg-circle card-bg-circle-3" style={{ top: '0%', left: '75%' }} />
                  <div className="absolute card-bg-circle card-bg-circle-4" style={{ top: '0%', left: '30%' }} />
                  <div className="absolute card-bg-circle card-bg-circle-5" style={{ top: '0%', left: '50%' }} />
                </div>
              )}
              
              <CardHeader className="relative z-10">
                <CardTitle className={useOpsSurface ? "text-lg font-display font-semibold text-foreground" : "text-base"}>Loan Progress Tracker</CardTitle>
                <CardDescription className={useOpsSurface ? "text-muted-foreground" : "text-base mt-2"}>
                  Track your loan application through each stage with real-time updates
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10 pt-6 overflow-visible">
                <div className="w-full -mx-6 px-6">
                  <LoanTrackerDominos 
                    currentStatus={loan.status as LoanStatus}
                    size="sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Loan Header */}
            <Card className={useOpsSurface ? "bg-white border-slate-200 shadow-sm" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className={useOpsSurface ? "text-2xl font-display font-semibold text-foreground" : "text-2xl"}>{loan.loan_number}</CardTitle>
                    <CardDescription className={useOpsSurface ? "mt-2 text-muted-foreground" : "mt-2"}>
                      {loan.property_address}, {loan.property_city}, {loan.property_state} {loan.property_zip}
                    </CardDescription>
                  </div>
                  <Badge className={statusConfigItem.color}>{statusConfigItem.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className={useOpsSurface ? "p-4 rounded-xl border border-slate-200 bg-white shadow-sm" : "magic-glow-card magic-glow-gold p-4 rounded-xl overflow-visible relative"}>
                    <div className="hover-star-1"></div>
                    <div className="hover-star-2"></div>
                    <div className="hover-star-3"></div>
                    <div className="hover-star-4"></div>
                    <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide relative z-10">Loan Amount</p>
                    <p className="text-2xl font-bold text-foreground relative z-10">{formatCurrency(loan.loan_amount || 0)}</p>
                  </div>
                  <div className={useOpsSurface ? "p-4 rounded-xl border border-slate-200 bg-white shadow-sm" : "magic-glow-card magic-glow-blue p-4 rounded-xl overflow-visible relative"}>
                    <div className="hover-star-1"></div>
                    <div className="hover-star-2"></div>
                    <div className="hover-star-3"></div>
                    <div className="hover-star-4"></div>
                    <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide relative z-10">Property Value</p>
                    <p className="text-xl font-bold text-foreground relative z-10">{formatCurrency(loan.property_value || 0)}</p>
                  </div>
                  <div className={useOpsSurface ? "p-4 rounded-xl border border-slate-200 bg-white shadow-sm" : "magic-glow-card magic-glow-green p-4 rounded-xl overflow-visible relative"}>
                    <div className="hover-star-1"></div>
                    <div className="hover-star-2"></div>
                    <div className="hover-star-3"></div>
                    <div className="hover-star-4"></div>
                    <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide relative z-10">LTV</p>
                    <p className="text-xl font-bold text-foreground relative z-10">{loan.requested_ltv}%</p>
                  </div>
                  <div className={useOpsSurface ? "p-4 rounded-xl border border-slate-200 bg-white shadow-sm" : "magic-glow-card magic-glow-purple p-4 rounded-xl overflow-visible relative"}>
                    <div className="hover-star-1"></div>
                    <div className="hover-star-2"></div>
                    <div className="hover-star-3"></div>
                    <div className="hover-star-4"></div>
                    <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide relative z-10">Transaction Type</p>
                    <p className="text-lg font-semibold text-foreground relative z-10">{loan.transaction_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Cards */}
            {loan.status === "new_request" && !isOpsView && (
              <Card className="border-2 border-slate-400/50 bg-gradient-to-br from-slate-50 to-slate-100/30 shadow-elegant hover:shadow-elegant-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className={useOpsSurface ? "flex items-center gap-2 font-display font-semibold text-foreground" : "flex items-center gap-2 text-slate-700"}>
                    <div className="w-10 h-10 rounded-xl bg-slate-500/20 flex items-center justify-center border border-slate-300/50">
                      <FileText className="w-5 h-5 text-slate-600" />
                    </div>
                    Complete Your Loan Request
                  </CardTitle>
                  <CardDescription className="text-base">
                    Your loan request has been created, but you need to complete the loan details form to submit it for approval.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="default"
                    className="bg-slate-700 hover:bg-slate-800 text-white w-full shadow-md hover:shadow-lg transition-all duration-300"
                    onClick={() => navigate(`/loan-request/${loanId}`)}
                    disabled={isProcessing}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Complete Loan Request Form
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    You'll need to provide property details, loan amount, transaction type, and other required information.
                  </p>
                </CardContent>
              </Card>
            )}

            {loan.status === "quote_requested" && (
              <Card className="border-2 border-yellow-400/50 bg-gradient-to-br from-yellow-50 to-amber-50/30 shadow-elegant hover:shadow-elegant-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className={useOpsSurface ? "flex items-center gap-3 font-display font-semibold text-foreground" : "flex items-center gap-3 text-yellow-700"}>
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center border border-yellow-300/50">
                      <Shield className="w-5 h-5 text-yellow-600" />
                    </div>
                    {isOpsView ? "Quote Request - Action Required" : "Quote Request Pending Approval"}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {isOpsView 
                      ? "This loan request is awaiting your approval to generate a quote. Review the loan details and approve to proceed."
                      : "Your loan request has been submitted and is awaiting admin approval. You will be notified once your quote is approved."
                    }
                  </CardDescription>
                </CardHeader>
                {isOpsView && (
                  <CardContent>
                    <Button 
                      variant="default"
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white w-full shadow-md hover:shadow-lg transition-all duration-300"
                      onClick={async () => {
                        setIsProcessing(true);
                        try {
                          await opsApi.approveQuote(loanId!);
                          toast.success(`Quote approved for ${loan.loan_number}`);
                          await loadLoanData();
                        } catch (error: any) {
                          console.error('Approve quote error:', error);
                          toast.error(error.message || 'Failed to approve quote');
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      disabled={isProcessing}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {isProcessing ? "Approving..." : "Approve Quote & Generate"}
                    </Button>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Appraisal Received - Borrower Guidance */}
            {loan.status === "appraisal_received" && !isOpsView && (
              <Card className="border-2 border-green-400/50 bg-gradient-to-br from-green-50 to-emerald-50/30 shadow-elegant hover:shadow-elegant-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className={useOpsSurface ? "flex items-center gap-3 font-display font-semibold text-foreground" : "flex items-center gap-3 text-green-700"}>
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center border border-green-300/50">
                      <Building2 className="w-5 h-5 text-green-600" />
                    </div>
                    Appraisal Received
                  </CardTitle>
                  <CardDescription className="text-base">
                    Your property appraisal has been completed and received.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Great news! The appraisal for your property has been received and the value has been confirmed. 
                      Our underwriting team is now reviewing the appraisal along with your complete loan file.
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-slate-900 mb-2">What happens next?</p>
                      <ul className="text-sm text-slate-800 space-y-1 list-disc list-inside">
                        <li>Underwriting will review the appraisal and your complete loan file</li>
                        <li>If approved, you'll receive conditional approval</li>
                        <li>You'll be notified via email when your loan moves to the next stage</li>
                      </ul>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Typical review time: 2-3 business days. We'll notify you as soon as there's an update.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Appraisal Received - Operations Guidance */}
            {loan.status === "appraisal_received" && isOpsView && (
              <Card className="border-purple-500/50 bg-purple-500/5">
                <CardHeader>
                  <CardTitle className={useOpsSurface ? "flex items-center gap-2 font-display font-semibold text-foreground" : "flex items-center gap-2 text-purple-600"}>
                    <Building2 className="w-5 h-5" />
                    Appraisal Received - Ready for Conditional Approval
                  </CardTitle>
                  <CardDescription>
                    Appraisal has been received. Review and update status when ready to proceed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      The appraisal has been received for this loan. Review the appraisal and complete loan file, then update the status to proceed:
                    </p>
                    <div className="space-y-2">
                      <Button
                        variant="default"
                        onClick={async () => {
                          try {
                            await opsApi.updateStatus(loanId!, "conditionally_approved", "Appraisal reviewed, loan conditionally approved");
                            toast.success("Status updated to Conditionally Approved");
                            await loadLoanData();
                          } catch (error: any) {
                            toast.error(error.message || "Failed to update status");
                          }
                        }}
                        disabled={isProcessing}
                        className="w-full"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {isProcessing ? "Updating..." : "Approve Conditionally (Next Step)"}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        This will move the loan to "Conditionally Approved" status, allowing you to upload the commitment letter.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Client View - Conditionally Approved - Waiting for Commitment Letter */}
            {loan.status === "conditionally_approved" && !isOpsView && (
              <Card className="border-orange-500/50 bg-orange-500/5 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <CheckCircle2 className="w-5 h-5" />
                    Loan Conditionally Approved!
                  </CardTitle>
                  <CardDescription className="text-base">
                    Congratulations! Your loan has been conditionally approved. The commitment letter is being prepared and will be available soon.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border-2 border-orange-200">
                    <p className="text-sm font-medium text-orange-900 mb-2">What's Next:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Your commitment letter is being prepared by our operations team</li>
                      <li>You'll receive an email notification when it's ready</li>
                      <li>Once available, you can download it from this page</li>
                      <li>Review the commitment letter and any conditional items</li>
                    </ul>
                  </div>
                  {loan.commitment_letter_url ? (
                    <div className="space-y-3">
                      <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                        <p className="text-sm font-medium text-green-900 mb-2">✓ Commitment Letter Ready!</p>
                        <p className="text-sm text-green-700 mb-3">Your commitment letter is now available for download.</p>
                        <a href={`${import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001')}${loan.commitment_letter_url}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white w-full">
                            <Download className="w-4 h-4 mr-2" /> Download Commitment Letter
                          </Button>
                        </a>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={async () => {
                          setIsProcessing(true);
                          try {
                            await loadLoanData();
                            toast.success("Page refreshed");
                          } catch (error: any) {
                            toast.error("Failed to refresh");
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        disabled={isProcessing}
                        className="w-full"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                        Refresh Status
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-orange-200">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-900">Commitment letter in preparation</p>
                        <p className="text-xs text-muted-foreground">We'll notify you when it's ready</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          setIsProcessing(true);
                          try {
                            await loadLoanData();
                            toast.info("Checking for commitment letter...");
                          } catch (error: any) {
                            toast.error("Failed to refresh");
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        disabled={isProcessing}
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                        Check Now
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Commitment Letter Upload for Operations - when conditionally approved */}
            {loan.status === "conditionally_approved" && isOpsView && (
              <Card className="border-orange-500/50 bg-orange-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <FileCheck className="w-5 h-5" />
                    Upload Commitment Letter
                  </CardTitle>
                  <CardDescription>
                    This loan has been conditionally approved. Upload the commitment letter to proceed to the next stage.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loan.commitment_letter_url ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Commitment letter has been uploaded.</p>
                      <a href={`${import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001')}${loan.commitment_letter_url}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" /> View Commitment Letter
                        </Button>
                      </a>
                      <Button 
                        variant="default"
                        className="bg-green-600 hover:bg-green-700 text-white w-full mt-2"
                        onClick={async () => {
                          try {
                            await opsApi.updateStatus(loanId!, "conditional_commitment_issued", "Commitment letter issued to borrower");
                            toast.success("Status updated to Conditional Commitment Issued");
                            await loadLoanData();
                          } catch (error: any) {
                            toast.error(error.message || "Failed to update status");
                          }
                        }}
                        disabled={isProcessing}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Mark as Issued (Next Step)
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="default"
                      className="bg-orange-600 hover:bg-orange-700 text-white w-full"
                      onClick={() => setShowCommitmentUpload(true)}
                      disabled={isProcessing}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Commitment Letter
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Show action card for soft_quote_issued status - allow signing term sheet */}
            {/* More flexible condition: check status OR if quote is generated but not signed */}
            {((loan.status === "soft_quote_issued" || 
               loan.status === "soft_quote" || 
               (loan.soft_quote_generated && !loan.term_sheet_signed)) && 
               !loan.term_sheet_signed && 
               !isOpsView) && (
              <Card className="border-cyan-500/50 bg-cyan-500/5 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-cyan-700">
                    <FileCheck className="w-5 h-5" />
                    Quote Approved - Review & Sign Term Sheet
                  </CardTitle>
                  <CardDescription className="text-base">
                    Your quote has been approved! Review your quote details below and sign the term sheet to proceed to the next step.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {quote && (
                    <div className="p-4 bg-white rounded-lg border-2 border-cyan-200">
                      <div className="grid md:grid-cols-1 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Estimated Monthly Payment</p>
                          <p className="text-xl font-semibold">{formatCurrency(quote.estimatedMonthlyPayment)}</p>
                        </div>
                      </div>
                      {quote.dscr && (
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground">DSCR Ratio</p>
                          <p className="text-lg font-semibold">{quote.dscr.toFixed(2)}x</p>
                        </div>
                      )}
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-2">Total Estimated Closing Costs</p>
                        <p className="text-xl font-bold">{formatCurrency(quote.totalClosingCosts)}</p>
                      </div>
                    </div>
                  )}
                  {!quote && loan.soft_quote_data && (
                    <div className="p-4 bg-white rounded-lg border-2 border-cyan-200">
                      <p className="text-sm text-muted-foreground mb-2">Quote Details</p>
                      <p className="text-lg">Your soft quote has been generated. Please review and sign the term sheet to continue.</p>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {loan.term_sheet_url && (
                      <a href={`${import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001')}${loan.term_sheet_url}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button variant="outline" className="w-full">
                          <Download className="w-4 h-4 mr-2" /> Download Term Sheet PDF
                        </Button>
                      </a>
                    )}
                    <Button 
                      onClick={handleSignTermSheet} 
                      disabled={isProcessing}
                      className="flex-1 text-lg py-6 bg-slate-700 hover:bg-slate-800 text-white"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <FileCheck className="w-5 h-5 mr-2" />
                          Sign Term Sheet to Continue
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    By signing, you agree to proceed with the loan application process
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Show "Proceed to Next Step" card if term sheet is signed but status hasn't updated */}
            {loan.term_sheet_signed && 
             (loan.status === "soft_quote" || loan.status === "soft_quote_issued" || loan.status === "term_sheet_signed") && 
             loan.status !== "needs_list_sent" &&
             !isOpsView && (
              <Card className="border-green-500/50 bg-green-500/5 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-5 h-5" />
                    Term Sheet Signed - Proceed to Next Step
                  </CardTitle>
                  <CardDescription className="text-base">
                    Your term sheet has been signed! Click below to generate your document needs list and proceed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border-2 border-green-200">
                    <p className="text-sm font-medium text-green-900 mb-2">Next Steps:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Document needs list will be generated</li>
                      <li>You'll see a list of required documents to upload</li>
                      <li>Upload all required documents to continue</li>
                    </ul>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant="outline" 
                      onClick={async () => {
                        setIsProcessing(true);
                        try {
                          await loadLoanData();
                          toast.success("Page refreshed. Checking for updates...");
                        } catch (error: any) {
                          toast.error(error.message || "Failed to refresh");
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Status
                    </Button>
                    <Button 
                      onClick={async () => {
                        setIsProcessing(true);
                        try {
                          // Try generating needs list directly first
                          try {
                            await loansApi.generateNeedsList(loanId!);
                            toast.success("Needs list generated!");
                            await loadLoanData();
                          } catch (genError: any) {
                            // If that fails, try signing term sheet again
                            try {
                              await loansApi.signTermSheet(loanId!);
                              toast.success("Processing next step...");
                              await loadLoanData();
                            } catch (signError: any) {
                              if (signError.message?.includes('already') || signError.message?.includes('signed')) {
                                // Term sheet already signed, just generate needs list
                                await loansApi.generateNeedsList(loanId!);
                                await loadLoanData();
                                toast.success("Needs list generated!");
                              } else {
                                throw signError;
                              }
                            }
                          }
                        } catch (error: any) {
                          toast.error(error.message || "Failed to proceed to next step");
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      disabled={isProcessing}
                      className="flex-1 text-lg py-6 bg-slate-700 hover:bg-slate-800 text-white"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <FileCheck className="w-5 h-5 mr-2" />
                          Proceed to Next Step
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Show document upload section if term sheet is signed and status is appropriate */}
            {/* Only show if status is term_sheet_signed or term_sheet_issued, NOT if still in soft_quote stages */}
            {loan.term_sheet_signed && 
             loan.status !== "soft_quote" &&
             loan.status !== "soft_quote_issued" &&
             loan.status !== "quote_requested" &&
             loan.status !== "new_request" &&
             loan.status !== "needs_list_sent" &&  // This has its own section below
             loan.status !== "needs_list_complete" &&
             loan.status !== "submitted_to_underwriting" &&
             loan.status !== "appraisal_ordered" &&
             loan.status !== "appraisal_received" &&
             loan.status !== "conditionally_approved" &&
             loan.status !== "conditional_commitment_issued" &&
             loan.status !== "closing_checklist_issued" &&
             loan.status !== "clear_to_close" &&
             loan.status !== "closing_scheduled" &&
             loan.status !== "funded" && (
              <Card className="border-green-500/50 bg-green-500/5 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-5 h-5" />
                    Term Sheet Signed - Upload Documents
                  </CardTitle>
                  <CardDescription className="text-base">
                    Your term sheet has been signed! Please upload the required documents below to continue with your loan application.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {needsList.length === 0 ? (
                    <div className="p-4 bg-white rounded-lg border space-y-3">
                      <p className="text-muted-foreground">Your needs list is being prepared. You will receive an email shortly with the required documents.</p>
                      <p className="text-sm text-muted-foreground">Please check your email or refresh this page in a few moments.</p>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={async () => {
                            setIsProcessing(true);
                            try {
                              await loadLoanData();
                              toast.success("Page refreshed. If needs list is still empty, the backend may need to be restarted.");
                            } catch (error: any) {
                              toast.error("Failed to refresh");
                            } finally {
                              setIsProcessing(false);
                            }
                          }}
                          disabled={isProcessing}
                          className="flex-1"
                        >
                          {isProcessing ? "Refreshing..." : "Refresh Page"}
                        </Button>
                        {import.meta.env.DEV && (
                          <Button 
                            variant="default"
                            onClick={async () => {
                              setIsProcessing(true);
                              try {
                                // Try to trigger needs list generation by calling sign-term-sheet again
                                // This will check if needs list exists and generate it if not
                                await loansApi.signTermSheet(loanId!);
                                toast.success("Needs list generation triggered. Refreshing...");
                                await loadLoanData();
                              } catch (error: any) {
                                toast.error(error.message || "Failed to generate needs list");
                              } finally {
                                setIsProcessing(false);
                              }
                            }}
                            disabled={isProcessing}
                            className="flex-1 bg-slate-600 hover:bg-slate-700"
                          >
                            {isProcessing ? "Generating..." : "Generate Needs List"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {needsList.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{item.document_type}</p>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                            {item.document_count > 0 && (
                              <p className="text-xs text-green-600 mt-1">
                                {item.document_count} file(s) uploaded
                              </p>
                            )}
                          </div>
                          <label>
                            <input
                              type="file"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file && loanId) {
                                  try {
                                    await documentsApi.upload(loanId, file, item.id);
                                    toast.success("Document uploaded successfully");
                                    await loadLoanData();
                                  } catch (error: any) {
                                    toast.error(error.message || "Upload failed");
                                  }
                                }
                              }}
                            />
                            <Button variant="outline" size="sm" asChild>
                              <span>
                                <Upload className="w-4 h-4 mr-2" /> Upload
                              </span>
                            </Button>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Debug card - Show loan status info in development mode */}
            {import.meta.env.DEV && (
              <Card 
                key={`debug-${loan.status}-${loan.id}`} 
                className={useOpsSurface 
                  ? "relative rounded-2xl border border-slate-200 bg-white shadow-sm" 
                  : "relative loan-progress-card-ghost loan-progress-card-blue"}
                style={useOpsSurface ? { overflow: 'hidden' } : { overflow: 'visible', backgroundColor: 'transparent' }}
              >
                {!useOpsSurface && (
                  <div className="absolute inset-0 pointer-events-none z-0" style={{ overflow: 'visible' }}>
                    <div className="absolute card-bg-circle card-bg-circle-1" style={{ top: '0%', left: '60%' }} />
                    <div className="absolute card-bg-circle card-bg-circle-2" style={{ top: '0%', left: '10%' }} />
                    <div className="absolute card-bg-circle card-bg-circle-3" style={{ top: '0%', left: '75%' }} />
                    <div className="absolute card-bg-circle card-bg-circle-4" style={{ top: '0%', left: '30%' }} />
                    <div className="absolute card-bg-circle card-bg-circle-5" style={{ top: '0%', left: '50%' }} />
                  </div>
                )}
                
                <CardHeader className="relative z-10">
                  <CardTitle className={useOpsSurface ? "text-sm font-display font-semibold flex items-center gap-2 text-foreground" : "text-sm font-bold flex items-center gap-2 relative z-10"}>
                    <Search className="w-5 h-5" />
                    <span>
                      Debug Info (Development Only)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2 font-mono relative z-10 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className={useOpsSurface ? "p-2 rounded-sm border border-slate-200 bg-slate-50" : "bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20 relative z-10"}>
                      <p className={useOpsSurface ? "text-muted-foreground font-semibold mb-1 text-xs" : "text-white/90 font-semibold mb-1 text-xs"}>Status:</p>
                      <p className={useOpsSurface ? "text-foreground font-bold text-sm" : "text-white font-bold text-sm"}>{loan.status}</p>
                    </div>
                    
                    <div className={useOpsSurface ? "p-2 rounded-sm border border-slate-200 bg-slate-50" : "bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20 relative z-10"}>
                      <p className={useOpsSurface ? "text-muted-foreground font-semibold mb-1 text-xs" : "text-white/90 font-semibold mb-1 text-xs"}>Soft Quote Generated:</p>
                      <div className="flex items-center gap-2">
                        {loan.soft_quote_generated ? (
                          <CheckCircle2 className={useOpsSurface ? "w-5 h-5 text-green-600" : "w-5 h-5 text-green-400 magic-icon-green-glow"} />
                        ) : (
                          <XCircle className={useOpsSurface ? "w-5 h-5 text-red-500" : "w-5 h-5 text-red-400 magic-icon-red-glow"} />
                        )}
                        <span className={`${loan.soft_quote_generated ? (useOpsSurface ? 'text-green-700' : 'text-green-400') : (useOpsSurface ? 'text-red-600' : 'text-red-400')} font-bold text-sm`}>
                          {loan.soft_quote_generated ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                    
                    <div className={useOpsSurface ? "p-2 rounded-sm border border-slate-200 bg-slate-50" : "bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20 relative z-10"}>
                      <p className={useOpsSurface ? "text-muted-foreground font-semibold mb-1 text-xs" : "text-white/90 font-semibold mb-1 text-xs"}>Term Sheet Signed:</p>
                      <div className="flex items-center gap-2">
                        {loan.term_sheet_signed ? (
                          <CheckCircle2 className={useOpsSurface ? "w-5 h-5 text-green-600" : "w-5 h-5 text-green-400 magic-icon-green-glow"} />
                        ) : (
                          <XCircle className={useOpsSurface ? "w-5 h-5 text-red-500" : "w-5 h-5 text-red-400 magic-icon-red-glow"} />
                        )}
                        <span className={`${loan.term_sheet_signed ? (useOpsSurface ? 'text-green-700' : 'text-green-400') : (useOpsSurface ? 'text-red-600' : 'text-red-400')} font-bold text-sm`}>
                          {loan.term_sheet_signed ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                    
                    <div className={useOpsSurface ? "p-2 rounded-sm border border-slate-200 bg-slate-50" : "bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20 relative z-10"}>
                      <p className={useOpsSurface ? "text-muted-foreground font-semibold mb-1 text-xs" : "text-white/90 font-semibold mb-1 text-xs"}>Has Quote Data:</p>
                      <div className="flex items-center gap-2">
                        {loan.soft_quote_data ? (
                          <CheckCircle2 className={useOpsSurface ? "w-5 h-5 text-green-600" : "w-5 h-5 text-green-400 magic-icon-green-glow"} />
                        ) : (
                          <XCircle className={useOpsSurface ? "w-5 h-5 text-red-500" : "w-5 h-5 text-red-400 magic-icon-red-glow"} />
                        )}
                        <span className={`${loan.soft_quote_data ? (useOpsSurface ? 'text-green-700' : 'text-green-400') : (useOpsSurface ? 'text-red-600' : 'text-red-400')} font-bold text-sm`}>
                          {loan.soft_quote_data ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                    
                    <div className={useOpsSurface ? "p-2 rounded-sm border border-slate-200 bg-slate-50" : "bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20 relative z-10"}>
                      <p className={useOpsSurface ? "text-muted-foreground font-semibold mb-1 text-xs" : "text-white/90 font-semibold mb-1 text-xs"}>Term Sheet URL:</p>
                      <div className="flex items-center gap-2">
                        {loan.term_sheet_url ? (
                          <CheckCircle2 className={useOpsSurface ? "w-5 h-5 text-green-600" : "w-5 h-5 text-green-400 magic-icon-green-glow"} />
                        ) : (
                          <XCircle className={useOpsSurface ? "w-5 h-5 text-red-500" : "w-5 h-5 text-red-400 magic-icon-red-glow"} />
                        )}
                        <span className={`${loan.term_sheet_url ? (useOpsSurface ? 'text-green-700' : 'text-green-400') : (useOpsSurface ? 'text-red-600' : 'text-red-400')} font-bold text-sm`}>
                          {loan.term_sheet_url ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                    
                    <div className={useOpsSurface ? "p-2 rounded-sm border border-slate-200 bg-slate-50" : "bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20 relative z-10"}>
                      <p className={useOpsSurface ? "text-muted-foreground font-semibold mb-1 text-xs" : "text-white/90 font-semibold mb-1 text-xs"}>Current Step:</p>
                      <p className={useOpsSurface ? "text-foreground font-bold text-sm" : "text-white font-bold text-sm"}>{loan.current_step || 'N/A'}</p>
                    </div>
                    
                    {loan.status === "funded" && (
                      <>
                        <div className={useOpsSurface ? "p-2 rounded-sm border border-slate-200 bg-slate-50" : "bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20 relative z-10"}>
                          <p className={useOpsSurface ? "text-muted-foreground font-semibold mb-1 text-xs" : "text-white/90 font-semibold mb-1 text-xs"}>Funded Date:</p>
                          <p className={useOpsSurface ? "text-foreground font-bold text-sm" : "text-white font-bold text-sm"}>
                            {loan.funded_date ? new Date(loan.funded_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No'}
                          </p>
                        </div>
                        <div className={useOpsSurface ? "p-2 rounded-sm border border-slate-200 bg-slate-50" : "bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20 relative z-10"}>
                          <p className={useOpsSurface ? "text-muted-foreground font-semibold mb-1 text-xs" : "text-white/90 font-semibold mb-1 text-xs"}>Funded Amount:</p>
                          <p className={useOpsSurface ? "text-foreground font-bold text-sm" : "text-white font-bold text-sm"}>{loan.funded_amount ? formatCurrency(loan.funded_amount) : 'No'}</p>
                        </div>
                      </>
                    )}
                    
                    <div className={useOpsSurface ? "p-2 rounded-sm border border-slate-200 bg-slate-50" : "bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20 relative z-10"}>
                      <p className={useOpsSurface ? "text-muted-foreground font-semibold mb-1 text-xs" : "text-white/90 font-semibold mb-1 text-xs"}>Is Ops View:</p>
                      <div className="flex items-center gap-2">
                        {isOpsView ? (
                          <CheckCircle2 className={useOpsSurface ? "w-5 h-5 text-green-600" : "w-5 h-5 text-green-400 magic-icon-green-glow"} />
                        ) : (
                          <XCircle className={useOpsSurface ? "w-5 h-5 text-red-500" : "w-5 h-5 text-red-400 magic-icon-red-glow"} />
                        )}
                        <span className={`${isOpsView ? 'text-green-700' : 'text-red-400'} font-bold text-sm`}>
                          {isOpsView ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                    
                    <div className={useOpsSurface ? "p-2 rounded-sm border border-slate-200 bg-slate-50" : "bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20 relative z-10"}>
                      <p className={useOpsSurface ? "text-muted-foreground font-semibold mb-1 text-xs" : "text-white/90 font-semibold mb-1 text-xs"}>Should Show Sign Card:</p>
                      <div className="flex items-center gap-2">
                        {(loan.status === "funded" || loan.status?.toLowerCase() === "funded") ? (
                          <XCircle className={useOpsSurface ? "w-5 h-5 text-red-500" : "w-5 h-5 text-red-400 magic-icon-red-glow"} />
                        ) : ((loan.status === "soft_quote_issued" || 
                              loan.status === "soft_quote" || 
                              (loan.soft_quote_generated && !loan.term_sheet_signed)) && 
                              !loan.term_sheet_signed && 
                              !isOpsView) ? (
                          <CheckCircle2 className={useOpsSurface ? "w-5 h-5 text-green-600" : "w-5 h-5 text-green-400 magic-icon-green-glow"} />
                        ) : (
                          <XCircle className={useOpsSurface ? "w-5 h-5 text-red-500" : "w-5 h-5 text-red-400 magic-icon-red-glow"} />
                        )}
                        <span className={`${
                          (loan.status === "funded" || loan.status?.toLowerCase() === "funded")
                            ? (useOpsSurface ? 'text-red-600' : 'text-red-400')
                            : ((loan.status === "soft_quote_issued" || 
                                loan.status === "soft_quote" || 
                                (loan.soft_quote_generated && !loan.term_sheet_signed)) && 
                                !loan.term_sheet_signed && 
                                !isOpsView) 
                              ? (useOpsSurface ? 'text-green-700' : 'text-green-400')
                              : (useOpsSurface ? 'text-red-600' : 'text-red-400')
                        } font-bold text-sm`}>
                          {
                            (loan.status === "funded" || loan.status?.toLowerCase() === "funded")
                              ? 'NO (Loan Complete)' 
                              : ((loan.status === "soft_quote_issued" || 
                                  loan.status === "soft_quote" || 
                                  (loan.soft_quote_generated && !loan.term_sheet_signed)) && 
                                  !loan.term_sheet_signed && 
                                  !isOpsView) 
                                ? 'YES' 
                                : 'NO'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Document Upload Section - Always show for needs_list_sent, or term_sheet_signed if not handled above */}
            {loan && (loan.status === "needs_list_sent" || (loan.status === "term_sheet_signed" && loan.term_sheet_signed)) && (
              <Card className="border-2 border-blue-300 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        {isOpsView ? "Document Needs List" : "Document Upload"}
                      </CardTitle>
                      <CardDescription className="text-base">
                        {isOpsView ? "Review required documents for this loan" : "Upload required documents for your loan"}
                      </CardDescription>
                    </div>
                    {isOpsView && needsList && needsList.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!confirm('This will remove duplicate needs list items. Continue?')) return;
                          setIsProcessing(true);
                          try {
                            const result = await opsApi.cleanupNeedsList(loanId!);
                            toast.success(result.message || `Removed ${result.removed} duplicate item(s)`);
                            await loadLoanData();
                          } catch (error: any) {
                            toast.error(error.message || 'Failed to cleanup duplicates');
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        disabled={isProcessing}
                        className="text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Clean Duplicates
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {(!needsList || needsList.length === 0) ? (
                    <div className="space-y-4">
                      <div className="p-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                        <div className="flex items-start gap-3 mb-4">
                          <AlertCircle className="w-5 h-5 text-yellow-700 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-base font-semibold text-yellow-900 mb-2">
                              No documents requested yet
                            </p>
                            <p className="text-sm text-yellow-800 mb-1">
                              The document needs list should be generated automatically, but it appears it hasn't been created yet.
                            </p>
                            <p className="text-sm text-yellow-700 mb-4">
                              Click the button below to generate your document requirements list now.
                            </p>
                            <div className="bg-white p-3 rounded border border-yellow-200 mb-4">
                              <p className="text-xs font-medium text-yellow-900 mb-1">After generating the needs list:</p>
                              <ol className="text-xs text-yellow-800 space-y-1 list-decimal list-inside">
                                <li>You'll see a list of required documents to upload</li>
                                <li>Upload all documents marked as "Required"</li>
                                <li>Click "Submit Documents for Review" to proceed to the next step</li>
                              </ol>
                            </div>
                            <Button
                              onClick={async () => {
                                setIsProcessing(true);
                                try {
                                  const result = await loansApi.generateNeedsList(loanId!);
                                  console.log('Generate needs list result:', result);
                                  toast.success("Document needs list generated successfully!");
                                  
                                  // Wait a moment for database to update
                                  await new Promise(resolve => setTimeout(resolve, 1000));
                                  
                                  // Force reload needs list immediately - try multiple times
                                  let retries = 5;
                                  let updatedNeedsRes = { needsList: [] };
                                  while (retries > 0) {
                                    try {
                                      updatedNeedsRes = await documentsApi.getNeedsList(loanId!);
                                      console.log(`Needs list reload attempt ${6 - retries}:`, updatedNeedsRes.needsList?.length || 0, 'items');
                                      if (updatedNeedsRes.needsList && updatedNeedsRes.needsList.length > 0) {
                                        console.log('Needs list loaded successfully:', updatedNeedsRes.needsList.length, 'items');
                                        break;
                                      }
                                      await new Promise(resolve => setTimeout(resolve, 1000));
                                      retries--;
                                    } catch (err) {
                                      console.error('Error loading needs list, retrying...', err);
                                      retries--;
                                      if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1000));
                                    }
                                  }
                                  
                                  console.log('Final needs list:', updatedNeedsRes.needsList?.length || 0, 'items');
                                  setNeedsList(updatedNeedsRes.needsList || []);
                                  
                                  // Also reload full loan data to get updated status
                                  await loadLoanData();
                                  
                                  // Double-check needs list after full reload
                                  if ((!updatedNeedsRes.needsList || updatedNeedsRes.needsList.length === 0)) {
                                    const finalCheck = await documentsApi.getNeedsList(loanId!);
                                    console.log('Final check after loadLoanData:', finalCheck.needsList?.length || 0, 'items');
                                    if (finalCheck.needsList && finalCheck.needsList.length > 0) {
                                      setNeedsList(finalCheck.needsList);
                                    }
                                  }
                                } catch (error: any) {
                                  console.error('Error generating needs list:', error);
                                  toast.error(error.message || "Failed to generate needs list");
                                } finally {
                                  setIsProcessing(false);
                                }
                              }}
                              disabled={isProcessing}
                              className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 text-white border-0 text-base py-6 px-8 shadow-lg"
                            >
                              {isProcessing ? (
                                <>
                                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                                  Generating Needs List...
                                </>
                              ) : (
                                <>
                                  <FileText className="w-5 h-5 mr-2" />
                                  Generate Needs List to Continue
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        {(() => {
                          // Deduplicate needs list items by document_type and folder_name
                          // Keep the most recent one (with highest document_count or most recent created_at)
                          const seen = new Map<string, typeof needsList[0]>();
                          const deduplicated = needsList.filter(item => {
                            const key = `${item.document_type}_${item.folder_name || ''}`;
                            if (!seen.has(key)) {
                              seen.set(key, item);
                              return true;
                            }
                            // If duplicate, keep the one with more documents or more recent
                            const existing = seen.get(key)!;
                            if ((item.document_count || 0) > (existing.document_count || 0)) {
                              seen.set(key, item);
                              return true;
                            }
                            if (item.document_count === existing.document_count) {
                              const itemDate = new Date(item.created_at || 0).getTime();
                              const existingDate = new Date(existing.created_at || 0).getTime();
                              if (itemDate > existingDate) {
                                seen.set(key, item);
                                return true;
                              }
                            }
                            return false;
                          }).map(item => seen.get(`${item.document_type}_${item.folder_name || ''}`)!);

                          return deduplicated.map((item) => {
                            const isUploaded = (item.document_count || 0) > 0;
                            const status = item.status || 'pending';
                            
                            return (
                              <div 
                                key={item.id} 
                                className={`flex items-center justify-between p-4 border-2 rounded-lg transition-all ${
                                  isUploaded 
                                    ? 'border-green-200 bg-green-50' 
                                    : status === 'reviewed'
                                    ? 'border-slate-200 bg-slate-50'
                                    : status === 'rejected'
                                    ? 'border-red-200 bg-red-50'
                                    : 'border-gray-200 bg-white'
                                }`}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-base">{item.document_type}</p>
                                    {item.required && (
                                      <Badge variant="outline" className="text-xs bg-amber-50 border-amber-300 text-amber-700">
                                        Required
                                      </Badge>
                                    )}
                                    {isUploaded && (
                                      <Badge variant="outline" className="text-xs bg-green-50 border-green-300 text-green-700">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Uploaded
                                      </Badge>
                                    )}
                                    {status === 'reviewed' && (
                                      <Badge variant="outline" className="text-xs bg-slate-50 border-slate-300 text-slate-700">
                                        Reviewed
                                      </Badge>
                                    )}
                                    {status === 'rejected' && (
                                      <Badge variant="outline" className="text-xs bg-red-50 border-red-300 text-red-700">
                                        Rejected
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                                  {isUploaded && (
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs text-green-700 font-medium">
                                        ✓ {item.document_count} file(s) uploaded
                                      </p>
                                      {item.last_upload && (
                                        <p className="text-xs text-muted-foreground">
                                          • {new Date(item.last_upload).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <label className="ml-4">
                                  <input
                                    type="file"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file && loanId) {
                                        try {
                                          await documentsApi.upload(loanId, file, item.id);
                                          toast.success("Document uploaded successfully");
                                          await loadLoanData();
                                        } catch (error: any) {
                                          toast.error(error.message || "Upload failed");
                                        }
                                      }
                                    }}
                                  />
                                  <Button 
                                    variant={isUploaded ? "outline" : "default"} 
                                    size="sm" 
                                    asChild
                                    className={isUploaded ? "border-green-300 text-green-700 hover:bg-green-100" : ""}
                                  >
                                    <span>
                                      <Upload className="w-4 h-4 mr-2" /> 
                                      {isUploaded ? 'Re-upload' : 'Upload'}
                                    </span>
                                  </Button>
                                </label>
                              </div>
                            );
                          });
                        })()}
                      </div>
                      
                      {/* Submit Documents Button - Always show when needs list exists */}
                      {!isOpsView && needsList && needsList.length > 0 && (() => {
                        // Filter required items - check both required and is_required fields
                        // Only treat as required if explicitly set to true, not if undefined
                        const requiredItems = needsList.filter(item => {
                          return item.required === true || 
                                 item.required === 'true' || 
                                 item.is_required === true ||
                                 item.is_required === 'true';
                        });
                        
                        // Check if all required items have documents uploaded
                        const allRequiredUploaded = requiredItems.length === 0 || 
                          requiredItems.every(item => {
                            const docCount = typeof item.document_count === 'number' 
                              ? item.document_count 
                              : parseInt(String(item.document_count || '0'), 10);
                            return docCount > 0;
                          });
                        
                        const uploadedCount = needsList.filter(item => {
                          const docCount = typeof item.document_count === 'number' 
                            ? item.document_count 
                            : parseInt(String(item.document_count || '0'), 10);
                          return docCount > 0;
                        }).length;
                        
                        const totalCount = needsList.length;
                        const missingRequired = requiredItems.filter(item => {
                          const docCount = typeof item.document_count === 'number' 
                            ? item.document_count 
                            : parseInt(String(item.document_count || '0'), 10);
                          return docCount === 0;
                        });
                        
                        return (
                          <div className="pt-4 border-t mt-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="text-sm font-medium">
                                  Progress: {uploadedCount} of {totalCount} document types uploaded
                                </p>
                                {requiredItems.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Required: {requiredItems.length - missingRequired.length} of {requiredItems.length} uploaded
                                  </p>
                                )}
                                {allRequiredUploaded && (
                                  <p className="text-sm text-green-600 mt-1 font-semibold">
                                    ✓ All required documents uploaded. Ready to submit!
                                  </p>
                                )}
                              </div>
                            </div>
                            {missingRequired.length > 0 && (
                              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-xs font-medium text-amber-900 mb-1">Missing required documents:</p>
                                <ul className="text-xs text-amber-800 list-disc list-inside">
                                  {missingRequired.map(item => (
                                    <li key={item.id}>{item.document_type}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <Button
                              className={`w-full text-white ${
                                allRequiredUploaded 
                                  ? 'bg-slate-700 hover:bg-slate-800' 
                                  : 'bg-slate-400 cursor-not-allowed'
                              }`}
                              disabled={!allRequiredUploaded || isProcessing}
                              onClick={async () => {
                                if (!allRequiredUploaded) {
                                  const missing = missingRequired.map(item => item.document_type).join(', ');
                                  toast.error(`Please upload all required documents: ${missing}`);
                                  return;
                                }
                                
                                setIsProcessing(true);
                                try {
                                  await loansApi.completeNeedsList(loanId!);
                                  toast.success("Documents submitted successfully! Your loan application will be reviewed by our team.");
                                  await loadLoanData();
                                } catch (error: any) {
                                  if (error.missingItems && Array.isArray(error.missingItems)) {
                                    toast.error(`Please upload: ${error.missingItems.join(', ')}`);
                                  } else {
                                    toast.error(error.message || "Failed to submit documents");
                                  }
                                } finally {
                                  setIsProcessing(false);
                                }
                              }}
                            >
                              {isProcessing ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <FileCheck className="w-4 h-4 mr-2" />
                                  Submit Documents for Review
                                </>
                              )}
                            </Button>
                            {!allRequiredUploaded && requiredItems.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-2 text-center">
                                Upload all required documents (marked with "Required" badge) to proceed
                              </p>
                            )}
                            {requiredItems.length === 0 && (
                              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs text-blue-900 font-medium mb-1">No required documents specified</p>
                                <p className="text-xs text-blue-800">
                                  You can submit your documents now. The button above will proceed to the next step.
                                </p>
                              </div>
                            )}
                            {/* Always show status summary */}
                            <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded text-xs">
                              <p className="font-medium text-slate-700 mb-1">Submission Status:</p>
                              <ul className="text-slate-600 space-y-0.5">
                                <li>• Total document types: {totalCount}</li>
                                <li>• Required documents: {requiredItems.length}</li>
                                <li>• Documents uploaded: {uploadedCount}</li>
                                <li>• Missing required: {missingRequired.length}</li>
                                <li className={`font-semibold ${allRequiredUploaded ? 'text-green-600' : 'text-amber-600'}`}>
                                  • Ready to submit: {allRequiredUploaded ? 'Yes ✓' : 'No - Upload required documents'}
                                </li>
                              </ul>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ALWAYS VISIBLE Submit Button - For borrowers when status is needs_list_sent */}
            {loan && !isOpsView && (loan.status === "needs_list_sent" || loan.status === "term_sheet_signed") && (
              <Card className="border-2 border-blue-500 bg-blue-50 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-blue-900 flex items-center gap-2">
                    <FileCheck className="w-6 h-6" />
                    Submit Documents for Review
                  </CardTitle>
                  <CardDescription className="text-base">
                    {needsList && needsList.length > 0 
                      ? `You have ${needsList.length} document type(s) in your needs list. Upload all required documents, then click below to proceed to the next step.`
                      : "Generate the needs list above, upload your documents, then click below to proceed."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {needsList && needsList.length > 0 && (
                    <div className="p-4 bg-white rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-900 mb-2">Document Status:</p>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Total document types: {needsList.length}</li>
                        <li>• Documents uploaded: {needsList.filter(item => (item.document_count || 0) > 0).length}</li>
                        <li>• Required documents: {needsList.filter(item => item.required || item.is_required).length}</li>
                      </ul>
                    </div>
                  )}
                  
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-6 shadow-lg"
                    disabled={isProcessing}
                    onClick={async () => {
                      setIsProcessing(true);
                      try {
                        // First, try to reload needs list to get latest status
                        try {
                          const needsRes = await documentsApi.getNeedsList(loanId!);
                          setNeedsList(needsRes.needsList || []);
                        } catch (err) {
                          console.error('Error reloading needs list:', err);
                        }
                        
                        // Submit the needs list completion
                        await loansApi.completeNeedsList(loanId!);
                        toast.success("Documents submitted successfully! Your loan application will be reviewed by our team.");
                        
                        // Reload all data
                        await loadLoanData();
                      } catch (error: any) {
                        console.error('Error completing needs list:', error);
                        if (error.missingItems && Array.isArray(error.missingItems)) {
                          toast.error(`Please upload all required documents: ${error.missingItems.join(', ')}`);
                        } else {
                          toast.error(error.message || "Failed to submit documents. Please make sure all required documents are uploaded.");
                        }
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2 inline-block"></div>
                        Submitting Documents...
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-5 h-5 mr-2" />
                        Submit Documents for Review
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-blue-700 text-center">
                    This will mark your documents as complete and move your application to the next stage.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Fallback: Show action button if term sheet is signed but we're in an unexpected state */}
            {loan && loan.term_sheet_signed && 
             loan.status !== "needs_list_sent" && 
             loan.status !== "needs_list_complete" &&
             loan.status !== "submitted_to_underwriting" &&
             loan.status !== "appraisal_ordered" &&
             loan.status !== "appraisal_received" &&
             loan.status !== "conditionally_approved" &&
             loan.status !== "conditional_commitment_issued" &&
             loan.status !== "closing_checklist_issued" &&
             loan.status !== "clear_to_close" &&
             loan.status !== "closing_scheduled" &&
             loan.status !== "funded" &&
             loan.status !== "soft_quote" &&
             loan.status !== "soft_quote_issued" &&
             !isOpsView && (
              <Card className="border-orange-300 bg-orange-50 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-orange-900">
                    Ready for Next Step
                  </CardTitle>
                  <CardDescription>
                    Your term sheet is signed. Click below to proceed to document upload.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={async () => {
                      setIsProcessing(true);
                      try {
                        // Try to generate needs list or update status
                        try {
                          await loansApi.generateNeedsList(loanId!);
                          toast.success("Needs list generated!");
                        } catch (e1: any) {
                          // If that fails, try signing term sheet again
                          try {
                            await loansApi.signTermSheet(loanId!);
                            toast.success("Status updated!");
                          } catch (e2: any) {
                            toast.error("Please contact support if this issue persists");
                            console.error("Error generating needs list:", e1);
                            console.error("Error signing term sheet:", e2);
                          }
                        }
                        await loadLoanData();
                      } catch (error: any) {
                        toast.error(error.message || "Failed to proceed");
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing}
                    className="w-full bg-slate-700 hover:bg-slate-800 text-white py-6"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-5 h-5 mr-2" />
                        Proceed to Document Upload
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Underwriting Status - Borrower Guidance */}
            {loan.status === "submitted_to_underwriting" && !isOpsView && (
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-700">
                    <Shield className="w-5 h-5" />
                    Underwriting Review in Progress
                  </CardTitle>
                  <CardDescription>
                    Your loan application is currently being reviewed by our underwriting team.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Your loan file is now in underwriting review. Our team is carefully reviewing all your documents and application. 
                      You don't need to take any action at this time.
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-slate-900 mb-2">What happens next?</p>
                      <ul className="text-sm text-slate-800 space-y-1 list-disc list-inside">
                        <li>Our underwriting team will review your complete application</li>
                        <li>If approved, an appraisal will be ordered (you'll need to pay the appraisal fee)</li>
                        <li>You'll be notified via email when your loan moves to the next stage</li>
                      </ul>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Typical review time: 3-5 business days. We'll notify you as soon as there's an update.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Underwriting Status - Operations Guidance */}
            {loan.status === "submitted_to_underwriting" && isOpsView && (
              <Card className="border-purple-500/50 bg-purple-500/5">
                <CardHeader>
                  <CardTitle className={useOpsSurface ? "flex items-center gap-2 font-display font-semibold text-foreground" : "flex items-center gap-2 text-purple-600"}>
                    <Shield className="w-5 h-5" />
                    Underwriting Review
                  </CardTitle>
                  <CardDescription>
                    Loan is in underwriting review. Update status when ready to proceed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      This loan is currently in underwriting review. Once the review is complete, update the status to proceed:
                    </p>
                    <div className="space-y-2">
                      <Button
                        variant="default"
                        onClick={async () => {
                          try {
                            await opsApi.updateStatus(loanId!, "appraisal_ordered", "Underwriting review complete, ordering appraisal");
                            toast.success("Status updated to Appraisal Ordered");
                            await loadLoanData();
                          } catch (error: any) {
                            toast.error(error.message || "Failed to update status");
                          }
                        }}
                        disabled={isProcessing}
                        className="w-full"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {isProcessing ? "Updating..." : "Order Appraisal (Next Step)"}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        This will move the loan to "Appraisal Ordered" status, and the borrower will be prompted to pay the appraisal fee.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {loan.status === "appraisal_ordered" && !loan.appraisal_paid && !isOpsView && (
              <Card className="border-orange-500/50 bg-orange-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-orange-600" />
                    Appraisal Payment Required
                  </CardTitle>
                  <CardDescription>
                    Payment is non-refundable. Required to proceed with appraisal.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">Appraisal Fee</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(loan.property_type === 'commercial' ? 750 : 500)}
                    </p>
                  </div>
                  <Button onClick={() => setShowAppraisalPayment(true)} className="bg-slate-700 hover:bg-slate-800 text-white">
                    Pay Appraisal Fee
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Appraisal Ordered - Payment Pending - Operations View */}
            {loan.status === "appraisal_ordered" && !loan.appraisal_paid && isOpsView && (
              <Card className="border-orange-500/50 bg-orange-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <Clock className="w-5 h-5" />
                    Waiting for Appraisal Payment
                  </CardTitle>
                  <CardDescription>
                    The borrower has been notified and needs to pay the appraisal fee.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">Appraisal Fee</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(loan.property_type === 'commercial' ? 750 : 500)}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      The borrower must pay the appraisal fee before the appraisal can be ordered. 
                      Once payment is received, you'll be able to mark the appraisal as received when it arrives.
                    </p>
                    <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                      <p><strong>Status:</strong> Waiting for borrower payment</p>
                      <p className="mt-1"><strong>Next Step:</strong> Borrower pays → Appraisal ordered → Mark as received</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Appraisal Ordered - Payment Complete - Borrower Waiting */}
            {loan.status === "appraisal_ordered" && loan.appraisal_paid && !isOpsView && (
              <Card className="border-slate-500/50 bg-slate-500/5">
                <CardHeader>
                  <CardTitle className={useOpsSurface ? "flex items-center gap-2 font-display font-semibold text-foreground" : "flex items-center gap-2 text-slate-600"}>
                    <Building2 className="w-5 h-5" />
                    Appraisal Payment Received
                  </CardTitle>
                  <CardDescription>
                    Your appraisal payment has been received. The appraisal is now in progress.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Thank you for your payment. The appraisal for your property is now being conducted. 
                      You will be notified once the appraisal is complete and received by our team.
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      Typical appraisal time: 5-10 business days. We'll notify you as soon as the appraisal is received.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Appraisal Ordered - Payment Complete - Operations: Mark as Received */}
            {loan.status === "appraisal_ordered" && loan.appraisal_paid && isOpsView && (
              <Card className="border-purple-500/50 bg-purple-500/5">
                <CardHeader>
                  <CardTitle className={useOpsSurface ? "flex items-center gap-2 font-display font-semibold text-foreground" : "flex items-center gap-2 text-purple-600"}>
                    <Building2 className="w-5 h-5" />
                    Appraisal Payment Received - Mark as Received
                  </CardTitle>
                  <CardDescription>
                    Appraisal payment has been received. Update status when the appraisal is received.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      The borrower has paid the appraisal fee. Once the appraisal report is received, update the status to <strong>"Appraisal Received"</strong> to proceed to the next stage.
                    </p>
                    <div className="space-y-2">
                      <Button
                        variant="default"
                        onClick={async () => {
                          try {
                            setIsProcessing(true);
                            await opsApi.updateStatus(loanId!, "appraisal_received", "Appraisal report received and reviewed");
                            toast.success("Status updated to Appraisal Received");
                            await loadLoanData();
                          } catch (error: any) {
                            toast.error(error.message || "Failed to update status");
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        disabled={isProcessing}
                        className="w-full"
                      >
                        <Building2 className="w-4 h-4 mr-2" />
                        {isProcessing ? "Updating..." : "Mark Appraisal as Received (Next Step)"}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        This will move the loan to "Appraisal Received" status, and the borrower will be notified.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Full Application Form */}
            {loan.status === "needs_list_complete" && !loan.full_application_completed && !isOpsView && (
              <FullApplicationForm 
                loanId={loanId!} 
                loan={loan} 
                onComplete={loadLoanData}
              />
            )}

            {/* Next Step Guidance - After Full Application Completed */}
            {loan.status === "needs_list_complete" && loan.full_application_completed && !isOpsView && (
              <Card className="border-slate-500/50 bg-slate-500/5">
                <CardHeader>
                  <CardTitle className={useOpsSurface ? "flex items-center gap-2 font-display font-semibold text-foreground" : "flex items-center gap-2 text-slate-600"}>
                    <Shield className="w-5 h-5" />
                    Application Submitted
                  </CardTitle>
                  <CardDescription>
                    Your full loan application has been submitted and is ready for review.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Your loan application is now complete. The operations team will review your documents and application, then submit it to underwriting. You will be notified when your loan moves to the next stage.
                    </p>
                    {loan.full_application_pdf_url && (
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          // Use relative URL in production (same domain)
                          const baseUrl = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '');
                          window.open(`${baseUrl}${loan.full_application_pdf_url}`, '_blank');
                        }}
                        className="w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Application PDF
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Operations: Next Step - Submit to Underwriting */}
            {loan.status === "needs_list_complete" && loan.full_application_completed && isOpsView && (
              <Card className="border-purple-500/50 bg-purple-500/5">
                <CardHeader>
                  <CardTitle className={useOpsSurface ? "flex items-center gap-2 font-display font-semibold text-foreground" : "flex items-center gap-2 text-purple-600"}>
                    <Shield className="w-5 h-5" />
                    Ready for Underwriting
                  </CardTitle>
                  <CardDescription>
                    All documents and the full application have been submitted. Update status to proceed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      The borrower has completed all required documents and the full application. Review the documents, then update the loan status to <strong>"Submitted to Underwriting"</strong> to proceed.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        onClick={async () => {
                          try {
                            await opsApi.updateStatus(loanId!, "submitted_to_underwriting", "Documents and application reviewed, submitting to underwriting");
                            toast.success("Status updated to Submitted to Underwriting");
                            await loadLoanData();
                          } catch (error: any) {
                            toast.error(error.message || "Failed to update status");
                          }
                        }}
                        disabled={isProcessing}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        {isProcessing ? "Updating..." : "Submit to Underwriting"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Client View - Commitment Letter Issued - Next Steps */}
            {!isOpsView && loan.status === "conditional_commitment_issued" && (
              <Card className="border-slate-500/50 bg-slate-500/5 shadow-lg">
                <CardHeader>
                  <CardTitle className={useOpsSurface ? "flex items-center gap-2 font-display font-semibold text-foreground" : "flex items-center gap-2 text-slate-700"}>
                    <FileCheck className="w-5 h-5" />
                    Commitment Letter Issued!
                  </CardTitle>
                  <CardDescription className="text-base">
                    Your commitment letter has been issued. Review it and prepare for the next steps in the closing process.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loan.commitment_letter_url && (
                    <div className="p-4 bg-white rounded-lg border-2 border-slate-200">
                      <p className="text-sm font-medium text-slate-900 mb-3">📄 Your Commitment Letter</p>
                      <a href={`${import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001')}${loan.commitment_letter_url}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="default" className="bg-slate-600 hover:bg-slate-700 text-white w-full">
                          <Download className="w-4 h-4 mr-2" /> Download Commitment Letter
                        </Button>
                      </a>
                    </div>
                  )}
                  
                  <div className="p-4 bg-white rounded-lg border-2 border-slate-200">
                    <p className="text-sm font-medium text-slate-900 mb-2">What's Next:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Review your commitment letter carefully</li>
                      <li>Complete any conditional items mentioned in the letter</li>
                      <li>Closing checklist will be provided by our operations team</li>
                      <li>You'll be notified when the closing checklist is ready</li>
                      <li>Once all items are complete, you'll be "Clear to Close"</li>
                    </ul>
                  </div>

                  {closingChecklist.length === 0 ? (
                    <div className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-slate-200">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-600"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">Closing checklist in preparation</p>
                        <p className="text-xs text-muted-foreground">We'll notify you when it's ready</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          setIsProcessing(true);
                          try {
                            await loadLoanData();
                            toast.info("Checking for closing checklist...");
                          } catch (error: any) {
                            toast.error("Failed to refresh");
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        disabled={isProcessing}
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                        Check Now
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-900 mb-2">✓ Closing Checklist Available</p>
                      <p className="text-sm text-green-700">Your closing checklist is ready. Please review and complete all required items.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Closing Checklist - Operations: Create Checklist */}
            {isOpsView && loan.status === "conditional_commitment_issued" && (
              <Card className="border-2 border-purple-400/50 bg-gradient-to-br from-purple-50 to-violet-50/30 shadow-elegant-lg hover:shadow-elegant-lg transition-all duration-300" data-checklist-section>
                <CardHeader>
                  <CardTitle className={useOpsSurface ? "flex items-center gap-3 font-display font-semibold text-foreground" : "flex items-center gap-3 text-purple-700"}>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-400/10 flex items-center justify-center border-2 border-purple-300/50 shadow-md">
                      <ClipboardCheck className="w-6 h-6 text-purple-600" />
                    </div>
                    Next Step: Create Closing Checklist
                  </CardTitle>
                  <CardDescription className="text-base">
                    Create closing checklist items for this loan. The status will automatically update to "Closing Checklist Issued" when you add the first item.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {closingChecklist.length === 0 && (
                    <>
                      <div className="p-5 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-purple-200/50 shadow-sm">
                        <p className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Current Status:
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside ml-2">
                          <li>Commitment letter has been issued</li>
                          <li>Borrower has been notified</li>
                          <li>Ready to create closing checklist</li>
                        </ul>
                      </div>
                      <div className="p-5 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-purple-200/50 shadow-sm">
                        <p className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                          <ArrowRight className="w-4 h-4" />
                          What Happens Next:
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside ml-2">
                          <li>Add closing checklist items below</li>
                          <li>Status will automatically update to "Closing Checklist Issued"</li>
                          <li>Borrower will be notified to complete the checklist</li>
                          <li>Once all items are complete, update to "Clear to Close"</li>
                        </ul>
                      </div>
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800 font-medium mb-2">
                          ⚠️ Status Update Notice
                        </p>
                        <p className="text-xs text-amber-700">
                          After adding your first checklist item, the loan status will automatically update to "Closing Checklist Issued".
                        </p>
                      </div>
                    </>
                  )}
                  
                  {closingChecklist.length > 0 && (
                    <div className="space-y-3">
                      {closingChecklist.map((item) => (
                        <div 
                          key={item.id} 
                          className={`flex items-start gap-3 p-3 border-2 rounded-lg transition-all ${
                            item.completed 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-white border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          <Checkbox
                            checked={item.completed || false}
                            onCheckedChange={async (checked) => {
                              setIsProcessing(true);
                              try {
                                await opsApi.updateClosingChecklistItem(loanId!, item.id, { completed: checked as boolean });
                                toast.success(`Item ${checked ? 'marked as complete' : 'marked as incomplete'}`);
                                await loadLoanData();
                              } catch (error: any) {
                                if (error.status === 401) {
                                  toast.error("Your session has expired. Please refresh the page and log in again.");
                                  // Reload the page to trigger re-authentication
                                  setTimeout(() => {
                                    window.location.reload();
                                  }, 2000);
                                } else {
                                  toast.error(error.message || "Failed to update item");
                                }
                              } finally {
                                setIsProcessing(false);
                              }
                            }}
                            disabled={isProcessing}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {item.item_name}
                              </p>
                              {item.required && (
                                <Badge variant="outline" className="text-xs bg-amber-50 border-amber-300 text-amber-700">
                                  Required
                                </Badge>
                              )}
                              {item.completed && (
                                <Badge variant="outline" className="text-xs bg-green-50 border-green-300 text-green-700">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Complete
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                            )}
                            {item.completed && item.completed_by_name && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Completed by {item.completed_by_name}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-muted-foreground">
                            Progress: {closingChecklist.filter((item: any) => item.completed).length} of {closingChecklist.length} items completed
                          </p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full transition-all"
                            style={{ 
                              width: `${(closingChecklist.filter((item: any) => item.completed).length / closingChecklist.length) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button 
                      variant="default"
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white flex-1 text-lg py-6 shadow-md hover:shadow-lg transition-all duration-300"
                      onClick={() => setShowAddChecklistItem(true)}
                      disabled={isProcessing}
                    >
                      <ClipboardCheck className="w-5 h-5 mr-2" />
                      {closingChecklist.length > 0 ? "Add More Checklist Items" : "Create Closing Checklist Now"}
                    </Button>
                    {loan.status === "conditional_commitment_issued" && closingChecklist.length > 0 && (
                      <Button 
                        variant="outline"
                        className="border-amber-300 text-amber-700 hover:bg-amber-50"
                        onClick={async () => {
                          if (!confirm("The status should have updated automatically. Manually update to 'Closing Checklist Issued' now?")) return;
                          setIsProcessing(true);
                          try {
                            await opsApi.updateStatus(loanId!, "closing_checklist_issued", "Closing checklist issued - manual update");
                            toast.success("Status updated to Closing Checklist Issued");
                            await loadLoanData();
                          } catch (error: any) {
                            toast.error(error.message || "Failed to update status");
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        disabled={isProcessing}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Update Status to "Closing Checklist Issued"
                      </Button>
                    )}
                    {closingChecklist.length > 0 && closingChecklist.filter((item: any) => !item.completed).length > 0 && (
                      <Button 
                        variant="outline"
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                        onClick={async () => {
                          if (!confirm(`Mark all ${closingChecklist.filter((item: any) => !item.completed).length} remaining items as complete?`)) return;
                          setIsProcessing(true);
                          try {
                            const incompleteItems = closingChecklist.filter((item: any) => !item.completed);
                            await Promise.all(
                              incompleteItems.map((item: any) =>
                                opsApi.updateClosingChecklistItem(loanId!, item.id, { completed: true })
                              )
                            );
                            toast.success(`Marked ${incompleteItems.length} item(s) as complete`);
                            await loadLoanData();
                          } catch (error: any) {
                            toast.error(error.message || "Failed to update items");
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        disabled={isProcessing}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Mark All Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Closing Checklist - Display */}
            {(loan.status === "closing_checklist_issued" || loan.status === "clear_to_close") && closingChecklist.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5" />
                    Closing Checklist
                  </CardTitle>
                  <CardDescription>
                    {isOpsView ? "Manage closing checklist items" : "Complete these items before closing"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {closingChecklist.map((item) => (
                      <div 
                        key={item.id} 
                        className={`flex items-start gap-3 p-3 border rounded-lg ${
                          item.completed ? 'bg-muted/50' : ''
                        }`}
                      >
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={async (checked) => {
                            try {
                              if (isOpsView) {
                                await opsApi.updateClosingChecklistItem(loanId!, item.id, { completed: checked as boolean });
                              } else {
                                await loansApi.updateClosingChecklistItem(loanId!, item.id, { completed: checked as boolean });
                              }
                              toast.success("Checklist item updated");
                              await loadLoanData();
                            } catch (error: any) {
                              toast.error(error.message || "Failed to update item");
                            }
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {item.item_name}
                            </p>
                            {item.required && (
                              <Badge variant="outline" className="text-xs">Required</Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          )}
                          {item.completed && item.completed_by_name && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Completed by {item.completed_by_name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {closingChecklist.filter((item: any) => item.completed).length} of {closingChecklist.length} items completed
                      </p>
                      {isOpsView && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowAddChecklistItem(true)}
                        >
                          <ClipboardCheck className="w-4 h-4 mr-2" />
                          Add Item
                        </Button>
                      )}
                    </div>
                    {!isOpsView && closingChecklist.filter((item: any) => item.completed).length === closingChecklist.length && closingChecklist.length > 0 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 font-medium">
                          ✓ All checklist items completed! The operations team will review and update your loan status to "Clear to Close" shortly.
                        </p>
                      </div>
                    )}
                    {isOpsView && closingChecklist.filter((item: any) => item.completed).length === closingChecklist.length && closingChecklist.length > 0 && loan.status === "closing_checklist_issued" && (
                      <Card className="border-2 border-green-400/50 bg-gradient-to-br from-green-50 to-emerald-50/30 shadow-elegant-lg hover:shadow-elegant-lg mt-4 transition-all duration-300">
                        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50/50 border-b border-green-200/50">
                          <CardTitle className="flex items-center gap-3 text-green-700 text-lg">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-green-400/10 flex items-center justify-center border-2 border-green-300/50 shadow-md">
                              <CheckCircle2 className="w-6 h-6 text-green-600" />
                            </div>
                            All Checklist Items Complete - Ready for Next Step
                          </CardTitle>
                          <CardDescription className="text-base">
                            All closing checklist items have been completed by the borrower. Proceed to "Clear to Close" status.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="p-5 bg-white/90 backdrop-blur-sm rounded-xl border-2 border-green-200/50 shadow-sm mb-4">
                            <p className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              Checklist Status:
                            </p>
                            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside ml-2">
                              <li>All {closingChecklist.length} checklist items completed</li>
                              <li>Loan is ready to proceed to closing</li>
                              <li>Next step: Mark as "Clear to Close"</li>
                            </ul>
                          </div>
                          <Button 
                            variant="default"
                            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white w-full text-lg py-6 shadow-md hover:shadow-lg transition-all duration-300"
                            onClick={async () => {
                              if (!loanId) return;
                              setIsProcessing(true);
                              try {
                                await opsApi.updateStatus(loanId, "clear_to_close", "All closing checklist items completed");
                                toast.success("Status updated to Clear to Close");
                                await loadLoanData();
                              } catch (error: any) {
                                toast.error(error.message || "Failed to update status");
                              } finally {
                                setIsProcessing(false);
                              }
                            }}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Updating...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-5 h-5 mr-2" />
                                Mark as Clear to Close (Next Step)
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Admin Next Step Action Card - Clear to Close */}
            {loan.status === "clear_to_close" && isOpsView && (
              <Card className="border-2 border-green-400/50 bg-gradient-to-br from-green-50 to-emerald-50/30 shadow-elegant-lg hover:shadow-elegant-lg transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50/50 border-b border-green-200/50">
                  <CardTitle className={useOpsSurface ? "flex items-center gap-3 font-display font-semibold text-foreground" : "flex items-center gap-3 text-green-700"}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-green-400/10 flex items-center justify-center border-2 border-green-300/50 shadow-md">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    Next Step: Schedule Closing or Mark as Funded
                  </CardTitle>
                  <CardDescription className="text-base">
                    This loan is clear to close. Schedule the closing date or mark as funded if closing has already occurred.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border-2 border-green-200">
                    <p className="text-sm font-medium text-green-900 mb-2">Current Status:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>All closing checklist items completed</li>
                      <li>Loan is clear to close</li>
                      <li>Ready for closing scheduling or funding</li>
                    </ul>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {loan.closing_scheduled_date ? (
                      <div className="p-4 bg-white rounded-lg border-2 border-green-200">
                        <p className="text-sm font-medium text-green-900 mb-2">✓ Closing Scheduled</p>
                        <p className="text-sm text-muted-foreground mb-3">
                          {new Date(loan.closing_scheduled_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <Button 
                          variant="outline"
                          onClick={() => setShowScheduleClosing(true)}
                          disabled={isProcessing}
                          className="w-full"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Change Date
                        </Button>
                      </div>
                    ) : (
                      <div className="p-4 bg-white rounded-lg border-2 border-green-200">
                        <p className="text-sm font-medium text-green-900 mb-2">Schedule Closing</p>
                        <p className="text-sm text-muted-foreground mb-3">
                          Set the closing date to proceed to the next stage.
                        </p>
                        <Button 
                          variant="default"
                          className="bg-green-600 hover:bg-green-700 text-white w-full"
                          onClick={() => setShowScheduleClosing(true)}
                          disabled={isProcessing}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Schedule Closing Date
                        </Button>
                      </div>
                    )}
                    <div className="p-4 bg-white rounded-lg border-2 border-green-200">
                      <p className="text-sm font-medium text-green-900 mb-2">Mark as Funded</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        If closing has already occurred, mark the loan as funded.
                      </p>
                      <Button 
                        variant="default"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
                        onClick={() => setShowFundLoan(true)}
                        disabled={isProcessing}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Mark as Funded
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Admin Next Step Action Card - Closing Scheduled */}
            {loan.status === "closing_scheduled" && isOpsView && (
              <Card className="border-slate-500/50 bg-slate-500/5 shadow-lg">
                <CardHeader>
                  <CardTitle className={useOpsSurface ? "flex items-center gap-2 font-display font-semibold text-foreground" : "flex items-center gap-2 text-slate-700"}>
                    <Calendar className="w-5 h-5" />
                    Next Step: Mark as Funded
                  </CardTitle>
                  <CardDescription className="text-base">
                    Closing has been scheduled. After closing occurs, mark the loan as funded to complete the process.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border-2 border-slate-200">
                    <p className="text-sm font-medium text-slate-900 mb-2">Current Status:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Closing scheduled for: <strong>{loan.closing_scheduled_date ? new Date(loan.closing_scheduled_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Date not set'}</strong></li>
                      <li>Borrower has been notified</li>
                      <li>Ready to mark as funded after closing</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-white rounded-lg border-2 border-slate-200">
                    <p className="text-sm font-medium text-slate-900 mb-2">What's Next:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Wait for closing to occur on the scheduled date</li>
                      <li>After closing, mark the loan as funded</li>
                      <li>Enter the funded amount and date</li>
                      <li>This will complete the loan process</li>
                    </ul>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 bg-white rounded-lg border-2 border-slate-200">
                      <p className="text-sm font-medium text-slate-900 mb-2">Update Closing Date</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Change the scheduled closing date if needed.
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => setShowScheduleClosing(true)}
                        disabled={isProcessing}
                        className="w-full"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Change Date
                      </Button>
                    </div>
                    <div className="p-4 bg-white rounded-lg border-2 border-emerald-200">
                      <p className="text-sm font-medium text-emerald-900 mb-2">Mark as Funded</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Mark the loan as funded after closing has occurred.
                      </p>
                      <Button 
                        variant="default"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
                        onClick={() => setShowFundLoan(true)}
                        disabled={isProcessing}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Mark as Funded (Final Step)
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Clear to Close - Borrower View */}
            {loan.status === "clear_to_close" && !isOpsView && (
              <Card className="border-green-500/50 bg-green-500/5">
                <CardHeader>
                  <CardTitle className={useOpsSurface ? "flex items-center gap-2 font-display font-semibold text-foreground" : "flex items-center gap-2 text-green-600"}>
                    <CheckCircle2 className="w-5 h-5" />
                    Clear to Close
                  </CardTitle>
                  <CardDescription>
                    Your loan has been cleared to close! The operations team will schedule your closing date shortly. You will be notified once the closing date is confirmed.
                  </CardDescription>
                </CardHeader>
                {loan.closing_scheduled_date && (
                  <CardContent>
                    <div className="p-4 bg-white rounded-lg border-2 border-green-200">
                      <p className="text-sm text-muted-foreground mb-1">Scheduled Closing Date</p>
                      <p className="text-2xl font-bold text-green-600">
                        {new Date(loan.closing_scheduled_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Closing Scheduled - Borrower View */}
            {loan.status === "closing_scheduled" && !isOpsView && (
              <Card className="border-slate-500/50 bg-slate-500/5">
                <CardHeader>
                  <CardTitle className={useOpsSurface ? "flex items-center gap-2 font-display font-semibold text-foreground" : "flex items-center gap-2 text-slate-600"}>
                    <Calendar className="w-5 h-5" />
                    Closing Scheduled
                  </CardTitle>
                  <CardDescription>
                    Your closing has been scheduled! Please see the details below.
                  </CardDescription>
                </CardHeader>
                {loan.closing_scheduled_date && (
                  <CardContent>
                    <div className="p-4 bg-white rounded-lg border-2 border-slate-200">
                      <p className="text-sm text-muted-foreground mb-1">Scheduled Closing Date</p>
                      <p className="text-2xl font-bold text-slate-600">
                        {new Date(loan.closing_scheduled_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        The operations team will mark your loan as funded after the closing is complete.
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Mark as Funded - Operations Only */}
            {loan.status === "closing_scheduled" && isOpsView && (
              <Card className="border-emerald-500/50 bg-emerald-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-600">
                    <DollarSign className="w-5 h-5" />
                    Mark Loan as Funded
                  </CardTitle>
                  <CardDescription>
                    This loan's closing has been scheduled. After the closing is complete, mark it as funded to finalize the loan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loan.closing_scheduled_date && (
                    <div className="p-3 bg-white rounded-lg border">
                      <p className="text-sm text-muted-foreground">Scheduled Closing Date</p>
                      <p className="text-lg font-semibold">
                        {new Date(loan.closing_scheduled_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {loan.funded_date ? (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 font-medium">
                        ✓ Loan has been marked as funded on {new Date(loan.funded_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      {loan.funded_amount && (
                        <p className="text-sm text-green-700 mt-1">
                          Funded Amount: {formatCurrency(loan.funded_amount)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button 
                      variant="default"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
                      onClick={() => setShowFundLoan(true)}
                      disabled={isProcessing}
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Mark as Funded
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card 
              className={useOpsSurface ? "relative rounded-2xl border border-slate-200 bg-white shadow-sm" : "relative loan-progress-card-ghost loan-progress-card-blue"}
              style={useOpsSurface ? { overflow: 'hidden' } : { overflow: 'visible', backgroundColor: 'transparent' }}
            >
              {!useOpsSurface && (
                <div className="absolute inset-0 pointer-events-none z-0" style={{ overflow: 'visible' }}>
                  <div className="absolute card-bg-circle card-bg-circle-1" style={{ top: '0%', left: '60%' }} />
                  <div className="absolute card-bg-circle card-bg-circle-2" style={{ top: '0%', left: '10%' }} />
                  <div className="absolute card-bg-circle card-bg-circle-3" style={{ top: '0%', left: '75%' }} />
                  <div className="absolute card-bg-circle card-bg-circle-4" style={{ top: '0%', left: '30%' }} />
                  <div className="absolute card-bg-circle card-bg-circle-5" style={{ top: '0%', left: '50%' }} />
                </div>
              )}
              
              <CardHeader className="relative z-10">
                <CardTitle className={useOpsSurface ? "text-base font-semibold text-slate-900" : "text-base"}>Loan Progress</CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <LoanTrackerFull currentStatus={loan.status as LoanStatus} />
              </CardContent>
            </Card>

            {loan.term_sheet_url && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Downloads</CardTitle>
                  {loan.soft_quote_generated && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Generated: {new Date(loan.updated_at).toLocaleDateString()}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <a href={`${import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001')}${loan.term_sheet_url}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Download className="w-4 h-4 mr-2" /> Term Sheet
                    </Button>
                  </a>
                  {loan.commitment_letter_url && (
                    <a href={`${import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001')}${loan.commitment_letter_url}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Download className="w-4 h-4 mr-2" /> Commitment Letter
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Credit Authorization Dialog */}
      <Dialog open={showCreditAuth} onOpenChange={setShowCreditAuth}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Credit Authorization</DialogTitle>
            <DialogDescription>
              Authorize a soft credit pull to generate your loan quote
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                By authorizing this credit check, you agree to:
              </p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Allow RPC Lending to perform a soft credit inquiry</li>
                <li>Use your credit information to generate a loan quote</li>
                <li>Understand this is a soft pull and will not affect your credit score</li>
              </ul>
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="consent"
                checked={creditConsent}
                onCheckedChange={(checked) => setCreditConsent(checked as boolean)}
              />
              <Label htmlFor="consent" className="text-sm cursor-pointer">
                I authorize RPC Lending to perform a soft credit pull for the purpose of generating a loan quote.
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreditAuth(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreditAuth} disabled={!creditConsent || isProcessing} className="bg-slate-700 hover:bg-slate-800 text-white">
              {isProcessing ? "Processing..." : "Authorize & Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appraisal Payment Dialog */}
      <Dialog open={showAppraisalPayment} onOpenChange={setShowAppraisalPayment}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Appraisal Payment</DialogTitle>
            <DialogDescription>
              Payment is required to proceed with the property appraisal
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 overflow-y-auto flex-1">
            {!paymentClientSecret ? (
              <div className="space-y-4">
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm font-medium text-orange-900 mb-1">Non-Refundable Payment</p>
                  <p className="text-xs text-orange-700">
                    This payment is non-refundable once the appraisal process begins.
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Amount</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(loan.property_type === 'commercial' ? 750 : 500)}
                  </p>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setShowAppraisalPayment(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAppraisalPayment} disabled={isProcessing} className="bg-slate-700 hover:bg-slate-800 text-white">
                    {isProcessing ? "Processing..." : "Continue to Payment"}
                  </Button>
                </div>
              </div>
            ) : (
              <StripePaymentForm
                clientSecret={paymentClientSecret}
                amount={paymentAmount}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Commitment Letter Upload Dialog */}
      <Dialog open={showCommitmentUpload} onOpenChange={setShowCommitmentUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Commitment Letter</DialogTitle>
            <DialogDescription>
              Upload the commitment letter for this conditionally approved loan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="commitmentUrl">Commitment Letter URL</Label>
              <input
                id="commitmentUrl"
                type="text"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="https://example.com/commitment-letter.pdf"
                value={commitmentLetterUrl}
                onChange={(e) => setCommitmentLetterUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the URL where the commitment letter is hosted, or upload to a file hosting service first.
              </p>
            </div>
            <div>
              <Label htmlFor="conditionalItems">Conditional Items (Optional)</Label>
              <textarea
                id="conditionalItems"
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="List any conditional items that need to be addressed..."
                value={conditionalItems}
                onChange={(e) => setConditionalItems(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCommitmentUpload(false);
              setCommitmentLetterUrl("");
              setConditionalItems("");
            }}>
              Cancel
            </Button>
            <Button 
              variant="default" 
              onClick={async () => {
                if (!commitmentLetterUrl.trim()) {
                  toast.error("Please enter a commitment letter URL");
                  return;
                }
                setIsProcessing(true);
                try {
                  await opsApi.uploadCommitment(loanId!, commitmentLetterUrl, conditionalItems || undefined);
                  toast.success("Commitment letter uploaded successfully");
                  setShowCommitmentUpload(false);
                  setCommitmentLetterUrl("");
                  setConditionalItems("");
                  await loadLoanData();
                } catch (error: any) {
                  toast.error(error.message || "Failed to upload commitment letter");
                } finally {
                  setIsProcessing(false);
                }
              }}
              disabled={isProcessing || !commitmentLetterUrl.trim()}
            >
              {isProcessing ? "Uploading..." : "Upload & Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Closing Checklist Item Dialog */}
      <Dialog open={showAddChecklistItem} onOpenChange={setShowAddChecklistItem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Closing Checklist Item</DialogTitle>
            <DialogDescription>
              Add a new item to the closing checklist
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="itemName">Item Name *</Label>
              <input
                id="itemName"
                type="text"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="e.g., Final Property Inspection"
                value={newChecklistItem.itemName}
                onChange={(e) => setNewChecklistItem({ ...newChecklistItem, itemName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="checklistDescription">Description (Optional)</Label>
              <textarea
                id="checklistDescription"
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Additional details about this checklist item..."
                value={newChecklistItem.description}
                onChange={(e) => setNewChecklistItem({ ...newChecklistItem, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="checklistCategory">Category</Label>
              <select
                id="checklistCategory"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newChecklistItem.category}
                onChange={(e) => setNewChecklistItem({ ...newChecklistItem, category: e.target.value })}
              >
                <option value="general">General</option>
                <option value="documents">Documents</option>
                <option value="insurance">Insurance</option>
                <option value="title">Title</option>
                <option value="inspection">Inspection</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="required"
                checked={newChecklistItem.required}
                onCheckedChange={(checked) => setNewChecklistItem({ ...newChecklistItem, required: checked as boolean })}
              />
              <Label htmlFor="required" className="cursor-pointer">Required item</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddChecklistItem(false);
              setNewChecklistItem({ itemName: "", description: "", category: "general", required: true });
            }}>
              Cancel
            </Button>
            <Button 
              variant="default" 
              onClick={async () => {
                if (!newChecklistItem.itemName.trim()) {
                  toast.error("Please enter an item name");
                  return;
                }
                setIsProcessing(true);
                try {
                  await opsApi.addClosingChecklistItem(loanId!, {
                    itemName: newChecklistItem.itemName,
                    description: newChecklistItem.description || undefined,
                    category: newChecklistItem.category,
                    required: newChecklistItem.required
                  });
                  toast.success("Checklist item added successfully");
                  setShowAddChecklistItem(false);
                  setNewChecklistItem({ itemName: "", description: "", category: "general", required: true });
                  await loadLoanData();
                } catch (error: any) {
                  toast.error(error.message || "Failed to add checklist item");
                } finally {
                  setIsProcessing(false);
                }
              }}
              disabled={isProcessing || !newChecklistItem.itemName.trim()}
            >
              {isProcessing ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Closing Dialog */}
      <Dialog open={showScheduleClosing} onOpenChange={setShowScheduleClosing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Closing</DialogTitle>
            <DialogDescription>
              Select the closing date for this loan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="closingDate">Closing Date *</Label>
              <input
                id="closingDate"
                type="date"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Select a future date for the loan closing
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowScheduleClosing(false);
              setClosingDate("");
            }}>
              Cancel
            </Button>
            <Button 
              variant="default" 
              onClick={async () => {
                if (!closingDate) {
                  toast.error("Please select a closing date");
                  return;
                }
                setIsProcessing(true);
                try {
                  await opsApi.scheduleClosing(loanId!, closingDate);
                  toast.success("Closing scheduled successfully");
                  setShowScheduleClosing(false);
                  setClosingDate("");
                  await loadLoanData();
                } catch (error: any) {
                  toast.error(error.message || "Failed to schedule closing");
                } finally {
                  setIsProcessing(false);
                }
              }}
              disabled={isProcessing || !closingDate}
            >
              {isProcessing ? "Scheduling..." : "Schedule Closing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fund Loan Dialog */}
      <Dialog open={showFundLoan} onOpenChange={setShowFundLoan}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Loan as Funded</DialogTitle>
            <DialogDescription>
              Enter the funded amount to mark this loan as funded
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="fundedAmount">Funded Amount *</Label>
              <input
                id="fundedAmount"
                type="number"
                step="0.01"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="375000"
                value={fundedAmount}
                onChange={(e) => setFundedAmount(e.target.value)}
                min="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the actual amount that was funded at closing
              </p>
            </div>
            {loan.loan_amount && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Original Loan Amount</p>
                <p className="text-lg font-semibold">{formatCurrency(loan.loan_amount)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowFundLoan(false);
              setFundedAmount("");
            }}>
              Cancel
            </Button>
            <Button 
              variant="default" 
              onClick={async () => {
                if (!fundedAmount || parseFloat(fundedAmount) <= 0) {
                  toast.error("Please enter a valid funded amount");
                  return;
                }
                setIsProcessing(true);
                try {
                  await opsApi.fundLoan(loanId!, parseFloat(fundedAmount));
                  toast.success("Loan marked as funded successfully");
                  setShowFundLoan(false);
                  setFundedAmount("");
                  await loadLoanData();
                } catch (error: any) {
                  toast.error(error.message || "Failed to mark loan as funded");
                } finally {
                  setIsProcessing(false);
                }
              }}
              disabled={isProcessing || !fundedAmount || parseFloat(fundedAmount) <= 0}
            >
              {isProcessing ? "Processing..." : "Mark as Funded"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


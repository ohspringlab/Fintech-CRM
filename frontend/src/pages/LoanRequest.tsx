import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { StepIndicator } from "@/components/ui/step-indicator";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { ArrowLeft, ArrowRight, Building2, DollarSign, FileText, Home, Briefcase, Calculator, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { loansApi, LoanRequestData } from "@/lib/api";
import { useUser } from "@clerk/clerk-react";

type PropertyType = "residential" | "commercial" | "";
type ResidentialUnits = "1" | "2" | "3" | "4" | "";
type CommercialType = "multifamily" | "mixed_use" | "retail" | "office" | "light_industrial" | "self_storage" | "automotive" | "";
type RequestType = "purchase" | "refinance" | "";
type TransactionType = "fix_flip" | "ground_up" | "dscr_rental" | "rate_term" | "cash_out" | "heloc" | "bridge" | "value_add" | "";
type BorrowerType = "owner_occupied" | "investment" | "";
type DocType = "full_doc" | "light_doc" | "bank_statement" | "no_doc" | "";

interface LoanFormData {
  propertyType: PropertyType;
  residentialUnits: ResidentialUnits;
  isPortfolio: boolean;
  portfolioCount: string;
  commercialType: CommercialType;
  requestType: RequestType;
  transactionType: TransactionType;
  borrowerType: BorrowerType;
  propertyValue: string;
  requestedLtv: string;
  docType: DocType;
  // DSCR fields
  annualRentalIncome: string;
  annualOperatingExpenses: string;
  annualLoanPayments: string;
}

export default function LoanRequest() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loanId: urlLoanId } = useParams();
  const { isSignedIn } = useUser();
  const [loanId, setLoanId] = useState<string | undefined>(urlLoanId);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(!urlLoanId);
  const [dscrRatio, setDscrRatio] = useState<number | null>(null);
  const [formData, setFormData] = useState<LoanFormData>({
    propertyType: "",
    residentialUnits: "",
    isPortfolio: false,
    portfolioCount: "",
    commercialType: "",
    requestType: "",
    transactionType: "",
    borrowerType: "",
    propertyValue: "",
    requestedLtv: "",
    docType: "",
    annualRentalIncome: "",
    annualOperatingExpenses: "",
    annualLoanPayments: "",
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isSignedIn) {
      navigate('/register');
    }
  }, [isSignedIn, navigate]);

  // Sync loanId with URL parameter
  useEffect(() => {
    if (urlLoanId && urlLoanId !== loanId) {
      setLoanId(urlLoanId);
    }
  }, [urlLoanId]);

  // Initialize loan ID if not provided in URL
  useEffect(() => {
    const initializeLoanId = async () => {
      if (urlLoanId) {
        setLoanId(urlLoanId);
        setIsInitializing(false);
        return;
      }

      if (!isSignedIn) return;

      // Check if user explicitly wants to create a new loan
      const urlParams = new URLSearchParams(location.search);
      const forceNew = urlParams.get('new') === 'true';

      try {
        if (forceNew) {
          // Force create a new loan
          try {
            const newLoan = await loansApi.create({
              propertyAddress: "To be updated",
              propertyCity: "To be updated",
              propertyState: "CA",
              propertyZip: "00000"
            });
            setLoanId(newLoan.loan.id);
            // Remove the 'new' parameter and update URL
            window.history.replaceState({}, '', `/loan-request/${newLoan.loan.id}`);
            setIsInitializing(false);
          } catch (createError: any) {
            console.error('Failed to create loan:', createError);
            toast.error("Failed to create loan. Please try again.");
            setIsInitializing(false);
          }
        } else {
          // Check for existing loans
          const loansRes = await loansApi.list();
          
          if (loansRes.loans && loansRes.loans.length > 0) {
            // Use the most recent loan (first in list, typically sorted by created_at DESC)
            const mostRecentLoan = loansRes.loans[0];
            setLoanId(mostRecentLoan.id);
            // Update URL without navigation
            window.history.replaceState({}, '', `/loan-request/${mostRecentLoan.id}`);
            setIsInitializing(false);
          } else {
            // No loans found - create a new loan with placeholder property address
            // The user will update it when they fill out the form
            try {
              const newLoan = await loansApi.create({
                propertyAddress: "To be updated",
                propertyCity: "To be updated",
                propertyState: "CA",
                propertyZip: "00000"
              });
              setLoanId(newLoan.loan.id);
              window.history.replaceState({}, '', `/loan-request/${newLoan.loan.id}`);
              setIsInitializing(false);
            } catch (createError: any) {
              console.error('Failed to create loan:', createError);
              toast.error("Failed to create loan. Please try again.");
              setIsInitializing(false);
            }
          }
        }
      } catch (error: any) {
        console.error('Failed to load loans:', error);
        toast.error("Failed to load loan information. Please try again.");
        setIsInitializing(false);
      }
    };

    if (isSignedIn && !urlLoanId) {
      initializeLoanId();
    } else if (urlLoanId) {
      setIsInitializing(false);
    }
  }, [isSignedIn, urlLoanId, navigate, location.search]);

  // Calculate DSCR when income fields change
  useEffect(() => {
    const income = parseFloat(formData.annualRentalIncome.replace(/[^0-9.]/g, "")) || 0;
    const expenses = parseFloat(formData.annualOperatingExpenses.replace(/[^0-9.]/g, "")) || 0;
    const payments = parseFloat(formData.annualLoanPayments.replace(/[^0-9.]/g, "")) || 0;
    
    if (payments > 0) {
      const noi = income - expenses;
      const dscr = noi / payments;
      setDscrRatio(Math.round(dscr * 100) / 100);
    } else {
      setDscrRatio(null);
    }
  }, [formData.annualRentalIncome, formData.annualOperatingExpenses, formData.annualLoanPayments]);

  const calculateLoanAmount = () => {
    const value = parseFloat(formData.propertyValue.replace(/[^0-9.]/g, ""));
    const ltv = parseFloat(formData.requestedLtv);
    if (isNaN(value) || isNaN(ltv)) return 0;
    return value * (ltv / 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!loanId) {
      toast.error("No loan ID found");
      return;
    }

    // Check DSCR for non-exempt doc types
    const exemptDocTypes = ['light_doc', 'bank_statement', 'no_doc'];
    if (dscrRatio !== null && dscrRatio < 1.0 && !exemptDocTypes.includes(formData.docType)) {
      toast.error("DSCR ratio below 1.0x - loan cannot be approved. Consider Light Doc, Bank Statement, or No-Doc options.");
      return;
    }

    setIsLoading(true);
    try {
      // Update loan with all details - only include non-empty values for fields with check constraints
      await loansApi.update(loanId, {
        propertyType: formData.propertyType || undefined,
        residentialUnits: formData.residentialUnits ? parseInt(formData.residentialUnits) : undefined,
        isPortfolio: formData.isPortfolio,
        portfolioCount: formData.portfolioCount ? parseInt(formData.portfolioCount) : undefined,
        commercialType: formData.commercialType || undefined,
        requestType: formData.requestType || undefined,
        transactionType: formData.transactionType || undefined,
        borrowerType: formData.borrowerType || undefined,
        propertyValue: parseFloat(formData.propertyValue.replace(/[^0-9.]/g, "")),
        requestedLtv: parseFloat(formData.requestedLtv),
        documentationType: formData.docType || undefined,
        annualRentalIncome: formData.annualRentalIncome ? parseFloat(formData.annualRentalIncome.replace(/[^0-9.]/g, "")) : undefined,
        annualOperatingExpenses: formData.annualOperatingExpenses ? parseFloat(formData.annualOperatingExpenses.replace(/[^0-9.]/g, "")) : undefined,
        annualLoanPayments: formData.annualLoanPayments ? parseFloat(formData.annualLoanPayments.replace(/[^0-9.]/g, "")) : undefined,
      });

      // Submit for quote
      await loansApi.submit(loanId);
      
      toast.success("Loan request submitted! Proceeding to credit authorization.");
      navigate(`/dashboard/loans/${loanId}`);
    } catch (error: any) {
      console.error('Loan submit error:', error);
      
      // Handle missing fields
      if (error.missingFields && Array.isArray(error.missingFields)) {
        toast.error(`Please complete all required fields: ${error.missingFields.join(', ')}`, { duration: 10000 });
        return;
      }
      
      // Handle declined loans
      if (error.declined) {
        toast.error(error.reason || error.details || "Loan request declined", { duration: 10000 });
        return;
      }
      
      // Handle eligibility errors
      if (error.eligibilityErrors && Array.isArray(error.eligibilityErrors)) {
        const errorMessages = error.eligibilityErrors.map((err: any) => {
          if (typeof err === 'string') return err;
          return err.message || JSON.stringify(err);
        }).filter(Boolean);
        
        if (errorMessages.length > 0) {
          toast.error(`Eligibility Issues:\n${errorMessages.join('\n')}`, { duration: 15000 });
        } else {
          toast.error("Loan request does not meet eligibility requirements. Please check your loan details.");
        }
      } else if (error.errors && Array.isArray(error.errors)) {
        // Handle errors array format
        toast.error(`Eligibility Issues:\n${error.errors.join('\n')}`, { duration: 15000 });
      } else if (error.requiresVerification) {
        toast.error("Please verify your email before submitting a loan request.", {
          action: {
            label: "Verify Email",
            onClick: () => navigate('/verify-email')
          },
          duration: 10000
        });
      } else {
        // Show detailed error message if available
        const errorMsg = error.details || error.message || "Failed to submit loan request";
        toast.error(errorMsg, { duration: 10000 });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactionOptions = () => {
    if (formData.propertyType === "residential") {
      if (formData.requestType === "purchase") {
        return [
          { value: "dscr_rental", label: "DSCR / Investor Rental", description: "Purchase rental property - DSCR-based qualification" },
          { value: "fix_flip", label: "Fix & Flip", description: "Short-term bridge for renovation" },
          { value: "ground_up", label: "Ground-Up Construction", description: "New construction financing" },
        ];
      }
      // Refinance options
      const options = [
        { value: "dscr_rental", label: "DSCR / Investor Rental", description: "Refinance rental property - DSCR-based" },
        { value: "rate_term", label: "Rate & Term", description: "Lower your rate or change terms" },
        { value: "cash_out", label: "Cash-Out", description: "Access your equity" },
        { value: "heloc", label: "Investment HELOC", description: "Revolving line of credit (up to 90% LTV)" },
      ];
      
      // Add portfolio refinance option if it's a portfolio
      if (formData.isPortfolio && formData.requestType === "refinance") {
        options.push({
          value: "portfolio_refinance",
          label: "Portfolio Refinance",
          description: `Refinance ${formData.portfolioCount || 'multiple'} properties - DSCR-based`
        });
      }
      
      return options;
    }
    // Commercial options
    if (formData.requestType === "purchase") {
      return [
        { value: "bridge", label: "Bridge Loan", description: "Acquisition or stabilization" },
        { value: "value_add", label: "Value-Add / Renovation", description: "Repositioning with rehab budget" },
      ];
    }
    return [
      { value: "bridge", label: "Bridge Refinance", description: "Short-term refinance" },
      { value: "cash_out", label: "Cash-Out Refinance", description: "Recapitalization of stabilized assets" },
      { value: "rate_term", label: "Rate & Term", description: "Permanent financing" },
    ];
  };

  const showDSCRFields = formData.borrowerType === "investment" && 
    ["dscr_rental", "bridge", "rate_term", "cash_out", "portfolio_refinance"].includes(formData.transactionType);

  // Show loading state while initializing loan ID
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-muted/30">
        <AppNavbar variant="borrower" />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-lg">
              <CardContent className="py-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading loan information...</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AppNavbar variant="borrower" />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Loan Request
            </h1>
            <p className="text-muted-foreground">
              Tell us about your financing needs to receive a soft quote
            </p>
          </div>

          <div className="mb-8">
            <StepIndicator 
              currentStep={step} 
              totalSteps={4}
              labels={["Property", "Loan Type", "Loan Details", "Documentation"]}
            />
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                  {step === 1 && <Building2 className="w-5 h-5 text-slate-600" />}
                  {step === 2 && <Briefcase className="w-5 h-5 text-slate-600" />}
                  {step === 3 && <DollarSign className="w-5 h-5 text-slate-600" />}
                  {step === 4 && <FileText className="w-5 h-5 text-slate-600" />}
                </div>
                <div>
                  <CardTitle className="font-serif font-bold">
                    {step === 1 && "Property Type"}
                    {step === 2 && "Loan Type"}
                    {step === 3 && "Loan Details"}
                    {step === 4 && "Documentation Type"}
                  </CardTitle>
                  <CardDescription>
                    {step === 1 && "What type of property are you financing?"}
                    {step === 2 && "Select your loan product"}
                    {step === 3 && "Enter property value and loan requirements"}
                    {step === 4 && "How would you like to qualify?"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {step === 1 && (
                <>
                  <div className="space-y-3">
                    <Label>Property Type *</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, propertyType: "residential", commercialType: "" })}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          formData.propertyType === "residential"
                            ? "border-slate-600 bg-slate-50/50"
                            : "border-border hover:border-slate-500/50"
                        }`}
                      >
                        <Home className={`w-6 h-6 mb-2 ${formData.propertyType === "residential" ? "text-slate-600" : "text-muted-foreground"}`} />
                        <p className="font-medium">Residential</p>
                        <p className="text-xs text-muted-foreground">SFR 1-4 Units</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, propertyType: "commercial", residentialUnits: "", isPortfolio: false, portfolioCount: "" })}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          formData.propertyType === "commercial"
                            ? "border-slate-600 bg-slate-50/50"
                            : "border-border hover:border-slate-500/50"
                        }`}
                      >
                        <Building2 className={`w-6 h-6 mb-2 ${formData.propertyType === "commercial" ? "text-slate-600" : "text-muted-foreground"}`} />
                        <p className="font-medium">Commercial</p>
                        <p className="text-xs text-muted-foreground">5+ Units or Commercial</p>
                      </button>
                    </div>
                  </div>

                  {formData.propertyType === "residential" && (
                    <>
                      <div className="space-y-3">
                        <Label>Number of Units *</Label>
                        <RadioGroup
                          value={formData.residentialUnits}
                          onValueChange={(value) => setFormData({ ...formData, residentialUnits: value as ResidentialUnits })}
                          className="flex gap-4"
                        >
                          {["1", "2", "3", "4"].map((unit) => (
                            <div key={unit} className="flex items-center space-x-2">
                              <RadioGroupItem value={unit} id={`unit-${unit}`} />
                              <Label htmlFor={`unit-${unit}`} className="font-normal">
                                {unit} {parseInt(unit) === 1 ? "Unit" : "Units"}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>

                      <div className="space-y-3">
                        <Label>Is this a portfolio of properties?</Label>
                        <RadioGroup
                          value={formData.isPortfolio ? "yes" : "no"}
                          onValueChange={(value) => setFormData({ ...formData, isPortfolio: value === "yes" })}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="portfolio-no" />
                            <Label htmlFor="portfolio-no" className="font-normal">No, single property</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="portfolio-yes" />
                            <Label htmlFor="portfolio-yes" className="font-normal">Yes, portfolio</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {formData.isPortfolio && (
                        <div className="space-y-2">
                          <Label htmlFor="portfolioCount">Number of Properties in Portfolio</Label>
                          <Input
                            id="portfolioCount"
                            type="number"
                            min="2"
                            placeholder="e.g., 5"
                            value={formData.portfolioCount}
                            onChange={(e) => setFormData({ ...formData, portfolioCount: e.target.value })}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {formData.propertyType === "commercial" && (
                    <div className="space-y-3">
                      <Label>Commercial Property Type *</Label>
                      <Select
                        value={formData.commercialType}
                        onValueChange={(value) => setFormData({ ...formData, commercialType: value as CommercialType })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select property type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multifamily">Multifamily (5+ Units)</SelectItem>
                          <SelectItem value="mixed_use">Mixed Use</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="office">Office</SelectItem>
                          <SelectItem value="light_industrial">Light Industrial</SelectItem>
                          <SelectItem value="self_storage">Self-Storage</SelectItem>
                          <SelectItem value="automotive">Automotive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-3">
                    <Label>Request Type *</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { value: "purchase", label: "Purchase", icon: Briefcase },
                        { value: "refinance", label: "Refinance", icon: DollarSign },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, requestType: option.value as RequestType, transactionType: "" })}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            formData.requestType === option.value
                              ? "border-slate-600 bg-slate-50/50"
                              : "border-border hover:border-slate-500/50"
                          }`}
                        >
                          <option.icon className={`w-5 h-5 mb-2 ${formData.requestType === option.value ? "text-slate-600" : "text-muted-foreground"}`} />
                          <p className="font-medium">{option.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.requestType && (
                    <div className="space-y-3">
                      <Label>Transaction Type *</Label>
                      <RadioGroup
                        value={formData.transactionType}
                        onValueChange={(value) => setFormData({ ...formData, transactionType: value as TransactionType })}
                        className="space-y-3"
                      >
                        {getTransactionOptions().map((option) => (
                          <div
                            key={option.value}
                            className={`flex items-start space-x-3 p-4 rounded-xl border-2 transition-all ${
                              formData.transactionType === option.value
                                ? "border-slate-600 bg-slate-50/50"
                                : "border-border"
                            }`}
                          >
                            <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                            <div>
                              <Label htmlFor={option.value} className="font-medium cursor-pointer">
                                {option.label}
                              </Label>
                              <p className="text-sm text-muted-foreground">{option.description}</p>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label>Borrower Type *</Label>
                    <RadioGroup
                      value={formData.borrowerType}
                      onValueChange={(value) => setFormData({ ...formData, borrowerType: value as BorrowerType })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="owner_occupied" id="owner-occupied" />
                        <Label htmlFor="owner-occupied" className="font-normal">Owner Occupied</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="investment" id="investment" />
                        <Label htmlFor="investment" className="font-normal">Investment Property</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="propertyValue">Property Value *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="propertyValue"
                          placeholder="500,000"
                          className="pl-9"
                          value={formData.propertyValue}
                          onChange={(e) => setFormData({ ...formData, propertyValue: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requestedLtv">Requested LTV *</Label>
                      <div className="relative">
                        <Input
                          id="requestedLtv"
                          type="number"
                          min="0"
                          max="90"
                          placeholder="75"
                          value={formData.requestedLtv}
                          onChange={(e) => setFormData({ ...formData, requestedLtv: e.target.value })}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>

                  {calculateLoanAmount() > 0 && (
                    <div className="p-4 rounded-xl bg-slate-700 text-white">
                      <p className="text-sm text-white/80 mb-1">Estimated Loan Amount</p>
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(calculateLoanAmount())}
                      </p>
                    </div>
                  )}

                  {showDSCRFields && (
                    <div className="space-y-4 p-4 rounded-xl bg-muted/50 border">
                      <div className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-slate-600" />
                        <Label className="font-semibold">DSCR Calculation</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        For DSCR loans, we need rental income details to calculate your debt service coverage ratio.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="annualRentalIncome">Annual Rental Income</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="annualRentalIncome"
                              placeholder="120,000"
                              className="pl-9"
                              value={formData.annualRentalIncome}
                              onChange={(e) => setFormData({ ...formData, annualRentalIncome: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="annualOperatingExpenses">Annual Operating Expenses</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="annualOperatingExpenses"
                              placeholder="40,000"
                              className="pl-9"
                              value={formData.annualOperatingExpenses}
                              onChange={(e) => setFormData({ ...formData, annualOperatingExpenses: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="annualLoanPayments">Est. Annual Loan Payments</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="annualLoanPayments"
                              placeholder="65,000"
                              className="pl-9"
                              value={formData.annualLoanPayments}
                              onChange={(e) => setFormData({ ...formData, annualLoanPayments: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>

                      {dscrRatio !== null && (
                        <div className={`p-4 rounded-lg ${dscrRatio >= 1.15 ? 'bg-success/10 border-success/20' : dscrRatio >= 1.0 ? 'bg-warning/10 border-warning/20' : 'bg-destructive/10 border-destructive/20'} border`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Calculated DSCR</p>
                              <p className="text-2xl font-bold">{dscrRatio.toFixed(2)}x</p>
                            </div>
                            <div className="text-right">
                              {dscrRatio >= 1.15 ? (
                                <span className="text-success text-sm">✓ Qualifies for best rates</span>
                              ) : dscrRatio >= 1.0 ? (
                                <span className="text-warning text-sm">⚠ May qualify with rate adjustment</span>
                              ) : (
                                <div className="flex items-center gap-1 text-destructive text-sm">
                                  <AlertCircle className="w-4 h-4" />
                                  <span>Below 1.0x - requires alternative doc type</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {step === 4 && (
                <>
                  <div className="space-y-3">
                    <Label>Documentation Type *</Label>
                    <p className="text-sm text-muted-foreground">
                      Select how you'd like to qualify for this loan
                    </p>
                    <RadioGroup
                      value={formData.docType}
                      onValueChange={(value) => setFormData({ ...formData, docType: value as DocType })}
                      className="space-y-3"
                    >
                      {[
                        { value: "full_doc", label: "Full Documentation", description: "Tax returns, W2s, pay stubs, bank statements", recommended: true },
                        { value: "light_doc", label: "Light Doc (No Tax Returns)", description: "Bank statements, CPA letter, or asset documentation" },
                        { value: "bank_statement", label: "Bank Statement Program", description: "12-24 months of personal or business bank statements" },
                        { value: "no_doc", label: "Streamline No-Doc", description: "DSCR-based qualification using property cash flow only" },
                      ].map((option) => (
                        <div
                          key={option.value}
                          className={`relative flex items-start space-x-3 p-4 rounded-xl border-2 transition-all ${
                            formData.docType === option.value
                              ? "border-slate-600 bg-slate-50/50"
                              : "border-border"
                          }`}
                        >
                          <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={option.value} className="font-medium cursor-pointer">
                                {option.label}
                              </Label>
                              {option.recommended && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                                  Best Rates
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{option.description}</p>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {dscrRatio !== null && dscrRatio < 1.0 && !['light_doc', 'bank_statement', 'no_doc'].includes(formData.docType) && (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-destructive">DSCR Below Minimum</p>
                          <p className="text-sm text-muted-foreground">
                            Your DSCR of {dscrRatio.toFixed(2)}x is below the 1.0x minimum for Full Documentation loans. 
                            Please select Light Doc, Bank Statement, or No-Doc to proceed.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : navigate("/dashboard")}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} disabled={isLoading} className="bg-slate-700 hover:bg-slate-800 text-white">
                  {isLoading ? (
                    "Submitting..."
                  ) : step === 4 ? (
                    "Submit & Get Quote"
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

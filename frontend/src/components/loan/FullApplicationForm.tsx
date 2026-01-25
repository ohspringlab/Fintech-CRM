import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loansApi } from "@/lib/api";
import { toast } from "sonner";
import { Download, FileText, Save } from "lucide-react";

interface FullApplicationFormProps {
  loanId: string;
  loan: any;
  onComplete: () => void;
}

export function FullApplicationForm({ loanId, loan, onComplete }: FullApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // Personal Information
    fullName: loan?.borrower_name || "",
    email: loan?.borrower_email || "",
    phone: loan?.borrower_phone || "",
    ssn: "",
    dateOfBirth: "",
    citizenship: "",
    maritalStatus: "",
    
    // Address
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    
    // Employment
    employmentStatus: "",
    employer: "",
    jobTitle: "",
    yearsAtJob: "",
    annualIncome: "",
    
    // Assets
    bankAccounts: "",
    realEstate: "",
    otherAssets: "",
    
    // Liabilities
    mortgages: "",
    creditCards: "",
    otherDebts: "",
    
    // Property Information
    propertyAddress: loan?.property_address || "",
    propertyCity: loan?.property_city || "",
    propertyState: loan?.property_state || "",
    propertyZip: loan?.property_zip || "",
    propertyValue: loan?.property_value?.toLocaleString() || "",
    
    // Loan Information
    loanAmount: loan?.loan_amount?.toLocaleString() || "",
    loanPurpose: loan?.transaction_type || "",
    
    // Additional Information
    additionalInfo: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await loansApi.submitFullApplication(loanId, formData);
      toast.success("Application submitted successfully! PDF is being generated.");
      
      // Wait a moment for PDF generation, then reload
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    if (loan?.full_application_pdf_url) {
      const baseUrl = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001');
      window.open(`${baseUrl}${loan.full_application_pdf_url}`, '_blank');
    } else {
      toast.error("PDF not available yet. Please submit the application first.");
    }
  };

  if (loan?.full_application_completed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Full Application
          </CardTitle>
          <CardDescription>Your loan application has been submitted</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your full loan application has been completed and submitted. You can download the PDF version below.
            </p>
            {loan?.full_application_pdf_url && (
              <Button onClick={handleDownloadPDF} variant="gold" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download Application PDF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Complete Loan Application
        </CardTitle>
        <CardDescription>Fill out all required information to complete your loan application</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ssn">SSN (Last 4 digits) *</Label>
              <Input
                id="ssn"
                name="ssn"
                maxLength={4}
                placeholder="1234"
                value={formData.ssn}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="citizenship">Citizenship Status *</Label>
              <Select value={formData.citizenship} onValueChange={(v) => handleSelectChange("citizenship", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select citizenship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us_citizen">US Citizen</SelectItem>
                  <SelectItem value="permanent_resident">Permanent Resident</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maritalStatus">Marital Status *</Label>
              <Select value={formData.maritalStatus} onValueChange={(v) => handleSelectChange("maritalStatus", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Mailing Address</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address Line 1 *</Label>
              <Input
                id="addressLine1"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  name="state"
                  maxLength={2}
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code *</Label>
                <Input
                  id="zipCode"
                  name="zipCode"
                  maxLength={5}
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Employment */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Employment Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employmentStatus">Employment Status *</Label>
              <Select value={formData.employmentStatus} onValueChange={(v) => handleSelectChange("employmentStatus", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employed">Employed</SelectItem>
                  <SelectItem value="self_employed">Self-Employed</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                  <SelectItem value="unemployed">Unemployed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employer">Employer</Label>
              <Input
                id="employer"
                name="employer"
                value={formData.employer}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearsAtJob">Years at Current Job</Label>
              <Input
                id="yearsAtJob"
                name="yearsAtJob"
                type="number"
                value={formData.yearsAtJob}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="annualIncome">Annual Income *</Label>
              <Input
                id="annualIncome"
                name="annualIncome"
                type="text"
                placeholder="$0.00"
                value={formData.annualIncome}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, "");
                  setFormData(prev => ({ ...prev, annualIncome: value }));
                }}
                required
              />
            </div>
          </div>
        </div>

        {/* Assets & Liabilities */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Financial Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankAccounts">Bank Accounts (Total Value)</Label>
              <Input
                id="bankAccounts"
                name="bankAccounts"
                type="text"
                placeholder="$0.00"
                value={formData.bankAccounts}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, "");
                  setFormData(prev => ({ ...prev, bankAccounts: value }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="realEstate">Real Estate (Total Value)</Label>
              <Input
                id="realEstate"
                name="realEstate"
                type="text"
                placeholder="$0.00"
                value={formData.realEstate}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, "");
                  setFormData(prev => ({ ...prev, realEstate: value }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mortgages">Mortgages (Total Balance)</Label>
              <Input
                id="mortgages"
                name="mortgages"
                type="text"
                placeholder="$0.00"
                value={formData.mortgages}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, "");
                  setFormData(prev => ({ ...prev, mortgages: value }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditCards">Credit Cards (Total Balance)</Label>
              <Input
                id="creditCards"
                name="creditCards"
                type="text"
                placeholder="$0.00"
                value={formData.creditCards}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, "");
                  setFormData(prev => ({ ...prev, creditCards: value }));
                }}
              />
            </div>
          </div>
        </div>

        {/* Property Information (Pre-filled) */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Subject Property</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="propertyAddress">Property Address</Label>
              <Input
                id="propertyAddress"
                name="propertyAddress"
                value={formData.propertyAddress}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="propertyCity">City</Label>
              <Input
                id="propertyCity"
                name="propertyCity"
                value={formData.propertyCity}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="propertyState">State</Label>
              <Input
                id="propertyState"
                name="propertyState"
                value={formData.propertyState}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="propertyValue">Property Value</Label>
              <Input
                id="propertyValue"
                name="propertyValue"
                value={formData.propertyValue}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loanAmount">Loan Amount</Label>
              <Input
                id="loanAmount"
                name="loanAmount"
                value={formData.loanAmount}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Additional Information</h3>
          <div className="space-y-2">
            <Label htmlFor="additionalInfo">Additional Comments or Information</Label>
            <Textarea
              id="additionalInfo"
              name="additionalInfo"
              rows={4}
              value={formData.additionalInfo}
              onChange={handleInputChange}
              placeholder="Any additional information you'd like to provide..."
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            onClick={handleSubmit}
            variant="gold"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              "Submitting..."
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Submit Application
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}



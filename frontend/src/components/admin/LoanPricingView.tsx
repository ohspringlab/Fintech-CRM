import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  DollarSign,
  RefreshCw,
  Calculator,
  TrendingUp,
} from "lucide-react";

export function LoanPricingView() {
  const [loanAmount, setLoanAmount] = useState<number>(500000);
  const [propertyType, setPropertyType] = useState<string>("residential");
  const [loanTerm, setLoanTerm] = useState<string>("30");
  const [ltv, setLtv] = useState<number>(75);
  const [rate, setRate] = useState<number>(0);
  const [points, setPoints] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculatePricing = useCallback(async () => {
    try {
      setIsCalculating(true);
      // TODO: Replace with actual pricing API call
      // Mock calculation for now
      const baseRate = propertyType === 'residential' ? 6.5 : 7.0;
      const ltvAdjustment = (ltv - 70) * 0.1;
      const calculatedRate = baseRate + ltvAdjustment;
      setRate(calculatedRate);
      setPoints(Math.max(0, (calculatedRate - 6.0) * 0.5));
    } catch (error) {
      console.error('Failed to calculate pricing:', error);
      toast.error('Failed to calculate pricing');
    } finally {
      setIsCalculating(false);
    }
  }, [propertyType, ltv]);

  useEffect(() => {
    calculatePricing();
  }, [calculatePricing]);

  const monthlyPayment = rate > 0 ? 
    (loanAmount * (rate / 100 / 12) * Math.pow(1 + (rate / 100 / 12), parseInt(loanTerm) * 12)) / 
    (Math.pow(1 + (rate / 100 / 12), parseInt(loanTerm) * 12) - 1) : 0;

  return (
    <div className="space-y-6">
      <Card className="relative bg-gradient-to-br from-white/95 via-blue-50/40 to-indigo-50/30 backdrop-blur-xl border-slate-200/50 shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-display font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-blue-600" />
                Loan Pricing
              </CardTitle>
              <CardDescription className="text-slate-600 mt-1">
                Calculate and manage loan pricing
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={calculatePricing} className="bg-white/80 backdrop-blur-sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Recalculate
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle>Pricing Parameters</CardTitle>
            <CardDescription>Enter loan details to calculate pricing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Loan Amount</Label>
              <Input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(parseFloat(e.target.value) || 0)}
                placeholder="500000"
              />
            </div>
            <div className="space-y-2">
              <Label>Property Type</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loan Term (Years)</Label>
              <Select value={loanTerm} onValueChange={setLoanTerm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 Years</SelectItem>
                  <SelectItem value="30">30 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loan-to-Value (LTV) - {ltv}%</Label>
              <Input
                type="range"
                min="50"
                max="90"
                value={ltv}
                onChange={(e) => setLtv(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle>Pricing Results</CardTitle>
            <CardDescription>Calculated rates and terms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isCalculating ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Interest Rate</span>
                      <Calculator className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-blue-600">{rate.toFixed(2)}%</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Points</span>
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-green-600">{points.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Monthly Payment</span>
                      <DollarSign className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-3xl font-bold text-purple-600">
                      ${monthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <Button className="w-full bg-blue-600 text-white">
                  Save Pricing Template
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


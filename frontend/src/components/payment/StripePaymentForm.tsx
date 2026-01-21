import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({ amount, onSuccess, onCancel }: Omit<PaymentFormProps, "clientSecret">) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message || "Payment failed");
      } else {
        toast.success("Payment completed successfully!");
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || "Payment processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <p className="text-sm font-medium text-orange-900 mb-1">Non-Refundable Payment</p>
        <p className="text-xs text-orange-700">
          This payment is non-refundable once the appraisal process begins.
        </p>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-1">Amount</p>
        <p className="text-2xl font-bold">
          ${amount.toFixed(2)}
        </p>
      </div>

      <div className="border rounded-lg p-4 bg-white">
        <PaymentElement />
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="gold"
          disabled={!stripe || isProcessing}
        >
          {isProcessing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
}

export function StripePaymentForm({ clientSecret, amount, onSuccess, onCancel }: PaymentFormProps) {
  const options = {
    clientSecret,
    appearance: {
      theme: "stripe" as const,
      variables: {
        colorPrimary: "#D4AF37",
        colorBackground: "#ffffff",
        colorText: "#1a1a1a",
        colorDanger: "#df1b41",
        fontFamily: "system-ui, sans-serif",
        spacingUnit: "4px",
        borderRadius: "8px",
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm amount={amount} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}

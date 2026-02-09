import { useState, useEffect } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Initialize Stripe with error handling
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
let stripePromise: Promise<Stripe | null> | null = null;

if (stripeKey) {
  stripePromise = loadStripe(stripeKey).catch((error) => {
    console.error('Failed to load Stripe:', error);
    return null;
  });
} else {
  console.warn('VITE_STRIPE_PUBLISHABLE_KEY is not set');
  stripePromise = Promise.resolve(null);
}

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
  const [stripeLoaded, setStripeLoaded] = useState<boolean | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);

  useEffect(() => {
    if (stripePromise) {
      stripePromise.then((stripe) => {
        if (stripe) {
          setStripeLoaded(true);
        } else {
          setStripeError('Stripe failed to load. Please check your internet connection or try again later.');
          setStripeLoaded(false);
        }
      }).catch((error) => {
        console.error('Stripe loading error:', error);
        setStripeError('Failed to load payment system. Please refresh the page or contact support.');
        setStripeLoaded(false);
      });
    } else {
      setStripeError('Payment system is not configured.');
      setStripeLoaded(false);
    }
  }, []);

  if (stripeLoaded === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading payment system...</p>
        </div>
      </div>
    );
  }

  if (stripeLoaded === false || stripeError) {
    return (
      <div className="p-6 border border-red-200 rounded-lg bg-red-50">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Payment System Unavailable</h3>
          <p className="text-sm text-red-700 mb-4">{stripeError || 'Stripe failed to load'}</p>
        </div>
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

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

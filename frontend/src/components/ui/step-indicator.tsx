import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export function StepIndicator({ currentStep, totalSteps, labels }: StepIndicatorProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all flex-shrink-0",
                step < currentStep && "bg-success text-white",
                step === currentStep && "bg-blue-600 text-white ring-4 ring-blue-600/20",
                step > currentStep && "bg-muted text-muted-foreground"
              )}
            >
              {step}
            </div>
            {step < totalSteps && (
              <div
                className={cn(
                  "flex-1 h-1 mx-2 rounded-full transition-all",
                  step < currentStep ? "bg-success" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>
      {labels && (
        <div className="flex justify-between">
          {labels.map((label, i) => (
            <span
              key={i}
              className={cn(
                "text-xs text-center",
                i + 1 === currentStep ? "text-blue-600 font-medium" : "text-muted-foreground"
              )}
              style={{ width: `${100 / totalSteps}%` }}
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

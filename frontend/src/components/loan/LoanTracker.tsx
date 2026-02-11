import { cn } from "@/lib/utils";
import { Check, Clock, FileText, CreditCard, Home, FileCheck, Shield, Calendar, DollarSign, Send, ClipboardCheck, Building, Banknote, AlertCircle } from "lucide-react";

export type LoanStatus = 
  | "new_request"
  | "quote_requested"
  | "soft_quote_issued"      // Step 1: Generate Soft Quote
  | "term_sheet_issued"       // Step 6: Generate Formal Term Sheet
  | "term_sheet_signed"       // Step 7: Term Sheet Signed + Appraisal Authorization
  | "appraisal_ordered"        // Step 8: Order Appraisal
  | "appraisal_received"      // Step 9: Appraisal Received → Underwriting Payment
  | "conditionally_approved"  // Step 10: Conditional Approval + Closing Fee
  | "conditional_items_needed" // Step 11: Clear To Close (conditions)
  | "clear_to_close"          // Step 11: Clear To Close
  | "funded";                 // Step 12: Closed And Funded

interface LoanTrackerStep {
  id: LoanStatus;
  label: string;
  description: string;
  icon: React.ElementType;
}

const steps: LoanTrackerStep[] = [
  { id: "new_request", label: "New Request", description: "Loan request submitted", icon: FileText },
  { id: "quote_requested", label: "Quote Requested", description: "Awaiting soft quote", icon: Send },
  { id: "soft_quote_issued", label: "Soft Quote", description: "Step 1: Quote generated (FREE)", icon: DollarSign },
  { id: "term_sheet_issued", label: "Term Sheet", description: "Step 6: Formal term sheet issued", icon: FileCheck },
  { id: "term_sheet_signed", label: "Term Sheet Signed", description: "Step 7: Terms accepted + appraisal authorized", icon: Check },
  { id: "appraisal_ordered", label: "Appraisal Ordered", description: "Step 8: Appraisal in progress", icon: Home },
  { id: "appraisal_received", label: "Appraisal Received", description: "Step 9: Value confirmed", icon: Building },
  { id: "conditionally_approved", label: "Cond. Approved", description: "Step 10: Conditions issued", icon: Shield },
  { id: "conditional_items_needed", label: "Items Needed", description: "Step 11: Complete conditions", icon: AlertCircle },
  { id: "clear_to_close", label: "Clear to Close", description: "Step 11: Ready for closing", icon: Check },
  { id: "funded", label: "Funded", description: "Step 12: Loan complete!", icon: Banknote },
];

// Map for status labels and colors
export const statusConfig: Record<LoanStatus, { label: string; color: string }> = {
  "new_request": { label: "New Request", color: "bg-gray-100 text-gray-700" },
  "quote_requested": { label: "Quote Requested", color: "bg-blue-100 text-blue-700" },
  "soft_quote_issued": { label: "Soft Quote", color: "bg-cyan-100 text-cyan-700" },
  "term_sheet_issued": { label: "Term Sheet", color: "bg-purple-100 text-purple-700" },
  "term_sheet_signed": { label: "Term Sheet Signed", color: "bg-indigo-100 text-indigo-700" },
  "appraisal_ordered": { label: "Appraisal Ordered", color: "bg-pink-100 text-pink-700" },
  "appraisal_received": { label: "Appraisal Received", color: "bg-rose-100 text-rose-700" },
  "conditionally_approved": { label: "Cond. Approved", color: "bg-lime-100 text-lime-700" },
  "conditional_items_needed": { label: "Items Needed", color: "bg-orange-100 text-orange-700" },
  "clear_to_close": { label: "Clear to Close", color: "bg-green-100 text-green-700" },
  "funded": { label: "Funded", color: "bg-green-300 text-green-900" },
};

interface LoanTrackerProps {
  currentStatus: LoanStatus;
  compact?: boolean;
}

export function LoanTracker({ currentStatus, compact = false }: LoanTrackerProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStatus);
  const isFunded = currentStatus === "funded";

  if (compact) {
    return (
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {steps.map((step, index) => {
          const isCompleted = isFunded ? index <= currentIndex : index < currentIndex;
          const isCurrent = !isFunded && index === currentIndex;
          
          return (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "w-3 h-3 rounded-full flex-shrink-0 transition-all",
                  isCompleted && "bg-slate-700",
                  isCurrent && "bg-slate-600 ring-2 ring-slate-400/50",
                  !isCompleted && !isCurrent && "bg-slate-200"
                )}
              />
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-4 h-0.5 mx-0.5",
                  index < currentIndex ? "bg-slate-600" : "bg-slate-200"
                )} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const isCompleted = isFunded ? index <= currentIndex : index < currentIndex;
        const isCurrent = !isFunded && index === currentIndex;
        const Icon = step.icon;

        return (
          <div key={step.id} className="tracker-step">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all z-10",
                isCompleted && "bg-slate-700 text-white border-2 border-slate-800 shadow-sm",
                isCurrent && "bg-slate-600 text-white ring-2 ring-slate-400/50 shadow-sm",
                !isCompleted && !isCurrent && "bg-white border-2 border-slate-300 text-slate-600 shadow-sm"
              )}
            >
              {isCompleted ? (
                <Check className="w-4 h-4" />
              ) : (
                <Icon className="w-4 h-4" style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))' }} />
              )}
            </div>
            <div className={cn(
              "pb-8",
              !isCompleted && !isCurrent && "opacity-50"
            )}>
              <p className={cn(
                "font-medium text-sm",
                isCurrent && "text-slate-700"
              )}>
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LoanTrackerHorizontal({ currentStatus }: { currentStatus: LoanStatus }) {
  const currentIndex = steps.findIndex(s => s.id === currentStatus);
  const isFunded = currentStatus === "funded";
  const displaySteps = steps.slice(0, 8); // Show first 8 steps for horizontal

  return (
    <div className="w-full overflow-x-auto overflow-y-visible pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="flex items-start min-w-max gap-2 sm:gap-3 md:gap-4 px-1 sm:px-2">
        {displaySteps.map((step, index) => {
          const isCompleted = isFunded ? index <= currentIndex : index < currentIndex;
          const isCurrent = !isFunded && index === currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex flex-col items-center relative flex-shrink-0 min-w-[60px] sm:min-w-[70px] md:min-w-[80px]">
              <div
                className={cn(
                  "rounded-full flex items-center justify-center transition-all flex-shrink-0",
                  "w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10",
                  isCompleted && "bg-slate-700 text-white border-2 border-slate-800 shadow-sm",
                  isCurrent && "bg-slate-600 text-white ring-2 ring-slate-400/50 shadow-sm",
                  !isCompleted && !isCurrent && "bg-white border-2 border-slate-300 text-slate-600 shadow-sm"
                )}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                ) : (
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))' }} />
                )}
              </div>
              {index < displaySteps.length - 1 && (
                <div className={cn(
                  "absolute top-4 sm:top-[18px] md:top-5 left-8 sm:left-9 md:left-10 h-0.5 z-0",
                  "w-6 sm:w-7 md:w-8",
                  index < currentIndex ? "bg-slate-600" : "bg-slate-200"
                )} />
              )}
              <span className={cn(
                "mt-1.5 sm:mt-2 text-center w-full px-0.5",
                "text-[9px] sm:text-[10px] md:text-xs leading-tight break-words",
                isCurrent ? "font-medium text-slate-700" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Domino's Pizza-style tracker - prominent horizontal progress tracker
type DominoTrackerSize = "sm" | "lg";

const dominoSizeConfig: Record<DominoTrackerSize, {
  stageWidth: string;
  circle: string;
  icon: string;
  checkIcon: string;
  labelText: string;
  descriptionText: string;
  connectorCompleted: string;
  connectorPending: string;
  connectorMargin: string;
  connectorOffset: string;
  indicatorOffset: string;
}> = {
  sm: {
    stageWidth: "min-w-[60px] max-w-[70px] sm:min-w-[80px] sm:max-w-[100px] md:min-w-[90px] md:max-w-[110px]",
    circle: "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12",
    icon: "w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5",
    checkIcon: "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6",
    labelText: "text-[9px] sm:text-[10px] md:text-[11px] leading-tight mb-0.5 sm:mb-1",
    descriptionText: "text-[8px] sm:text-[9px] md:text-[10px] leading-tight hidden sm:block",
    connectorCompleted: "w-8 sm:w-12 md:w-16",
    connectorPending: "w-6 sm:w-8 md:w-10",
    connectorMargin: "ml-1.5 sm:ml-2 md:ml-3 mr-0",
    connectorOffset: "absolute top-1/2 -translate-y-1/2",
    indicatorOffset: "-top-2 sm:-top-2.5",
  },
  lg: {
    stageWidth: "min-w-[70px] max-w-[80px] sm:min-w-[90px] sm:max-w-[110px] md:min-w-[100px] md:max-w-[120px]",
    circle: "w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14",
    icon: "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6",
    checkIcon: "w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7",
    labelText: "text-[10px] sm:text-[11px] md:text-xs leading-tight mb-1 sm:mb-1.5",
    descriptionText: "text-[9px] sm:text-[10px] leading-tight hidden sm:block",
    connectorCompleted: "w-12 sm:w-16 md:w-20",
    connectorPending: "w-8 sm:w-10 md:w-12",
    connectorMargin: "ml-2 sm:ml-3 md:ml-4 mr-0",
    connectorOffset: "absolute top-1/2 -translate-y-1/2",
    indicatorOffset: "-top-2.5 sm:-top-3",
  },
};

export function LoanTrackerDominos({ currentStatus, size = "lg" }: { currentStatus: LoanStatus; size?: DominoTrackerSize }) {
  const sizeClasses = dominoSizeConfig[size] || dominoSizeConfig.lg;
  const currentIndex = steps.findIndex(s => s.id === currentStatus);
  const isFunded = currentStatus === "funded";
  const progressPercentage = isFunded ? 100 : ((currentIndex + 1) / steps.length) * 100;
  const currentStep = currentIndex >= 0 ? steps[currentIndex] : null;
  const CurrentIcon = currentStep?.icon;

  return (
    <div className="w-full animate-fade-up overflow-hidden">
      {/* Progress Bar Background - Institutional Style */}
      <div className="relative w-full h-4 bg-slate-100 border border-slate-200 rounded-full mb-8 overflow-visible shadow-inner">
        {/* Animated Progress Fill - Subtle Institutional Blue */}
        <div
          className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out rounded-full relative overflow-visible"
          style={{ width: `${progressPercentage}%` }}
        >
          {/* Subtle Blue Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-400 via-slate-500 to-slate-400 rounded-full shadow-sm" />
          
          {/* Subtle Inner Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-300/20 via-slate-400/30 to-slate-300/20 rounded-full" />
        </div>
        
        {/* Progress percentage indicator */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-2 text-xs font-semibold text-foreground z-20">
          {Math.round(progressPercentage)}%
        </div>
      </div>

      {/* Stages - Horizontal Scrollable Container */}
      <div className="relative w-full overflow-x-auto overflow-y-visible pb-4 scrollbar-tracker scrollbar-with-stars -mx-2 sm:-mx-4 md:mx-0 px-2 sm:px-4 md:px-0">
        <div className="flex items-center min-w-max gap-1 sm:gap-2">
          {steps.map((step, index) => {
            // If funded, all steps including the last one are completed
            const isCompleted = isFunded ? index <= currentIndex : index < currentIndex;
            const isCurrent = !isFunded && index === currentIndex;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex items-center group relative flex-shrink-0">
                <div
                  className={cn(
                    "flex flex-col items-center relative transition-all duration-500 ease-out hover:scale-105 flex-shrink-0",
                    sizeClasses.stageWidth,
                    isCurrent && "z-20"
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  {/* Stage Circle */}
                  <div
                    className={cn(
                      "relative z-10 rounded-full flex items-center justify-center transition-all duration-500 ease-out shadow-sm overflow-visible",
                      sizeClasses.circle,
                      "border-2",
                      "group-hover:shadow-md group-hover:scale-105",
                      isCompleted && "bg-slate-700 border-slate-700 text-white",
                      isCurrent && "bg-slate-700 border-slate-700 text-white",
                      !isCompleted && !isCurrent && "bg-white border-slate-300 text-slate-600 shadow-sm hover:border-slate-400"
                    )}
                  >
                    {/* Downloading Star Effects for State Icons - COMMENTED OUT */}
                    {/*
                    {(isCompleted || isCurrent) && (
                      <>
                        <div className="absolute state-icon-star state-icon-star-1 pointer-events-none" />
                        <div className="absolute state-icon-star state-icon-star-2 pointer-events-none" />
                        <div className="absolute state-icon-star state-icon-star-3 pointer-events-none" />
                        <div className="absolute state-icon-circle state-icon-circle-1 pointer-events-none" />
                        <div className="absolute state-icon-circle state-icon-circle-2 pointer-events-none" />
                      </>
                    )}
                    */}
                    
                    {/* Subtle inner highlight for completed */}
                    {isCompleted && (
                      <div className="absolute inset-0 rounded-full bg-white/10" />
                    )}
                    {/* Subtle inner highlight for current */}
                    {isCurrent && (
                      <div className="absolute inset-0 rounded-full bg-white/15" />
                    )}
                    {isCompleted ? (
                      <Check className={cn(sizeClasses.checkIcon, "relative z-10 animate-scale-in")} />
                    ) : (
                      <Icon className={cn(
                        "relative z-10 transition-transform duration-300",
                        sizeClasses.icon,
                        isCurrent && "animate-bounce-subtle"
                      )} style={{ filter: !isCompleted && !isCurrent ? 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))' : undefined }} />
                    )}
                  </div>

                  {/* Stage Label */}
                  <div className={cn(
                    "mt-4 text-center transition-all duration-500 w-full",
                    isCurrent && "scale-110"
                  )}>
                    <p className={cn(
                      "font-semibold transition-all duration-300",
                      sizeClasses.labelText,
                      isCompleted && "text-slate-700 font-semibold",
                      isCurrent && "text-slate-700 font-semibold",
                      !isCompleted && !isCurrent && "text-muted-foreground group-hover:text-foreground/70"
                    )}>
                      {step.label}
                    </p>
                    <p className={cn(
                      "transition-all duration-300",
                      sizeClasses.descriptionText,
                      isCompleted && "text-slate-600 font-normal",
                      isCurrent && "text-slate-600 font-normal",
                      !isCompleted && !isCurrent && "text-muted-foreground/60 group-hover:text-muted-foreground/80"
                    )}>
                      {step.description}
                    </p>
                  </div>

                  {/* Current Stage Indicator */}
                  {isCurrent && (
                    <div className={cn("absolute left-1/2 -translate-x-1/2 z-20", sizeClasses.indicatorOffset)}>
                      <div className="relative">
                        <div className="w-3 h-3 bg-slate-600 rounded-full" />
                      </div>
                    </div>
                  )}
                  
                  {/* Completed Stage - No glow */}
                </div>

                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <div className={cn("relative flex items-center justify-center flex-shrink-0", sizeClasses.connectorMargin)}>
                    <div className={cn(
                      "h-0.5 rounded-full transition-all duration-500 ease-out",
                      isCompleted
                        ? cn("bg-slate-700", sizeClasses.connectorCompleted)
                        : cn("bg-slate-200", sizeClasses.connectorPending)
                    )} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Stage Info */}
      {currentStep && CurrentIcon && (
        <div className={cn(
          "mt-8 p-5 rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-500 animate-fade-up",
          "hover:shadow-md hover:scale-[1.01]"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-14 h-14 rounded-sm bg-slate-700 border border-slate-800 flex items-center justify-center shadow-sm transition-all duration-300",
              "relative overflow-hidden",
              "animate-scale-in"
            )}>
              {isFunded ? (
                <Check className="w-7 h-7 relative z-10 text-white" />
              ) : (
                <CurrentIcon className="w-7 h-7 relative z-10 text-white" />
              )}
            </div>
            <div className="flex-1">
              <p className={cn(
                "font-display font-semibold text-base mb-1 transition-colors duration-300 text-foreground"
              )}>
                {isFunded ? "✓ Completed Stage" : "→ Current Stage"}: <span className="font-semibold">{currentStep.label}</span>
              </p>
              <p className="text-sm text-muted-foreground font-normal">
                {currentStep.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Full vertical tracker for loan detail page
export function LoanTrackerFull({ currentStatus }: { currentStatus: LoanStatus }) {
  const currentIndex = steps.findIndex(s => s.id === currentStatus);
  // If status is "funded" (final step), treat it as completed
  const isFunded = currentStatus === "funded";

  return (
    <div className="relative overflow-visible">
      {steps.map((step, index) => {
        // If funded, all steps including the last one are completed
        const isCompleted = isFunded ? index <= currentIndex : index < currentIndex;
        const isCurrent = !isFunded && index === currentIndex;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex gap-4 pb-6 last:pb-0 overflow-visible">
            {/* Line */}
            {index < steps.length - 1 && (
              <div className={cn(
                "absolute left-4 w-0.5 h-6 mt-8",
                isCompleted ? "bg-slate-600" : "bg-slate-200"
              )} style={{ top: `${index * 56}px` }} />
            )}
            
            {/* Icon with White Glowing Rail Circle Effect */}
            <div className="relative flex-shrink-0 w-8 h-8 overflow-visible">
              {/* Magic Glowing Star Downloading Effect - COMMENTED OUT */}
              {/*
              {(isCompleted || isCurrent) && (
                <>
                  <div className="absolute star-circle star-circle-1 pointer-events-none" />
                  <div className="absolute star-circle star-circle-2 pointer-events-none" />
                  <div className="absolute star-circle star-circle-3 pointer-events-none" />
                  
                  <div
                    className="absolute star-download star-1 pointer-events-none"
                    style={{
                      top: '50%',
                      left: '50%',
                      width: '12px',
                      height: '12px',
                    }}
                  />
                  <div
                    className="absolute star-download star-2 pointer-events-none"
                    style={{
                      top: '50%',
                      left: '50%',
                      width: '10px',
                      height: '10px',
                    }}
                  />
                  <div
                    className="absolute star-download star-3 pointer-events-none"
                    style={{
                      top: '50%',
                      left: '50%',
                      width: '14px',
                      height: '14px',
                    }}
                  />
                  <div
                    className="absolute star-download star-4 pointer-events-none"
                    style={{
                      top: '50%',
                      left: '50%',
                      width: '9px',
                      height: '9px',
                    }}
                  />
                  <div
                    className="absolute star-download star-5 pointer-events-none"
                    style={{
                      top: '50%',
                      left: '50%',
                      width: '11px',
                      height: '11px',
                    }}
                  />
                </>
              )}
              */}
              
              {/* Outer Glowing Rail Circle - Background Glow */}
              <div
                className={cn(
                  "absolute rounded-full transition-all duration-500 pointer-events-none",
                  isCompleted && "animate-pulse-rail-glow",
                  isCurrent && "animate-pulse-rail-glow-intense"
                )}
                style={{
                  width: '44px',
                  height: '44px',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  boxShadow: isCompleted 
                    ? '0 0 20px rgba(255, 255, 255, 0.6), 0 0 40px rgba(255, 255, 255, 0.4), 0 0 60px rgba(255, 255, 255, 0.2)'
                    : isCurrent
                    ? '0 0 25px rgba(255, 255, 255, 0.8), 0 0 50px rgba(255, 255, 255, 0.6), 0 0 80px rgba(255, 255, 255, 0.4), 0 0 100px rgba(255, 255, 255, 0.2)'
                    : '0 0 10px rgba(255, 255, 255, 0.3), 0 0 20px rgba(255, 255, 255, 0.2)',
                  background: isCompleted || isCurrent
                    ? 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 60%)',
                  border: isCompleted || isCurrent
                    ? '2px solid rgba(255, 255, 255, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.2)',
                }}
              />
              
              {/* Middle Glowing Rail Circle */}
              {(isCompleted || isCurrent) && (
                <div
                  className={cn(
                    "absolute rounded-full transition-all duration-500 pointer-events-none",
                    isCurrent && "animate-ping-rail"
                  )}
                  style={{
                    width: '40px',
                    height: '40px',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.2) 40%, transparent 70%)',
                    boxShadow: '0 0 15px rgba(255, 255, 255, 0.5), inset 0 0 10px rgba(255, 255, 255, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                  }}
                />
              )}
              
              {/* Icon Container */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all relative z-10 border-2 shadow-sm",
                  isCompleted && "bg-slate-700 border-slate-800 text-white",
                  isCurrent && "bg-slate-600 border-slate-700 text-white ring-2 ring-slate-400/50",
                  !isCompleted && !isCurrent && "bg-white border-slate-300 text-slate-600"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 relative z-10" />
                ) : (
                  <Icon className="w-4 h-4 relative z-10" style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))' }} />
                )}
                
                {/* Subtle inner highlight */}
                {(isCompleted || isCurrent) && (
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none bg-white/10"
                  />
                )}
              </div>
            </div>
            
            {/* Content */}
            <div className={cn(
              "flex-1 pt-1",
              !isCompleted && !isCurrent && "opacity-50"
            )}>
              <p className={cn(
                "font-medium text-sm",
                isCompleted && "text-slate-700",
                isCurrent && "text-slate-700",
                !isCompleted && !isCurrent && "text-muted-foreground"
              )}>
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

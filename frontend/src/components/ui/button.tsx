import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-300",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.96] active:shadow-md hover:[&_svg]:translate-x-0.5",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.96] active:shadow-md hover:[&_svg]:scale-110",
        outline: "border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:-translate-y-0.5 active:scale-[0.96] hover:border-primary/80 hover:[&_svg]:rotate-12",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.96] active:shadow-md hover:[&_svg]:scale-110",
        ghost: "hover:bg-accent/10 hover:text-accent-foreground hover:shadow-sm active:scale-[0.96] hover:[&_svg]:translate-x-1",
        link: "text-primary underline-offset-4 hover:underline active:scale-[0.98]",
        // Fintech-specific variants
        gold: "bg-slate-700 text-white hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.96] font-bold button-gradient-animate hover:[&_svg]:translate-x-1 hover:[&_svg]:scale-110 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700",
        navy: "bg-slate-800 text-white hover:bg-slate-900 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.96] button-gradient-animate hover:[&_svg]:translate-x-1",
        hero: "bg-slate-700 text-white hover:bg-slate-800 hover:shadow-lg hover:-translate-y-1 hover:scale-105 active:scale-[0.98] font-bold text-base px-8 py-3 h-auto button-gradient-animate hover:[&_svg]:translate-x-2 hover:[&_svg]:scale-110 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700",
        "hero-outline": "border-2 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:border-white/50 backdrop-blur-sm font-semibold text-base px-8 py-3 h-auto hover:shadow-lg active:scale-[0.98] hover:[&_svg]:translate-x-1",
        success: "bg-success text-success-foreground hover:bg-success/90 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.96] active:shadow-md hover:[&_svg]:scale-110",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([]);
    const rippleIdRef = React.useRef(0);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!asChild) {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = rippleIdRef.current++;
        
        setRipples(prev => [...prev, { id, x, y }]);
        setTimeout(() => {
          setRipples(prev => prev.filter(r => r.id !== id));
        }, 600);
      }
      
      onClick?.(e);
    };

    // When asChild is true, Slot expects exactly one child - pass children directly
    if (asChild) {
      return (
        <Comp 
          className={cn(
            buttonVariants({ variant, size, className }),
            "button-ripple"
          )} 
          ref={ref} 
          {...props}
          onClick={handleClick}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp 
        className={cn(
          buttonVariants({ variant, size, className }),
          "button-ripple"
        )} 
        ref={ref} 
        {...props}
        onClick={handleClick}
      >
        {/* Ripple Effects */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full bg-white/50 pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: '20px',
              height: '20px',
              transform: 'translate(-50%, -50%)',
              animation: 'ripple 0.6s ease-out',
            }}
          />
        ))}
        
        {/* Shimmer Overlay for Gradient Buttons */}
        {(variant === 'gold' || variant === 'hero' || variant === 'navy') && (
          <span 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer-button 2s infinite',
            }}
          />
        )}
        
        {/* Content */}
        <span className="relative z-10 flex items-center justify-center">
          {children}
        </span>
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

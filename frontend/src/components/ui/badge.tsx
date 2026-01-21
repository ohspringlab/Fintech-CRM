import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:shadow-md hover:scale-105",
        secondary: "border-transparent bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground hover:shadow-md hover:scale-105",
        destructive: "border-transparent bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground hover:shadow-md hover:scale-105",
        outline: "text-foreground border-2 hover:bg-muted/50",
        success: "border-transparent bg-gradient-to-r from-success to-success/90 text-success-foreground hover:shadow-md hover:scale-105",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

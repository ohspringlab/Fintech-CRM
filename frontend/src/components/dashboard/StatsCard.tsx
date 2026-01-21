import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  className?: string;
}

export function StatsCard({ title, value, description, icon: Icon, trend, className }: StatsCardProps) {
  return (
    <Card className={cn("transition-all duration-300 hover:shadow-elegant-lg hover:-translate-y-1 hover:border-primary/30 group", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 group-hover:bg-slate-200 transition-all duration-300 group-hover:scale-110">
            <Icon className="w-5 h-5 text-slate-700" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span className={cn(
                "text-xs font-medium",
                trend.positive ? "text-success" : "text-destructive"
              )}>
                {trend.positive ? "+" : ""}{trend.value}%
              </span>
            )}
            {description && (
              <CardDescription className="text-xs">{description}</CardDescription>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

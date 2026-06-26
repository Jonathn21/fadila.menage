import React from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: number;
  color: string;
  icon: React.ReactNode;
  loading?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  trend,
  trendValue,
  color,
  icon,
  loading = false,
  compact = false,
  onClick,
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case "down":
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      case "neutral":
        return <Minus className="h-3 w-3 text-gray-500" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      case "neutral":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const getTrendBackground = () => {
    switch (trend) {
      case "up":
        return "bg-green-500/20";
      case "down":
        return "bg-red-500/20";
      case "neutral":
        return "bg-gray-500/20";
      default:
        return "bg-gray-500/20";
    }
  };

  if (loading) {
    return (
      <Card className="overflow-hidden transition-all duration-300 h-full border border-gray-200">
        <CardContent className="p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <Skeleton className="h-3.5 sm:h-4 w-20 sm:w-24 lg:w-32" />
            <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 rounded-lg" />
          </div>
          <div className="mt-3 sm:mt-4 lg:mt-6 space-y-1.5 sm:space-y-2">
            <Skeleton className="h-6 sm:h-7 lg:h-8 w-14 sm:w-16 lg:w-20" />
            <Skeleton className="h-2.5 sm:h-3 w-16 sm:w-20 lg:w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card 
  className={cn(
    "overflow-hidden transition-all duration-300 cursor-pointer group",
    "h-full",
    "border",
    "bg-white",
    "hover:shadow-sm",
    compact ? "p-2 sm:p-3" : "p-0"
  )}
  onClick={onClick}
>
  <CardContent className={cn(
    "p-3 sm:p-4 h-full flex flex-col",
    compact && "!p-2"
  )}>
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 sm:mb-3 gap-2 sm:gap-0">
      <h3 className={cn(
        "text-xs sm:text-sm font-medium text-gray-600",
        "line-clamp-1 flex-1 pr-2"
      )}>
        {title}
      </h3>
      <div className={cn(
        "rounded-lg flex-shrink-0 flex items-center justify-center",
        color,
        compact ? "p-1.5" : "p-2 sm:p-2.5"
      )}>
        <div className={cn(
          "transition-transform duration-300 group-hover:scale-110",
          "flex items-center justify-center",
          compact ? "h-3.5 w-3.5" : "h-4 w-4 sm:h-5 sm:w-5"
        )}>
          {React.cloneElement(icon as React.ReactElement, {
            className: cn(
              "h-full w-full",
              "max-h-full max-w-full",
              "object-contain"
            )
          })}
        </div>
      </div>
    </div>

    {/* Value and Trend */}
    <div className="flex-grow">
      <div className="flex flex-col gap-1 sm:gap-1.5">
        <p className={cn(
          "font-bold text-gray-900",
          "tracking-tight",
          compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
        )}>
          {value}
        </p>
        
        {(description || trend) && (
          <div className={cn(
            "flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5",
            compact ? "mt-1" : "mt-2 sm:mt-3"
          )}>
            {trend && (
              <div className={cn(
                "flex items-center gap-1 px-1.5 py-1 rounded-full text-xs font-medium shrink-0 w-fit",
                getTrendBackground(),
                getTrendColor()
              )}>
                {getTrendIcon()}
                {trendValue && (
                  <span className="font-semibold whitespace-nowrap">
                    {trendValue > 0 ? `+${trendValue}` : trendValue}%
                  </span>
                )}
              </div>
            )}
            
            {description && (
              <p className={cn(
                "text-xs sm:text-sm text-gray-600",
                "line-clamp-2 flex-1 min-w-0",
                compact && "text-xs"
              )}>
                {description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar - Only show if not compact */}
      {trend && !compact && (
        <div className="mt-3 sm:mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 mb-1 gap-2 sm:gap-0">
            <span>Progression</span>
            {trendValue && (
              <span className={cn("font-medium", getTrendColor())}>
                {trendValue > 0 ? `+${trendValue}%` : `${trendValue}%`}
              </span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                trend === "up" && "bg-green-500",
                trend === "down" && "bg-red-500",
                trend === "neutral" && "bg-gray-500",
                "group-hover:brightness-110"
              )}
              style={{
                width: trend === "up" ? "75%" : trend === "down" ? "30%" : "50%",
              }}
            />
          </div>
        </div>
      )}
    </div>

    {/* Hover Indicator - Only show on desktop if not compact */}
    {onClick && !compact && (
      <div className="mt-3 sm:mt-4 pt-2 border-t border-gray-100 hidden sm:block">
        <div className="text-xs text-primary/70 flex items-center justify-end gap-1 transition-colors group-hover:text-primary">
          <span>Cliquer pour détails</span>
          <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    )}
  </CardContent>
</Card>
        </TooltipTrigger>
        
        {(description || trend) && (
          <TooltipContent 
            side="top" 
            align="center"
            className="max-w-xs p-3 hidden sm:block"
          >
            <div className="flex items-center gap-2">
              {trend && getTrendIcon()}
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {description}
                </p>
                {trend && trendValue && (
                  <p className={cn("text-xs font-semibold mt-1", getTrendColor())}>
                    {trend === 'up' ? 'Augmentation' : 'Diminution'} de {Math.abs(trendValue)}%
                  </p>
                )}
              </div>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

// Version alternative avec un conteneur d'icône optimisé
const IconContainer = ({ 
  children, 
  className,
  size = "md" 
}: { 
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) => {
  const sizeClasses = {
    sm: "h-6 w-6 sm:h-7 sm:w-7",
    md: "h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10",
    lg: "h-10 w-10 sm:h-12 sm:w-12"
  };

  return (
    <div className={cn(
      "rounded-lg flex items-center justify-center",
      "relative overflow-hidden",
      sizeClasses[size],
      className
    )}>
      <div className="absolute inset-0 bg-current opacity-10"></div>
      <div className="relative z-10 flex items-center justify-center p-1.5 sm:p-2">
        {React.cloneElement(children as React.ReactElement, {
          className: cn(
            "h-full w-full",
            "max-h-[80%] max-w-[80%]",
            "object-contain"
          )
        })}
      </div>
    </div>
  );
};

// Composant de conteneur pour la grille responsive
interface StatGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
}

export const StatGrid: React.FC<StatGridProps> = ({ 
  children, 
  cols = 4,
  gap = "md"
}) => {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  };

  const gapClasses = {
    sm: "gap-2 sm:gap-3",
    md: "gap-3 sm:gap-4 lg:gap-6",
    lg: "gap-4 sm:gap-6 lg:gap-8"
  };

  return (
    <div className={cn(
      "grid",
      gridCols[cols],
      gapClasses[gap]
    )}>
      {children}
    </div>
  );
};

export default StatCard;
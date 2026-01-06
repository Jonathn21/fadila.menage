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
  color: string;
  icon: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  trend,
  color,
  icon,
  loading = false,
  onClick,
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "neutral":
        return <Minus className="h-4 w-4 text-gray-500" />;
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

  if (loading) {
    return (
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card 
            className={cn(
              "overflow-hidden transition-all duration-300 cursor-pointer group",
            
              onClick && "hover:border-primary/50"
            )}
            onClick={onClick}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground tracking-wide">
                  {title}
                </h3>
                <div className={cn("p-2 rounded-lg", color)}>
                  {icon}
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {value}
                  </p>
                  
                  {(description || trend) && (
                    <div className="flex items-center gap-2 mt-2">
                      {trend && getTrendIcon()}
                      {description && (
                        <p className={cn("text-xs font-medium", getTrendColor())}>
                          {description}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {trend && !description && (
                  <div className="flex items-center gap-1">
                    {getTrendIcon()}
                  </div>
                )}
              </div>

              {/* Progress bar for trend visualization */}
              {trend && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-500",
                        trend === "up" && "bg-green-500",
                        trend === "down" && "bg-red-500",
                        trend === "neutral" && "bg-gray-500"
                      )}
                      style={{
                        width: trend === "up" ? "75%" : trend === "down" ? "30%" : "50%",
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TooltipTrigger>
        
        {description && (
          <TooltipContent>
            <div className="flex items-center gap-2">
              {trend && getTrendIcon()}
              <p className="text-sm">{description}</p>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export default StatCard;
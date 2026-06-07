// components/ScoreBadge.tsx
import React from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Star, 
  TrendingUp, 
  AlertCircle, 
  HelpCircle, 
  Crown,
  Zap,
  Award,
  Clock
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  showTooltip?: boolean;
  className?: string;
  animate?: boolean;
  showTrend?: boolean;
  trend?: "up" | "down" | "stable";
  priority?: "high" | "medium" | "low";
}

const ScoreBadge: React.FC<ScoreBadgeProps> = ({ 
  score, 
  showIcon = true, 
  size = "md",
  showTooltip = true,
  className,
  animate = false,
  showTrend = false,
  trend,
  priority
}) => {
  const getScoreConfig = (score: number) => {
    if (score >= 90) {
      return {
        variant: "default" as const,
        label: "Exceptionnel",
        icon: <Crown className="h-3 w-3 fill-current" />,
        gradient: "from-yellow-500 to-orange-500",
        bgColor: "bg-gradient-to-r from-yellow-500 to-orange-500",
        borderColor: "border-yellow-200",
        textColor: "text-white",
        description: "Candidat exceptionnel, priorité absolue",
        emoji: "🏆"
      };
    } else if (score >= 80) {
      return {
        variant: "default" as const,
        label: "Excellent",
        icon: <Award className="h-3 w-3 fill-current" />,
        gradient: "from-green-500 to-emerald-600",
        bgColor: "bg-gradient-to-r from-green-500 to-emerald-600",
        borderColor: "",
        textColor: "text-white",
        description: "Candidat excellent, fortement recommandé",
        emoji: "⭐"
      };
    } else if (score >= 70) {
      return {
        variant: "secondary" as const,
        label: "Très bon",
        icon: <Star className="h-3 w-3 fill-current" />,
        gradient: "from-blue-500 to-cyan-600",
        bgColor: "bg-gradient-to-r from-blue-500 to-cyan-600",
        borderColor: "border-blue-200",
        textColor: "text-white",
        description: "Très bon profil, à considérer sérieusement",
        emoji: "🚀"
      };
    } else if (score >= 60) {
      return {
        variant: "secondary" as const,
        label: "Bon",
        icon: <TrendingUp className="h-3 w-3" />,
        gradient: "from-indigo-500 to-purple-500",
        bgColor: "bg-gradient-to-r from-indigo-500 to-purple-500",
        borderColor: "border-indigo-200",
        textColor: "text-white",
        description: "Bon profil, entretien recommandé",
        emoji: "👍"
      };
    } else if (score >= 50) {
      return {
        variant: "outline" as const,
        label: "Moyen+",
        icon: <Zap className="h-3 w-3" />,
        gradient: "from-amber-500 to-orange-500",
        bgColor: "bg-amber-100",
        borderColor: "border-amber-300",
        textColor: "text-amber-900",
        description: "Profil intéressant, potentiel à vérifier",
        emoji: "💡"
      };
    } else if (score >= 40) {
      return {
        variant: "outline" as const,
        label: "Moyen",
        icon: <AlertCircle className="h-3 w-3" />,
        gradient: "from-yellow-400 to-amber-500",
        bgColor: "bg-yellow-100",
        borderColor: "border-yellow-300",
        textColor: "text-yellow-900",
        description: "Profil moyen, nécessite une évaluation approfondie",
        emoji: "🤔"
      };
    } else if (score >= 20) {
      return {
        variant: "destructive" as const,
        label: "Faible",
        icon: <AlertCircle className="h-3 w-3" />,
        gradient: "from-orange-500 to-red-500",
        bgColor: "bg-orange-100",
        borderColor: "border-orange-300",
        textColor: "text-orange-900",
        description: "Profil peu adapté, à reconsidérer",
        emoji: "⚠️"
      };
    } else if (score > 0) {
      return {
        variant: "destructive" as const,
        label: "Très faible",
        icon: <AlertCircle className="h-3 w-3" />,
        gradient: "from-red-500 to-rose-600",
        bgColor: "bg-red-100",
        borderColor: "border-red-300",
        textColor: "text-red-900",
        description: "Profil non adapté aux besoins du poste",
        emoji: "❌"
      };
    } else {
      return {
        variant: "outline" as const,
        label: "Non évalué",
        icon: <HelpCircle className="h-3 w-3" />,
        gradient: "from-gray-400 to-gray-500",
        bgColor: "bg-gray-100",
        borderColor: "border-gray-300",
        textColor: "text-gray-700",
        description: "Score en cours d'évaluation ou non disponible",
        emoji: "⏳"
      };
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case "down":
        return <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />;
      case "stable":
        return <Clock className="h-3 w-3 text-blue-600" />;
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      high: { label: "Élevée", color: "bg-red-100 text-red-800 border-red-200" },
      medium: { label: "Moyenne", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      low: { label: "Faible", color: "bg-green-100 text-green-800 " }
    };
    
    return config[priority as keyof typeof config] || config.medium;
  };

  const config = getScoreConfig(score);
  const priorityConfig = priority ? getPriorityBadge(priority) : null;
  
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-3 py-1 gap-1.5",
    lg: "text-base px-4 py-1.5 gap-2",
    xl: "text-lg px-5 py-2 gap-2"
  };

  const animationClass = animate ? "animate-pulse" : "";

  const badgeContent = (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge 
        variant={config.variant}
        className={cn(
          sizeClasses[size],
          config.bgColor,
          "border-2",
          config.borderColor,
          config.textColor,
          "font-semibold flex items-center transition-all duration-200 hover:scale-105",
          animationClass,
          "shadow-sm"
        )}
      >
        {showIcon && (
          <span className="flex items-center">
            {config.icon}
          </span>
        )}
        
        <span className="flex items-center gap-1">
          {score > 0 ? (
            <>
              <span className="font-bold">{score}</span>
              <span className="font-normal opacity-90">/100</span>
            </>
          ) : (
            <span>{config.label}</span>
          )}
        </span>

       
      </Badge>

      {/* Indicateur de tendance */}
      {showTrend && trend && (
        <div className={cn(
          "p-1 rounded-full border",
          trend === "up" ? "bg-green-50 " :
          trend === "down" ? "bg-red-50 border-red-200" :
          "bg-blue-50 border-blue-200"
        )}>
          {getTrendIcon(trend)}
        </div>
      )}

      {/* Badge de priorité */}
      {priority && (
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs font-medium",
            priorityConfig?.color
          )}
        >
          {priorityConfig?.label}
        </Badge>
      )}
    </div>
  );

  if (!showTooltip || score === 0) {
    return badgeContent;
  }

  const tooltipContent = (
    <div className="text-center space-y-1">
      <div className="font-semibold">{config.label}</div>
      <div className="text-sm opacity-90">{config.description}</div>
      <div className="flex items-center justify-center gap-1 text-xs opacity-75">
        <span>{config.emoji}</span>
        <span>Score: {score}/100</span>
      </div>
      {priority && (
        <div className="text-xs opacity-75">
          Priorité: {priorityConfig?.label}
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent className="max-w-[200px] text-center">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ScoreBadge;
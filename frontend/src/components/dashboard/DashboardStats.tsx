import React from "react";
import StatCard from "./StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DashboardStatsProps {
  stats: {
    title: string;
    value: string;
    description?: string;
    trend?: "up" | "down" | "neutral";
    color: string;
    icon: React.ReactNode;
    loading?: boolean;
  }[];
  loading?: boolean;
  className?: string;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  stats, 
  loading = false,
  className 
}) => {
  if (loading) {
    return (
      <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border bg-card p-3 sm:p-4 md:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4 grid-cols-2 md:grid-cols-4", className)}>
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          title={stat.title}
          value={stat.value}
          color={stat.color}
          icon={stat.icon}
        />
      ))}
    </div>
  );
};

export default DashboardStats;
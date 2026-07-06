import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight,
  Calendar,
  Clock,
  Users,
  FileText,
  Briefcase,
  Eye,
  Plus,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface OverviewTabProps {
  recentApplications: {
    id: number;
    name: string;
    domain: string;
    date: string; // YYYY-MM-DD
    status: string;
  }[];
  upcomingEvents: {
    id: number;
    title: string;
    date: string; // YYYY-MM-DD
    type: string;
    candidate?: string;
    duration?: string;
  }[];
  getStatusBadge: (status: string) => React.ReactNode;
  loading?: boolean;
}

// Format simple DD/MM/YYYY
const formatDate = (dateString?: string | null) => {
  if (!dateString) return "Date invalide";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
};

// Format de date amélioré avec jour de la semaine
const formatDateWithDay = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

const OverviewTab: React.FC<OverviewTabProps> = ({
  recentApplications,
  upcomingEvents,
  getStatusBadge,
  loading = false,
}) => {
  const getEventTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "entretien":
        return <Users className="h-4 w-4" />;
      case "réunion":
        return <Briefcase className="h-4 w-4" />;
      default:
        return <CalendarDays className="h-4 w-4" />;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "entretien":
        return "bg-blue-50 text-blue-600 border-blue-200";
      case "réunion":
        return "bg-purple-50 text-purple-600 border-purple-200";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Skeleton pour Demandes récentes */}
          <Card className="border-0 shadow-sm h-fit border border-gray-200">
            <CardHeader className="border-b p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 sm:h-6 sm:w-6 rounded" />
                  <Skeleton className="h-6 w-32 sm:w-40" />
                </div>
                <Skeleton className="h-6 w-8 sm:w-10 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <div className="flex items-center gap-3 sm:gap-4">
                          <Skeleton className="h-3 w-20 sm:w-24" />
                          <Skeleton className="h-3 w-16 sm:w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded-full ml-2 sm:ml-4" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skeleton pour Événements à venir */}
          <Card className="border-0 shadow-sm h-fit border border-gray-200">
            <CardHeader className="border-b p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 sm:h-6 sm:w-6 rounded" />
                  <Skeleton className="h-6 w-32 sm:w-40" />
                </div>
                <Skeleton className="h-6 w-8 sm:w-10 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="p-4 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-5 w-20 sm:w-24 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Grid responsive avec breakpoints optimisés */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Carte Demandes récentes */}
        <Card className="duration-200 h-fit border border-gray-200 shadow-sm ">
          <CardHeader className="border-b border-gray-200 pb-3 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
                  Demandes récentes
                </CardTitle>
              </div>
              <Badge
                variant="secondary"
                className="px-2.5 py-1 text-xs font-medium bg-secondary text-black"
              >
                {recentApplications.length}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {recentApplications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 sm:py-6 md:py-8 sm:py-12 px-4">
                <div className="p-3 bg-gray-50 rounded-full mb-3 sm:mb-4">
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                </div>
                <p className="text-sm sm:text-base font-medium text-gray-800 mb-1 sm:mb-2 text-center">
                  Aucune demande récente
                </p>
                <p className="text-xs sm:text-sm text-gray-600 text-center max-w-xs mb-4">
                  Les nouvelles demandes de stage apparaîtront ici
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {recentApplications.slice(0, 5).map((application, index) => (
                  <div
                    key={application.id}
                    className={cn(
                      "group p-4 sm:p-6 transition-all duration-200",
                      "hover:bg-gray-50/50",
                      index === 0 && "rounded-t-lg"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0">
                      <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1 sm:mb-0">
                          <h4 className="font-medium text-sm sm:text-base truncate group-hover:text-primary transition-colors">
                            {application.name}
                          </h4>
                          <span className="flex-shrink-0">
                            {getStatusBadge(application.status)}
                          </span>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-x-4 sm:gap-y-2 text-xs sm:text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5" />
                            <span className="truncate">{application.domain}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <time dateTime={application.date} className="whitespace-nowrap">
                              {formatDate(application.date)}
                            </time>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 ml-2 sm:ml-4 opacity-0 sm:opacity-100 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                        asChild
                      >
                        <Link
                          to={`/demandes/${application.id}`}
                          aria-label={`Voir les détails de ${application.name}`}
                        >
                          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          {recentApplications.length > 0 && (
            <CardFooter className="border-t border-gray-200 px-4 py-3 bg-gray-50/30">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between group text-gray-700 hover:text-primary hover:bg-gray-100 text-xs sm:text-sm"
                asChild
              >
                <Link
                  to="/demandes/toutes"
                  className="font-medium"
                >
                  <span>Voir toutes les demandes</span>
                  <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Carte Événements à venir - Désactivé pour l'instant */}
        {upcomingEvents && upcomingEvents.length > 0 && (
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 h-fit">
            <CardHeader className="border-b border-gray-200 pb-3 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
                    Événements à venir
                  </CardTitle>
                </div>
                <Badge
                  variant="secondary"
                  className="px-2.5 py-1 text-xs font-medium bg-primary text-white"
                >
                  {upcomingEvents.length}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {upcomingEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 sm:py-6 md:py-8 sm:py-12 px-4">
                  <div className="p-3 bg-gray-50 rounded-full mb-3 sm:mb-4">
                    <CalendarDays className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                  </div>
                  <p className="text-sm sm:text-base font-medium text-gray-800 mb-1 sm:mb-2 text-center">
                    Aucun événement programmé
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 text-center max-w-xs mb-4">
                    Planifiez vos entretiens et réunions à venir
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {upcomingEvents.slice(0, 5).map((event, index) => (
                    <div
                      key={event.id}
                      className={cn(
                        "group p-4 sm:p-6 transition-all duration-200",
                        "hover:bg-gray-50/50",
                        index === 0 && "rounded-t-lg"
                      )}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div
                          className={cn(
                            "flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-lg border border-gray-300 flex-shrink-0 bg-gray-50"
                          )}
                        >
                          {getEventTypeIcon(event.type)}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <h4 className="font-medium text-sm sm:text-base group-hover:text-primary transition-colors">
                              {event.title}
                            </h4>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs px-2 py-0.5 bg-gray-100 text-gray-700 border-gray-300 w-fit sm:w-auto"
                              )}
                            >
                              {event.type}
                            </Badge>
                          </div>

                          {event.candidate && (
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600">
                              <Users className="h-3.5 w-3.5" />
                              <span className="truncate">{event.candidate}</span>
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-x-4 sm:gap-y-2 text-xs sm:text-sm text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              <time dateTime={event.date} className="whitespace-nowrap">
                                {formatDateWithDay(event.date)}
                              </time>
                            </div>
                            {event.duration && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{event.duration}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

          </Card>
        )}
      </div>
    </div>
  );
};

export default OverviewTab;
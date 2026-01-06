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
} from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

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
        return <Calendar className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Skeleton pour Demandes récentes */}
          <Card className="flex flex-col min-h-0">
            <CardHeader className="flex-shrink-0">
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              <div className="space-y-4 h-full">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skeleton pour Entretiens à venir */}
          <Card className="flex flex-col min-h-0">
            <CardHeader className="flex-shrink-0">
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              <div className="space-y-4 h-full">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 border rounded-lg"
                  >
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-5 w-16" />
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
    <div className="space-y-12">
      <div className="grid gap-12 md:grid-cols-1">
        {/* Recent Applications */}
        <Card className="flex flex-col min-h-0 h-fit">
          <CardHeader className="flex flex-row items-center justify-between pb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Demandes récentes</CardTitle>
            </div>
            <Badge variant="outline" className="px-2 py-1">
              {recentApplications.length}
            </Badge>
          </CardHeader>
          
          <CardContent className="p-0 flex-1 min-h-0">
            {recentApplications.length === 0 ? (
              <div className="text-center py-8 px-4 flex flex-col items-center justify-center h-full min-h-[200px]">
                <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-3">
                  Aucune demande récente
                </p>
                
              </div>
            ) : (
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {recentApplications.slice(0, 5).map((application) => (
                  <div
                    key={application.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {application.name}
                        </h4>
                        {getStatusBadge(application.status)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Briefcase className="h-3 w-3" />
                        <span className="truncate">{application.domain}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(application.date)}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 ml-2"
                      asChild
                    >
                      <Link to={`/demandes/${application.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          
          {recentApplications.length > 0 && (
            <CardFooter className="border-t px-4 py-3 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center"
                asChild
              >
                <Link to="/internships/pending" className="text-xs">
                  Voir toutes les demandes
                  <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Upcoming Events 
        <Card className="flex flex-col min-h-0 h-fit">
          <CardHeader className="flex flex-row items-center justify-between pb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Entretiens à venir</CardTitle>
            </div>
            <Badge variant="outline" className="px-2 py-1">
              {upcomingEvents.length}
            </Badge>
          </CardHeader>
          
          <CardContent className="p-0 flex-1 min-h-0">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 px-4 flex flex-col items-center justify-center h-full min-h-[200px]">
                <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Aucun entretien programmé
                </p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {upcomingEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="p-4 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 shrink-0 mt-0.5">
                        {getEventTypeIcon(event.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm mb-1">{event.title}</h4>

                        {event.candidate && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Users className="h-3 w-3" />
                            <span className="truncate">Avec {event.candidate}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(event.date)}</span>
                          {event.duration && (
                            <>
                              <span>•</span>
                              <span>{event.duration}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          
          {upcomingEvents.length > 0 && (
            <CardFooter className="border-t px-4 py-3 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center"
                asChild
              >
                <Link to="/calendar" className="text-xs">
                  Voir le calendrier complet
                  <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </CardFooter>
          )}
        </Card>*/}
      </div>
    </div>
  );
};

export default OverviewTab;
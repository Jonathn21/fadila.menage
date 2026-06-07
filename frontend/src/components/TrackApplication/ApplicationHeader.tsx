// components/TrackApplication/ApplicationHeader.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { ApplicationStatus } from "./types";

interface ApplicationHeaderProps {
  application: ApplicationStatus;
}

export const ApplicationHeader: React.FC<ApplicationHeaderProps> = ({ application }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Non définie";
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <StatusBadge status={application.statut_stage} />
            <div>
              <CardTitle className="text-lg sm:text-xl">État de votre demande</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Code de suivi: {application.tracking_id}
                {application.statut_detaille && ` • ${application.statut_detaille}`}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            <span><strong>Soumise le:</strong> {formatDate(application.date_soumission)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            <span><strong>Dernière mise à jour:</strong> {formatDate(application.date_maj)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
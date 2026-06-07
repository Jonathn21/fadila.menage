// components/TrackApplication/AdditionalInfo.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { GraduationCap, Mail, Phone, MapPin } from "lucide-react";
import { ApplicationStatus } from "./types";

interface AdditionalInfoProps {
  application: ApplicationStatus;
  isEditing?: boolean;
}

export const AdditionalInfo: React.FC<AdditionalInfoProps> = ({ 
  application,
  isEditing = false 
}) => {
  const renderField = (label: string, value: string, placeholder: string = "Non renseigné") => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="text-sm p-2 bg-muted rounded-md min-h-[40px] flex items-center">
        {value || <span className="text-muted-foreground">{placeholder}</span>}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
          Informations complémentaires
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Section 1: Étudiant */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {renderField("Spécialité", application.stagiaire.specialite || "")}
            {renderField("Niveau d'étude", application.stagiaire.niveau || "")}
            {renderField("Type de stage demandé", application.type_stage)}
          </div>
          
          {/* Section 2: Établissement */}
          {application.etablissement && (
            <div className="border-t pt-4 sm:pt-6">
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Établissement scolaire</h4>
              <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
                <p className="font-medium text-sm mb-2">{application.etablissement.nom}</p>
                <div className="space-y-2 text-xs sm:text-sm">
                  {application.etablissement.adresse && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span>{application.etablissement.adresse}</span>
                    </div>
                  )}
                  {application.etablissement.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <a 
                        href={`mailto:${application.etablissement.email}`}
                        className="text-primary hover:underline"
                      >
                        {application.etablissement.email}
                      </a>
                    </div>
                  )}
                  {application.etablissement.telephone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <a 
                        href={`tel:${application.etablissement.telephone}`}
                        className="text-primary hover:underline"
                      >
                        {application.etablissement.telephone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
// components/TrackApplication/StageInfo.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building,
  MapPin,
  Briefcase,
  Users,
  Coins,
  CalendarDays,
  Clock as ClockIcon,
  GraduationCap,
  FileCheck,
  Eye,
  Download,
  Award
} from "lucide-react";
import { Stage } from "./types";

interface StageInfoProps {
  stage: Stage;
}

export const StageInfo: React.FC<StageInfoProps> = ({ stage }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Non définie";
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  const getStageStatusColor = (status: string) => {
    switch (status) {
      case "Actuel":
        return "bg-green-100 text-green-800 ";
      case "Terminé":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "À venir":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const renderStageField = (
    label: string,
    value: string | number | boolean | undefined,
    icon?: React.ReactNode,
    placeholder: string = "Non renseigné"
  ) => {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon && icon}
          <span>{label}</span>
        </div>
        <div className="text-sm font-medium p-2 bg-muted/50 rounded-md min-h-[36px] flex items-center">
          {typeof value === 'boolean' 
            ? (value ? 'Oui' : 'Non')
            : (value || <span className="text-muted-foreground italic">{placeholder}</span>)
          }
        </div>
      </div>
    );
  };

  const handleViewDocument = (doc: any) => {
    window.open(doc.url, '_blank');
  };

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <div>
              <CardTitle className="text-lg sm:text-xl">Informations concernant votre stage</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Détails de votre stage à la CEB
              </p>
            </div>
          </div>
          <Badge 
            className={`text-xs sm:text-sm ${getStageStatusColor(stage.statut_actuel)}`}
          >
            {stage.statut_actuel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Dates et Durée */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-sm sm:text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Période du stage
            </h4>
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between text-sm gap-2 sm:gap-0">
                <span className="text-muted-foreground">Début:</span>
                <span className="font-medium">{formatDate(stage.date_debut)}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between text-sm gap-2 sm:gap-0">
                <span className="text-muted-foreground">Fin:</span>
                <span className="font-medium">{formatDate(stage.date_fin)}</span>
              </div>
              {stage.date_accord && (
                <div className="flex flex-col sm:flex-row sm:justify-between text-sm gap-2 sm:gap-0">
                  <span className="text-muted-foreground">Accordé le:</span>
                  <span className="font-medium">{formatDate(stage.date_accord)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm sm:text-base flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-primary" />
              Durée
            </h4>
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between text-sm gap-2 sm:gap-0">
                <span className="text-muted-foreground">En jours:</span>
                <span className="font-medium">{stage.duree_jours} jours</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between text-sm gap-2 sm:gap-0">
                <span className="text-muted-foreground">En mois:</span>
                <span className="font-medium">{stage.duree_mois} mois</span>
              </div>
              {stage.jours_restants !== undefined && (
                <div className="flex flex-col sm:flex-row sm:justify-between text-sm gap-2 sm:gap-0">
                  <span className="text-muted-foreground">Jours restants:</span>
                  <span className="font-medium">{stage.jours_restants} jours</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm sm:text-base flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              Rémunération
            </h4>
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between text-sm gap-2 sm:gap-0">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium">{stage.remunere ? "Payant" : "Non rémunéré"}</span>
              </div>
              {stage.remunere && stage.montant_remuneration && (
                <div className="flex flex-col sm:flex-row sm:justify-between text-sm gap-2 sm:gap-0">
                  <span className="text-muted-foreground">Montant:</span>
                  <span className="font-medium text-green-600">
                    {stage.montant_remuneration.toLocaleString()} FCFA
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-sm sm:text-base flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" />
              Lieu de stage
            </h4>
            <div className="space-y-2">
              {renderStageField("Direction", stage.direction, <Briefcase className="h-3 w-3" />)}
              {renderStageField("Service", stage.service, <Users className="h-3 w-3" />)}
              {renderStageField("Lieu", stage.lieu_stage, <MapPin className="h-3 w-3" />)}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm sm:text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Détails du stagiaire
            </h4>
            <div className="space-y-2">
              {renderStageField("Niveau d'études", stage.niveau_etude, <GraduationCap className="h-3 w-3" />)}
              {renderStageField("Spécialité", stage.specialite, <Briefcase className="h-3 w-3" />)}
              {renderStageField("Type de stage", stage.type_stage, <FileCheck className="h-3 w-3" />)}
            </div>
          </div>
        </div>

        {/* Convention de stage */}
        {stage.convention && (
          <div className="border-t pt-4 sm:pt-6">
            <h4 className="font-medium text-sm sm:text-base flex items-center gap-2 mb-4">
              <FileCheck className="h-4 w-4 text-primary" />
              Convention de stage
            </h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-blue-800">
                    N° {stage.convention.numero_convention}
                  </p>
                  <p className="text-sm text-blue-700">
                    {stage.convention.est_temporaire ? 
                      "Convention temporaire (à signer)" : 
                      "Convention définitive"}
                  </p>
                  {stage.convention.date_creation && (
                    <p className="text-xs text-blue-600">
                      Créée le: {formatDate(stage.convention.date_creation)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDocument({
                      nom: `Convention de stage ${stage.convention.numero_convention}`,
                      url: stage.convention.fichier_url,
                      type: 'convention'
                    })}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Voir
                  </Button>
                  <Button
                    size="sm"
                    asChild
                  >
                    <a 
                      href={stage.convention.fichier_url} 
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Télécharger
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attestation de stage */}
        {stage.attestation && (
          <div className="border-t pt-4 sm:pt-6">
            <h4 className="font-medium text-sm sm:text-base flex items-center gap-2 mb-4">
              <Award className="h-4 w-4 text-primary" />
              Attestation de stage
            </h4>
            <div className="bg-green-50 border  rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-green-800">
                    Attestation générée
                  </p>
                  {stage.attestation.date_generation && (
                    <p className="text-sm text-green-700">
                      Générée le: {formatDate(stage.attestation.date_generation)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDocument({
                      nom: `Attestation de stage`,
                      url: stage.attestation.fichier_url,
                      type: 'attestation'
                    })}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Voir
                  </Button>
                  <Button
                    size="sm"
                    asChild
                  >
                    <a 
                      href={stage.attestation.fichier_url} 
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Télécharger
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
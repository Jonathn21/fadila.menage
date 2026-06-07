// components/ScoreDetailsModal.tsx
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Star, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  Zap,
  Lightbulb,
  Target
} from "lucide-react";
import ScoreBadge from "./ScoreBadge";

interface ScoreDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  score: number;
  details: any;
  commentaire: string;
  candidatNom: string;
}

const ScoreDetailsModal: React.FC<ScoreDetailsModalProps> = ({
  open,
  onOpenChange,
  score,
  details,
  commentaire,
  candidatNom
}) => {
  if (!details) return null;

  const criteres = [
    { 
      key: "adequation_profil", 
      label: "Adéquation profil", 
      max: 30,
      icon: Target,
      description: "Correspondance avec le poste"
    },
    { 
      key: "qualite_cv", 
      label: "Qualité du CV", 
      max: 25,
      icon: FileText,
      description: "Structure et clarté"
    },
    { 
      key: "experience", 
      label: "Expérience", 
      max: 20,
      icon: TrendingUp,
      description: "Pertinence et durée"
    },
    { 
      key: "motivation", 
      label: "Motivation", 
      max: 15,
      icon: Zap,
      description: "Intérêt et alignement"
    },
    { 
      key: "potentiel", 
      label: "Potentiel", 
      max: 10,
      icon: Lightbulb,
      description: "Capacité d'évolution"
    },
  ];

  const meta = details.meta || {};

  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case "ÉLEVÉ": return "text-red-600 bg-red-50 border-red-200";
      case "MOYEN": return "text-orange-600 bg-orange-50 border-orange-200";
      case "FAIBLE": return "text-green-600 bg-green-50 ";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getRecommandationVariant = (recommandation: string) => {
    switch (recommandation) {
      case "ACCEPTER": return "default";
      case "ENTRETIEN": return "secondary";
      case "REFUSER": return "destructive";
      default: return "outline";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Star className="h-5 w-5 text-blue-600" />
                Analyse IA - {candidatNom}
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Évaluation détaillée de la candidature par notre intelligence artificielle
              </DialogDescription>
            </div>
            <div className="flex items-center gap-3">
              <ScoreBadge 
                score={score} 
                showIcon={true} 
                size="lg" 
                className="shadow-sm"
              />
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-140px)]">
          <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
            {/* Score Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border rounded-lg p-4 text-center">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">{score}/100</div>
                <div className="text-xs text-muted-foreground">Score global</div>
              </div>
              <div className="bg-white border rounded-lg p-4 text-center">
                <div className="text-lg font-semibold text-orange-600 capitalize">
                  {meta.niveau_priorite || "Moyenne"}
                </div>
                <div className="text-xs text-muted-foreground">Priorité</div>
              </div>
              
            </div>

            {/* Commentaire global */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">Avis Global de l'IA</h3>
                  <p className="text-sm text-blue-800 leading-relaxed">{commentaire}</p>
                </div>
              </div>
            </div>

            {/* Breakdown par critère */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-gray-600" />
                Détail des Critères d'Évaluation
              </h3>
              <div className="space-y-4">
                {criteres.map((critere) => {
                  const data = details[critere.key] || {};
                  const scoreValue = data.score || 0;
                  const percentage = (scoreValue / critere.max) * 100;
                  const IconComponent = critere.icon;

                  return (
                    <div key={critere.key} className="space-y-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0">
                        <div className="flex items-start gap-3 flex-1">
                          <IconComponent className="h-4 w-4 text-gray-500 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 gap-2 sm:gap-0">
                              <span className="font-medium text-sm">{critere.label}</span>
                              <Badge variant="secondary" className="ml-2">
                                {Math.round(scoreValue)}/{critere.max} pts
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {critere.description}
                            </p>
                            <Progress 
                              value={percentage} 
                              className={`h-2 ${
                                percentage >= 80 ? "bg-green-500" :
                                percentage >= 60 ? "bg-blue-500" :
                                percentage >= 40 ? "bg-yellow-500" :
                                "bg-red-500"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                      {data.justification && (
                        <p className="text-xs text-muted-foreground bg-white p-2 rounded border">
                          💡 {data.justification}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Points forts et améliorations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 border  rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">Points Forts</h3>
                </div>
                <ul className="space-y-2">
                  {(meta.points_forts || []).map((point: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-green-800 leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-900">Points d'Amélioration</h3>
                </div>
                <ul className="space-y-2">
                  {(meta.points_amelioration || []).map((point: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-orange-800 leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// Composant FileText manquant - à ajouter
const FileText = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
    />
  </svg>
);

export default ScoreDetailsModal;
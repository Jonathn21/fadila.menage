import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Clock, BookOpen, Eye, Trash2, Search, Filter, Users, 
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, 
  RefreshCw, Calendar, Award, AlertCircle, TrendingUp, CheckCircle 
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import {
  genderOptions,
  internshipTypeOptions,
  directionOptions,
  serviceOptions,
} from "@/data/internships";
import apiClient from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";

// ==============================
// INTERFACES ET TYPES
// ==============================

interface Stagiaire {
  id: number;
  nom: string;
  prenom: string;
  genre: string;
  specialite: string;
  niveau_etude: string;
  type_stage: string;
  direction: string;
  service: string;
  date_debut: string;
  date_fin: string;
}

type SortField = keyof Stagiaire | "nom_complet";
type SortDirection = "asc" | "desc" | null;

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

interface Column {
  key: string;
  label: string;
  sortable: boolean;
  render?: (value: unknown, item: Stagiaire) => React.ReactNode;
}

interface PageConfig {
  title: string;
  description: string;
  endpoint: string;
  errorMessage: string;
  emptyMessage: string;
  emptyIcon: React.ReactNode;
  defaultSort: { field: SortField; direction: SortDirection };
  cardBorderColor?: string;
  getColumns: (helpers: ColumnHelpers) => Column[];
  getMobileCardBadge?: (stagiaire: Stagiaire, helpers: MobileHelpers) => React.ReactNode;
  getMobileCardDetails?: (stagiaire: Stagiaire, helpers: MobileHelpers) => React.ReactNode;
}

interface ColumnHelpers {
  handleViewDetails: (id: number) => void;
  handleDelete: (id: number) => void;
  formatDate: (date: string) => string;
  calculateDaysUntilStart?: (date: string) => number;
  calculateDaysLeft?: (date: string) => number;
  calculateDaysSinceCompletion?: (date: string) => number | null;
  calculateProgress?: (dateDebut: string, dateFin: string) => number;
  calculateDuration: (dateDebut: string, dateFin: string) => number;
}

type MobileHelpers = ColumnHelpers

// ==============================
// FONCTIONS POUR LES COULEURS DES BADGES
// ==============================

const getDaysBadgeVariant = (days: number, type: 'start' | 'end'): string => {
  if (type === 'start') {
    return days < 7 
      ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' 
      : days < 30
      ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100';
  } else {
    return days < 7 
      ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' 
      : days < 30
      ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
  }
};

const getProgressColor = (progress: number): string => {
  if (progress >= 75) return 'bg-green-500';
  if (progress >= 50) return 'bg-yellow-500';
  if (progress >= 25) return 'bg-orange-500';
  return 'bg-red-500';
};

// ==============================
// CONFIGURATION DES PAGES
// ==============================

const getPageConfigs = (helpers: ColumnHelpers): Record<string, PageConfig> => ({
  upcoming: {
    title: "Stages prochains",
    description: "Consultez et gérez les stages programmés à venir",
    endpoint: "/stages/prochains/",
    errorMessage: "Impossible de charger les stages prochains.",
    emptyMessage: "Aucun stage programmé",
    emptyIcon: (
          <div className="flex items-center justify-center">
            <Users className="h-12 w-12 text-gray-400" />
          </div>
        ),
    defaultSort: { field: "date_debut", direction: "asc" },
    cardBorderColor: "border-blue-200 hover:border-blue-300",
    getColumns: (h) => [
      { 
        key: "nom", 
        label: "Stagiaire",
        sortable: true,
        render: (value: string, item: Stagiaire) => (
          <div className="flex flex-col min-w-0 max-w-[140px]">
            <span className="font-medium text-sm sm:text-base truncate text-gray-900">
              {item.nom} {item.prenom}
            </span>
            <span className="text-xs text-gray-600 truncate">{item.specialite}</span>
          </div>
        ),
      },
      { 
        key: "genre", 
        label: "Genre",
        sortable: true,
        render: (value: string) => (
          <div className="max-w-[70px]">
            <Badge variant="outline" className="capitalize px-2 py-0.5 text-xs sm:text-sm whitespace-nowrap truncate bg-gray-50 text-gray-700 w-full">
              {value}
            </Badge>
          </div>
        ),
      },
      { 
        key: "niveau_etude", 
        label: "Niveau",
        sortable: true,
        render: (value: string) => (
          <div className="max-w-[80px]">
            <span className="text-xs sm:text-sm whitespace-nowrap truncate block text-gray-800">{value}</span>
          </div>
        ),
      },
      {
        key: "type_stage",
        label: "Type",
        sortable: true,
        render: (value: string) => (
          <div className="flex items-center min-w-0 max-w-[90px]">
            <BookOpen className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-gray-600 flex-shrink-0" />
            <span className="text-xs sm:text-sm truncate text-gray-800">{value}</span>
          </div>
        ),
      },
      {
        key: "direction",
        label: "Direction",
        sortable: true,
        render: (value: string) => (
          <div className="max-w-[110px]">
            <span className="text-xs sm:text-sm whitespace-nowrap truncate block text-gray-800">{value}</span>
          </div>
        ),
      },
      {
        key: "service",
        label: "Service",
        sortable: true,
        render: (value: string) => (
          <div className="max-w-[120px]">
            <span className="text-xs sm:text-sm whitespace-nowrap truncate block text-gray-800">{value}</span>
          </div>
        ),
      },
      {
        key: "date_debut",
        label: "Début",
        sortable: true,
        render: (value: string) => {
          const daysUntilStart = h.calculateDaysUntilStart!(value);
          
          return (
            <div className="flex flex-col min-w-0 max-w-[110px]">
              <div className="flex items-center">
                <Calendar className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-gray-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm whitespace-nowrap text-gray-700 font-medium truncate">
                  {h.formatDate(value)}
                </span>
              </div>
              {daysUntilStart !== null && (
                <Badge 
                  className={`mt-1 text-[10px] px-1.5 py-0.5 w-fit truncate transition-colors ${getDaysBadgeVariant(daysUntilStart, 'start')}`}
                >
                  {daysUntilStart > 0 ? `Dans ${daysUntilStart}j` : "Aujourd'hui"}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        key: "duration",
        label: "Durée",
        sortable: false,
        render: (_: unknown, item: Stagiaire) => {
          const duration = h.calculateDuration(item.date_debut, item.date_fin);
          
          return (
            <div className="flex flex-col min-w-0 max-w-[90px]">
              <div className="flex items-center">
                <Clock className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-gray-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-800 truncate">{duration}j</span>
              </div>
              <span className="text-[10px] text-gray-600 mt-0.5 truncate">
                Fin: {h.formatDate(item.date_fin)}
              </span>
            </div>
          );
        },
      },
      {
        key: "actions",
        label: "",
        sortable: false,
        render: (_: unknown, item: Stagiaire) => (
          <div className="flex space-x-1 justify-end">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => h.handleViewDetails(item.id)}
              title="Voir les détails"
              className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-gray-50 text-gray-700 hover:text-gray-800"
            >
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => h.handleDelete(item.id)}
              className="h-7 w-7 sm:h-8 sm:w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        ),
      },
    ],
    getMobileCardBadge: (stagiaire, h) => {
      const daysUntilStart = h.calculateDaysUntilStart!(stagiaire.date_debut);
      return (
        <Badge 
          variant="outline" 
          className={`capitalize px-2 py-0.5 text-xs shrink-0 transition-colors ${getDaysBadgeVariant(daysUntilStart, 'start')}`}
        >
          {daysUntilStart > 0 ? `Dans ${daysUntilStart}j` : "Aujourd'hui"}
        </Badge>
      );
    },
    getMobileCardDetails: (stagiaire, h) => {
      const daysUntilStart = h.calculateDaysUntilStart!(stagiaire.date_debut);
      const duration = h.calculateDuration(stagiaire.date_debut, stagiaire.date_fin);
      
      return (
        <div className={`p-2 rounded text-xs ${
          daysUntilStart < 7 
            ? 'bg-red-50 text-red-800 border border-red-200' 
            : daysUntilStart < 30
            ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
            : 'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span className="font-medium">Planning du stage</span>
            </div>
            <span className="text-[10px] font-medium text-gray-700">{duration} jours</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex items-center text-[10px]">
              <span className="font-medium mr-1">Début:</span>
              <span>{h.formatDate(stagiaire.date_debut)}</span>
            </div>
            <div className="flex items-center text-[10px] justify-end">
              <span className="font-medium mr-1">Fin:</span>
              <span>{h.formatDate(stagiaire.date_fin)}</span>
            </div>
          </div>
          
          {daysUntilStart < 7 && (
            <div className="mt-2 flex items-start gap-1 text-[10px] opacity-80 border-t border-red-200 pt-1">
              <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5 text-red-600" />
              <span><span className="font-medium">Début imminent:</span> Préparer l'accueil</span>
            </div>
          )}
          {daysUntilStart >= 7 && daysUntilStart < 30 && (
            <p className="mt-1 text-[10px] opacity-80 border-t border-yellow-200 pt-1">
              <span className="font-medium">Début prochain:</span> À venir
            </p>
          )}
        </div>
      );
    },
  },

  ongoing: {
    title: "Stages en cours",
    description: "Suivez et gérez les stages actuellement en cours",
    endpoint: "/stages/en-cours/",
    errorMessage: "Impossible de charger les stages en cours.",
    emptyMessage: "Aucun stage en cours",
    emptyIcon: (
          <div className="flex items-center justify-center">
            <Users className="h-12 w-12 text-gray-400" />
          </div>
        ),    
    defaultSort: { field: "date_fin", direction: "asc" },
    cardBorderColor: "border-green-200 hover:border-green-300",
    getColumns: (h) => [
      { 
        key: "nom", 
        label: "Stagiaire",
        sortable: true,
        render: (value: string, item: Stagiaire) => (
          <div className="flex flex-col min-w-0 max-w-[150px]">
            <span className="font-medium text-sm sm:text-base truncate text-gray-900">
              {item.nom} {item.prenom}
            </span>
            <span className="text-xs text-gray-600 truncate">{item.specialite}</span>
          </div>
        ),
      },
      { 
        key: "genre", 
        label: "Genre",
        sortable: true,
        render: (value: string) => (
          <Badge variant="outline" className="capitalize px-2 py-0.5 text-xs sm:text-sm whitespace-nowrap bg-gray-50 text-gray-700">
            {value}
          </Badge>
        ),
      },
      { 
        key: "niveau_etude", 
        label: "Niveau",
        sortable: true,
        render: (value: string) => (
          <span className="text-xs sm:text-sm whitespace-nowrap text-gray-800">{value}</span>
        ),
      },
      {
        key: "type_stage",
        label: "Type",
        sortable: true,
        render: (value: string) => (
          <div className="flex items-center min-w-0 max-w-[100px]">
            <BookOpen className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-gray-600 flex-shrink-0" />
            <span className="text-xs sm:text-sm truncate text-gray-800">{value}</span>
          </div>
        ),
      },
      {
        key: "direction",
        label: "Direction",
        sortable: true,
        render: (value: string) => (
          <div className="max-w-[120px]">
            <span className="text-xs sm:text-sm whitespace-nowrap truncate block text-gray-800">{value}</span>
          </div>
        ),
      },
      {
        key: "service",
        label: "Service",
        sortable: true,
        render: (value: string) => (
          <div className="max-w-[120px] sm:max-w-[150px]">
            <span className="text-xs sm:text-sm whitespace-nowrap truncate block text-gray-800">{value}</span>
          </div>
        ),
      },
      {
        key: "date_fin",
        label: "Fin",
        sortable: true,
        render: (value: string, item: Stagiaire) => {
          const daysLeft = h.calculateDaysLeft!(value);
          
          return (
            <div className="flex flex-col min-w-0 max-w-[120px]">
              <div className="flex items-center">
                <Calendar className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-gray-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm whitespace-nowrap text-gray-700 font-medium">
                  {h.formatDate(value)}
                </span>
              </div>
              {daysLeft !== null && (
                <Badge 
                  className={`mt-1 text-[10px] px-1.5 py-0.5 w-fit truncate transition-colors ${getDaysBadgeVariant(daysLeft, 'end')}`}
                >
                  {daysLeft}j restant
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        key: "progress",
        label: "Prog.",
        sortable: false,
        render: (_: unknown, item: Stagiaire) => {
          const progress = h.calculateProgress!(item.date_debut, item.date_fin);
          
          return (
            <div className="flex flex-col min-w-0 max-w-[80px]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs mb-1 gap-2 sm:gap-0">
                <span className="font-medium text-gray-800">{progress}%</span>
              </div>
              <Progress 
                value={progress} 
                className="h-1.5 sm:h-2 bg-gray-100"
                indicatorClassName={getProgressColor(progress)}
              />
            </div>
          );
        },
      },
      {
        key: "actions",
        label: "",
        sortable: false,
        render: (_: unknown, item: Stagiaire) => (
          <div className="flex space-x-1 justify-end">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => h.handleViewDetails(item.id)}
              title="Voir les détails"
              className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-gray-50 text-gray-700 hover:text-gray-800"
            >
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => h.handleDelete(item.id)}
              className="h-7 w-7 sm:h-8 sm:w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        ),
      },
    ],
    getMobileCardBadge: (stagiaire, h) => {
      const daysLeft = h.calculateDaysLeft!(stagiaire.date_fin);
      return (
        <Badge 
          variant="outline" 
          className={`capitalize px-2 py-0.5 text-xs shrink-0 transition-colors ${getDaysBadgeVariant(daysLeft, 'end')}`}
        >
          {daysLeft}j
        </Badge>
      );
    },
    getMobileCardDetails: (stagiaire, h) => {
      const daysLeft = h.calculateDaysLeft!(stagiaire.date_fin);
      const progress = h.calculateProgress!(stagiaire.date_debut, stagiaire.date_fin);
      
      return (
        <>
          <div className="space-y-1">
            <div className="flex flex-col sm:flex-row sm:justify-between text-xs gap-2 sm:gap-0">
              <span className="font-medium text-gray-700">Progression du stage</span>
              <span className="text-gray-800">{progress}%</span>
            </div>
            <Progress 
              value={progress} 
              className="h-1.5 bg-gray-100"
              indicatorClassName={getProgressColor(progress)}
            />
          </div>

          <div className={`p-2 rounded text-xs ${
            daysLeft < 7 
              ? 'bg-red-50 text-red-800 border border-red-200' 
              : daysLeft < 30
              ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
              : 'bg-green-50 text-green-800 border border-green-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span className="font-medium">Dates du stage</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="flex items-center text-[10px]">
                <span className="font-medium mr-1">Début:</span>
                <span>{h.formatDate(stagiaire.date_debut)}</span>
              </div>
              <div className="flex items-center text-[10px] justify-end">
                <span className="font-medium mr-1">Fin:</span>
                <span>{h.formatDate(stagiaire.date_fin)}</span>
              </div>
            </div>
            
            {daysLeft < 7 && (
              <p className="mt-1 text-[10px] opacity-80 border-t border-red-200 pt-1">
                <span className="font-medium">Fin imminente:</span> Préparer l'évaluation
              </p>
            )}
            {daysLeft >= 7 && daysLeft < 30 && (
              <p className="mt-1 text-[10px] opacity-80 border-t border-yellow-200 pt-1">
                <span className="font-medium">Fin prochaine:</span> Bientôt terminé
              </p>
            )}
          </div>
        </>
      );
    },
  },

  completed: {
    title: "Stages terminés",
    description: "Consultez l'historique des stages terminés avec succès",
    endpoint: "/stages/termines/",
    errorMessage: "Impossible de charger les stages terminés.",
    emptyMessage: "Aucun stage terminé",
    emptyIcon: (
          <div className="flex items-center justify-center">
            <Users className="h-12 w-12 text-gray-400" />
          </div>
        ),    
    defaultSort: { field: "date_fin", direction: "desc" },
    cardBorderColor: "border-purple-200 hover:border-purple-300",
    getColumns: (h) => [
      { 
        key: "nom", 
        label: "Stagiaire",
        sortable: true,
        render: (value: string, item: Stagiaire) => (
          <div className="flex flex-col min-w-0 max-w-[140px]">
            <span className="font-medium text-sm sm:text-base truncate text-gray-900">
              {item.nom} {item.prenom}
            </span>
            <span className="text-xs text-gray-600 truncate">{item.specialite}</span>
          </div>
        ),
      },
      { 
        key: "genre", 
        label: "Genre",
        sortable: true,
        render: (value: string) => (
          <div className="max-w-[70px]">
            <Badge variant="outline" className="capitalize px-2 py-0.5 text-xs sm:text-sm whitespace-nowrap truncate bg-gray-50 text-gray-700 w-full">
              {value}
            </Badge>
          </div>
        ),
      },
      { 
        key: "niveau_etude", 
        label: "Niveau",
        sortable: true,
        render: (value: string) => (
          <div className="max-w-[80px]">
            <span className="text-xs sm:text-sm whitespace-nowrap truncate block text-gray-800">{value}</span>
          </div>
        ),
      },
      {
        key: "type_stage",
        label: "Type",
        sortable: true,
        render: (value: string) => (
          <div className="flex items-center min-w-0 max-w-[90px]">
            <BookOpen className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-gray-600 flex-shrink-0" />
            <span className="text-xs sm:text-sm truncate text-gray-800">{value}</span>
          </div>
        ),
      },
      {
        key: "direction",
        label: "Direction",
        sortable: true,
        render: (value: string) => (
          <div className="max-w-[110px]">
            <span className="text-xs sm:text-sm whitespace-nowrap truncate block text-gray-800">{value}</span>
          </div>
        ),
      },
      {
        key: "service",
        label: "Service",
        sortable: true,
        render: (value: string) => (
          <div className="max-w-[120px]">
            <span className="text-xs sm:text-sm whitespace-nowrap truncate block text-gray-800">{value}</span>
          </div>
        ),
      },
      {
        key: "date_fin",
        label: "Date de fin",
        sortable: true,
        render: (value: string, item: Stagiaire) => {
          const daysSinceCompletion = h.calculateDaysSinceCompletion!(value);
          const duration = h.calculateDuration(item.date_debut, value);
          
          return (
            <div className="flex flex-col min-w-0 max-w-[110px]">
              <div className="flex items-center">
                <span className="text-xs sm:text-sm whitespace-nowrap font-medium truncate">
                  {h.formatDate(value)}
                </span>
              </div>
              {daysSinceCompletion !== null && (
                <div className="flex flex-col mt-1 space-y-0.5">
                  <span className="text-[10px] text-gray-600 truncate">
                    Finie il y a {daysSinceCompletion}j
                  </span>
                  
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: "actions",
        label: "",
        sortable: false,
        render: (_: unknown, item: Stagiaire) => (
          <div className="flex space-x-1 justify-end">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => h.handleViewDetails(item.id)}
              title="Voir les détails"
              className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-gray-50 text-gray-700 hover:text-gray-800"
            >
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => h.handleDelete(item.id)}
              className="h-7 w-7 sm:h-8 sm:w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        ),
      },
    ],
    getMobileCardBadge: () => (
      <Badge 
        variant="outline" 
        className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 border-purple-200 transition-colors"
      >
        <CheckCircle className="h-3 w-3 mr-1 inline" />
        Terminé
      </Badge>
    ),
    getMobileCardDetails: (stagiaire, h) => {
      const daysSinceCompletion = h.calculateDaysSinceCompletion!(stagiaire.date_fin);
      const duration = h.calculateDuration(stagiaire.date_debut, stagiaire.date_fin);
      
      return (
        <div className="p-2 rounded text-xs bg-purple-50 text-purple-800 border border-purple-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-1">
              <Award className="h-3 w-3 text-purple-600" />
              <span className="font-medium">Stage terminé avec succès</span>
            </div>
            <span className="text-[10px] font-medium text-purple-700">Durée: {duration}j</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex items-center text-[10px]">
              <Calendar className="h-2.5 w-2.5 mr-1 text-purple-600" />
              <span className="font-medium text-purple-700">Terminé le:</span>
              <span className="ml-1 text-purple-800">{h.formatDate(stagiaire.date_fin)}</span>
            </div>
            <div className="flex items-center text-[10px] justify-end">
              <Calendar className="h-2.5 w-2.5 mr-1 text-purple-600" />
              <span className="font-medium text-purple-700">Début:</span>
              <span className="ml-1 text-purple-800">{h.formatDate(stagiaire.date_debut)}</span>
            </div>
          </div>
          
          {daysSinceCompletion !== null && (
            <p className="mt-2 text-[10px] opacity-80 border-t border-purple-200 pt-1">
              <span className="font-medium">Historique:</span> Terminé il y a {daysSinceCompletion} jour(s)
            </p>
          )}
        </div>
      );
    },
  },
});

// ==============================
// COMPOSANT PRINCIPAL
// ==============================

const StudentsPage: React.FC = () => {
  const location = window.location.pathname;
  const navigate = useNavigate();
  const { toast } = useToast();

  // 🔄 Mapper les URLs françaises vers les statuts de configuration
  const getStatusFromPath = (path: string): string => {
    if (path.includes('/prochains')) return 'upcoming';
    if (path.includes('/en-cours')) return 'ongoing';
    if (path.includes('/termines')) return 'completed';
    return 'upcoming'; // Par défaut
  };

  const currentStatus = getStatusFromPath(location);

  // Helper functions
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (window.innerWidth < 640) {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const calculateDaysUntilStart = (dateDebut: string) => {
    const startDate = new Date(dateDebut);
    const today = new Date();
    const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return daysUntilStart > 0 ? daysUntilStart : 0;
  };

  const calculateDaysLeft = (dateFin: string) => {
    const endDate = new Date(dateFin);
    const today = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return daysLeft > 0 ? daysLeft : 0;
  };

  const calculateDaysSinceCompletion = (dateFin: string) => {
    if (!dateFin) return null;
    const completionDate = new Date(dateFin);
    const today = new Date();
    const daysSinceCompletion = Math.floor((today.getTime() - completionDate.getTime()) / (1000 * 3600 * 24));
    return daysSinceCompletion;
  };

  const calculateProgress = (dateDebut: string, dateFin: string) => {
    const startDate = new Date(dateDebut);
    const endDate = new Date(dateFin);
    const today = new Date();
    
    const totalDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    const daysPassed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    
    const progress = Math.min(100, Math.max(0, Math.round((daysPassed / totalDuration) * 100)));
    return progress;
  };

  const calculateDuration = (dateDebut: string, dateFin: string) => {
    const startDate = new Date(dateDebut);
    const endDate = new Date(dateFin);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    return duration;
  };

  const handleViewDetails = (id: number) => navigate(`/stagiaires/${id}`);
  const handleDelete = (id: number) => setSelectedDelete(id);

  const helpers: ColumnHelpers = {
    handleViewDetails,
    handleDelete,
    formatDate,
    calculateDaysUntilStart,
    calculateDaysLeft,
    calculateDaysSinceCompletion,
    calculateProgress,
    calculateDuration,
  };

  // Configuration
  const pageConfigs = getPageConfigs(helpers);
  const config = pageConfigs[currentStatus] || pageConfigs.upcoming;

  // États
  const [stagiaires, setStagiaires] = useState<Stagiaire[]>([]);
  const [filteredStagiaires, setFilteredStagiaires] = useState<Stagiaire[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [internshipTypeFilter, setInternshipTypeFilter] = useState("Tous");
  const [educationLevelFilter, setEducationLevelFilter] = useState("Tous");
  const [directionFilter, setDirectionFilter] = useState("Toutes");
  const [serviceFilter, setServiceFilter] = useState("Tous");
  const [genderFilter, setGenderFilter] = useState("Tous");
  const [selectedDelete, setSelectedDelete] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>(config.defaultSort);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // CORRECTION: Fetch des données avec params optimisés
  const fetchStagiaires = async () => {
    setLoading(true);
    try {
      // Créer un objet params sans envoyer de chaînes vides
      const params: Record<string, string> = {};
      
      if (searchQuery) params.q = searchQuery;
      if (genderFilter !== "Tous") params.genre = genderFilter;
      if (educationLevelFilter !== "Tous") params.etudiant_niveau = educationLevelFilter;
      if (internshipTypeFilter !== "Tous") params.type_stage = internshipTypeFilter;
      if (directionFilter !== "Toutes") params.direction = directionFilter;
      if (serviceFilter !== "Tous") params.service = serviceFilter;

      const response = await apiClient.get(config.endpoint, { params });
      setStagiaires(response.data.results);
      setFilteredStagiaires(response.data.results);
      setCurrentPage(1);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: config.errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // CORRECTION: Ajout de config.endpoint dans les dépendances
  useEffect(() => {
    fetchStagiaires();
  }, [searchQuery, internshipTypeFilter, educationLevelFilter, genderFilter, directionFilter, serviceFilter, currentStatus, config.endpoint]);

  // Tri
  const handleSort = (field: SortField) => {
    let direction: SortDirection = "asc";
    if (sortConfig.field === field) {
      if (sortConfig.direction === "asc") direction = "desc";
      else if (sortConfig.direction === "desc") direction = null;
    }
    setSortConfig({ field, direction });
  };

  useEffect(() => {
    if (sortConfig.direction) {
      const sortedData = [...stagiaires].sort((a, b) => {
        // CORRECTION: Correction des noms de variables
        let aValue: unknown = a[sortConfig.field as keyof Stagiaire];
        let bValue: unknown = b[sortConfig.field as keyof Stagiaire];
        
        if (sortConfig.field === "nom_complet") {
          aValue = `${a.nom} ${a.prenom}`.toLowerCase();
          bValue = `${b.nom} ${b.prenom}`.toLowerCase();
        }
        
        if (sortConfig.field === "date_debut" || sortConfig.field === "date_fin") {
          aValue = new Date(aValue as string).getTime();
          bValue = new Date(bValue as string).getTime();
        }
        
        if (typeof aValue === "string") aValue = aValue.toLowerCase();
        if (typeof bValue === "string") bValue = bValue.toLowerCase();
        
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
      
      setFilteredStagiaires(sortedData);
      setCurrentPage(1);
    } else {
      setFilteredStagiaires([...stagiaires]);
      setCurrentPage(1);
    }
  }, [sortConfig, stagiaires]);

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 opacity-30 text-gray-400" />;
    }
    switch (sortConfig.direction) {
      case "asc":
        return <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />;
      case "desc":
        return <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />;
      default:
        return <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 opacity-30 text-gray-400" />;
    }
  };

  // Pagination
  const paginatedStagiaires = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredStagiaires.slice(startIndex, endIndex);
  }, [filteredStagiaires, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredStagiaires.length / itemsPerPage);
  }, [filteredStagiaires.length, itemsPerPage]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const goToPreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  // Actions
  const handleDeleteConfirm = async (id: number) => {
    try {
      const response = await apiClient.delete(`/stagiaires/${id}/supprimer/`);
      
      if (response.data.success) {
        toast({
          title: "Supprimé",
          description: "Le stagiaire a bien été supprimé.",
          variant: "default",
        });
        fetchStagiaires();
      } else {
        toast({
          title: "Erreur",
          description: response.data.message,
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Erreur lors de la suppression",
        variant: "destructive",
      });
    } finally {
      setSelectedDelete(null);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setEducationLevelFilter("Tous");
    setInternshipTypeFilter("Tous");
    setGenderFilter("Tous");
    setDirectionFilter("Toutes");
    setServiceFilter("Tous");
    setSortConfig(config.defaultSort);
    setIsMobileFiltersOpen(false);
    setCurrentPage(1);
  };

  // CORRECTION: Filtres avec options "Tous/Toutes"
  const filters = [
    {
      name: "gender",
      placeholder: "Genre",
      label: "Genre",
      options: [{ value: "Tous", label: "Tous" }, ...genderOptions.map((option) => ({ value: option, label: option }))],
      value: genderFilter,
      onChange: setGenderFilter,
    },
    {
      name: "direction",
      placeholder: "Direction",
      label: "Direction",
      options: [{ value: "Toutes", label: "Toutes" }, ...directionOptions.map((option) => ({ value: option, label: option }))],
      value: directionFilter,
      onChange: setDirectionFilter,
    },
    {
      name: "service",
      placeholder: "Service",
      label: "Service",
      options: [{ value: "Tous", label: "Tous" }, ...serviceOptions.map((option) => ({ value: option, label: option }))],
      value: serviceFilter,
      onChange: setServiceFilter,
    },
    {
      name: "internshipType",
      placeholder: "Type",
      label: "Type de stage",
      options: [{ value: "Tous", label: "Tous" }, ...internshipTypeOptions.map((option) => ({ value: option, label: option }))],
      value: internshipTypeFilter,
      onChange: setInternshipTypeFilter,
    },
  ];

  // Colonnes
  const columns = config.getColumns(helpers);

  // Composant en-tête triable
  const SortableHeader = ({ column }: { column: Column }) => {
    if (!column.sortable) {
      return <span className="text-xs sm:text-sm font-medium text-gray-900">{column.label}</span>;
    }
    return (
      <Button
        variant="ghost"
        className="p-0 h-auto text-xs sm:text-sm font-medium hover:bg-transparent flex items-center gap-1 text-gray-900 hover:text-gray-700"
        onClick={() => handleSort(column.key as SortField)}
      >
        <span>{column.label}</span>
        <span className="flex-shrink-0">{getSortIcon(column.key as SortField)}</span>
      </Button>
    );
  };

  // Composant de filtres mobiles
  const MobileFilters = () => (
    <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden flex items-center gap-2 text-gray-700 hover:bg-gray-50 hover:text-gray-800">
          <Filter className="h-4 w-4" />
          Filtres
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] sm:w-[400px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-gray-900">Filtres</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 sm:space-y-4 md:space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-800">Recherche</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 "
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-800">Niveau d'étude</label>
            <Select value={educationLevelFilter} onValueChange={setEducationLevelFilter}>
              <SelectTrigger className="">
                <SelectValue placeholder="Niveau d'étude" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tous" className="focus:bg-gray-50">Tous les niveaux</SelectItem>
                <SelectItem value="Licence" className="focus:bg-gray-50">Licence</SelectItem>
                <SelectItem value="Master" className="focus:bg-gray-50">Master</SelectItem>
                <SelectItem value="Doctorat" className="focus:bg-gray-50">Doctorat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filters.map((filter) => (
            <div key={filter.name} className="space-y-2">
              <label className="text-sm font-medium text-gray-800">{filter.label}</label>
              <Select value={filter.value} onValueChange={filter.onChange}>
                <SelectTrigger className="">
                  <SelectValue placeholder={filter.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="focus:bg-gray-50">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          <div className="pt-4 space-y-3">
            <Button onClick={() => { fetchStagiaires(); setIsMobileFiltersOpen(false); }} className="w-full bg-gray-700 hover:bg-gray-600 text-white">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <Button onClick={handleResetFilters} variant="outline" className="w-full text-gray-700 hover:bg-gray-50 hover:text-gray-800">
              Réinitialiser
            </Button>
            <Button onClick={() => setIsMobileFiltersOpen(false)} variant="ghost" className="w-full text-gray-700 hover:bg-gray-50 hover:text-gray-800">
              Fermer
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* En-tête */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">{config.title}</h1>
              <CardDescription className="text-xs sm:text-sm text-gray-600">{config.description}</CardDescription>
            </div>
            <MobileFilters />
          </div>

          {/* Barre d'actions mobiles */}
          <div className="flex flex-wrap gap-2 md:hidden">
            <Button variant="outline" size="sm" onClick={fetchStagiaires} className="flex items-center gap-1 text-gray-700 hover:bg-gray-50 hover:text-gray-800">
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">Actualiser</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetFilters} className="flex items-center gap-1 text-gray-700 hover:bg-gray-50 hover:text-gray-800">
              <Filter className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">Réinitialiser</span>
            </Button>
          </div>
        </div>

        {/* Carte des filtres (desktop) */}
        <Card className="hidden md:block">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-gray-900">Filtres et recherche</h3>
                <p className="text-xs sm:text-sm text-gray-600">Affinez votre recherche selon différents critères</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchStagiaires} className="flex items-center gap-2 text-gray-700 hover:bg-gray-50 hover:text-gray-800">
                  <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Actualiser</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetFilters} className="flex items-center gap-2 text-gray-700 hover:bg-gray-50 hover:text-gray-800">
                  <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Réinitialiser</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600" />
                <Input
                  placeholder="Rechercher par spécialité, niveau, stagiaire..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 "
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-800">Niveau d'étude</label>
                  <Select value={educationLevelFilter} onValueChange={setEducationLevelFilter}>
                    <SelectTrigger className="text-xs sm:text-sm ">
                      <SelectValue placeholder="Niveau d'étude" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tous" className="text-xs sm:text-sm focus:bg-gray-50">Tous</SelectItem>
                      <SelectItem value="Licence" className="text-xs sm:text-sm focus:bg-gray-50">Licence</SelectItem>
                      <SelectItem value="Master" className="text-xs sm:text-sm focus:bg-gray-50">Master</SelectItem>
                      <SelectItem value="Doctorat" className="text-xs sm:text-sm focus:bg-gray-50">Doctorat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* CORRECTION: Ajout des options "Tous/Toutes" dans chaque filtre */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-800">Genre</label>
                  <Select value={genderFilter} onValueChange={setGenderFilter}>
                    <SelectTrigger className="text-xs sm:text-sm ">
                      <SelectValue placeholder="Genre" />
                    </SelectTrigger>
                    <SelectContent>
                      {genderOptions.map((option) => (
                        <SelectItem key={option} value={option} className="text-xs sm:text-sm focus:bg-gray-50">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-800">Direction</label>
                  <Select value={directionFilter} onValueChange={setDirectionFilter}>
                    <SelectTrigger className="text-xs sm:text-sm ">
                      <SelectValue placeholder="Direction" />
                    </SelectTrigger>
                    <SelectContent>
                      {directionOptions.map((option) => (
                        <SelectItem key={option} value={option} className="text-xs sm:text-sm focus:bg-gray-50">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-800">Service</label>
                  <Select value={serviceFilter} onValueChange={setServiceFilter}>
                    <SelectTrigger className="text-xs sm:text-sm ">
                      <SelectValue placeholder="Service" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceOptions.map((option) => (
                        <SelectItem key={option} value={option} className="text-xs sm:text-sm focus:bg-gray-50">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-800">Type de stage</label>
                  <Select value={internshipTypeFilter} onValueChange={setInternshipTypeFilter}>
                    <SelectTrigger className="text-xs sm:text-sm ">
                      <SelectValue placeholder="Type de stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {internshipTypeOptions.map((option) => (
                        <SelectItem key={option} value={option} className="text-xs sm:text-sm focus:bg-gray-50">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Carte du tableau */}
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            {loading ? (
              <div className="space-y-3 sm:space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 sm:h-12 w-full bg-gray-100" />
                ))}
              </div>
            ) : (
              <>
                {/* En-tête du tableau */}
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 sm:mb-4">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                    {filteredStagiaires.length} stage{filteredStagiaires.length !== 1 ? 's' : ''}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-gray-600">Afficher</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
                      <SelectTrigger className="w-[80px] h-8 sm:h-9 text-xs sm:text-sm ">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs sm:text-sm text-gray-600">par page</span>
                  </div>
                </div>

                {/* Version Desktop - Tableau - CORRECTION: Style inline pour les grilles dynamiques */}
                <div className="hidden lg:block border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <div className="min-w-[1000px]">
                      {/* En-tête avec style inline */}
                      <div 
                        style={{ 
                          display: 'grid', 
                          gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` 
                        }}
                        className="border-b bg-gray-50/50 p-3"
                      >
                        {columns.map((column) => (
                          <div key={column.key} className="px-2">
                            <SortableHeader column={column} />
                          </div>
                        ))}
                      </div>

                      {filteredStagiaires.length === 0 ? (
                        <div className="p-4 sm:p-6 md:p-8 text-center">
                          {config.emptyIcon}
                          <h3 className="font-medium text-lg mb-1 text-gray-900 mt-4">{config.emptyMessage}</h3>
                          <p className="text-gray-600">Aucun stage ne correspond à vos critères</p>
                        </div>
                      ) : (
                        paginatedStagiaires.map((stagiaire, index) => (
                          <div
                            key={stagiaire.id}
                            style={{ 
                              display: 'grid', 
                              gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` 
                            }}
                            className={`border-b border-gray-100 p-3 hover:bg-gray-50/30 transition-colors ${
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50/10'
                            }`}
                          >
                            {columns.map((column) => (
                              <div key={column.key} className="px-2 flex items-center">
                                {column.render
                                  ? column.render(stagiaire[column.key as keyof Stagiaire], stagiaire)
                                  : stagiaire[column.key as keyof Stagiaire]}
                              </div>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Version Mobile - Cartes */}
                <div className="md:hidden space-y-3">
                  {filteredStagiaires.length === 0 ? (
                    <div className="text-center py-4 sm:py-6 md:py-8">
                      {config.emptyIcon}
                      <h3 className="font-medium text-base mb-1 text-gray-900 mt-3">{config.emptyMessage}</h3>
                      <p className="text-xs text-gray-600">Aucun stage ne correspond à vos critères</p>
                    </div>
                  ) : (
                    paginatedStagiaires.map((stagiaire) => (
                      <Card key={stagiaire.id} className={`overflow-hidden ${config.cardBorderColor || 'hover:border-gray-300'}`}>
                        <CardContent className="p-3">
                          <div className="space-y-3">
                            {/* En-tête avec nom et badge */}
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm truncate text-gray-900">
                                  {stagiaire.prenom} {stagiaire.nom}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="capitalize px-1.5 py-0 text-xs bg-gray-50 text-gray-700">
                                    {stagiaire.genre}
                                  </Badge>
                                  <span className="text-xs text-gray-600 truncate">{stagiaire.specialite}</span>
                                </div>
                              </div>
                              {config.getMobileCardBadge && config.getMobileCardBadge(stagiaire, helpers)}
                            </div>

                            {/* Informations secondaires */}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <span className="font-medium text-gray-700">Niveau</span>
                                <p className="text-gray-800">{stagiaire.niveau_etude}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="font-medium text-gray-700">Type</span>
                                <div className="flex items-center">
                                  <BookOpen className="h-3 w-3 mr-1 text-gray-600 flex-shrink-0" />
                                  <span className="truncate text-gray-800">{stagiaire.type_stage}</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="font-medium text-gray-700">Direction</span>
                                <p className="truncate text-gray-800">{stagiaire.direction}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="font-medium text-gray-700">Service</span>
                                <p className="truncate text-gray-800">{stagiaire.service}</p>
                              </div>
                            </div>

                            {/* Détails spécifiques à la page */}
                            {config.getMobileCardDetails && config.getMobileCardDetails(stagiaire, helpers)}

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-2 border-t border-gray-100 gap-2 sm:gap-0">
                              <div className="flex items-center text-xs text-gray-600">
                                <span>Durée: {calculateDuration(stagiaire.date_debut, stagiaire.date_fin)} jours</span>
                              </div>
                              <div className="flex space-x-1">
                                <Button variant="ghost" size="sm" onClick={() => handleViewDetails(stagiaire.id)} className="h-7 w-7 p-0 hover:bg-gray-50 text-gray-700" title="Détails">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedDelete(stagiaire.id)} className="h-7 w-7 p-0 text-red-600 hover:bg-red-50" title="Supprimer">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {paginatedStagiaires.length > 0 && (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-4 md:pt-6 border-t mt-4 md:mt-6">
                    <div className="text-xs sm:text-sm text-gray-600">
                      Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, filteredStagiaires.length)} sur {filteredStagiaires.length}
                    </div>
                    <div className="flex items-center gap-1 md:gap-2">
                      <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={currentPage === 1} className="h-8 sm:h-9 px-2 sm:px-3 text-gray-700">
                        <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden md:inline ml-1 text-xs sm:text-sm">Précédent</span>
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) pageNum = i + 1;
                          else if (currentPage <= 3) pageNum = i + 1;
                          else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                          else pageNum = currentPage - 2 + i;
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => goToPage(pageNum)}
                              className={`h-8 sm:h-9 min-w-[32px] sm:min-w-[40px] px-1 sm:px-2 text-xs sm:text-sm ${
                                currentPage === pageNum ? "bg-primary hover:bg-primary/80 text-white" : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages} className="h-8 sm:h-9 px-2 sm:px-3 text-gray-700">
                        <span className="hidden md:inline mr-1 text-xs sm:text-sm">Suivant</span>
                        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Modal de confirmation de suppression */}
            {selectedDelete && (
              <DeleteConfirmDialog
                title="Supprimer ce stagiaire ?"
                description="Êtes-vous sûr de vouloir supprimer ce stagiaire ? Cette action est irréversible."
                onConfirm={() => handleDeleteConfirm(selectedDelete)}
                open={true}
                onOpenChange={(open) => !open && setSelectedDelete(null)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentsPage;

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Clock, BookOpen, Eye, Trash2, Search, Filter, Users, 
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, 
  RefreshCw, Calendar, XCircle, Hourglass, CheckCircle, 
  AlertTriangle, Award 
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import {
  genderOptions,
  specializationOptions,
  internshipTypeOptions,
  educationLevelOptions,
} from "@/data/internships";
import apiClient from "@/lib/apiClient";
import { usePermissions } from "@/hooks/usePermissions";
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

// ==============================
// INTERFACES ET TYPES
// ==============================

interface Internship {
  id: string;
  etudiant_nom: string;
  etudiant_prenom: string;
  genre: string;
  etudiant_specialite: string;
  etudiant_niveau: string;
  type_stage: string;
  statut_stage: string;
  date_soumission: string;
  date_acceptation?: string;
  date_refus?: string;
  score_ia: number;
  score_details: Record<string, unknown>;
  score_commentaire: string;
}

type SortField = keyof Internship | "etudiant_complet";
type SortDirection = "asc" | "desc" | null;

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

interface Column {
  key: string;
  label: string;
  sortable: boolean;
  render?: (value: unknown, item: Internship) => React.ReactNode;
}

interface PageConfig {
  title: string;
  description: string;
  endpoint: string;
  errorMessage: string;
  emptyMessage: string;
  emptyIcon: React.ReactNode;
  showStatusFilter: boolean;
  defaultSort: { field: SortField; direction: SortDirection };
  badgeColor?: string;
  cardBorderColor?: string;
  getColumns: (helpers: ColumnHelpers) => Column[];
  getMobileCardBadge?: (internship: Internship, helpers: MobileHelpers) => React.ReactNode;
  getMobileCardDetails?: (internship: Internship, helpers: MobileHelpers) => React.ReactNode;
}

interface ColumnHelpers {
  handleViewDetails: (id: string) => void;
  handleDelete: (id: string) => void;
  canDelete: boolean;
  formatDate: (date: string) => string;
  calculateDaysWaiting?: (date: string) => number;
  calculateDaysInProcess?: (date: string) => number;
  calculateDaysInAcceptation?: (date: string) => number;
  calculateDaysSinceAcceptation?: (date: string) => number | null;
  calculateDaysSinceRejection?: (date: string) => number | null;
}

interface MobileHelpers extends ColumnHelpers {
  formatStatusText: (status: string) => string;
}

// ==============================
// FONCTIONS UTILITAIRES
// ==============================

const getStatusBadgeVariant = (status: string): string => {
  const statusColors: Record<string, string> = {
    'En attente': 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
    'En cours de traitement': 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    'Acceptée': 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
    'Refusée': 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    'default': 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
  };
  
  return statusColors[status] || statusColors.default;
};

const calculateDaysWaiting = (dateSoumission: string) => {
  const submissionDate = new Date(dateSoumission);
  const today = new Date();
  const diffTime = today.getTime() - submissionDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
  return diffDays;
};

// Fonction utilitaire pour formater l'affichage des jours
const formatDaysDisplay = (days: number): string => {
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 0) return "Dans le futur";
  return `${days} jours`;
};

// ==============================
// CONFIGURATION DES PAGES
// ==============================

const getPageConfigs = (helpers: ColumnHelpers & { formatStatusText: (status: string) => string }): Record<string, PageConfig> => ({
  all: {
    title: "Demandes de stage",
    description: "Gérez et suivez les demandes de stage",
    endpoint: "/demande-toutes/",
    errorMessage: "Impossible de charger les demandes.",
    emptyMessage: "Aucune demande de stage",
    emptyIcon: (
      <div className="flex items-center justify-center">
        <Users className="h-12 w-12 text-gray-400" />
      </div>
    ),
    showStatusFilter: true,
    defaultSort: { field: "etudiant_nom", direction: "asc" },
    getColumns: (h) => [
      {
        key: "etudiant_nom",
        label: "Demandeur",
        sortable: true,
        render: (value: string, item: Internship) => (
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm sm:text-base truncate text-gray-900">
              {item.etudiant_nom} {item.etudiant_prenom}
            </span>
            <span className="text-xs text-gray-600 truncate">{item.etudiant_specialite}</span>
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
        key: "etudiant_niveau",
        label: "Niveau",
        sortable: true,
        render: (value: string) => <span className="text-xs sm:text-sm whitespace-nowrap text-gray-800">{value}</span>,
      },
      {
        key: "type_stage",
        label: "Type",
        sortable: true,
        render: (value: string) => (
          <div className="flex items-center min-w-0">
            <BookOpen className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-gray-600 flex-shrink-0" />
            <span className="text-xs sm:text-sm truncate text-gray-800">{value}</span>
          </div>
        ),
      },
      {
        key: "statut_stage",
        label: "Statut",
        sortable: true,
        render: (value: string) => (
          <Badge 
            variant="outline" 
            className={`capitalize px-2 py-0.5 text-xs whitespace-nowrap transition-colors ${getStatusBadgeVariant(value)}`}
          >
            {helpers.formatStatusText(value)}
          </Badge>
        ),
      },
      {
        key: "date_soumission",
        label: "Soumission",
        sortable: true,
        render: (value: string) => (
          <div className="flex items-center min-w-0">
            <Clock className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-gray-600 flex-shrink-0" />
            <span className="text-xs sm:text-sm whitespace-nowrap text-gray-800">{h.formatDate(value)}</span>
          </div>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        render: (_: unknown, item: Internship) => (
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" onClick={() => h.handleViewDetails(item.id)} title="Voir les détails" className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-gray-100 text-gray-700">
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            {h.canDelete && (
              <Button variant="ghost" size="icon" onClick={() => h.handleDelete(item.id)} className="h-8 w-8 sm:h-9 sm:w-9 text-red-600 hover:bg-red-50" title="Supprimer">
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
  },

  pending: {
    title: "Demandes en attente",
    description: "Demandes nécessitant une validation",
    endpoint: "/demande-en-attente/",
    errorMessage: "Impossible de charger les demandes en attente.",
    emptyMessage: "Aucune demande en attente",
    emptyIcon: (
      <div className="flex items-center justify-center">
        <Users className="h-12 w-12 text-gray-400" />
      </div>
    ),
    showStatusFilter: false,
    defaultSort: { field: "date_soumission", direction: "desc" },
    cardBorderColor: "border-yellow-200 hover:border-yellow-300",
    getColumns: (h) => [
      {
        key: "etudiant_nom",
        label: "Demandeur",
        sortable: true,
        render: (value: string, item: Internship) => (
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm sm:text-base truncate text-gray-900">{item.etudiant_nom} {item.etudiant_prenom}</span>
            <span className="text-xs text-gray-600 truncate">{item.etudiant_specialite}</span>
          </div>
        ),
      },
      {
        key: "genre",
        label: "Genre",
        sortable: true,
        render: (value: string) => <Badge variant="outline" className="capitalize px-2 py-0.5 text-xs sm:text-sm bg-gray-50 text-gray-700">{value}</Badge>,
      },
      {
        key: "etudiant_niveau",
        label: "Niveau",
        sortable: true,
        render: (value: string) => <span className="text-xs sm:text-sm text-gray-800">{value}</span>,
      },
      {
        key: "type_stage",
        label: "Type",
        sortable: true,
        render: (value: string) => (
          <div className="flex items-center">
            <BookOpen className="mr-2 h-4 w-4 text-gray-600" />
            <span className="text-xs sm:text-sm text-gray-800">{value}</span>
          </div>
        ),
      },
      {
        key: "date_soumission",
        label: "Soumission",
        sortable: true,
        render: (value: string) => {
          const daysWaiting = h.calculateDaysWaiting!(value);
          return (
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4 text-gray-600" />
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm text-gray-800">{h.formatDate(value)}</span>
                <Badge variant={daysWaiting > 7 ? "destructive" : "secondary"} className="mt-1 px-1.5 py-0 text-xs w-fit bg-yellow-50 text-yellow-700 border-yellow-200">
                  {formatDaysDisplay(daysWaiting)}
                </Badge>
              </div>
            </div>
          );
        },
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        render: (_: unknown, item: Internship) => (
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" onClick={() => h.handleViewDetails(item.id)} className="h-8 w-8 hover:bg-gray-50"><Eye className="h-4 w-4" /></Button>
            {h.canDelete && (<Button variant="ghost" size="icon" onClick={() => h.handleDelete(item.id)} className="h-8 w-8 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>)}
          </div>
        ),
      },
    ],
    getMobileCardBadge: (internship, h) => {
      const daysWaiting = h.calculateDaysWaiting!(internship.date_soumission);
      return (
        <Badge 
          variant={daysWaiting > 7 ? "destructive" : "secondary"} 
          className={`px-2 py-0.5 text-xs transition-colors ${
            daysWaiting > 7 
              ? 'bg-red-50 text-red-700 border-red-200' 
              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
          }`}
        >
          {formatDaysDisplay(daysWaiting)}
        </Badge>
      );
    },
    getMobileCardDetails: (internship, h) => {
      const daysWaiting = h.calculateDaysWaiting!(internship.date_soumission);
      return (
        <div className={`p-2 rounded text-xs ${daysWaiting > 7 ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <span className="font-medium">{daysWaiting > 7 ? '⚠️ Prioritaire' : 'En attente'}</span>
            <span>{formatDaysDisplay(daysWaiting)}</span>
          </div>
          {daysWaiting > 7 && <p className="mt-1 text-[10px] opacity-80">Nécessite une attention rapide</p>}
        </div>
      );
    },
  },

  "in-process": {
    title: "Demandes en traitement",
    description: "Demandes en cours d'analyse",
    endpoint: "/demande-en-traitement/",
    errorMessage: "Impossible de charger les demandes en traitement.",
    emptyMessage: "Aucune demande en traitement",
    emptyIcon: (
      <div className="flex items-center justify-center">
        <Users className="h-12 w-12 text-gray-400" />
      </div>
    ),
    showStatusFilter: false,
    defaultSort: { field: "date_soumission", direction: "desc" },
    cardBorderColor: "border-blue-200 hover:border-blue-300",
    getColumns: (h) => [
      {
        key: "etudiant_nom",
        label: "Demandeur",
        sortable: true,
        render: (value: string, item: Internship) => (
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm sm:text-base truncate text-gray-900">{item.etudiant_nom} {item.etudiant_prenom}</span>
            <span className="text-xs text-gray-600 truncate">{item.etudiant_specialite}</span>
          </div>
        ),
      },
      {
        key: "genre",
        label: "Genre",
        sortable: true,
        render: (value: string) => <Badge variant="outline" className="capitalize px-2 py-0.5 text-xs bg-gray-50 text-gray-700">{value}</Badge>,
      },
      {
        key: "etudiant_niveau",
        label: "Niveau",
        sortable: true,
        render: (value: string) => <span className="text-xs sm:text-sm text-gray-800">{value}</span>,
      },
      {
        key: "type_stage",
        label: "Type",
        sortable: true,
        render: (value: string) => (
          <div className="flex items-center">
            <BookOpen className="mr-2 h-4 w-4 text-gray-600" />
            <span className="text-xs sm:text-sm text-gray-800">{value}</span>
          </div>
        ),
      },
      {
        key: "date_soumission",
        label: "Soumission",
        sortable: true,
        render: (value: string) => {
          const daysInProcess = h.calculateDaysInProcess!(value);
          return (
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4 text-gray-600" />
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm text-gray-800">{h.formatDate(value)}</span>
                <Badge className="mt-1 px-1.5 py-0 text-xs w-fit bg-yellow-50 text-yellow-700 border-yellow-200">
                  {formatDaysDisplay(daysInProcess)}
                </Badge>
              </div>
            </div>
          );
        },
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        render: (_: unknown, item: Internship) => (
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" onClick={() => h.handleViewDetails(item.id)} className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
            {h.canDelete && (<Button variant="ghost" size="icon" onClick={() => h.handleDelete(item.id)} className="h-8 w-8 text-red-600"><Trash2 className="h-4 w-4" /></Button>)}
          </div>
        ),
      },
    ],
    getMobileCardBadge: (internship, h) => {
      const daysInProcess = h.calculateDaysInProcess!(internship.date_soumission);
      return (
        <Badge 
          className={`px-2 py-0.5 text-xs transition-colors ${
            daysInProcess > 30 
              ? 'bg-red-50 text-red-700 border-red-200' 
              : daysInProcess > 15 
                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}
        >
          {formatDaysDisplay(daysInProcess)}
        </Badge>
      );
    },
    getMobileCardDetails: (internship, h) => {
      const daysInProcess = h.calculateDaysInProcess!(internship.date_soumission);
      return (
        <div className={`p-2 rounded text-xs ${daysInProcess > 30 ? 'bg-red-50 text-red-800 border border-red-200' : daysInProcess > 15 ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-1">
              {daysInProcess > 30 && <AlertTriangle className="h-3 w-3 text-red-600" />}
              <span className="font-medium">{daysInProcess > 30 ? 'Retard critique' : daysInProcess > 15 ? 'Attention' : 'En traitement'}</span>
            </div>
            <span>{formatDaysDisplay(daysInProcess)}</span>
          </div>
          {daysInProcess > 30 && <p className="mt-1 text-[10px] opacity-80">Dépasse le délai recommandé</p>}
          {daysInProcess > 15 && daysInProcess <= 30 && <p className="mt-1 text-[10px] opacity-80">Approche du délai maximum</p>}
        </div>
      );
    },
  },

  "pre-acceptance": {
    title: "Demandes en acceptation",
    description: "Demandes prêtes à être acceptées",
    endpoint: "/demande-en-acceptation/",
    errorMessage: "Impossible de charger les demandes en acceptation.",
    emptyMessage: "Aucune demande en acceptation",
    emptyIcon: (
      <div className="flex items-center justify-center">
        <Users className="h-12 w-12 text-gray-400" />
      </div>
    ),
    showStatusFilter: false,
    defaultSort: { field: "date_soumission", direction: "desc" },
    cardBorderColor: "border-yellow-200 hover:border-yellow-300",
    getColumns: (h) => [
      {
        key: "etudiant_nom",
        label: "Étudiant",
        sortable: true,
        render: (value: string, item: Internship) => (
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm sm:text-base truncate text-gray-900">{item.etudiant_nom} {item.etudiant_prenom}</span>
            <span className="text-xs text-gray-600 truncate">{item.etudiant_specialite}</span>
          </div>
        ),
      },
      {
        key: "genre",
        label: "Genre",
        sortable: true,
        render: (value: string) => <Badge variant="outline" className="capitalize px-2 py-0.5 text-xs bg-gray-50 text-gray-700">{value}</Badge>,
      },
      {
        key: "etudiant_niveau",
        label: "Niveau",
        sortable: true,
        render: (value: string) => <span className="text-xs sm:text-sm text-gray-800">{value}</span>,
      },
      {
        key: "type_stage",
        label: "Type",
        sortable: true,
        render: (value: string) => (
          <div className="flex items-center">
            <BookOpen className="mr-2 h-4 w-4 text-gray-600" />
            <span className="text-xs sm:text-sm text-gray-800">{value}</span>
          </div>
        ),
      },
      {
        key: "date_soumission",
        label: "Soumission",
        sortable: true,
        render: (value: string) => {
          const daysInAcceptation = h.calculateDaysInAcceptation!(value);
          return (
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4 text-gray-600" />
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm text-gray-800">{h.formatDate(value)}</span>
                <Badge className="mt-1 px-1.5 py-0 text-xs w-fit bg-yellow-50 text-yellow-700 border-yellow-200">
                  {formatDaysDisplay(daysInAcceptation)}
                </Badge>
              </div>
            </div>
          );
        },
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        render: (_: unknown, item: Internship) => (
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" onClick={() => h.handleViewDetails(item.id)} className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
            {h.canDelete && (<Button variant="ghost" size="icon" onClick={() => h.handleDelete(item.id)} className="h-8 w-8 text-red-600"><Trash2 className="h-4 w-4" /></Button>)}
          </div>
        ),
      },
    ],
    getMobileCardBadge: (internship, h) => {
      const daysInAcceptation = h.calculateDaysInAcceptation!(internship.date_soumission);
      return (
        <Badge 
          className={`px-2 py-0.5 text-xs transition-colors ${
            daysInAcceptation > 14 
              ? 'bg-orange-50 text-orange-700 border-orange-200' 
              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
          }`}
        >
          <Hourglass className="h-3 w-3 mr-1 inline" />
          {formatDaysDisplay(daysInAcceptation)}
        </Badge>
      );
    },
    getMobileCardDetails: (internship, h) => {
      const daysInAcceptation = h.calculateDaysInAcceptation!(internship.date_soumission);
      return (
        <div className={`p-2 rounded text-xs ${daysInAcceptation > 14 ? 'bg-orange-50 text-orange-800 border border-orange-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-1">
              <Hourglass className="h-3 w-3" />
              <span className="font-medium">{daysInAcceptation > 14 ? 'Acceptation urgente' : 'Prêt pour acceptation'}</span>
            </div>
            <span>{formatDaysDisplay(daysInAcceptation)}</span>
          </div>
          <p className="mt-1 text-[10px] opacity-80">
            {daysInAcceptation > 14 ? 'Cette demande attend depuis plus de 14 jours' : 'En attente de décision finale'}
          </p>
        </div>
      );
    },
  },

  accepted: {
    title: "Demandes acceptées",
    description: "Demandes définitivement acceptées",
    endpoint: "/demande-acceptees/",
    errorMessage: "Impossible de charger les demandes acceptées.",
    emptyMessage: "Aucune demande acceptée",
    emptyIcon: (
      <div className="flex items-center justify-center">
        <Users className="h-12 w-12 text-gray-400" />
      </div>
    ),
    showStatusFilter: false,
    defaultSort: { field: "date_soumission", direction: "desc" },
    cardBorderColor: "border-green-200 hover:border-green-300",
    getColumns: (h) => [
      {
        key: "etudiant_nom",
        label: "Étudiant",
        sortable: true,
        render: (value: string, item: Internship) => (
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm sm:text-base truncate text-gray-900">{item.etudiant_nom} {item.etudiant_prenom}</span>
            <span className="text-xs text-gray-600 truncate">{item.etudiant_specialite}</span>
          </div>
        ),
      },
      {
        key: "genre",
        label: "Genre",
        sortable: true,
        render: (value: string) => <Badge variant="outline" className="capitalize px-2 py-0.5 text-xs bg-gray-50 text-gray-700">{value}</Badge>,
      },
      {
        key: "etudiant_niveau",
        label: "Niveau",
        sortable: true,
        render: (value: string) => <span className="text-xs sm:text-sm text-gray-800">{value}</span>,
      },
      {
        key: "type_stage",
        label: "Type",
        sortable: true,
        render: (value: string) => (
          <div className="flex items-center">
            <BookOpen className="mr-2 h-4 w-4 text-gray-600" />
            <span className="text-xs sm:text-sm text-gray-800">{value}</span>
          </div>
        ),
      },
      {
        key: "date_acceptation",
        label: "Acceptation",
        sortable: true,
        render: (value: string) => {
          const daysSinceAcceptation = h.calculateDaysSinceAcceptation!(value);
          return (
            <div className="flex items-center">
              <Calendar className="mr-2 h-4 w-4 text-gray-600" />
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm text-gray-700 font-medium">{h.formatDate(value)}</span>
                {daysSinceAcceptation !== null && (
                  <span className="text-[10px] text-gray-600 mt-0.5">Il y a {formatDaysDisplay(daysSinceAcceptation)}</span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        render: (_: unknown, item: Internship) => (
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" onClick={() => h.handleViewDetails(item.id)} className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
            {h.canDelete && (<Button variant="ghost" size="icon" onClick={() => h.handleDelete(item.id)} className="h-8 w-8 text-red-600"><Trash2 className="h-4 w-4" /></Button>)}
          </div>
        ),
      },
    ],
    getMobileCardBadge: () => (
      <Badge 
        variant="outline" 
        className="px-2 py-0.5 text-xs bg-green-50 text-green-700 border-green-200 transition-colors"
      >
        <CheckCircle className="h-3 w-3 mr-1 inline" />
        Accepté
      </Badge>
    ),
    getMobileCardDetails: (internship, h) => {
      const daysSinceAcceptation = h.calculateDaysSinceAcceptation!(internship.date_acceptation || "");
      return (
        <div className="p-2 rounded text-xs bg-green-50 text-green-800 border border-green-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-1">
              <Award className="h-3 w-3 text-green-600" />
              <span className="font-medium">Acceptation définitive</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex items-center text-[10px]">
              <Calendar className="h-2.5 w-2.5 mr-1 text-green-600" />
              <span className="font-medium text-green-700">Accepté le:</span>
              <span className="ml-1 text-green-800">{h.formatDate(internship.date_acceptation || "")}</span>
            </div>
            {daysSinceAcceptation !== null && (
              <div className="text-[10px] text-green-600 text-right">Il y a {formatDaysDisplay(daysSinceAcceptation)}</div>
            )}
          </div>
        </div>
      );
    },
  },

  rejected: {
    title: "Demandes refusées",
    description: "Historique des demandes refusées",
    endpoint: "/demande-refusees/",
    errorMessage: "Impossible de charger les demandes refusées.",
    emptyMessage: "Aucune demande refusée",
    emptyIcon: (
      <div className="flex items-center justify-center">
        <Users className="h-12 w-12 text-gray-400" />
      </div>
    ),
    showStatusFilter: false,
    defaultSort: { field: "date_soumission", direction: "desc" },
    cardBorderColor: "border-red-200 hover:border-red-300",
    getColumns: (h) => [
      {
        key: "etudiant_nom",
        label: "Demandeur",
        sortable: true,
        render: (value: string, item: Internship) => (
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm sm:text-base truncate text-gray-900">{item.etudiant_nom} {item.etudiant_prenom}</span>
            <span className="text-xs text-gray-600 truncate">{item.etudiant_specialite}</span>
          </div>
        ),
      },
      {
        key: "genre",
        label: "Genre",
        sortable: true,
        render: (value: string) => <Badge variant="outline" className="capitalize px-2 py-0.5 text-xs bg-gray-50 text-gray-700">{value}</Badge>,
      },
      {
        key: "etudiant_niveau",
        label: "Niveau",
        sortable: true,
        render: (value: string) => <span className="text-xs sm:text-sm text-gray-800">{value}</span>,
      },
      {
        key: "type_stage",
        label: "Type",
        sortable: true,
        render: (value: string) => (
          <div className="flex items-center">
            <BookOpen className="mr-2 h-4 w-4 text-gray-600" />
            <span className="text-xs sm:text-sm text-gray-800">{value}</span>
          </div>
        ),
      },
      {
        key: "date_refus",
        label: "Refus",
        sortable: true,
        render: (value: string) => {
          const daysSinceRejection = h.calculateDaysSinceRejection!(value);
          return (
            <div className="flex items-center">
              <XCircle className="mr-2 h-4 w-4 text-red-600" />
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm text-red-700 font-medium">{h.formatDate(value)}</span>
                {daysSinceRejection !== null && (
                  <span className="text-[10px] text-red-600 mt-0.5">Il y a {formatDaysDisplay(daysSinceRejection)}</span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        render: (_: unknown, item: Internship) => (
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" onClick={() => h.handleViewDetails(item.id)} className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
            {h.canDelete && (<Button variant="ghost" size="icon" onClick={() => h.handleDelete(item.id)} className="h-8 w-8 text-red-600"><Trash2 className="h-4 w-4" /></Button>)}
          </div>
        ),
      },
    ],
    getMobileCardBadge: () => (
      <Badge 
        variant="destructive" 
        className="px-2 py-0.5 text-xs bg-red-50 text-red-700 border-red-200 transition-colors"
      >
        <XCircle className="h-3 w-3 mr-1 inline" />
        Refusé
      </Badge>
    ),
    getMobileCardDetails: (internship, h) => {
      const daysSinceRejection = h.calculateDaysSinceRejection!(internship.date_refus || "");
      return (
        <div className="p-2 rounded text-xs bg-red-50 text-red-800 border border-red-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-600" />
              <span className="font-medium">Refus définitif</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex items-center text-[10px]">
              <Calendar className="h-2.5 w-2.5 mr-1 text-red-600" />
              <span className="font-medium text-red-700">Refusé le:</span>
              <span className="ml-1 text-red-800">{h.formatDate(internship.date_refus || "")}</span>
            </div>
            {daysSinceRejection !== null && (
              <div className="text-[10px] text-red-600 text-right">Il y a {formatDaysDisplay(daysSinceRejection)}</div>
            )}
          </div>
        </div>
      );
    },
  },
});

// ==============================
// COMPOSANT PRINCIPAL
// ==============================

const InternshipsPage: React.FC = () => {
  const { status = "all" } = useParams<{ status?: string }>();
  const location = window.location.pathname;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canDelete = hasPermission("demandes.delete");

  const getStatusFromPath = (path: string): string => {
    if (path.includes('/en-attente')) return 'pending';
    if (path.includes('/en-traitement')) return 'in-process';
    if (path.includes('/en-acceptation')) return 'pre-acceptance';
    if (path.includes('/acceptees')) return 'accepted';
    if (path.includes('/rejetees')) return 'rejected';
    if (path.includes('/toutes')) return 'all';
    return 'all';
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

  const formatStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'en attente': 'En attente',
      'en cours de traitement': 'En traitement',
      'acceptee': 'Acceptée',
      'refusee': 'Refusée',
    };
    return statusMap[status] || status;
  };

  const calculateDaysInProcess = (dateSoumission: string) => {
    return calculateDaysWaiting(dateSoumission);
  };

  const calculateDaysInAcceptation = (dateSoumission: string) => {
    return calculateDaysWaiting(dateSoumission);
  };

  const calculateDaysSinceAcceptation = (dateAcceptation: string) => {
    if (!dateAcceptation) return null;
    const acceptationDate = new Date(dateAcceptation);
    const today = new Date();
    return Math.floor((today.getTime() - acceptationDate.getTime()) / (1000 * 3600 * 24));
  };

  const calculateDaysSinceRejection = (dateRefus: string) => {
    if (!dateRefus) return null;
    const rejectionDate = new Date(dateRefus);
    const today = new Date();
    return Math.floor((today.getTime() - rejectionDate.getTime()) / (1000 * 3600 * 24));
  };

  const handleViewDetails = (id: string) => navigate(`/demandes/${id}`);
  const handleDelete = (id: string) => setSelectedDelete(id);

  const helpers: ColumnHelpers & { formatStatusText: (status: string) => string } = {
    handleViewDetails,
    handleDelete,
    canDelete,
    formatDate,
    formatStatusText,
    calculateDaysWaiting,
    calculateDaysInProcess,
    calculateDaysInAcceptation,
    calculateDaysSinceAcceptation,
    calculateDaysSinceRejection,
  };

  // Configuration
  const pageConfigs = getPageConfigs(helpers);
  const config = pageConfigs[currentStatus] || pageConfigs.all;

  // États
  const [internships, setInternships] = useState<Internship[]>([]);
  const [filteredInternships, setFilteredInternships] = useState<Internship[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("Toutes");
  const [internshipTypeFilter, setInternshipTypeFilter] = useState("Tous");
  const [educationLevelFilter, setEducationLevelFilter] = useState("Tous");
  const [genderFilter, setGenderFilter] = useState("Tous");
  const [statusFilter, setStatusFilter] = useState("Tous");
  const [selectedDelete, setSelectedDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>(config.defaultSort);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch des données — pagination et tri côté serveur
  const fetchInternships = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};

      if (searchQuery) params.q = searchQuery;
      if (genderFilter !== "Tous") params.genre = genderFilter;
      if (educationLevelFilter !== "Tous") params.etudiant_niveau = educationLevelFilter;
      if (specializationFilter !== "Toutes") params.etudiant_specialite = specializationFilter;
      if (internshipTypeFilter !== "Tous") params.type_stage = internshipTypeFilter;
      if (config.showStatusFilter && statusFilter !== "Tous") params.statut_stage = statusFilter;

      params.page = String(currentPage);
      params.page_size = String(itemsPerPage);
      if (sortConfig.direction && sortConfig.field) {
        const field = sortConfig.field === "etudiant_complet" ? "etudiant_nom" : String(sortConfig.field);
        params.ordering = sortConfig.direction === "desc" ? `-${field}` : field;
      }

      const response = await apiClient.get(config.endpoint, { params });
      setInternships(response.data.results);
      setFilteredInternships(response.data.results);
      setTotalCount(response.data.count ?? response.data.results.length);
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

  useEffect(() => {
    fetchInternships();
  }, [searchQuery, specializationFilter, internshipTypeFilter, educationLevelFilter, genderFilter, statusFilter, currentStatus, config.endpoint, currentPage, itemsPerPage, sortConfig]);

  // Retour à la page 1 quand un filtre ou la recherche change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, specializationFilter, internshipTypeFilter, educationLevelFilter, genderFilter, statusFilter, config.endpoint]);

  // Tri
  const handleSort = (field: SortField) => {
    let direction: SortDirection = "asc";
    if (sortConfig.field === field) {
      if (sortConfig.direction === "asc") direction = "desc";
      else if (sortConfig.direction === "desc") direction = null;
    }
    setSortConfig({ field, direction });
  };

  // Le tri est désormais effectué côté serveur (paramètre `ordering`).

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

  // Pagination côté serveur : la page courante est déjà la seule chargée
  const paginatedInternships = filteredInternships;

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCount / itemsPerPage));
  }, [totalCount, itemsPerPage]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const goToPreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  // Actions
  const handleDeleteConfirm = async (id: string) => {
    try {
      const response = await apiClient.delete(`/demandes/${id}/supprimer/`);
      if (response.data.success) {
        toast({
          title: "Supprimé",
          description: response.data.message,
          variant: "default",
        });
        fetchInternships();
      } else {
        toast({
          title: "Erreur",
          description: response.data.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
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
    setSpecializationFilter("Toutes");
    setInternshipTypeFilter("Tous");
    setGenderFilter("Tous");
    setStatusFilter("Tous");
    setSortConfig(config.defaultSort);
    setIsMobileFiltersOpen(false);
    setCurrentPage(1);
  };

  // Filtres
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
      name: "educationLevel",
      placeholder: "Niveau",
      label: "Niveau d'étude",
      options: [{ value: "Tous", label: "Tous" }, ...educationLevelOptions.map((option) => ({ value: option, label: option }))],
      value: educationLevelFilter,
      onChange: setEducationLevelFilter,
    },
    {
      name: "specialization",
      placeholder: "Spécialité",
      label: "Spécialité",
      options: [{ value: "Toutes", label: "Toutes" }, ...specializationOptions.map((option) => ({ value: option, label: option }))],
      value: specializationFilter,
      onChange: setSpecializationFilter,
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

  if (config.showStatusFilter) {
    filters.push({
      name: "status",
      placeholder: "Statut",
      label: "Statut",
      options: [
        { value: "Tous", label: "Tous" },
        { value: "en attente", label: "En attente" },
        { value: "en cours de traitement", label: "En traitement" },
        { value: "acceptee", label: "Acceptée" },
        { value: "refusee", label: "Refusée" },
      ],
      value: statusFilter,
      onChange: setStatusFilter,
    });
  }

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
            <Button onClick={() => { fetchInternships(); setIsMobileFiltersOpen(false); }} className="w-full bg-gray-700 hover:bg-gray-600 text-white">
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
          <div className="relative overflow-hidden rounded-xl border border-border/80 surface-brushed shadow-card px-4 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">{config.title}</h1>
              <CardDescription className="text-xs sm:text-sm text-gray-600">{config.description}</CardDescription>
            </div>
            <MobileFilters />
          </div>

          {/* Barre d'actions mobiles */}
          <div className="flex flex-wrap gap-2 md:hidden">
            <Button variant="outline" size="sm" onClick={fetchInternships} className="flex items-center gap-1 text-gray-700 hover:bg-gray-50 hover:text-gray-800">
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
                <Button variant="outline" size="sm" onClick={fetchInternships} className="flex items-center gap-2 text-gray-700 hover:bg-gray-50 hover:text-gray-800">
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
              {/* Barre de recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600" />
                <Input
                  placeholder="Rechercher par spécialité, niveau, étudiant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 "
                />
              </div>

              {/* Filtres en ligne */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Spécialité - CORRECTION: Ajout de l'option "Toutes" */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-800">Spécialité</label>
                  <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
                    <SelectTrigger className="text-xs sm:text-sm ">
                      <SelectValue placeholder="Spécialité" />
                    </SelectTrigger>
                    <SelectContent>
                      {specializationOptions.map((option) => (
                        <SelectItem key={option} value={option} className="text-xs sm:text-sm focus:bg-gray-50">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type de stage - CORRECTION: Ajout de l'option "Tous" */}
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

                {/* Niveau d'étude - CORRECTION: Ajout de l'option "Tous" */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-800">Niveau</label>
                  <Select value={educationLevelFilter} onValueChange={setEducationLevelFilter}>
                    <SelectTrigger className="text-xs sm:text-sm ">
                      <SelectValue placeholder="Niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      {educationLevelOptions.map((option) => (
                        <SelectItem key={option} value={option} className="text-xs sm:text-sm focus:bg-gray-50">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Genre - CORRECTION: Ajout de l'option "Tous" */}
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

                {/* Statut (conditionnel) */}
                {config.showStatusFilter ? (
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-800">Statut</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="text-xs sm:text-sm ">
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tous">Tous</SelectItem>
                        <SelectItem value="en attente">En attente</SelectItem>
                        <SelectItem value="en cours de traitement">En traitement</SelectItem>
                        <SelectItem value="acceptee">Acceptée</SelectItem>
                        <SelectItem value="refusee">Refusée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  /* Cellules vides pour maintenir la grille à 5 colonnes */
                  <>
                    <div className="hidden lg:block" />
                    <div className="hidden lg:block" />
                    <div className="hidden lg:block" />
                  </>
                )}
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
                    {totalCount} demande{totalCount !== 1 ? 's' : ''}
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
                <div className="hidden lg:block rounded-xl border border-border/80 overflow-hidden shadow-card bg-card">
                  <div className="overflow-x-auto">
                    <div className="min-w-[900px]">
                      {/* En-tête avec style inline */}
                      <div 
                        style={{ 
                          display: 'grid', 
                          gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` 
                        }}
                        className="border-b border-border thead-brushed p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {columns.map((column) => (
                          <div key={column.key} className="px-2">
                            <SortableHeader column={column} />
                          </div>
                        ))}
                      </div>

                      {filteredInternships.length === 0 ? (
                        <div className="p-4 sm:p-6 md:p-8 text-center">
                          {config.emptyIcon}
                          <h3 className="font-medium text-lg mb-1 text-gray-900 mt-4">{config.emptyMessage}</h3>
                          <p className="text-gray-600">Aucune demande ne correspond à vos critères</p>
                        </div>
                      ) : (
                        paginatedInternships.map((internship, index) => (
                          <div
                            key={internship.id}
                            style={{ 
                              display: 'grid', 
                              gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` 
                            }}
                            className={`border-b border-border/50 p-3 hover:bg-accent/50 transition-colors ${
                              index % 2 === 0 ? 'bg-card' : 'bg-muted/25'
                            }`}
                          >
                            {columns.map((column) => (
                              <div key={column.key} className="px-2 flex items-center">
                                {column.render
                                  ? column.render(internship[column.key as keyof Internship], internship)
                                  : internship[column.key as keyof Internship]}
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
                  {filteredInternships.length === 0 ? (
                    <div className="text-center py-4 sm:py-6 md:py-8">
                      {config.emptyIcon}
                      <h3 className="font-medium text-base mb-1 text-gray-900 mt-3">{config.emptyMessage}</h3>
                      <p className="text-xs text-gray-600">Aucune demande ne correspond à vos critères</p>
                    </div>
                  ) : (
                    paginatedInternships.map((internship) => (
                      <Card key={internship.id} className={`overflow-hidden ${config.cardBorderColor || 'hover:border-gray-300'}`}>
                        <CardContent className="p-3">
                          <div className="space-y-3">
                            {/* En-tête avec nom et badge */}
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm truncate text-gray-900">
                                  {internship.etudiant_prenom} {internship.etudiant_nom}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="capitalize px-1.5 py-0 text-xs bg-gray-50 text-gray-700">
                                    {internship.genre}
                                  </Badge>
                                  <span className="text-xs text-gray-600 truncate">{internship.etudiant_specialite}</span>
                                </div>
                              </div>
                              {config.getMobileCardBadge ? config.getMobileCardBadge(internship, helpers) : (
                                <Badge 
                                  variant="outline" 
                                  className={`px-2 py-0.5 text-xs transition-colors ${getStatusBadgeVariant(internship.statut_stage)}`}
                                >
                                  {formatStatusText(internship.statut_stage)}
                                </Badge>
                              )}
                            </div>

                            {/* Informations secondaires */}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <span className="font-medium text-gray-700">Niveau</span>
                                <p className="text-gray-800">{internship.etudiant_niveau}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="font-medium text-gray-700">Type</span>
                                <div className="flex items-center">
                                  <BookOpen className="h-3 w-3 mr-1 text-gray-600 flex-shrink-0" />
                                  <span className="truncate text-gray-800">{internship.type_stage}</span>
                                </div>
                              </div>
                            </div>

                            {/* Détails spécifiques à la page */}
                            {config.getMobileCardDetails && config.getMobileCardDetails(internship, helpers)}

                            {/* Date et actions */}
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-2 border-t border-gray-100 gap-2 sm:gap-0">
                              <div className="flex items-center text-xs text-gray-600">
                                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span>Soumise: {formatDate(internship.date_soumission)}</span>
                              </div>
                              <div className="flex space-x-1">
                                <Button variant="ghost" size="sm" onClick={() => handleViewDetails(internship.id)} className="h-7 w-7 p-0 hover:bg-gray-50 text-gray-700" title="Détails">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                {canDelete && (
                                  <Button variant="ghost" size="sm" onClick={() => setSelectedDelete(internship.id)} className="h-7 w-7 p-0 text-red-600 hover:bg-red-50" title="Supprimer">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {paginatedInternships.length > 0 && (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-4 md:pt-6 border-t mt-4 md:mt-6">
                    <div className="text-xs sm:text-sm text-gray-600">
                      Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, totalCount)} sur {totalCount}
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
                title="Supprimer cette demande ?"
                description="Êtes-vous sûr de vouloir supprimer cette demande ? Cette action est irréversible."
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

export default InternshipsPage;
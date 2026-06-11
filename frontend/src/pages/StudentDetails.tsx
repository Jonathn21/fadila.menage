import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { departmentDescriptions } from "@/config/sharedConfig";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Mail, Phone, Upload, User, FileText, Eye, AlertCircle, X, FileCheck, GraduationCap,
  UserCheck, Building2, ClipboardList, MapPin, Download, ArrowLeft, Briefcase, Clock,
  DollarSign, FileBarChart, CalendarRange, Loader2, Calendar,
  Award, TrendingUp, BookOpen, Users, Shield, ExternalLink, Printer, PenLine, Flag, RefreshCw,
  Lock, Unlock
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import apiClient from "@/lib/apiClient";
import { usePermissions } from "@/hooks/usePermissions";
import {
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, differenceInDays, isBefore, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";

// Import des composants shadcn/ui pour les dates
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

import RenewalModal from "@/components/stagiaires/modals/RenewalModal";
import FinalizeRenewalModal from "@/components/stagiaires/modals/FinalizeRenewalModal";
import SignatoryModal from "@/components/internships/SignatoryModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getErrorMessage } from "@/lib/errors";


// Déclaration pour l'API File System Access
declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandle>;
  }
}

// ========================= //
//     Types et utilitaires  //
// ========================= //
type APIDocument = {
  nom: string;
  url: string;
  type?: string;
  date_upload?: string;
  size?: number;
};

type APIEcole = {
  name: string | null;
  location?: string | null;
  email?: string | null;
  phone?: string | null;
};

type ConventionRenouvellement = {
  id: number;
  numero_convention?: string;
  fichier_url: string | null;
  date_creation?: string | null;
  est_temporaire?: boolean;
};

type APIStagiaire = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  resume?: string | null;
  adresse?: string | null;
  niveau_etude: string;
  genre: string;
  superviseur?: string | null;
  type_stage: string;
  date_debut: string;
  date_fin: string;
  duree_jours: number;
  direction?: string | null;
  service?: string | null;
  lieu_stage?: string | null;
  specialite: string;
  etablissement?: APIEcole | null;
  pays_residence?: string | null;
  photo_passeport?: string | null;
  resume_cv?: string | null;
  remunere: boolean;
  montant_remuneration?: number | null;
  documents: APIDocument[];
  statut: string;
  // Clôture du dossier (verrouillage)
  est_cloture?: boolean;
  date_cloture?: string | null;
  // ✅ Nouveaux champs pour le renouvellement
  pre_renouvellement_en_cours?: boolean;
  convention_renouvellement_temporaire?: ConventionRenouvellement | null;
  // Champs pour la convention
  convention?: {
    id: string;
    numero_convention: string;
    fichier_url: string | null;
    date_creation: string;
  } | null;
  statut_renouvellement?: string | null;
  date_pre_renouvellement?: string | null;
  date_finalisation_renouvellement?: string | null;
  donnees_pre_renouvellement?: {
    type_stage?: string;
    lieu?: string;
    direction?: string;
    service?: string;
    tuteur?: string;
    date_debut?: string;
    date_fin?: string;
    remunere?: boolean;
    montant?: number;
  } | null;
  a_ete_renouvele?: boolean;
  est_renouvellement?: boolean;
  stage_precedent_id?: number | null;
  nouveau_stage_id?: number | null;
};

type HistoriqueStage = {
  id: number;
  nom: string;
  prenom: string;
  type_stage: string;
  date_debut: string | null;
  date_fin: string | null;
  duree_jours: number | null;
  statut: string;
  direction: string | null;
  service: string | null;
  est_renouvellement: boolean;
  est_courant: boolean;
};

// ========================= //
//     Données de configuration //
// ========================= //

const internshipTypes = [
  { value: "Académique", label: "Stage Académique", description: "Stage dans le cadre d'un cursus universitaire" },
  { value: "Fonctionnel", label: "Stage Fonctionnel", description: "Stage d'application professionnelle" },
  { value: "Libre", label: "Stage Libre", description: "Stage hors cadre académique" },
];

const locations = [
  { value: "Direction Générale", label: "Direction Générale", description: "Siège principal de l'entreprise" },
  { value: "DRB", label: "DRB", description: "Direction Régionale de Borgou" },
  { value: "DRT", label: "DRT", description: "Direction Régionale de l'Atacora" },
  { value: "Poste de Kara", label: "Poste de Kara", description: "Unité opérationnelle à Kara" },
  { value: "Poste de Lokossa", label: "Poste de Lokossa", description: "Unité opérationnelle à Lokossa" },
];

const departments = [
  { value: "DARH", label: "DARH", description: "Direction des Affaires et Ressources Humaines" },
  { value: "DCGIS", label: "DCGIS", description: "Direction du Centre de Gestion de l'Information et des Statistiques" },
  { value: "DEPP", label: "DEPP", description: "Direction des Études, Planification et Projets" },
  { value: "DT", label: "DT", description: "Direction Technique" },
  { value: "DM", label: "DM", description: "Direction des Marchés" },
  { value: "DFC", label: "DFC", description: "Direction Financière et Comptable" },
  { value: "DG", label: "DG", description: "Direction Générale" },
];

const servicesByDepartment = {
  DARH: ["Administration et Archives", "Ressources Humaines et Affaires Sociales", "Secrétariat"],
  DCGIS: ["Informatique", "Statistique", "Secrétariat"],
  DM: ["Préparation et Suivi des Marchés", "Exécutions des Marchés, Approvisionnement et Exonérations"],
  DT: ["Mouvements d'Energie - Dispathing", "Entretient et Télécommunications"],
  DEPP: ["Planiification Etudes et Préparation des Projets", "Service Environnement, Génie Civil et Mécanique"],
  DFC: ["Comptabilité", "Finance", "Infrastructures et Logistique"],
  DG: ["Communication", "Gestion des ressources financières"],
};

// Ajoutez cette fonction utilitaire au début de votre composant, après les imports
const formatResumeHtml = (htmlText: string): string => {
  if (!htmlText) return "";

  // Remplacer les sauts de ligne HTML par des paragraphes ou des breaks
  const textWithBreaks = htmlText
    .replace(/\n/g, '<br>')
    .replace(/<br><br>/g, '</p><p>')
    .replace(/<strong>/g, '<strong class="font-bold">');

  return `<p>${textWithBreaks}</p>`;
};

// ========================= //
//     Composant principal   //
// ========================= //
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    "Actuel": { label: "En cours", variant: "default" },
    "À venir": { label: "À venir", variant: "outline" },
    "Terminé": { label: "Terminé", variant: "secondary" },
    "Annulé": { label: "Annulé", variant: "destructive" },
  };
  const config = statusConfig[status] || { label: status, variant: "outline" };
  return (
    <Badge variant={config.variant} className={`capitalize text-[10px] sm:text-xs ${
      status === "Actuel"
        ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
        : status === "À venir"
          ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-50"
          : status === "Terminé"
            ? "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-50"
            : status === "Annulé"
              ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-50"
              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-50"
    }`}>
      {config.label}
    </Badge>
  );
};

// ========================= //
//     Composant principal   //
// ========================= //
const OngoingInternshipDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [stagiaire, setStagiaire] = useState<APIStagiaire | null>(null);
  const [historiqueStages, setHistoriqueStages] = useState<HistoriqueStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<APIDocument | null>(null);
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [isEditPeriodOpen, setIsEditPeriodOpen] = useState(false);
  const [newStartDate, setNewStartDate] = useState<Date>();
  const [newEndDate, setNewEndDate] = useState<Date>();
  const [loadingPeriod, setLoadingPeriod] = useState(false);

  // ---- State pour l'édition du résumé ----
  const [isEditingResume, setIsEditingResume] = useState(false);
  const [editedResume, setEditedResume] = useState("");
  const [isSavingResume, setIsSavingResume] = useState(false);

  // States pour le renouvellement
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [isFinalizeRenewalModalOpen, setIsFinalizeRenewalModalOpen] = useState(false);
  const [renewalConventionData, setRenewalConventionData] = useState<{
    url?: string;
    id?: number;
  } | null>(null);

  // ---- State pour l'impression/téléchargement du résumé ----
  const [isPrintingResume, setIsPrintingResume] = useState(false);
  const [isDownloadingResume, setIsDownloadingResume] = useState(false);
  const [isSignatoryModalOpen, setIsSignatoryModalOpen] = useState(false);
  const [isCancelRenewalOpen, setIsCancelRenewalOpen] = useState(false);
  const [isCancellingRenewal, setIsCancellingRenewal] = useState(false);


  // Fonction pour charger les données du stagiaire
  const fetchStagiaire = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!id) return;
      const res = await apiClient.get(`/stagiaires/${id}/`);
      const data: APIStagiaire = res.data.stagiaire;
      setStagiaire(data);
      setHistoriqueStages(res.data.historique_stages || []);
      
      // Initialiser le résumé édité avec la valeur actuelle
      setEditedResume(data.resume_cv || data.resume || "");
      setNewStartDate(new Date(data.date_debut));
      setNewEndDate(new Date(data.date_fin));
      
      // Initialiser les données de convention si elles existent
      if (data.convention_renouvellement_temporaire?.fichier_url) {
        setRenewalConventionData({
          url: data.convention_renouvellement_temporaire.fichier_url,
          id: data.convention_renouvellement_temporaire.id,
        });
      }
    } catch (e: any) {
      setError(e.message || "Impossible de charger le stagiaire");
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du stagiaire",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStagiaire();
  }, [id, toast]);

  // ---- Fonction pour générer le HTML du résumé pour l'export ----
  const generateResumeHtmlForExport = (): string => {
    if (!stagiaire) return "";

    const today = new Date().toLocaleDateString("fr-FR", {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const resumeContent = stagiaire.resume_cv || stagiaire.resume || "";
    const formattedResume = resumeContent ? formatResumeHtml(resumeContent) : "";

    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Résumé - ${stagiaire.prenom} ${stagiaire.nom}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.8;
            color: #333;
            padding: 30px 40px;
            background: white;
            min-height: 100vh;
          }
          
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
          }
          
          .title {
            color: #1e40af;
            font-size: 28px;
            margin-bottom: 10px;
          }
          
          .subtitle {
            color: #4b5563;
            font-size: 18px;
            margin-bottom: 20px;
          }
          
          .badge {
            display: inline-block;
            padding: 4px 12px;
            background: #dbeafe;
            color: #1e40af;
            border-radius: 20px;
            font-size: 14px;
            margin-right: 8px;
            margin-bottom: 8px;
            border: 1px solid #93c5fd;
          }
          
          .internship-info {
            background: #f8fafc;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 30px;
            border-left: 4px solid #2563eb;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 10px;
          }
          
          .info-item {
            display: flex;
            flex-direction: column;
          }
          
          .info-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          
          .info-value {
            font-size: 14px;
            font-weight: 600;
            color: #1e40af;
          }
          
          .resume-text {
            font-size: 13px;
            line-height: 1.5;
            color: #374151;
            text-align: justify;
            hyphens: auto;
            max-width: 100%;
          }
          
          .resume-text p {
            margin-bottom: 10px;
            text-indent: 0;
          }
          
          .resume-text strong {
            color: #1e40af;
            font-weight: 600;
          }
          
          .resume-text ul, .resume-text ol {
            margin-left: 30px;
            margin-bottom: 10px;
          }
          
          .resume-text li {
            margin-bottom: 4px;
          }
          
          .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #6b7280;
            font-style: italic;
          }
          
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
          }
          
          @media print {
            body {
              padding: 15mm;
            }
            
            .no-print {
              display: none;
            }
            
            @page {
              margin: 15mm;
              size: A4;
            }
            
            .resume-text {
              orphans: 3;
              widows: 3;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">Résumé professionnel</h1>
          <h2 class="subtitle">${stagiaire.prenom} ${stagiaire.nom}</h2>
          <div style="margin-top: 20px;">
            <span class="badge">${stagiaire.specialite}</span>
            <span class="badge">${stagiaire.niveau_etude}</span>
            <span class="badge">${stagiaire.type_stage}</span>
          </div>
        </div>
        
        ${resumeContent ? `
          <div class="resume-text">
            ${formattedResume}
          </div>
        ` : `
          <div class="empty-state">
            Aucun résumé n'a été fourni par l'étudiant.
          </div>
        `}
      </body>
      </html>
    `;
  };

  // Annuler le pré-renouvellement en cours
  const handleCancelRenewal = async () => {
    if (!stagiaire || isCancellingRenewal) return;
    setIsCancellingRenewal(true);
    try {
      await apiClient.post(`/stagiaires/${stagiaire.id}/annuler-pre-renouvellement/`);
      toast({
        title: "Pré-renouvellement annulé",
        description: "La convention temporaire a été supprimée.",
      });
      setIsCancelRenewalOpen(false);
      setRenewalConventionData(null);
      await fetchStagiaire();
    } catch (error) {
      toast({
        title: "Erreur",
        description: getErrorMessage(error, "Impossible d'annuler le pré-renouvellement."),
        variant: "destructive",
      });
    } finally {
      setIsCancellingRenewal(false);
    }
  };

  // Fonction pour gérer le succès du pré-renouvellement
  const handleRenewalSuccess = (data?: {
    convention_temporaire_url?: string;
    convention_temporaire_id?: number;
    message?: string;
  }) => {
    if (data?.convention_temporaire_url) {
      setRenewalConventionData({
        url: data.convention_temporaire_url,
        id: data.convention_temporaire_id,
      });
      setIsRenewalModalOpen(false);
      
      // Ouvrir automatiquement le modal de finalisation après un court délai
      setTimeout(() => {
        setIsFinalizeRenewalModalOpen(true);
      }, 500);
      
      toast({
        title: "Convention générée",
        description: "Téléchargez-la, faites-la signer, puis uploadez-la pour finaliser le renouvellement.",
        variant: "default",
      });
    }
  };

  // ---- Fonction pour imprimer le résumé ----
  const handlePrintResume = () => {
    if (!stagiaire) {
      toast({
        title: "Erreur",
        description: "Aucun stagiaire trouvé",
        variant: "destructive",
      });
      return;
    }

    setIsPrintingResume(true);

    try {
      const htmlContent = generateResumeHtmlForExport();
      const printWindow = window.open('', '_blank', 'width=800,height=600,toolbar=0,scrollbars=1,status=0');

      if (!printWindow) {
        toast({
          title: "Erreur",
          description: "Veuillez autoriser les pop-ups pour l'impression",
          variant: "destructive",
        });
        setIsPrintingResume(false);
        return;
      }

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Attendre que le contenu soit chargé avant d'imprimer
      printWindow.onload = function () {
        printWindow.focus();
        printWindow.print();

        // Fermer la fenêtre après l'impression (optionnel)
        printWindow.onafterprint = function () {
          printWindow.close();
        };
      };

      // Fallback si onload ne se déclenche pas
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        setIsPrintingResume(false);
      }, 1000);

      toast({
        title: "Impression lancée",
        description: "La fenêtre d'impression s'est ouverte",
        variant: "default",
      });
    } catch (err: any) {
      console.error("Erreur lors de l'impression:", err);
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir la fenêtre d'impression",
        variant: "destructive",
      });
      setIsPrintingResume(false);
    }
  };


  // Fonction pour vérifier si le stage a commencé
  const hasInternshipStarted = useMemo(() => {
    if (!stagiaire?.date_debut) return false;
    const startDate = new Date(stagiaire.date_debut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return startDate <= today;
  }, [stagiaire]);

  // Fonction pour vérifier si le stage n'a pas encore commencé
  const hasInternshipNotStarted = useMemo(() => {
    if (!stagiaire?.date_debut) return false;
    const startDate = new Date(stagiaire.date_debut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return startDate > today;
  }, [stagiaire]);

  // Calcul de la progression du stage
  const calculateProgress = () => {
    if (!stagiaire) return 0;
    const start = new Date(stagiaire.date_debut).getTime();
    const end = new Date(stagiaire.date_fin).getTime();
    const now = new Date().getTime();
    if (now >= end) return 100;
    if (now <= start) return 0;
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.round((elapsed / total) * 100));
  };

  // Calcul des jours restants
  const calculateDaysLeft = () => {
    if (!stagiaire) return 0;
    const end = new Date(stagiaire.date_fin).getTime();
    const now = new Date().getTime();
    const daysLeft = Math.ceil((end - now) / (1000 * 3600 * 24));
    return daysLeft > 0 ? daysLeft : 0;
  };

  // Données étudiant transformées
  const student = useMemo(() => {
    if (!stagiaire) return null;
    return {
      name: `${stagiaire.nom} ${stagiaire.prenom}`,
      email: stagiaire.email,
      phone: stagiaire.telephone,
      photo: stagiaire.photo_passeport || undefined,
      avatar: `${stagiaire.prenom?.[0] || ""}${stagiaire.nom?.[0] || ""}`.toUpperCase() || "ET",
      program: stagiaire.specialite,
      year: stagiaire.niveau_etude,
      resume: stagiaire.resume_cv || stagiaire.resume || "",
      address: stagiaire.adresse || "",
      country: stagiaire.pays_residence || "",
      gender: stagiaire.genre || "",
      documents: stagiaire.documents || [],
      statut: stagiaire.statut,
      startDate: stagiaire.date_debut,
      endDate: stagiaire.date_fin,
      duration: stagiaire.duree_jours,
    };
  }, [stagiaire]);

  // Données école
  const school = useMemo(() => {
    if (!stagiaire || !stagiaire.etablissement) return null;
    const s = stagiaire.etablissement;
    return {
      name: s.name || "Non spécifié",
      location: s.location || undefined,
      email: s.email || undefined,
      phone: s.phone || undefined,
    };
  }, [stagiaire]);

  // Ferme l'aperçu et libère l'URL blob
  const closeDocumentPreview = () => {
    setSelectedDocument(null);
    setDocumentPreviewUrl((prev) => {
      if (prev && prev.startsWith("blob:")) window.URL.revokeObjectURL(prev);
      return null;
    });
    setIsPreviewLoading(false);
  };

  // Visualisation d'un document : on récupère le fichier authentifié (JWT) sous
  // forme de blob pour l'afficher dans le modal. Charger l'URL brute dans l'iframe
  // échoue (401/403) car le navigateur n'envoie pas le token → « erreur d'affichage du PDF ».
  const handleViewDocument = async (doc: APIDocument) => {
    setSelectedDocument(doc);
    setDocumentPreviewUrl(null);

    // Lien externe (autre domaine) : on l'utilise tel quel
    const isExternal = /^https?:\/\//i.test(doc.url) && !doc.url.includes(window.location.host);
    if (isExternal) {
      setDocumentPreviewUrl(doc.url);
      return;
    }

    setIsPreviewLoading(true);
    try {
      const response = await apiClient.get(doc.url, { responseType: "blob" });
      const isPdf = (doc.url || "").split("?")[0].toLowerCase().endsWith(".pdf");
      const blob = isPdf && response.data.type !== "application/pdf"
        ? new Blob([response.data], { type: "application/pdf" })
        : response.data;
      const blobUrl = window.URL.createObjectURL(blob);
      setDocumentPreviewUrl(blobUrl);
    } catch {
      toast({ title: "Erreur", description: "Impossible d'afficher le document", variant: "destructive" });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Fonction pour télécharger un document
  const handleDownloadDocument = async (doc: APIDocument) => {
    if (!stagiaire) return;

    const fileName = `${doc.nom.replace(/\s+/g, "_")}_${stagiaire.nom}_${stagiaire.prenom}`;

    try {
      const response = await apiClient.get(doc.url, { responseType: "blob" });
      const blob = response.data;

      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: "Fichiers autorisés",
              accept: {
                "application/pdf": [".pdf"],
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
                "image/jpeg": [".jpg", ".jpeg"],
                "image/png": [".png"],
              },
            },
          ],
        });

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: "Téléchargement réussi",
        description: `Le document "${doc.nom}" a été téléchargé.`,
      });
    } catch (err: any) {
      console.error("Erreur lors du téléchargement :", err);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le document.",
        variant: "destructive",
      });
    }
  };

  // Fonction pour clôturer un stage
  const handleEndEarly = async () => {
    if (!stagiaire) return;

    try {
      await apiClient.post(`/stagiaires/${stagiaire.id}/fin-anticipee/`);
      toast({
        title: "Stage clôturé",
        description: `Le stage de ${stagiaire.prenom} ${stagiaire.nom} a été clôturé avec succès.`,
      });
      setStagiaire({ ...stagiaire, statut: "Terminé", date_fin: new Date().toISOString() });
    } catch (err: any) {
      console.error("Erreur fin anticipée :", err);
      toast({
        title: "Erreur",
        description: "Impossible de clôturer le stage",
        variant: "destructive",
      });
    }
  };

  // Clôturer le dossier (verrouille le stage terminé)
  const handleCloturer = async () => {
    if (!stagiaire) return;
    try {
      const res = await apiClient.post(`/stagiaires/${stagiaire.id}/cloture/`);
      toast({
        title: "Dossier clôturé",
        description: `Le dossier de ${stagiaire.prenom} ${stagiaire.nom} a été clôturé.`,
      });
      setStagiaire({
        ...stagiaire,
        est_cloture: true,
        date_cloture: res.data?.stagiaire?.date_cloture ?? new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Erreur clôture :", err);
      toast({
        title: "Erreur",
        description: err.response?.data?.message || "Impossible de clôturer le dossier",
        variant: "destructive",
      });
    }
  };

  // Rouvrir un dossier clôturé (réservé aux détenteurs de stages.close)
  const handleRouvrir = async () => {
    if (!stagiaire) return;
    try {
      await apiClient.delete(`/stagiaires/${stagiaire.id}/cloture/`);
      toast({
        title: "Dossier rouvert",
        description: `Le dossier de ${stagiaire.prenom} ${stagiaire.nom} a été rouvert.`,
      });
      setStagiaire({ ...stagiaire, est_cloture: false, date_cloture: null });
    } catch (err: any) {
      console.error("Erreur réouverture :", err);
      toast({
        title: "Erreur",
        description: err.response?.data?.message || "Impossible de rouvrir le dossier",
        variant: "destructive",
      });
    }
  };

  // Fonction pour mettre à jour la période du stage
  const handleUpdatePeriod = async () => {
    if (!stagiaire || !newStartDate || !newEndDate) return;

    setLoadingPeriod(true);
    try {
      const formatDateToYYYYMMDD = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      await apiClient.post(`/stagiaires/${stagiaire.id}/modifier-periode/`, {
        date_debut: formatDateToYYYYMMDD(newStartDate),
        date_fin: formatDateToYYYYMMDD(newEndDate),
      });

      setStagiaire((prev) => prev ? {
        ...prev,
        date_debut: newStartDate.toISOString(),
        date_fin: newEndDate.toISOString(),
        duree_jours: differenceInDays(newEndDate, newStartDate) + 1,
      } : null);

      toast({ title: "Succès", description: "Période mise à jour", variant: "default" });
      setIsEditPeriodOpen(false);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erreur",
        description: err.response?.data?.message || "Impossible de mettre à jour la période",
        variant: "destructive"
      });
    } finally {
      setLoadingPeriod(false);
    }
  };

  // Fonction pour générer une attestation
  const handleGenererAttestation = async () => {
    if (!stagiaire) return;

    try {
      const response = await apiClient.get(
        `/stagiaires/${stagiaire.id}/generer-attestation/`,
        { responseType: "blob" }
      );

      const blob = response.data;
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `attestation_${stagiaire.nom || "stagiaire"}_${stagiaire.prenom || ""}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Succès",
        description: "L'attestation de stage a été générée et téléchargée.",
      });
    } catch (err: any) {
      console.error("Erreur attestation :", err);
      toast({
        title: "Erreur",
        description: "L'attestation de stage sera disponible une fois le stage terminé.",
        variant: "destructive",
      });
    }
  };

  // Fonction utilitaire pour vérifier la présence de documents de rapport
  const hasRapportDocuments = useMemo(() => {
    if (!student?.documents || student.documents.length === 0) return false;
    return student.documents.some(doc =>
      doc.nom.toLowerCase().includes('rapport') ||
      doc.nom.toLowerCase().includes('report')
    );
  }, [student?.documents]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate("/stages/en_cours")}
                  className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-gray-50 text-gray-700 hover:text-gray-800 hover:border-gray-300"
                >
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Skeleton className="h-6 sm:h-8 w-40 sm:w-64 bg-gray-100" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4 sm:space-y-6">
              <Card className="border border-gray-200">
                <CardHeader className="pb-2 sm:pb-3">
                  <Skeleton className="h-5 sm:h-6 w-32 sm:w-48 mb-1.5 sm:mb-2 bg-gray-100" />
                  <Skeleton className="h-3 sm:h-4 w-20 sm:w-32 bg-gray-100" />
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Skeleton className="h-3 sm:h-4 w-full bg-gray-100" />
                    <Skeleton className="h-1.5 sm:h-2 w-full bg-gray-100" />
                  </div>
                  <Skeleton className="h-3 sm:h-4 w-3/4 bg-gray-100" />
                  <div className="flex gap-1.5 sm:gap-2 pt-2 sm:pt-3">
                    <Skeleton className="h-5 sm:h-6 w-16 sm:w-20 bg-gray-100" />
                    <Skeleton className="h-5 sm:h-6 w-20 sm:w-24 bg-gray-100" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardHeader>
                  <Skeleton className="h-5 sm:h-6 w-36 sm:w-48 bg-gray-100" />
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 sm:gap-3">
                      <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gray-100" />
                      <div className="space-y-1.5 sm:space-y-2">
                        <Skeleton className="h-2.5 sm:h-3 w-16 sm:w-20 bg-gray-100" />
                        <Skeleton className="h-3 sm:h-4 w-24 sm:w-32 bg-gray-100" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardHeader>
                  <Skeleton className="h-5 sm:h-6 w-24 sm:w-32 bg-gray-100" />
                </CardHeader>
                <CardContent className="space-y-2.5 sm:space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 sm:p-3 border border-gray-200 rounded-lg gap-2 sm:gap-0">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gray-100" />
                        <Skeleton className="h-3 sm:h-4 w-24 sm:w-32 bg-gray-100" />
                      </div>
                      <Skeleton className="h-7 w-20 sm:h-9 sm:w-24 bg-gray-100" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <Card className="border border-gray-200">
                <CardHeader>
                  <Skeleton className="h-5 sm:h-6 w-24 sm:w-32 bg-gray-100" />
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center">
                    <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-full mb-3 sm:mb-4 bg-gray-100" />
                    <Skeleton className="h-4 sm:h-6 w-24 sm:w-32 mb-1.5 sm:mb-2 bg-gray-100" />
                    <Skeleton className="h-3 sm:h-4 w-20 sm:w-24 mb-3 sm:mb-4 bg-gray-100" />
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-3 sm:h-4 w-full mb-1.5 sm:mb-2 bg-gray-100" />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardHeader>
                  <Skeleton className="h-5 sm:h-6 w-24 sm:w-32 bg-gray-100" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2.5 sm:space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 sm:h-10 w-full bg-gray-100" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate("/stages/en_cours")}
                  className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-gray-50 text-gray-700 hover:text-gray-800 hover:border-gray-300"
                >
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900">Détails du stagiaire</h1>
              </div>
            </div>
          </div>

          <Card className="border border-gray-200">
            <CardContent className="pt-4 sm:pt-6">
              <div className="text-center py-6 sm:py-8">
                <User className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-gray-400 mb-3 sm:mb-4" />
                <h3 className="text-sm sm:text-base font-medium mb-1 sm:mb-2 text-gray-900">Erreur de chargement</h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                  {error}
                </p>
                <Button
                  onClick={fetchStagiaire}
                  className="text-xs sm:text-sm bg-primary hover:bg-primary/90 text-white"
                >
                  Réessayer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!stagiaire || !student) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate("/stages/en_cours")}
                  className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-gray-50 text-gray-700 hover:text-gray-800 hover:border-gray-300"
                >
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900">Détails du stagiaire</h1>
              </div>
            </div>
          </div>

          <Card className="border border-gray-200">
            <CardContent className="pt-4 sm:pt-6">
              <div className="text-center py-6 sm:py-8">
                <User className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-gray-400 mb-3 sm:mb-4" />
                <h3 className="text-sm sm:text-base font-medium mb-1 sm:mb-2 text-gray-900">Stagiaire non trouvé</h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  Le stagiaire que vous recherchez n'existe pas ou a été supprimé.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const progress = calculateProgress();
  const daysLeft = calculateDaysLeft();

  // Logs pour debug
  console.log("=== ÉTAT ACTUEL ===");
  console.log("Statut:", stagiaire.statut);
  console.log("pre_renouvellement_en_cours:", stagiaire.pre_renouvellement_en_cours);
  console.log("renewalConventionData:", renewalConventionData);
  console.log("convention API:", stagiaire.convention_renouvellement_temporaire);
  console.log("hasInternshipStarted:", hasInternshipStarted);
  console.log("hasInternshipNotStarted:", hasInternshipNotStarted);

  return (
    <DashboardLayout>
      <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header avec bouton retour */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-gray-50 text-gray-700 hover:text-gray-800 hover:border-gray-300"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900">Détails du stagiaire</h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  Informations sur le stage de {student.name}
                </p>
              </div>
            </div>
            <StatusBadge status={student.statut} />
          </div>

          {/* Barre de progression */}
          <Card className="overflow-hidden border border-gray-200">
            <CardContent className="p-3 sm:p-4 bg-gray-50/30">
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between text-xs sm:text-sm gap-2 sm:gap-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                    <span className="font-medium text-gray-700">Progression du stage</span>
                  </div>
                  <span className="font-semibold text-gray-900">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5 sm:h-2 bg-gray-100" />
                <div className="flex flex-col sm:flex-row sm:justify-between text-xs text-gray-600 gap-2 sm:gap-0">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span>{new Date(student.startDate).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{daysLeft} jours restants</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span>{new Date(student.endDate).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {/* Colonne principale */}
          <div className="md:col-span-2 space-y-4 sm:space-y-6">
            {/* En-tête avec statut et informations étudiant */}
            <Card className="border border-gray-200">
              <CardHeader className="pb-2 sm:pb-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                  <div>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 mb-1 text-gray-900">
                      {student.name}
                      {student.resume && (
                        <div className="flex gap-1.5 sm:gap-2 ml-1.5 sm:ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handlePrintResume}
                            disabled={isPrintingResume || !stagiaire}
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-gray-50 text-gray-700 hover:text-gray-800"
                            title="Imprimer le résumé"
                          >
                            {isPrintingResume ? (
                              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                            ) : (
                              <Printer className="h-3 w-3 sm:h-4 sm:w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Badge variant="outline" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs bg-gray-50 text-gray-700 border-gray-300">
                        <BookOpen className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {student.program}
                      </Badge>
                      <Badge variant="outline" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs bg-gray-50 text-gray-700 border-gray-300">
                        <GraduationCap className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {student.year}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Section résumé éditable */}
                <div className="mb-3 sm:mb-4">
                  {isEditingResume ? (
                    <div className="space-y-2.5 sm:space-y-3">
                      <Textarea
                        value={editedResume}
                        onChange={(e) => setEditedResume(e.target.value)}
                        placeholder="Entrez le résumé du candidat..."
                        className="min-h-[100px] sm:min-h-[120px] resize-y font-mono text-xs sm:text-sm focus:border-primary focus:ring-primary"
                      />
                      <p className="text-xs text-gray-600">
                        Vous pouvez modifier le résumé du candidat. Les modifications seront sauvegardées immédiatement.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 sm:space-y-3">
                      {student.resume ? (
                        <div
                          className="text-xs sm:text-sm text-justify leading-relaxed prose prose-sm max-w-none text-gray-800"
                          dangerouslySetInnerHTML={{ __html: formatResumeHtml(student.resume) }}
                        />
                      ) : (
                        <div className="space-y-2.5 sm:space-y-3">
                          <span className="text-gray-600 italic">
                            Aucun résumé n'a été fourni par l'étudiant.
                          </span>
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 sm:p-3">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
                              <p className="text-xs sm:text-sm text-yellow-700">
                                Aucun résumé disponible. Vous pouvez en ajouter un en cliquant sur "Modifier".
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Informations de stage */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base text-gray-900">
                  <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />
                  Informations de stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                  {/* Colonne gauche */}
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                        <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Direction</p>
                        <p className="font-medium text-gray-900">{stagiaire.direction || "—"}</p>
                        {stagiaire.direction && (
                          <p className="text-xs text-gray-600 mt-0.5 sm:mt-1">
                            {departmentDescriptions[stagiaire.direction]}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                        <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Service</p>
                        <p className="font-medium text-gray-900">{stagiaire.service || "—"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Lieu</p>
                        <p className="font-medium text-gray-900">{stagiaire.lieu_stage || "—"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Colonne droite */}
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                        <FileCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Type de stage</p>
                        <p className="font-medium text-gray-900">{stagiaire.type_stage}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                        <CalendarRange className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Période</p>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Badge variant="outline" className="text-[10px] sm:text-xs bg-gray-50 text-gray-700 border-gray-300">
                            {new Date(stagiaire.date_debut).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short' })}
                          </Badge>
                          <span className="text-gray-600">→</span>
                          <Badge variant="outline" className="text-[10px] sm:text-xs bg-gray-50 text-gray-700 border-gray-300">
                            {new Date(stagiaire.date_fin).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short' })}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 sm:mt-1">
                          {stagiaire.duree_jours} jours • {daysLeft} jours restants
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 rounded-lg bg-yellow-100 text-yellow-600 mt-0.5">
                        <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-yellow-600">Rémunération</p>
                        <p className="font-medium text-gray-900">
                          {stagiaire.remunere ? (
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              {stagiaire.montant_remuneration?.toLocaleString() || "N/A"}
                              <span className="text-xs text-gray-600">FCFA</span>
                            </span>
                          ) : (
                            "Non rémunéré"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base text-gray-900">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                  Documents
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-gray-600">
                  Documents associés au stagiaire
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5 sm:space-y-3">
                  {student.documents.length > 0 ? (
                    student.documents.map((doc, index) => (
                      <div
                        key={`${doc.nom}-${index}`}
                        className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 border border-gray-300 rounded-lg hover:bg-gray-50/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="p-1.5 sm:p-2 rounded-md bg-red-100">
                            <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-xs sm:text-sm truncate text-gray-900">{doc.nom}</p>
                            <p className="text-xs text-gray-600">
                              {doc.url.split('.').pop()?.toUpperCase()} •{" "}
                              {doc.url.includes('http') ? 'Lien externe' : 'Document'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 sm:gap-2 self-end sm:self-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                            className="h-7 sm:h-8 gap-0.5 sm:gap-1 hover:bg-gray-50 text-gray-700 hover:text-gray-800"
                          >
                            <Eye className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                            <span className="hidden sm:inline">Voir</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadDocument(doc)}
                            className="h-7 sm:h-8 gap-0.5 sm:gap-1 text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300"
                          >
                            <Download className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                            <span className="hidden sm:inline">Télécharger</span>
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 sm:py-8 border border-gray-300 rounded-lg bg-gray-50/20">
                      <FileText className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-gray-400 mb-2 sm:mb-3" />
                      <p className="text-xs sm:text-sm text-gray-700">Aucun document disponible</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite : Stagiaire + Établissement + Superviseur + Actions */}
          <div className="space-y-4 sm:space-y-6">
            {/* Stagiaire */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base text-gray-900">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  Stagiaire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-16 w-16 sm:h-20 sm:w-20 mb-3 sm:mb-4 cursor-pointer" onClick={() => setIsPhotoDialogOpen(true)}>
                    <AvatarImage src={student.photo} className="object-cover" />
                    <AvatarFallback className="text-lg sm:text-xl font-bold bg-primary/10 text-primary">{student.avatar}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900">{student.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">{student.program}, {student.year}</p>

                  <div className="w-full space-y-2.5 sm:space-y-3">
                    <div className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg bg-gray-50/50">
                      <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 flex-shrink-0" />
                      <a
                        href={`mailto:${student.email}`}
                        className="text-xs sm:text-sm hover:underline truncate text-left text-gray-800 hover:text-gray-900"
                        title={student.email}
                      >
                        {student.email}
                      </a>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg bg-gray-50/50">
                      <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 flex-shrink-0" />
                      <a
                        href={`tel:${student.phone}`}
                        className="text-xs sm:text-sm hover:underline truncate text-gray-800 hover:text-gray-900"
                      >
                        {student.phone}
                      </a>
                    </div>

                    {student.gender && (
                      <div className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg bg-gray-50/50">
                        <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 flex-shrink-0" />
                        <p className="text-xs sm:text-sm capitalize truncate text-gray-800">{student.gender.toLowerCase()}</p>
                      </div>
                    )}

                    {student.country && (
                      <div className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg bg-gray-50/50">
                        <Flag className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 flex-shrink-0" />
                        <p className="text-xs sm:text-sm truncate text-gray-800">{student.country}</p>
                      </div>
                    )}

                    {student.address && (
                      <div className="flex items-start gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg bg-gray-50/50">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs sm:text-sm text-left text-gray-800">{student.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Établissement */}
            {school && (
              <Card className="border border-gray-200">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-gray-900">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 text-primary">
                      <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4" />
                    </div>
                    Établissement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2.5 sm:space-y-3">
                    <div className="pb-1.5 sm:pb-2 border-b border-gray-200">
                      <h4 className="font-medium text-xs sm:text-sm text-gray-900 truncate">{school.name}</h4>
                    </div>

                    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                      {school.location && (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <MapPin className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-gray-600 flex-shrink-0" />
                          <span className="truncate text-gray-800">{school.location}</span>
                        </div>
                      )}

                      {school.email && (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Mail className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-gray-600 flex-shrink-0" />
                          <a href={`mailto:${school.email}`} className="hover:underline truncate text-gray-800 hover:text-gray-900">
                            {school.email}
                          </a>
                        </div>
                      )}

                      {school.phone && (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Phone className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-gray-600 flex-shrink-0" />
                          <a href={`tel:${school.phone}`} className="hover:underline truncate text-gray-800 hover:text-gray-900">
                            {school.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Superviseur */}
            {stagiaire.superviseur && (
              <Card className="border border-gray-200">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-gray-900">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100 text-blue-600">
                      <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                    </div>
                    Superviseur
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex-shrink-0 inline-flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-blue-100 text-blue-600">
                      <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate text-xs sm:text-sm text-gray-900" title={stagiaire.superviseur}>
                        {stagiaire.superviseur}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {stagiaire.service || "Service"}
                        {stagiaire.direction && ` • ${stagiaire.direction}`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions - VERSION CORRIGÉE */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base text-gray-900">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 sm:space-y-3">
              {stagiaire.est_cloture ? (
                /* Dossier clôturé : verrouillé */
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="p-2.5 sm:p-3 border border-amber-200 bg-amber-50 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lock className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <p className="text-xs sm:text-sm font-medium text-amber-700">Dossier clôturé</p>
                    </div>
                    <p className="text-xs text-amber-600">
                      Le dossier est verrouillé{stagiaire.date_cloture ? ` depuis le ${format(new Date(stagiaire.date_cloture), "dd/MM/yyyy")}` : ""}. Renouvellement et modifications désactivés.
                    </p>
                  </div>
                  {hasPermission("stages.close") && (
                    <Button
                      variant="outline"
                      className="w-full gap-1.5 sm:gap-2 justify-center text-xs sm:text-sm text-amber-700 hover:bg-amber-50 hover:text-amber-800 border-amber-200"
                      onClick={handleRouvrir}
                    >
                      <Unlock className="h-3 w-3 sm:h-4 sm:w-4" />
                      Rouvrir le dossier
                    </Button>
                  )}
                </div>
              ) : (
                <>
              {/* CAS 1: Stage terminé ET pas en pré-renouvellement ET pas déjà renouvelé => Renouveler */}
              {stagiaire.statut === "Terminé" && !stagiaire.pre_renouvellement_en_cours && !stagiaire.a_ete_renouvele && hasPermission("stages.renew") && (
                <Button
                  variant="default"
                  className="w-full gap-1.5 sm:gap-2 text-xs sm:text-sm bg-primary hover:bg-red-800 text-white"
                  onClick={() => setIsRenewalModalOpen(true)}
                >
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                  Renouveler le stage
                </Button>
              )}

              {/* CAS 2: Stage terminé ET en pré-renouvellement => Finaliser */}
              {stagiaire.statut === "Terminé" && stagiaire.pre_renouvellement_en_cours && hasPermission("stages.renew") && (
                <>
                  {/* Badge d'information avec données du pré-renouvellement */}
                  <div className="p-3 border border-green-200 bg-green-50 rounded-lg mb-2">
                    <div className="flex items-center gap-1.5 mb-2">
                      <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <p className="text-xs font-medium text-green-700">Pré-renouvellement en cours</p>
                    </div>
                    {stagiaire.donnees_pre_renouvellement ? (
                      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px] sm:text-xs text-green-900">
                        {stagiaire.donnees_pre_renouvellement.date_debut && stagiaire.donnees_pre_renouvellement.date_fin && (
                          <>
                            <dt className="font-medium text-green-700">Période :</dt>
                            <dd>{stagiaire.donnees_pre_renouvellement.date_debut} → {stagiaire.donnees_pre_renouvellement.date_fin}</dd>
                          </>
                        )}
                        {stagiaire.donnees_pre_renouvellement.direction && (
                          <>
                            <dt className="font-medium text-green-700">Direction :</dt>
                            <dd>{stagiaire.donnees_pre_renouvellement.direction}</dd>
                          </>
                        )}
                        {stagiaire.donnees_pre_renouvellement.service && (
                          <>
                            <dt className="font-medium text-green-700">Service :</dt>
                            <dd>{stagiaire.donnees_pre_renouvellement.service}</dd>
                          </>
                        )}
                        {stagiaire.donnees_pre_renouvellement.tuteur && (
                          <>
                            <dt className="font-medium text-green-700">Tuteur :</dt>
                            <dd>{stagiaire.donnees_pre_renouvellement.tuteur}</dd>
                          </>
                        )}
                        {stagiaire.donnees_pre_renouvellement.remunere && (
                          <>
                            <dt className="font-medium text-green-700">Rémunération :</dt>
                            <dd>
                              {stagiaire.donnees_pre_renouvellement.montant
                                ? `${stagiaire.donnees_pre_renouvellement.montant.toLocaleString("fr-FR")} FCFA / mois`
                                : "Oui"}
                            </dd>
                          </>
                        )}
                      </dl>
                    ) : (
                      <p className="text-xs text-green-600">Une convention temporaire a été générée.</p>
                    )}
                  </div>

                  {/* Bouton principal - Finaliser */}
                  <Button
                    variant="default"
                    className="w-full gap-1.5 sm:gap-2 text-xs sm:text-sm  hover:bg-red-800 text-white"
                    onClick={() => {
                      // Utiliser les données de l'API si disponibles
                      if (stagiaire.convention_renouvellement_temporaire?.fichier_url) {
                        setRenewalConventionData({
                          url: stagiaire.convention_renouvellement_temporaire.fichier_url,
                          id: stagiaire.convention_renouvellement_temporaire.id,
                        });
                      }
                      setIsFinalizeRenewalModalOpen(true);
                    }}
                  >
                    <FileCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                    Finaliser le renouvellement
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setIsSignatoryModalOpen(true)}
                  >
                    <PenLine className="h-3 w-3 sm:h-4 sm:w-4" />
                    Faire signer
                  </Button>

                  {/* Lien pour télécharger la convention si disponible */}
                  {stagiaire.convention_renouvellement_temporaire?.fichier_url && (
                    <Button
                      variant="outline"
                      className="w-full gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => window.open(stagiaire.convention_renouvellement_temporaire?.fichier_url || '', '_blank')}
                    >
                      <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                      Télécharger la convention
                    </Button>
                  )}

                  {/* Annuler le pré-renouvellement */}
                  <Button
                    variant="outline"
                    className="w-full gap-1.5 sm:gap-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                    onClick={() => setIsCancelRenewalOpen(true)}
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    Annuler le pré-renouvellement
                  </Button>
                </>
              )}

              {/* CAS 3: Stage non terminé - Modifier la période et Mettre fin */}
              {stagiaire.statut !== "Terminé" && (
                <>
                  {hasPermission("stages.edit") && (
                  <Button
                    variant="default"
                    className="w-full gap-1.5 sm:gap-2 justify-start text-xs sm:text-sm hover:bg-red-800"
                    onClick={() => {
                      setNewStartDate(new Date(stagiaire.date_debut));
                      setNewEndDate(new Date(stagiaire.date_fin));
                      setIsEditPeriodOpen(true);
                    }}
                  >
                    <CalendarRange className="h-3 w-3 sm:h-4 sm:w-4" />
                    Modifier la période
                  </Button>
                  )}

                  {hasInternshipStarted && hasPermission("stages.end_early") && (
                    <Button
                      variant="outline"
                      className="w-full gap-1.5 sm:gap-2 justify-start text-xs sm:text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300"
                      onClick={handleEndEarly}
                    >
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      Mettre fin au stage
                    </Button>
                  )}
                </>
              )}

              {/* Message si stage programmé */}
              {hasInternshipNotStarted && stagiaire.statut !== "Terminé" && (
                <div className="p-2.5 sm:p-3 border border-blue-200 bg-blue-50 rounded-lg text-center">
                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs sm:text-sm font-medium text-blue-700">Stage programmé</p>
                  <p className="text-xs text-blue-600 mt-0.5 sm:mt-1">
                    Le stage débutera le {format(new Date(student.startDate), "dd/MM/yyyy")}
                  </p>
                </div>
              )}

              {/* Clôturer le dossier : stage terminé, non clôturé, hors renouvellement en cours */}
              {stagiaire.statut === "Terminé" && !stagiaire.pre_renouvellement_en_cours && hasPermission("stages.close") && (
                <Button
                  variant="outline"
                  className="w-full gap-1.5 sm:gap-2 justify-center text-xs sm:text-sm text-amber-700 hover:bg-amber-50 hover:text-amber-800 border-amber-200"
                  onClick={handleCloturer}
                >
                  <Lock className="h-3 w-3 sm:h-4 sm:w-4" />
                  Clôturer le stage
                </Button>
              )}
                </>
              )}
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Historique des stages */}
        {historiqueStages.length > 1 && (
          <Card className="border border-gray-200 mt-4 sm:mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base text-gray-900">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                Historique des stages ({historiqueStages.length})
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600">
                Tous les stages effectués par ce stagiaire
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline verticale */}
                <div className="absolute left-3 sm:left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                <div className="space-y-4">
                  {historiqueStages.map((stage, index) => (
                    <div key={stage.id} className="relative pl-8 sm:pl-10">
                      {/* Point sur la timeline */}
                      <div className={`absolute left-1.5 sm:left-2.5 top-1.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 ${
                        stage.est_courant
                          ? "bg-primary border-primary ring-2 ring-primary/20"
                          : stage.statut === "Terminé"
                          ? "bg-gray-400 border-gray-400"
                          : stage.statut === "Actuel"
                          ? "bg-green-500 border-green-500"
                          : "bg-blue-400 border-blue-400"
                      }`} />

                      <div
                        className={`p-3 sm:p-4 rounded-lg border transition-colors ${
                          stage.est_courant
                            ? "border-primary/30 bg-primary/5"
                            : "border-gray-200 hover:bg-gray-50/50"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-xs sm:text-sm text-gray-900">
                              {stage.est_renouvellement ? "Renouvellement" : "Stage initial"}
                              {stage.est_courant && (
                                <span className="ml-1.5 text-[10px] sm:text-xs text-primary font-normal">(actuel)</span>
                              )}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] sm:text-xs px-1.5 py-0 ${
                                stage.statut === "Terminé"
                                  ? "bg-gray-50 text-gray-600 border-gray-300"
                                  : stage.statut === "Actuel"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              {stage.statut}
                            </Badge>
                          </div>
                          {!stage.est_courant && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 text-gray-600 hover:text-gray-800 self-end sm:self-center"
                              onClick={() => navigate(`/stagiaires/${stage.id}`)}
                            >
                              <Eye className="h-3 w-3" />
                              Voir
                            </Button>
                          )}
                        </div>

                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] sm:text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <CalendarRange className="h-3 w-3 flex-shrink-0" />
                            <span>
                              {stage.date_debut ? format(new Date(stage.date_debut), "dd/MM/yyyy") : "—"} → {stage.date_fin ? format(new Date(stage.date_fin), "dd/MM/yyyy") : "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span>{stage.duree_jours ? `${stage.duree_jours} jours` : "—"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3 flex-shrink-0" />
                            <span>{stage.type_stage || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 flex-shrink-0" />
                            <span>{stage.direction || "—"}{stage.service ? ` / ${stage.service}` : ""}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal document */}
        <Dialog open={!!selectedDocument} onOpenChange={(open) => { if (!open) closeDocumentPreview(); }}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base text-gray-900">{selectedDocument?.nom}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-600">
                Visualisation du document
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center p-3 sm:p-4 bg-gray-50/30 rounded-lg">
              {isPreviewLoading ? (
                <div className="flex flex-col items-center justify-center h-[60vh] sm:h-[70vh] w-full text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <span className="text-xs sm:text-sm">Chargement du document…</span>
                </div>
              ) : !documentPreviewUrl ? (
                <div className="flex items-center justify-center h-[60vh] sm:h-[70vh] w-full text-gray-500 text-xs sm:text-sm">
                  Impossible d'afficher ce document.
                </div>
              ) : (selectedDocument?.url || "").split("?")[0].toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={documentPreviewUrl}
                  className="w-full h-[60vh] sm:h-[70vh] border border-gray-300 rounded-md"
                  title={selectedDocument?.nom}
                />
              ) : (
                <img
                  src={documentPreviewUrl}
                  alt={selectedDocument?.nom}
                  className="max-w-full max-h-[60vh] sm:max-h-[70vh] object-contain border border-gray-300 rounded-md"
                />
              )}
            </div>
            <div className="flex justify-end gap-1.5 sm:gap-2">
              <Button
                variant="outline"
                onClick={closeDocumentPreview}
                className="text-xs sm:text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300"
              >
                Fermer
              </Button>
              <Button
                onClick={() => selectedDocument && handleDownloadDocument(selectedDocument)}
                className="gap-1.5 sm:gap-2 text-xs sm:text-sm bg-primary hover:bg-primary/90 text-white"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                Télécharger
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal photo */}
        {student?.photo && (
          <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
            <DialogContent className="max-w-md p-0 overflow-hidden bg-transparent border-none">
              <img
                src={student.photo}
                alt={student.name}
                className="w-full h-auto object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-avatar.png';
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Modal modification période */}
        <Dialog open={isEditPeriodOpen} onOpenChange={setIsEditPeriodOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full mb-3 sm:mb-4 mx-auto">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <DialogTitle className="text-center text-base sm:text-lg font-semibold text-gray-900">
                Modifier la période du stage
              </DialogTitle>
              <DialogDescription className="text-center text-xs sm:text-sm text-gray-600">
                {hasInternshipStarted
                  ? "Ajustez la date de fin du stage (le stage a déjà débuté)"
                  : "Ajustez les dates de début et de fin du stage"
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 sm:space-y-4">
              {/* Affichage conditionnel selon l'état du stage */}
              {hasInternshipNotStarted && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 sm:p-3">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                    <p className="text-xs sm:text-sm text-blue-700">
                      Le stage n'a pas encore débuté. Vous pouvez modifier les deux dates.
                    </p>
                  </div>
                </div>
              )}

              {hasInternshipStarted && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 sm:p-3">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
                    <p className="text-xs sm:text-sm text-yellow-700">
                      Le stage a déjà débuté. Vous ne pouvez modifier que la date de fin.
                    </p>
                  </div>
                </div>
              )}

              {newStartDate && newEndDate && (
                <div className="bg-gray-50/50 rounded-lg p-2.5 sm:p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Durée du stage :</span>
                    <Badge variant="outline" className="text-[10px] sm:text-xs bg-gray-50 text-gray-700 border-gray-300">
                      {differenceInDays(newEndDate, newStartDate) + 1} jours
                    </Badge>
                  </div>
                </div>
              )}

              {newStartDate && newEndDate && isBefore(newEndDate, newStartDate) && (
                <Alert variant="destructive" className="bg-red-50/10 border-red-200">
                  <AlertDescription className="text-red-700 text-xs sm:text-sm">
                    ⚠️ La date de fin ne peut pas être antérieure à la date de début
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {/* Date de début - désactivée si le stage a déjà commencé */}
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm font-medium text-gray-700">
                    Date de début {hasInternshipStarted && "(Non modifiable)"}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal text-xs sm:text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300",
                          !newStartDate && "text-gray-600"
                        )}
                        disabled={hasInternshipStarted}
                      >
                        <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        {newStartDate ? (
                          format(newStartDate, "PPP", { locale: fr })
                        ) : (
                          <span>Sélectionnez une date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={newStartDate}
                        onSelect={setNewStartDate}
                        disabled={(date) => hasInternshipStarted || date < new Date()}
                        locale={fr}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {hasInternshipStarted && (
                    <p className="text-xs text-gray-600">
                      La date de début ne peut pas être modifiée car le stage a déjà commencé
                    </p>
                  )}
                </div>

                {/* Date de fin - toujours modifiable */}
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm font-medium text-gray-700">
                    Date de fin *
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal text-xs sm:text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300",
                          !newEndDate && "text-gray-600"
                        )}
                      >
                        <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        {newEndDate ? (
                          format(newEndDate, "PPP", { locale: fr })
                        ) : (
                          <span>Sélectionnez une date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={newEndDate}
                        onSelect={setNewEndDate}
                        disabled={(date) => date < (hasInternshipStarted ? new Date(stagiaire.date_debut) : (newStartDate || new Date()))}
                        locale={fr}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-1.5 sm:gap-2 pt-3 sm:pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditPeriodOpen(false)}
                disabled={loadingPeriod}
                className="text-xs sm:text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300"
              >
                Annuler
              </Button>
              <Button
                onClick={handleUpdatePeriod}
                disabled={
                  loadingPeriod ||
                  !newStartDate ||
                  !newEndDate ||
                  isBefore(newEndDate, newStartDate)
                }
                className="gap-1.5 sm:gap-2 text-xs sm:text-sm bg-primary hover:bg-primary/90 text-white"
              >
                {loadingPeriod ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  <>
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                    Valider les modifications
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de renouvellement */}
        {stagiaire && (
          <RenewalModal
            open={isRenewalModalOpen}
            onOpenChange={setIsRenewalModalOpen}
            stagiaire={{
              id: stagiaire.id,
              prenom: stagiaire.prenom,
              nom: stagiaire.nom,
              type_stage: stagiaire.type_stage,
              specialite: stagiaire.specialite,
              date_fin: stagiaire.date_fin,
              duree_jours: stagiaire.duree_jours,
              direction: stagiaire.direction,
              service: stagiaire.service,
              lieu_stage: stagiaire.lieu_stage,
              remunere: stagiaire.remunere,
              montant_remuneration: stagiaire.montant_remuneration,
            }}
            onSuccess={handleRenewalSuccess}
          />
        )}

        {/* Modal de finalisation du renouvellement (deuxième étape) */}
        {stagiaire && (
          <FinalizeRenewalModal
            open={isFinalizeRenewalModalOpen}
            onOpenChange={setIsFinalizeRenewalModalOpen}
            stagiaireId={stagiaire.id}
            studentName={`${stagiaire.prenom} ${stagiaire.nom}`}
            conventionTemporaireUrl={renewalConventionData?.url || stagiaire.convention_renouvellement_temporaire?.fichier_url || undefined}
            conventionTemporaireId={renewalConventionData?.id || stagiaire.convention_renouvellement_temporaire?.id}
            onSuccess={() => {
              // Rafraîchir les données après finalisation
              fetchStagiaire();
              setRenewalConventionData(null);
            }}
          />
        )}
        {stagiaire && (
          <SignatoryModal
            open={isSignatoryModalOpen}
            onOpenChange={setIsSignatoryModalOpen}
            demandeId={parseInt(stagiaire.id)}
            conventionTemporaireUrl={
              renewalConventionData?.url ||
              stagiaire.convention_renouvellement_temporaire?.fichier_url
            }
            endpoint={`/stagiaires/${stagiaire.id}/regenerer-convention-renouvellement/`}
            onSuccess={(pdfUrl) => {
              setRenewalConventionData(prev => ({ ...prev, url: pdfUrl }));
              fetchStagiaire();
              toast({
                title: "Convention prête",
                description: "La convention de renouvellement a été générée avec le signataire choisi.",
              });
            }}
          />
        )}

        {/* Confirmation d'annulation du pré-renouvellement */}
        <AlertDialog open={isCancelRenewalOpen} onOpenChange={setIsCancelRenewalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Annuler le pré-renouvellement ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action supprimera la convention temporaire et remettra le stagiaire en état terminé.
                Vous pourrez initier un nouveau renouvellement ensuite.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isCancellingRenewal}>Retour</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleCancelRenewal();
                }}
                disabled={isCancellingRenewal}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isCancellingRenewal ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Annulation...
                  </>
                ) : (
                  "Confirmer l'annulation"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default OngoingInternshipDetails;

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
import { Mail, Phone, Info, Upload, User, FileText, Eye, AlertCircle, X, FileCheck, GraduationCap, UserCheck, Building2, ClipboardList, MapPin, Download, ArrowLeft, Briefcase, Clock, DollarSign, FileBarChart, CalendarRange, CheckCircle, Edit, Save, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import apiClient from "@/lib/apiClient";

import { 
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, differenceInDays, isBefore, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";

// Import pour le formulaire de renouvellement
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Import des composants shadcn/ui pour les dates
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar"; // Renommé pour éviter le conflit
import { cn } from "@/lib/utils";

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
  // Champs pour la convention
  convention?: {
    id: string;
    numero_convention: string;
    fichier_url: string | null;
    date_creation: string;
  } | null;
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

const supervisorsByService = {
  "Administration et Archives": ["KOUBIRMA-BIGNADI Yada"],
  "Ressources Humaines et Affaires Sociales": ["N'DAH-ABOUKHEDOUD Alida"],
  "Informatique": ["TCHAMDJA Mawababè", "MAISSO Tartien"],
  "Statistique": ["SIMNAGNAN Hadatema"],
  "Préparation et Suivi des Marchés": ["YANDOA Kolani", "DAFIA SANNI Alidou"],
  "Mouvements d'Energie - Dispathing": ["TIDIYE Essoyomewe"],
  "Service Environnement, Génie Civil et Mécanique": ["PASSEM Afeitom"],
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
    "Renouvelé": { label: "Renouvelé", variant: "outline" },
    "Annulé": { label: "Annulé", variant: "destructive" },
  };
  const config = statusConfig[status] || { label: status, variant: "outline" };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const XofIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className} role="img">
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="700" fill="currentColor">
      XOF
    </text>
  </svg>
);

const OngoingInternshipDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stagiaire, setStagiaire] = useState<APIStagiaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<APIDocument | null>(null);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [isEditPeriodOpen, setIsEditPeriodOpen] = useState(false);
  const [newStartDate, setNewStartDate] = useState<Date>();
  const [newEndDate, setNewEndDate] = useState<Date>();
  const [loadingPeriod, setLoadingPeriod] = useState(false);

  // ---- State pour l'édition du résumé ----
  const [isEditingResume, setIsEditingResume] = useState(false);
  const [editedResume, setEditedResume] = useState("");
  const [isSavingResume, setIsSavingResume] = useState(false);

  // Fonction pour charger les données du stagiaire
  const fetchStagiaire = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!id) return;
      const res = await apiClient.get(`/stagiaires/${id}/`);
      const data: APIStagiaire = res.data.stagiaire;
      setStagiaire(data);
      // Initialiser le résumé édité avec la valeur actuelle
      setEditedResume(data.resume_cv || data.resume || "");
      setNewStartDate(new Date(data.date_debut));
      setNewEndDate(new Date(data.date_fin));
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

  // ---- Fonction pour sauvegarder le résumé ----
  const handleSaveResume = async () => {
    if (!stagiaire) return;

    setIsSavingResume(true);
    try {
      // Utiliser PATCH avec le nouvel endpoint
      await apiClient.patch(`/stagiaires/${stagiaire.id}/`, {
        resume_cv: editedResume
      });

      // Mettre à jour l'état local
      setStagiaire(prev => prev ? {
        ...prev,
        resume_cv: editedResume
      } : null);

      setIsEditingResume(false);
      
      toast({
        title: "Succès",
        description: "Le résumé a été mis à jour avec succès",
      });
      
    } catch (err: any) {
      console.error("Erreur lors de la sauvegarde du résumé:", err);
      
      let errorMessage = "Impossible de mettre à jour le résumé";
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.status === 405) {
        errorMessage = "Méthode non autorisée. Contactez l'administrateur.";
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSavingResume(false);
    }
  };

  // ---- Fonction pour annuler l'édition ----
  const handleCancelEdit = () => {
    setEditedResume(stagiaire?.resume_cv || stagiaire?.resume || "");
    setIsEditingResume(false);
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

  // Fonction pour visualiser un document
  const handleViewDocument = (doc: APIDocument) => setSelectedDocument(doc);

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

  // ---- Fonction pour télécharger le résumé en PDF ----
  const handleDownloadResume = async () => {
    if (!stagiaire || !student?.resume) {
      toast({
        title: "Aucun résumé",
        description: "Aucun résumé disponible pour le téléchargement",
        variant: "destructive",
      });
      return;
    }

    try {
      const { jsPDF } = await import('jspdf');
      
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 25;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Espace pour le papier entête
      const headerSpace = 20;
      yPosition += headerSpace;

      // Titre principal centré
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RÉSUMÉ DU CURRICULUM VITAE', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Ligne de séparation sous le titre
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 25;

      // Section Informations personnelles avec photo
      const photoSize = 40;
      const photoX = pageWidth - margin - photoSize;
      const photoY = yPosition;

      // Ajouter la photo si disponible
      let photoAdded = false;
      if (student.photo) {
        try {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.src = student.photo;
          
          await new Promise((resolve, reject) => {
            img.onload = () => {
              try {
                // Cadre autour de la photo
                pdf.setDrawColor(150, 150, 150);
                pdf.setLineWidth(0.5);
                pdf.rect(photoX - 2, photoY - 2, photoSize + 4, photoSize + 4);
                
                // Ajouter la photo
                pdf.addImage(img, 'JPEG', photoX, photoY, photoSize, photoSize);
                photoAdded = true;
                resolve(undefined);
              } catch (error) {
                reject(error);
              }
            };
            img.onerror = reject;
            
            setTimeout(() => reject(new Error('Timeout loading image')), 5000);
          });
          
        } catch (photoError) {
          console.warn("Impossible de charger la photo:", photoError);
          photoAdded = false;
        }
      }

      // Titre de la section
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INFORMATIONS PERSONNELLES', margin, yPosition);
      pdf.line(margin, yPosition + 1, margin + 70, yPosition + 1);
      yPosition += 15;

      // Contenu informations personnelles
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const textMaxWidth = photoAdded ? pageWidth - margin - photoSize - 20 : maxWidth;
      
      pdf.text(`Nom complet : ${student.name}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Spécialité : ${student.program}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Niveau d'étude : ${student.year}`, margin, yPosition);
      yPosition += 6;
      
      if (school) {
        pdf.text(`Établissement : ${school.name}`, margin, yPosition);
        yPosition += 6;
      }
      
      pdf.text(`Email : ${student.email}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Téléphone : ${student.phone}`, margin, yPosition);
      
      // Ajuster la position si la photo est plus haute que le texte
      if (photoAdded) {
        const photoBottom = photoY + photoSize;
        if (photoBottom > yPosition) {
          yPosition = photoBottom + 10;
        } else {
          yPosition += 15;
        }
      } else {
        yPosition += 15;
      }

      // Section Présentation professionnelle
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PRÉSENTATION PROFESSIONNELLE', margin, yPosition);
      pdf.line(margin, yPosition + 1, margin + 85, yPosition + 1);
      yPosition += 10;

      // Ajouter le texte du résumé
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const lines = pdf.splitTextToSize(student.resume, maxWidth);
      const lineHeight = 5;
      
      for (let i = 0; i < lines.length; i++) {
        if (yPosition + lineHeight > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(lines[i], margin, yPosition);
        yPosition += lineHeight;
      }

      // Pied de page
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Page ${i} sur ${totalPages}`, pageWidth / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
      }

      const fileName = `Resume_CV_${stagiaire.nom}_${stagiaire.prenom}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Résumé téléchargé",
        description: "Le résumé du CV a été téléchargé au format PDF",
      });
      
    } catch (err: any) {
      console.error("Erreur lors de la génération du PDF:", err);
      
      // Fallback vers le format texte
      try {
        const blob = new Blob([student.resume], { type: 'text/plain;charset=utf-8' });
        const fileName = `resume_${stagiaire.nom}_${stagiaire.prenom}.txt`;
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Résumé téléchargé (format texte)",
          description: "Le PDF n'a pas pu être généré",
          variant: "default",
        });
      } catch (fallbackError) {
        toast({
          title: "Erreur",
          description: "Impossible de télécharger le résumé",
          variant: "destructive",
        });
      }
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

  // Fonction pour mettre à jour la période du stage
  const handleUpdatePeriod = async () => {
    if (!stagiaire || !newStartDate || !newEndDate) return;

    setLoadingPeriod(true);
    try {
      const formatDateToDDMMYYYY = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };

      const res = await apiClient.post(`/stagiaires/${stagiaire.id}/modifier-periode/`, {
        date_debut: formatDateToDDMMYYYY(newStartDate),
        date_fin: formatDateToDDMMYYYY(newEndDate),
      });

      setStagiaire((prev) => prev ? { 
        ...prev, 
        date_debut: newStartDate.toISOString(), 
        date_fin: newEndDate.toISOString(),
        duree_jours: differenceInDays(newEndDate, newStartDate) + 1,
      } : prev);
      
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
    
    // Vérifier si au moins un document contient "rapport" dans son nom (insensible à la casse)
    return student.documents.some(doc => 
      doc.nom.toLowerCase().includes('rapport') || 
      doc.nom.toLowerCase().includes('report')
    );
  }, [student?.documents]);

  // Fonction pour télécharger la convention
  const handleDownloadConvention = async () => {
    if (!stagiaire?.convention?.fichier_url) {
      toast({
        title: "Aucune convention",
        description: "Aucune convention disponible pour le téléchargement",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiClient.get(stagiaire.convention.fichier_url, { responseType: "blob" });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `convention_${stagiaire.nom}_${stagiaire.prenom}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Convention téléchargée",
        description: "La convention de stage a été téléchargée.",
      });
    } catch (err: any) {
      console.error("Erreur téléchargement convention :", err);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger la convention.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 space-y-3 sm:space-y-4 md:space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/stages/en_cours")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Skeleton className="h-8 w-64" />
          </div>
          
          <div className="grid gap-3 sm:gap-4 md:gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-3 sm:space-y-4 md:space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full mb-3" />
                  ))}
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3 items-center">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 space-y-3 sm:space-y-4 md:space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/students/ongoing")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Détails du stagiaire</h1>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-10">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Erreur de chargement</h3>
                <p className="text-muted-foreground mb-4">
                  {error}
                </p>
                <Button onClick={fetchStagiaire}>
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
        <div className="container mx-auto py-6 space-y-3 sm:space-y-4 md:space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/students/ongoing")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Détails du stagiaire</h1>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-10">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Stagiaire non trouvé</h3>
                <p className="text-muted-foreground">
                  Le stagiaire que vous recherchez n'existe pas ou a été supprimé.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-3 sm:space-y-4 md:space-y-6">
        {/* Header avec bouton retour */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">Détails du stagiaire</h1>
            <p className="text-muted-foreground">
              Informations complètes sur {student.name} et son stage
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 md:gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-3 sm:space-y-4 md:space-y-6">
            {/* En-tête avec statut et progression */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {student.name}
                      <StatusBadge status={student.statut} />
                    </CardTitle>
                    <CardDescription>
                      {student.program} • {student.year}
                    </CardDescription>
                  </div>
                  
                  {/* Boutons d'action pour le résumé */}
                  <div className="flex gap-2">
                    {/* Bouton de téléchargement du résumé 
                    {student.resume && !isEditingResume && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadResume}
                        className="gap-2"
                        title="Télécharger le résumé"
                      >
                        <Download className="h-4 w-4" />
                        Télécharger
                      </Button>
                    )}*/}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between text-sm gap-2 sm:gap-0">
                    <span>Progression du stage</span>
                    <span>{calculateProgress()}%</span>
                  </div>
                  <Progress value={calculateProgress()} className="h-2" />
                  <div className="flex flex-col sm:flex-row sm:justify-between text-xs text-muted-foreground gap-2 sm:gap-0">
                    <span>{new Date(student.startDate).toLocaleDateString("fr-FR")}</span>
                    <span>{new Date(student.endDate).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                {/* Section résumé éditable */}
                <div className="mb-4">
                  {isEditingResume ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editedResume}
                        onChange={(e) => setEditedResume(e.target.value)}
                        placeholder="Entrez le résumé du candidat..."
                        className="min-h-[120px] resize-y font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Vous pouvez modifier le résumé du candidat. Les modifications seront sauvegardées immédiatement.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {student.resume ? (
                        <div 
                          className="text-sm text-justify leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: formatResumeHtml(student.resume) }}
                        />
                      ) : (
                        <div className="space-y-3">
                          <span className="text-muted-foreground italic">
                            Aucun résumé n'a été fourni par l'étudiant.
                          </span>
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-amber-600" />
                              <p className="text-sm text-amber-700">
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Informations de stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 text-sm">
                  {/* Colonne gauche */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Direction</p>
                        <p className="font-medium">{stagiaire.direction || "—"}</p>
                        {stagiaire.direction && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {departmentDescriptions[stagiaire.direction]}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-100 text-cyan-600">
                        <ClipboardList className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Service</p>
                        <p className="font-medium">{stagiaire.service || "—"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100 text-green-600">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Lieu</p>
                        <p className="font-medium">{stagiaire.lieu_stage || "—"}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Colonne droite */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                        <FileCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Type de stage</p>
                        <p className="font-medium">{stagiaire.type_stage}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                        <CalendarRange className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Période</p>
                        <p className="font-medium">
                          {new Date(stagiaire.date_debut).toLocaleDateString("fr-FR")} — {" "}
                          {new Date(stagiaire.date_fin).toLocaleDateString("fr-FR")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {stagiaire.duree_jours} jours
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Rémunération</p>
                        <p className="font-medium">
                          {stagiaire.remunere ? (
                            <span className="flex items-center gap-1">
                              {stagiaire.montant_remuneration?.toLocaleString() || "N/A"}
                               FCFA
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents
                </CardTitle>
                <CardDescription>
                  Documents associés au stagiaire
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {student.documents.length > 0 ? (
                    student.documents.map((doc, index) => (
                      <div
                        key={`${doc.nom}-${index}`}
                        className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 border rounded-lg hover:bg-muted/30 transition-colors gap-2 sm:gap-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-md bg-primary/10">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{doc.nom}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.url.split('.').pop()?.toUpperCase()} •{" "}
                              {doc.url.includes('http') ? 'Lien externe' : 'Document'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                            className="h-9 gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Voir
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleDownloadDocument(doc)}
                            className="h-9 gap-1"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Télécharger
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 sm:py-6 md:py-8 border rounded-lg bg-muted/20">
                      <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Aucun document disponible</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite : Stagiaire + Établissement + Superviseur + Actions */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {/* Stagiaire */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Stagiaire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-4 cursor-pointer" onClick={() => setIsPhotoDialogOpen(true)}>
                    <AvatarImage src={student.photo} className="object-cover" />
                    <AvatarFallback className="text-lg sm:text-xl md:text-2xl font-bold">{student.avatar}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-lg">{student.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{student.program}, {student.year}</p>
                  
                  <div className="w-full space-y-3">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`mailto:${student.email}`} 
                        className="text-sm hover:underline truncate"
                        title={student.email}
                      >
                        {student.email}
                      </a>
                    </div>
                    
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`tel:${student.phone}`} 
                        className="text-sm hover:underline"
                      >
                        {student.phone}
                      </a>
                    </div>
                    {student.gender && (
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm capitalize">{student.gender.toLowerCase()}</p>
                      </div>
                    )}

                    {student.country && (
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{student.country}</p>
                      </div>
                    )}
                    
                    {student.address && (
                      <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <p className="text-sm">{student.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Établissement */}
            {school && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-green-100 text-green-600">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    Établissement scolaire
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="pb-2 border-b">
                      <h4 className="font-medium text-sm text-foreground">{school.name}</h4>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {school.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span>{school.location}</span>
                        </div>
                      )}
                      
                      {school.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <a href={`mailto:${school.email}`} className="hover:underline truncate">
                            {school.email}
                          </a>
                        </div>
                      )}
                      
                      {school.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <a href={`tel:${school.phone}`} className="hover:underline">
                            {school.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Superviseur 
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Superviseur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-full bg-red-100 text-red-600">
                    <UserCheck size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" title={stagiaire.superviseur || "Non spécifié"}>
                      {stagiaire.superviseur || "Non spécifié"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {stagiaire.service || "Service non spécifié"}
                      {stagiaire.direction && `, ${stagiaire.direction}`}
                    </p>
                  </div>
                </div>
              </CardContent>*/}
            <Card>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                  Actions
                  
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Bouton "Modifier la période" TOUJOURS visible */}
                {stagiaire.statut !== "Terminé" && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      setNewStartDate(new Date(stagiaire.date_debut));
                      setNewEndDate(new Date(stagiaire.date_fin));
                      setIsEditPeriodOpen(true);
                    }}
                  >
                    <CalendarRange className="h-4 w-4" />
                    Modifier la période
                  </Button>
                )}

                {/* Bouton Renouveler le stage (désactivé) */}
                {stagiaire.statut === "Terminé" && !stagiaire.a_ete_renouvele && (
                  <Button
                    variant="default"
                    className="w-full gap-2 bg-red-600 hover:bg-green-700 animate-pulse"
                    disabled={true}
                  >
                    <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Renouvellement bientôt disponible ...
                  </Button>
                )}

                {/* Afficher seulement si le stage n'est PAS terminé ET a déjà débuté */}
                {stagiaire.statut !== "Terminé" && hasInternshipStarted && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleEndEarly}
                  >
                    <Clock className="h-4 w-4" />
                    Mettre fin au stage
                  </Button>
                )}

                {/* Afficher un message si le stage n'a pas encore débuté */}
                {hasInternshipNotStarted && (
                  <div className="p-3 border border-blue-200 bg-blue-50 rounded-lg text-center">
                    <Info className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                    <p className="text-sm font-medium text-blue-700">Stage programmé</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Le stage débutera le {format(new Date(student.startDate), "dd/MM/yyyy")}
                    </p>
                  </div>
                )}

                {/* Génération d'attestation */}
                {hasInternshipStarted && (
                  hasRapportDocuments ? (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleGenererAttestation}
                    >
                      <FileText className="h-4 w-4" />
                      Générer une attestation
                    </Button>
                  ) : (
                    <div className="p-3 border border-amber-200 bg-amber-50 rounded-lg text-center">
                      <AlertCircle className="h-4 w-4 text-amber-600 mx-auto mb-1" />
                      <p className="text-sm font-medium text-amber-700">Attestation indisponible</p>
                      <p className="text-xs text-amber-600 mt-1">
                        Ajoutez d'abord un rapport pour générer l'attestation
                      </p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modal document */}
        <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{selectedDocument?.nom}</DialogTitle>
              <DialogDescription>
                Visualisation du document
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center p-4 bg-muted/30 rounded-lg">
              {selectedDocument?.url?.endsWith(".pdf") ? 
                <iframe 
                  src={selectedDocument.url} 
                  className="w-full h-[70vh] border rounded-md"
                  title={selectedDocument.nom}
                /> : 
                <img 
                  src={selectedDocument?.url} 
                  alt={selectedDocument?.nom} 
                  className="max-w-full max-h-[70vh] object-contain border rounded-md"
                />
              }
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setSelectedDocument(null)}
              >
                Fermer
              </Button>
              <Button 
                onClick={() => selectedDocument && handleDownloadDocument(selectedDocument)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal photo */}
        <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden bg-transparent border-none">
            <img 
              src={student.photo} 
              alt={student.name} 
              className="w-full h-auto object-contain rounded-lg shadow-lg"
            />
          </DialogContent>
        </Dialog>

        {/* Modal modification période */}
        <Dialog open={isEditPeriodOpen} onOpenChange={setIsEditPeriodOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4 mx-auto">
                <CalendarDays className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center text-xl">
                Modifier la période du stage
              </DialogTitle>
              <DialogDescription className="text-center">
                {hasInternshipStarted 
                  ? "Ajustez la date de fin du stage (le stage a déjà débuté)"
                  : "Ajustez les dates de début et de fin du stage"
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Affichage conditionnel selon l'état du stage */}
              {hasInternshipNotStarted && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <p className="text-sm text-blue-700">
                      Le stage n'a pas encore débuté. Vous pouvez modifier les deux dates.
                    </p>
                  </div>
                </div>
              )}

              {hasInternshipStarted && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <p className="text-sm text-amber-700">
                      Le stage a déjà débuté. Vous ne pouvez modifier que la date de fin.
                    </p>
                  </div>
                </div>
              )}

              {newStartDate && newEndDate && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                    <span className="text-sm font-medium">Durée du stage :</span>
                    <Badge variant="outline">
                      {differenceInDays(newEndDate, newStartDate) + 1} jours
                    </Badge>
                  </div>
                </div>
              )}

              {newStartDate && newEndDate && isBefore(newEndDate, newStartDate) && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                  <AlertDescription className="text-destructive text-sm">
                    ⚠️ La date de fin ne peut pas être antérieure à la date de début
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 gap-4">
                {/* Date de début - désactivée si le stage a déjà commencé */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Date de début {hasInternshipStarted && "(Non modifiable)"}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newStartDate && "text-muted-foreground"
                        )}
                        disabled={hasInternshipStarted}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {newStartDate ? (
                          format(newStartDate, "PPP", { locale: fr })
                        ) : (
                          <span>Sélectionnez une date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={newStartDate}
                        onSelect={setNewStartDate}
                        disabled={(date) => hasInternshipStarted || date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {hasInternshipStarted && (
                    <p className="text-xs text-muted-foreground">
                      La date de début ne peut pas être modifiée car le stage a déjà commencé
                    </p>
                  )}
                </div>

                {/* Date de fin - toujours modifiable */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Date de fin *
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {newEndDate ? (
                          format(newEndDate, "PPP", { locale: fr })
                        ) : (
                          <span>Sélectionnez une date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={newEndDate}
                        onSelect={setNewEndDate}
                        disabled={(date) => date < (hasInternshipStarted ? new Date(stagiaire.date_debut) : (newStartDate || new Date()))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsEditPeriodOpen(false)}
                disabled={loadingPeriod}
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
                className="gap-2"
              >
                {loadingPeriod ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  <>
                    <CalendarDays className="h-4 w-4" />
                    Valider les modifications
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default OngoingInternshipDetails;
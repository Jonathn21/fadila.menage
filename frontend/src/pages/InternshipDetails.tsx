import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  FileText, Eye, Download, XCircle, MessageSquare,
  CheckCircle, Mail, Phone, User, GraduationCap,
  Calendar, MapPin, ArrowLeft, BookOpen, FileCheck,
  ClipboardList, Loader2, RefreshCcw, Briefcase, 
  PlayCircle, Edit, Save, X, Sparkles, Info , Upload
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { archiverDemande, desarchiverDemande } from "@/lib/demandes";
import DocumentPreviewDialog from "@/components/internships/DocumentPreviewDialog";
import PhotoDialog from "@/components/internships/PhotoDialog";
import { RefuseDialog } from "@/components/internships/RefuseDialog";
import apiClient from "@/lib/apiClient";
import { Textarea } from "@/components/ui/textarea";
import ScoreBadge from "@/components/ScoreBadge";
import ScoreDetailsModal from "@/components/ScoreDetailsModal";
import { RequestInfoModal } from "@/components/internships/RequestInfoModal";
import AcceptInternshipModal from "@/components/internships/AcceptInternshipModal";
// Ajoutez ces imports en haut du fichier
import FinalizeAcceptanceModal from "@/components/internships/FinalizeAcceptanceModal";


// Ajoutez cette fonction utilitaire au début de votre composant, après les imports
const formatResumeHtml = (htmlText) => {
  if (!htmlText) return "";
  
  // Remplacer les sauts de ligne HTML par des paragraphes ou des breaks
  const textWithBreaks = htmlText
    .replace(/\n/g, '<br>')
    .replace(/<br><br>/g, '</p><p>')
    .replace(/<strong>/g, '<strong class="font-bold">');
  
  return `<p>${textWithBreaks}</p>`;
};

// ✅ Déclaration pour éviter les erreurs TS avec File System Access API
declare global {
  interface Window {
    showSaveFilePicker?: (options?: any) => Promise<any>;
  }
}

// ---- Types API ----
type APIDocument = {
  id: number;
  nom: string;
  url: string;
  statut: 'new' | 'modified' | 'existing' | 'viewed';
  date_upload: string;
  est_modifie: boolean;
};

type APIEcole = {
  name: string | null;
  location?: string | null;
  email?: string | null;
  phone?: string | null;
};

type APIEtudiant = {
  prenom: string;
  nom: string;
  genre: string;
  email: string;
  telephone: string;
  adresse?: string | null;
  niveau: string;
  specialite: string;
  pays_residence?: string | null;
  photo_passeport?: string | null;
  resume_cv?: string | null;
};

type APIDemande = {
  id: number;
  tracking_id: string;
  date_soumission: string;
  statut_stage: string;
  est_archivee?: boolean;
  type_stage: string;
  etudiant: APIEtudiant;
  etablissement: APIEcole | null;
  documents: APIDocument[];
  existe_entretien: boolean;
  score_ia?: number;
  score_details?: any;
  score_commentaire?: string;
  score_date?: string;
  raison_refus?: string; // AJOUTÉ
  convention_temporaire_url?: string;
};

// ---- Badge statut ----
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    "En attente": { label: "En attente", variant: "secondary" },
    "En cours de traitement": { label: "En cours de traitement", variant: "default" },
    "Acceptée": { label: "Acceptée", variant: "default" },
    "Refusée": { label: "Refusée", variant: "destructive" },
  };
  
  const config = statusConfig[status] || { label: status, variant: "outline" };
  
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// ---- Page ----
const InternshipDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demande, setDemande] = useState<APIDemande | null>(null);
  const [documents, setDocuments] = useState<APIDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<{ name: string; url: string } | null>(null);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [isRefuseDialogOpen, setIsRefuseDialogOpen] = useState(false);
  const [motifRefus, setMotifRefus] = useState("");
  const [isEditingResume, setIsEditingResume] = useState(false);
  const [editedResume, setEditedResume] = useState("");
  const [isSavingResume, setIsSavingResume] = useState(false)
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
const [conventionTemporaireUrl, setConventionTemporaireUrl] = useState<string | null>(null);
;
  
  // State pour le modal de détails du score
  const [selectedScoreModal, setSelectedScoreModal] = useState<{
    open: boolean;
    score: number;
    details: any;
    commentaire: string;
    nom: string;
  }>({
    open: false,
    score: 0,
    details: null,
    commentaire: "",
    nom: ""
  });
  const [isRequestInfoModalOpen, setIsRequestInfoModalOpen] = useState(false);

  // ---- Fetch API ----
  useEffect(() => {
    let cancelled = false;

    const fetchDemande = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await apiClient.get<APIDemande>(`/demandes/${id}/`);

        if (!cancelled) {
          console.log("📦 Données complètes reçues:", res.data);
          console.log("📄 Documents avec statut:", res.data.documents);
          console.log("🔍 Raison refus:", res.data.raison_refus); // DEBUG
          
          setDemande(res.data);
          setDocuments(res.data.documents || []);
          setEditedResume(res.data.etudiant?.resume_cv || "");
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("❌ Erreur API:", err);
          const message =
            err.response?.data?.detail ||
            err.response?.statusText ||
            err.message ||
            "Erreur inconnue lors du chargement";
          setError(message);

          toast({
            title: "Erreur",
            description: message,
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (id) fetchDemande();

    return () => {
      cancelled = true;
    };
  }, [id, toast]);

  // ---- Marquer un document comme vu ----
  const markDocumentAsViewed = async (documentHistoryId: number) => {
    if (!demande) return;

    try {
      await apiClient.post(`/demandes/${demande.id}/marquer-document-vu/`, {
        document_history_id: documentHistoryId
      });
      
      console.log(`📄 Document ${documentHistoryId} marqué comme vu`);
      
      // Recharger les données pour mettre à jour les statuts
      await refreshData();
      
    } catch (error) {
      console.error("Erreur lors du marquage du document comme vu:", error);
    }
  };

  // ---- Handlers pour documents ----
  const handleViewDocument = async (doc: APIDocument) => {
    // Marquer comme vu dans le backend seulement si pas déjà vu
    if (doc.statut !== 'viewed') {
      await markDocumentAsViewed(doc.id);
    }
    setSelectedDocument({ name: doc.nom, url: doc.url });
  };

  const handleDownloadDocument = async (doc: APIDocument) => {
    // Marquer comme vu dans le backend seulement si pas déjà vu
    if (doc.statut !== 'viewed') {
      await markDocumentAsViewed(doc.id);
    }

    if (!demande) return;

    const fileName = `${doc.nom.replace(/\s+/g, "_")}_${demande.etudiant.nom || "nom"}_${demande.etudiant.prenom || "prenom"}`;

    try {
      const response = await apiClient.get(doc.url, { responseType: "blob" });
      const blob = response.data;

      // Si le navigateur supporte File System Access API
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
        // Fallback classique
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
        description: `Le document "${doc.nom}" a été téléchargé`,
      });
    } catch (err: any) {
      console.error("Erreur lors du téléchargement :", err);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le document",
        variant: "destructive",
      });
    }
  };

const handleAnnulerAcceptation = async () => {
  if (!demande) return;

  setProcessingAction("Annuler l'acceptation");

  try {
    // Appel API direct sans confirmation
    const response = await apiClient.post(
      `/demandes/${demande.id}/annuler-pre-acceptation-simple/`
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Erreur lors de l'annulation");
    }

    // Rafraîchir les données
    await refreshData(false);

    toast({
      title: "Pré-acceptation annulée",
      description: "La demande est revenue en 'En cours de traitement'",
      variant: "default",
    });

  } catch (error: any) {
    console.error("Erreur annulation pré-acceptation:", error);
    
    let errorMessage = "Impossible d'annuler la pré-acceptation";
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    toast({
      title: "Erreur",
      description: errorMessage,
      variant: "destructive",
    });
  } finally {
    setProcessingAction(null);
  }
};

  // ---- Helpers ----
  const student = useMemo(() => {
    if (!demande) return null;
    
    const e = demande.etudiant;
    
    return {
      name: `${e.nom} ${e.prenom}`,
      email: e.email,
      phone: e.telephone,
      photo: e.photo_passeport || undefined,
      avatar: `${e.prenom?.[0] || ""}${e.nom?.[0] || ""}`.toUpperCase() || "ET",
      program: e.specialite,
      year: e.niveau,
      resume: e.resume_cv || "",
      address: e.adresse || "",
      gender: e.genre,
      country: e.pays_residence || "",
    };
  }, [demande]);

  const school = useMemo(() => {
    if (!demande?.etablissement) return null;
    const s = demande.etablissement;
    return {
      name: s.name || "Non spécifié",
      location: s.location || undefined,
      email: s.email || undefined,
      phone: s.phone || undefined,
    };
  }, [demande]);

  // Fonction pour rafraîchir les données
  // Ajoutez un paramètre à refreshData
const refreshData = async (showToast = true) => {
  if (!id) return;
  
  try {
    const res = await apiClient.get<APIDemande>(`/demandes/${id}/`);
    setDemande(res.data);
    setDocuments(res.data.documents || []);
    
    console.log("🔄 Données rafraîchies");
    
    if (showToast) {
      toast({
        title: "Données mises à jour",
        variant: "default",
      });
    }
  } catch (error) {
    if (showToast) {
      toast({
        title: "Erreur",
        description: "Impossible de rafraîchir les données",
        variant: "destructive",
      });
    }
  }
};

  // Fonction pour ouvrir le modal de détails du score
  const handleViewScoreDetails = () => {
    if (!demande) return;
    
    const hasScore = demande.score_ia !== undefined && demande.score_ia !== null;
    const scoreValue = demande.score_ia || 0;
    const hasDetails = demande.score_details !== undefined && demande.score_details !== null;
    
    if (!hasScore || scoreValue === 0 || !hasDetails) {
      toast({
        title: "Score non disponible",
        description: "Les détails du score ne sont pas disponibles ou le score est 0",
        variant: "destructive",
      });
      return;
    }

    setSelectedScoreModal({
      open: true,
      score: scoreValue,
      details: demande.score_details,
      commentaire: demande.score_commentaire || "Aucun commentaire disponible",
      nom: student?.name || "Candidat"
    });
  };

  // Rendu conditionnel de la carte score
  //const renderScoreCard = () => {
  //  if (!demande) return null;
    
  //  const hasScore = demande.score_ia !== undefined && demande.score_ia !== null;
  //  const scoreValue = demande.score_ia || 0;
  //  const hasValidScore = hasScore && scoreValue > 0;
  //  const hasDetails = demande.score_details !== undefined && demande.score_details !== null;

  //  return (
  //    <Card>
  //      <CardHeader className="pb-3">
  //        <div className="flex justify-between items-center">
  //          <CardTitle className="flex items-center gap-2">
  //            <Sparkles className="h-5 w-5 text-purple-500" />
  //            Évaluation IA
  //          </CardTitle>
  //          <Button
  //            variant="ghost"
  //            size="sm"
  //            onClick={refreshData}
  //            title="Rafraîchir les données"
  //          >
  //            <RefreshCcw className="h-4 w-4" />
  //          </Button>
  //        </div>
  //        <CardDescription>
  //          Score de matching généré par l'intelligence artificielle
  //        </CardDescription>
  //      </CardHeader>
  //      <CardContent className="space-y-4">
  //        <div className="flex flex-col items-center text-center">
  //          {hasValidScore ? (
  //            <>
  //              <ScoreBadge 
  //                score={scoreValue} 
  //                showIcon={true} 
  //                size="lg" 
  //                className="mb-3"
  //              />
  //              <p className="text-sm text-muted-foreground mb-3">
  //                {demande.score_commentaire || "Évaluation automatique des compétences"}
  //              </p>
  //              <div className="flex gap-2 w-full">
  //                <Button
  //                  variant="outline"
  //                  size="sm"
  //                  onClick={handleViewScoreDetails}
  //                  className="gap-2 flex-1"
  //                  disabled={!hasDetails}
  //                >
  //                  <Info className="h-4 w-4" />
  //                  Détails
  //                </Button>
  //              </div>
  //            </>
  //          ) : (
  //            <div className="bg-muted/30 rounded-lg p-4 mb-3 w-full">
  //              <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
  //              <p className="text-sm text-muted-foreground">
  //                {hasScore && scoreValue === 0 
  //                  ? "Score calculé: 0/100 - Réévaluation recommandée"
  //                  : "Ce candidat n'a pas encore été évalué par l'IA"
  //                }
  //              </p>
  //            </div>
  //          )}
  //        </div>
  //      </CardContent>
  //    </Card>
  //  );
  //};

  const handleDownloadResume = async () => {
    if (!demande || !student?.resume) {
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

      // ... code de génération PDF existant ...
      // (conservé pour la compatibilité)

      const fileName = `Resume_CV_${demande.etudiant.nom}_${demande.etudiant.prenom}.pdf`;
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
        const fileName = `resume_${demande.etudiant.nom}_${demande.etudiant.prenom}.txt`;
        
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

  const handleSaveResume = async () => {
    if (!demande) return;

    setIsSavingResume(true);
    try {
      await apiClient.patch(`/demandes/${demande.id}/`, {
        resume_cv: editedResume
      });

      setDemande(prev => prev ? {
        ...prev,
        etudiant: {
          ...prev.etudiant,
          resume_cv: editedResume
        }
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

  const handleCancelEdit = () => {
    setEditedResume(demande?.etudiant.resume_cv || "");
    setIsEditingResume(false);
  };

  const handleStatusChange = async (action: "Archiver" | "Desarchiver" | "Ractualiser" | "Valider la candidature") => {
    setProcessingAction(action);

    try {
      if (!demande) return;

      if (action === "Archiver") {
        await archiverDemande(demande.id);
        setDemande({ ...demande, est_archivee: true });
        toast({
          title: "Succès",
          description: "La demande a été archivée avec succès",
        });
      } else if (action === "Desarchiver") {
        await desarchiverDemande(demande.id);
        setDemande({ ...demande, est_archivee: false });
        toast({
          title: "Succès",
          description: "La demande a été désarchivée avec succès",
        });
      } else if (action === "Ractualiser") {
          if (!demande) return;

          try {
            setProcessingAction("Ractualiser");
            await apiClient.post(`/demandes/${demande.id}/ractualiser/`);
            setDemande(prev => prev ? { ...prev, statut_stage: "En attente" } : prev);

            toast({
              title: "Succès",
              description: "La demande a été réactualisée et les notifications envoyées",
            });
          } catch (err: any) {
            toast({
              title: "Erreur",
              description: err.response?.data?.message || "Impossible de réactualiser la demande",
              variant: "destructive",
            });
          } finally {
            setProcessingAction(null);
          }
        }
      else if (action === "Valider la candidature") {
        try {
          await apiClient.post(`/demandes/${demande.id}/mettre-en-traitement/`);
          setDemande({ ...demande, statut_stage: "En cours de traitement" });
          toast({
            title: "Succès",
            description: "La demande a été mise en cours de traitement",
          });
        } catch (err: any) {
          toast({
            title: "Erreur",
            description: err.response?.data?.message || "Impossible de valider la candidature",
            variant: "destructive",
          });
        }
      }

    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la demande",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRefuse = async () => {
    if (!motifRefus.trim() || !demande) {
      toast({
        title: "Motif requis",
        description: "Veuillez entrer un motif de refus.",
        variant: "destructive",
      });
      return;
    }

    setProcessingAction("Refuser");

    try {
      await apiClient.post(`/demandes/${demande.id}/refuser/`, {
        raison_refus: motifRefus,
      });

      setDemande({ ...demande, statut_stage: "Refusée" });

      toast({
        title: "Succès",
        description: "La candidature a été refusée.",
      });

      setIsRefuseDialogOpen(false);
      setMotifRefus("");
    } catch (err: any) {
      const message =
        err.response?.data?.detail ||
        err.message ||
        "Impossible de refuser la candidature.";

      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  // MODIFICATION : Changer l'action "Accepter la demande" pour ouvrir le modal
  const actions = [
  ...(demande?.statut_stage === "Refusée"
    ? [{
        icon: RefreshCcw,
        label: "Ractualiser la demande",
        onClick: () => handleStatusChange("Ractualiser"),
        variant: "default" as const,
        disabled: true
      }]
    : [
        ...(demande?.statut_stage === "En attente" ? [{
          icon: PlayCircle,
          label: "Valider la candidature",
          onClick: () => handleStatusChange("Valider la candidature"),
          variant: "default" as const,
        }] : []),
        
        // ÉTAPE 1: Pré-acceptation pour les demandes en traitement
        ...(demande?.statut_stage === "En cours de traitement" ? [{
          icon: CheckCircle,
          label: "Accepter la demande",
          onClick: () => setIsAcceptModalOpen(true),
          variant: "default" as const,
        }] : []),
        
        // ÉTAPE 2: Finalisation pour les demandes pré-acceptées
        ...(demande?.statut_stage === "Pré-acceptée" ? [
          {
            icon: Upload,
            label: "Finaliser l'acceptation",
            onClick: () => {
              if (demande.convention_temporaire_url) {
                setConventionTemporaireUrl(demande.convention_temporaire_url);
              }
              setIsFinalizeModalOpen(true);
            },
            variant: "default" as const,
          },
          // ✅ AJOUTEZ CE BOUTON D'ANNULATION SIMPLE
          {
            icon: XCircle,
            label: "Annuler l'acceptation",
            onClick: () => handleAnnulerAcceptation(),
            variant: "destructive" as const,
          }
        ] : []),
        
        // Refus (disponible pour les statuts En attente et En cours de traitement)
        ...(demande?.statut_stage && ["En attente", "En cours de traitement"].includes(demande.statut_stage) ? [{
          icon: XCircle,
          label: "Refuser la candidature",
          onClick: () => setIsRefuseDialogOpen(true),
          variant: "outline" as const,
        }] : []),
      ]
  ),
];

  // ---- Rendu des documents ----
  const renderDocuments = () => {
    if (documents.length === 0) {
      return (
        <div className="text-center py-8 border rounded-lg bg-muted/20">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aucun document disponible</p>
        </div>
      );
    }

    return documents.map((doc) => (
      <div
        key={`${doc.id}-${doc.nom}`}
        className="flex justify-between items-center p-3 border rounded-lg"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 rounded-md bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-sm">{doc.nom}</p>
              
            </div>
            <p className="text-xs text-muted-foreground">
              {doc.url.split('.').pop()?.toUpperCase()} •{" "}
              {doc.url.includes('http') ? 'Lien externe' : 'Document'} •{" "}
              Ajouté le {new Date(doc.date_upload).toLocaleDateString('fr-FR')}
              {doc.est_modifie && " • Modifié"}
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
    ));
  };

  // ---- UI ----
  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Skeleton className="h-8 w-64" />
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
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
                    <Skeleton className="h-6 w-28" />
                  </div>
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
            
            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, i) => (
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
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Détails de la demande</h1>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-10">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Erreur de chargement</h3>
                <p className="text-muted-foreground mb-4">
                  {error}
                </p>
                <Button onClick={() => window.location.reload()}>
                  Réessayer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!demande || !student) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Détails de la demande</h1>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-10">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Demande non trouvée</h3>
                <p className="text-muted-foreground">
                  La demande que vous recherchez n'existe pas ou a été supprimée.
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
      <div className="container mx-auto py-6 space-y-6">
        {/* Header avec bouton retour ET boutons en haut à droite */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Détails de la demande</h1>
              <p className="text-muted-foreground">
                Soumise le {new Date(demande.date_soumission).toLocaleDateString("fr-FR", {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
          
          {/* Boutons positionnés en haut à droite */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsRequestInfoModalOpen(true)}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Demander plus d'informations
            </Button>
            <Button variant="outline" onClick={() => refreshData()} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* COLONNE GAUCHE */}
          <div className="md:col-span-2 space-y-6">
            {/* PROFIL */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      Profil du demandeur
                      <StatusBadge status={demande.statut_stage || "En attente"} />
                    </CardTitle>
                  </div>
                  
                  {/* Boutons d'action pour le résumé */}
                  <div className="flex gap-2">
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
                    )}
                    
                    {/*{!isEditingResume ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingResume(true)}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Modifier
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="gap-2"
                          disabled={isSavingResume}
                        >
                          <X className="h-4 w-4" />
                          Annuler
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleSaveResume}
                          className="gap-2"
                          disabled={isSavingResume}
                        >
                          {isSavingResume ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Sauvegarder
                        </Button>
                      </div>
                    )}*/}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
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

            {/* INFORMATIONS DE LA DEMANDE */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Informations de la demande
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                  {/* Colonne gauche */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Spécialité</p>
                        <p className="font-medium">{student.program}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-100 text-cyan-600">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Niveau d'étude</p>
                        <p className="font-medium">{student.year}</p>
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
                        <p className="font-medium">{demande.type_stage}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Date de soumission</p>
                        <p className="font-medium">
                          {new Date(demande.date_soumission).toLocaleDateString("fr-FR", {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    
                    {demande.existe_entretien && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                          <ClipboardList className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Entretien</p>
                          <p className="font-medium">Programmé</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            

            {/* ✅ CARTE MOTIF DE REFUS AJOUTÉE ICI */}
            {demande.statut_stage === "Refusée" && (
            <Card className="border-red-100 bg-white shadow-sm">
              <CardHeader className="border-b border-red-100 bg-red-50/30">
                <CardTitle className="flex items-center gap-2 text-red-900 text-base font-semibold text-xl  ">
                  <XCircle className="h-5 w-5 text-red-600" />
                  Motif du refus
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <MessageSquare className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Raison communiquée
                      </p>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-sm text-gray-800 leading-relaxed">
                          {demande.raison_refus || "Aucun motif spécifié"}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {demande.raison_refus && (
                    <div className="flex items-start gap-2 pt-2 border-t border-gray-100">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Cette information a été transmise à l'étudiant par notification.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            )}

            {/* DOCUMENTS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents
                </CardTitle>
                <CardDescription>
                  Documents fournis par le demandeur
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {renderDocuments()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* COLONNE DROITE */}
          <div className="space-y-6">
            {/*{renderScoreCard()}*/}

            {/* ÉTUDIANT */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Demandeur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center text-center mb-4">
                  <Avatar className="h-24 w-24 mb-4 cursor-pointer" onClick={() => student.photo && setIsPhotoDialogOpen(true)}>
                    <AvatarImage src={student.photo} className="object-cover" />
                    <AvatarFallback className="text-2xl font-bold">{student.avatar}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-lg">{student.name}</h3>
                  <p className="text-sm text-muted-foreground">{student.program}, {student.year}</p>
                </div>
                
                <div className="space-y-3">
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
                  
                  {student.address && (
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm">{student.address}</p>
                    </div>
                  )}
                  
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
                </div>
              </CardContent>
            </Card>
            {/* ÉTABLISSEMENT - Version compacte */}
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

            {/* ACTIONS */}
            {demande.statut_stage !== "Acceptée" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">Actions</CardTitle>
                  <CardDescription>
                    Gérer cette demande de stage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {actions.map((action, i) => (
                    <Button
                      key={i}
                      variant={action.variant}
                      onClick={action.onClick}
                      className="w-full gap-2"
                      disabled={action.disabled || processingAction === action.label}
                    >
                      {processingAction === action.label ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <action.icon className="h-4 w-4" />
                      )}
                      {action.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Ajout du modal d'acceptation */}
        {demande && (
          <AcceptInternshipModal
            open={isAcceptModalOpen}
            onOpenChange={setIsAcceptModalOpen}
            demandeId={demande.id}
            studentName={student?.name || ""}
            existingData={{
              type_stage: demande.type_stage,
              specialite: student?.program || ""
            }}
           onSuccess={() => {
            // Rafraîchir sans afficher le toast
            refreshData(false);
            
            // Afficher le toast d'acceptation
            toast({
              title: "Succès",
              description: "La demande a été acceptée et un nouveau stage créé",
            });
          }}
          />
        )}

        <DocumentPreviewDialog
          document={selectedDocument ? { nom: selectedDocument.name, url: selectedDocument.url } : null}
          onClose={() => setSelectedDocument(null)}
          onDownload={handleDownloadDocument}
        />

        <PhotoDialog
          open={isPhotoDialogOpen}
          onOpenChange={setIsPhotoDialogOpen}
          photoUrl={student.photo}
          altText={student.name}
        />

        <RefuseDialog
          open={isRefuseDialogOpen}
          onOpenChange={setIsRefuseDialogOpen}
          motifRefus={motifRefus}
          setMotifRefus={setMotifRefus}
          onConfirm={handleRefuse}
          loading={processingAction === "Refuser"}
        />

        {/* Modal des détails du score */}
        {selectedScoreModal.open && (
          <ScoreDetailsModal
            open={selectedScoreModal.open}
            onOpenChange={(open) => setSelectedScoreModal(prev => ({ ...prev, open }))}
            score={selectedScoreModal.score}
            details={selectedScoreModal.details}
            commentaire={selectedScoreModal.commentaire}
            candidatNom={selectedScoreModal.nom}
          />
        )}
      </div>
      
      <RequestInfoModal
        open={isRequestInfoModalOpen}
        onOpenChange={setIsRequestInfoModalOpen}
        studentName={student?.name || ""}
        studentEmail={student?.email || ""}
        demandeId={demande?.id || 0}
      />

      {isAcceptModalOpen && demande && (
  <AcceptInternshipModal
    open={isAcceptModalOpen}
    onOpenChange={setIsAcceptModalOpen}
    demandeId={demande.id}
    studentName={student?.name || ""}
    existingData={{
      type_stage: demande.type_stage,
      specialite: student?.program || ""
    }}
    onSuccess={(data) => {
      // Rafraîchir les données
      refreshData(false);
      
      // Si un PDF a été généré, afficher un message spécifique
      if (data?.pdf_url) {
        toast({
          title: "Convention générée",
          description: "La convention a été générée avec succès. Vous pouvez maintenant la finaliser.",
          variant: "default",
        });
        
        // Stocker l'URL pour la finalisation
        setConventionTemporaireUrl(data.pdf_url);
      } else {
        toast({
          title: "Succès",
          description: "La demande a été pré-acceptée",
          variant: "default",
        });
      }
    }}
  />
)}

{isFinalizeModalOpen && demande && (
  <FinalizeAcceptanceModal
    open={isFinalizeModalOpen}
    onOpenChange={setIsFinalizeModalOpen}
    demandeId={demande.id}
    studentName={student?.name || ""}
    conventionTemporaireUrl={conventionTemporaireUrl || demande.convention_temporaire_url}
    onSuccess={() => {
      // Rafraîchir les données
      refreshData(false);
      
      toast({
        title: "Succès",
        description: "L'acceptation a été finalisée et le stagiaire créé",
        variant: "default",
      });
    }}
  />
)}
    </DashboardLayout>
  );
};

export default InternshipDetailsPage;
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
  PlayCircle, Upload, Clock, Users, Award,
  Printer, Flag, PenLine
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { archiverDemande, desarchiverDemande } from "@/lib/demandes";
import DocumentPreviewDialog from "@/components/internships/DocumentPreviewDialog";
import PhotoDialog from "@/components/internships/PhotoDialog";
import { RefuseDialog } from "@/components/internships/RefuseDialog";
import apiClient from "@/lib/apiClient";
import { RequestInfoModal } from "@/components/internships/RequestInfoModal";
import AcceptInternshipModal from "@/components/internships/AcceptInternshipModal";
import FinalizeAcceptanceModal from "@/components/internships/FinalizeAcceptanceModal";
import SignatoryModal from "@/components/internships/SignatoryModal";

const formatResumeHtml = (htmlText: string): string => {
  if (!htmlText) return "";
  const textWithBreaks = htmlText
    .replace(/\n/g, '<br>')
    .replace(/<br><br>/g, '</p><p>')
    .replace(/<strong>/g, '<strong class="font-bold">');
  return `<p>${textWithBreaks}</p>`;
};

declare global {
  interface Window {
    showSaveFilePicker?: (options?: any) => Promise<any>;
  }
}

// ---- Types ----
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
  raison_refus?: string;
  convention_temporaire_url?: string;
};

// ---- Badge statut ----
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    "En attente": { label: "En attente", variant: "secondary" },
    "En cours de traitement": { label: "En traitement", variant: "default" },
    "Pré-acceptée": { label: "Pré-acceptée", variant: "default" },
    "Acceptée": { label: "Acceptée", variant: "default" },
    "Refusée": { label: "Refusée", variant: "destructive" },
  };
  const config = statusConfig[status] || { label: status, variant: "outline" };
  return (
    <Badge
      variant={config.variant}
      className={`capitalize px-2.5 py-0.5 text-xs ${
        status === "En attente"
          ? "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50"
          : status === "En cours de traitement"
          ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50"
          : status === "Pré-acceptée"
          ? "bg-green-50 text-green-700 hover:bg-green-50"
          : status === "Acceptée"
          ? "bg-green-50 text-green-700 hover:bg-green-50"
          : status === "Refusée"
          ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-50"
          : "bg-green-50 text-green-700 hover:bg-green-50"
      }`}
    >
      {config.label}
    </Badge>
  );
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
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [conventionTemporaireUrl, setConventionTemporaireUrl] = useState<string | null>(null);
  const [isRequestInfoModalOpen, setIsRequestInfoModalOpen] = useState(false);
  const [isPrintingResume, setIsPrintingResume] = useState(false);
  const [isSignatoryModalOpen, setIsSignatoryModalOpen] = useState(false);

  // ---- Fetch ----
  useEffect(() => {
    let cancelled = false;
    const fetchDemande = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<APIDemande>(`/demandes/${id}/`);
        if (!cancelled) {
          setDemande(res.data);
          setDocuments(res.data.documents || []);
        }
      } catch (err: any) {
        if (!cancelled) {
          const message = err.response?.data?.detail || err.response?.statusText || err.message || "Erreur inconnue";
          setError(message);
          toast({ title: "Erreur", description: message, variant: "destructive" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (id) fetchDemande();
    return () => { cancelled = true; };
  }, [id, toast]);

  const refreshData = async (showToast = true) => {
    if (!id) return;
    try {
      const res = await apiClient.get<APIDemande>(`/demandes/${id}/`);
      setDemande(res.data);
      setDocuments(res.data.documents || []);
    } catch {
      if (showToast) toast({ title: "Erreur", description: "Impossible de rafraîchir les données", variant: "destructive" });
    }
  };

  // ---- Documents ----
  const markDocumentAsViewed = async (documentHistoryId: number) => {
    if (!demande) return;
    try {
      await apiClient.post(`/demandes/${demande.id}/marquer-document-vu/`, { document_history_id: documentHistoryId });
      await refreshData();
    } catch (error) {
      console.error("Erreur marquage document vu:", error);
    }
  };

  const handleViewDocument = async (doc: APIDocument) => {
    if (doc.statut !== 'viewed') await markDocumentAsViewed(doc.id);
    setSelectedDocument({ name: doc.nom, url: doc.url });
  };

  const handleDownloadDocument = async (doc: APIDocument) => {
    if (doc.statut !== 'viewed') await markDocumentAsViewed(doc.id);
    if (!demande) return;
    const fileName = `${doc.nom.replace(/\s+/g, "_")}_${demande.etudiant.nom}_${demande.etudiant.prenom}`;
    try {
      const response = await apiClient.get(doc.url, { responseType: "blob" });
      const blob = response.data;
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: "Fichiers autorisés", accept: { "application/pdf": [".pdf"], "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] } }],
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
      toast({ title: "Téléchargement réussi", description: `"${doc.nom}" téléchargé` });
    } catch {
      toast({ title: "Erreur", description: "Impossible de télécharger le document", variant: "destructive" });
    }
  };

  // ---- Actions ----
  const handleAnnulerAcceptation = async () => {
    if (!demande) return;
    setProcessingAction("Annuler l'acceptation");
    try {
      const response = await apiClient.post(`/demandes/${demande.id}/annuler-pre-acceptation-simple/`);
      if (!response.data.success) throw new Error(response.data.message || "Erreur lors de l'annulation");
      await refreshData(false);
      toast({ title: "Pré-acceptation annulée", description: "La demande est revenue en 'En cours de traitement'" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.response?.data?.message || error.response?.data?.detail || error.message || "Impossible d'annuler", variant: "destructive" });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleStatusChange = async (action: "Archiver" | "Desarchiver" | "Ractualiser" | "Valider la candidature") => {
    setProcessingAction(action);
    try {
      if (!demande) return;
      if (action === "Archiver") {
        await archiverDemande(demande.id);
        setDemande({ ...demande, est_archivee: true });
        toast({ title: "Succès", description: "La demande a été archivée avec succès" });
      } else if (action === "Desarchiver") {
        await desarchiverDemande(demande.id);
        setDemande({ ...demande, est_archivee: false });
        toast({ title: "Succès", description: "La demande a été désarchivée avec succès" });
      } else if (action === "Ractualiser") {
        try {
          await apiClient.post(`/demandes/${demande.id}/ractualiser/`);
          setDemande(prev => prev ? { ...prev, statut_stage: "En attente" } : prev);
          toast({ title: "Succès", description: "La demande a été réactualisée" });
        } catch (err: any) {
          toast({ title: "Erreur", description: err.response?.data?.message || "Impossible de réactualiser", variant: "destructive" });
        }
      } else if (action === "Valider la candidature") {
        try {
          await apiClient.post(`/demandes/${demande.id}/mettre-en-traitement/`);
          setDemande({ ...demande, statut_stage: "En cours de traitement" });
          toast({ title: "Succès", description: "La demande a été mise en cours de traitement" });
        } catch (err: any) {
          toast({ title: "Erreur", description: err.response?.data?.message || "Impossible de valider", variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour la demande", variant: "destructive" });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRefuse = async () => {
    if (!motifRefus.trim() || !demande) {
      toast({ title: "Motif requis", description: "Veuillez entrer un motif de refus.", variant: "destructive" });
      return;
    }
    setProcessingAction("Refuser");
    try {
      await apiClient.post(`/demandes/${demande.id}/refuser/`, { raison_refus: motifRefus });
      setDemande({ ...demande, statut_stage: "Refusée" });
      toast({ title: "Succès", description: "La candidature a été refusée." });
      setIsRefuseDialogOpen(false);
      setMotifRefus("");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.response?.data?.detail || err.message || "Impossible de refuser.", variant: "destructive" });
    } finally {
      setProcessingAction(null);
    }
  };

  // ---- Résumé ----
  const generateResumeHtmlForExport = (): string => {
    if (!demande || !student) return "";
    const formattedResume = student.resume ? formatResumeHtml(student.resume) : "";
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Résumé - ${student.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; line-height: 1.8; color: #333; padding: 30px 40px; background: white; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #16a34a; padding-bottom: 20px; }
        .title { color: #166534; font-size: 28px; margin-bottom: 10px; }
        .subtitle { color: #4b5563; font-size: 18px; margin-bottom: 20px; }
        .badge { display: inline-block; padding: 4px 12px; background: #dcfce7; color: #166534; border-radius: 20px; font-size: 14px; margin-right: 8px; border: 1px solid #bbf7d0; }
        .resume-text { font-size: 13px; line-height: 1.5; color: #374151; text-align: justify; }
        .resume-text p { margin-bottom: 10px; }
        .resume-text strong { color: #166534; font-weight: 600; }
        .empty-state { text-align: center; padding: 60px 20px; color: #6b7280; font-style: italic; }
        @media print { body { padding: 15mm; } @page { margin: 15mm; size: A4; } }
      </style>
      </head><body>
      <div class="header">
        <h1 class="title">Résumé professionnel</h1>
        <h2 class="subtitle">${student.name}</h2>
        <div style="margin-top: 20px;">
          <span class="badge">${student.program}</span>
          <span class="badge" style="background:#fef3c7;color:#92400e;border-color:#fde68a;">${demande.type_stage}</span>
        </div>
      </div>
      ${student.resume ? `<div class="resume-text">${formattedResume}</div>` : `<div class="empty-state">Aucun résumé n'a été fourni par l'étudiant.</div>`}
      </body></html>`;
  };

  const handlePrintResume = () => {
    if (!student) return;
    setIsPrintingResume(true);
    try {
      const printWindow = window.open('', '_blank', 'width=800,height=600,toolbar=0,scrollbars=1,status=0');
      if (!printWindow) {
        toast({ title: "Erreur", description: "Veuillez autoriser les pop-ups", variant: "destructive" });
        setIsPrintingResume(false);
        return;
      }
      printWindow.document.write(generateResumeHtmlForExport());
      printWindow.document.close();
      printWindow.onload = function () {
        printWindow.focus();
        printWindow.print();
        printWindow.onafterprint = function () { printWindow.close(); };
      };
      setTimeout(() => { printWindow.focus(); printWindow.print(); setIsPrintingResume(false); }, 1000);
      toast({ title: "Impression lancée", description: "La fenêtre d'impression s'est ouverte" });
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ouvrir la fenêtre d'impression", variant: "destructive" });
      setIsPrintingResume(false);
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
    if (!s.name || s.name === "Non spécifié") return null;
    return { name: s.name, location: s.location || undefined, email: s.email || undefined, phone: s.phone || undefined };
  }, [demande]);

  const calculateDaysSinceSubmission = () => {
    if (!demande?.date_soumission) return 0;
    return Math.floor((new Date().getTime() - new Date(demande.date_soumission).getTime()) / (1000 * 3600 * 24));
  };

  const getActions = () => {
    if (!demande) return [];
    const actions = [];
    if (demande.statut_stage === "Refusée") {
      actions.push({ icon: RefreshCcw, label: "Ractualiser la demande", onClick: () => handleStatusChange("Ractualiser"), variant: "outline" as const, disabled: true });
    } else {
      if (demande.statut_stage === "En attente") {
        actions.push({ icon: PlayCircle, label: "Valider la candidature", onClick: () => handleStatusChange("Valider la candidature"), variant: "default" as const });
      }
      if (demande.statut_stage === "En cours de traitement") {
        actions.push({ icon: CheckCircle, label: "Accepter la demande", onClick: () => setIsAcceptModalOpen(true), variant: "default" as const });
      }
      if (demande.statut_stage === "Pré-acceptée") {
        actions.push({
          icon: Upload, label: "Finaliser l'acceptation",
          onClick: () => { if (demande.convention_temporaire_url) setConventionTemporaireUrl(demande.convention_temporaire_url); setIsFinalizeModalOpen(true); },
          variant: "default" as const,
        });
        actions.push({ icon: PenLine, label: "Faire signer", onClick: () => setIsSignatoryModalOpen(true), variant: "outline" as const });
        actions.push({ icon: XCircle, label: "Annuler l'acceptation", onClick: () => handleAnnulerAcceptation(), variant: "outline" as const });
      }
      if (["En attente", "En cours de traitement"].includes(demande.statut_stage)) {
        actions.push({ icon: XCircle, label: "Refuser la candidature", onClick: () => setIsRefuseDialogOpen(true), variant: "outline" as const });
      }
    }
    return actions;
  };

  const renderDocuments = () => {
    if (documents.length === 0) {
      return (
        <div className="text-center py-4 sm:py-6 md:py-8 border rounded-lg bg-gray-50">
          <FileText className="h-10 w-10 mx-auto text-red-400 mb-3" />
          <p className="text-sm text-gray-600">Aucun document disponible</p>
        </div>
      );
    }
    return documents.map((doc) => (
      <div key={`${doc.id}-${doc.nom}`} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-red-100"><FileText className="h-4 w-4 text-red-600" /></div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate text-gray-900">{doc.nom}</p>
            <p className="text-xs text-gray-600">
              Ajouté le {new Date(doc.date_upload).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              {doc.est_modifie && " • Modifié"}
            </p>
          </div>
        </div>
        <div className="flex gap-2 self-end sm:self-center">
          <Button variant="ghost" size="sm" onClick={() => handleViewDocument(doc)} className="h-8 gap-1 hover:bg-gray-100 text-gray-700">
            <Eye className="h-3.5 w-3.5" /><span className="hidden sm:inline">Voir</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDownloadDocument(doc)} className="h-8 gap-1 text-gray-700 hover:bg-gray-100 hover:border-gray-300">
            <Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Télécharger</span>
          </Button>
        </div>
      </div>
    ));
  };

  // ---- États de chargement / erreur ----
  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 space-y-3 sm:space-y-4 md:space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 text-gray-700">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Skeleton className="h-8 w-48 bg-gray-200" />
          </div>
          <div className="grid gap-3 sm:gap-4 md:gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-3 sm:space-y-4 md:space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <Skeleton className="h-6 w-40 mb-2 bg-gray-200" />
                    <Skeleton className="h-4 w-24 bg-gray-200" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-4 w-full bg-gray-200" />
                    <Skeleton className="h-4 w-3/4 bg-gray-200" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader><Skeleton className="h-6 w-32 bg-gray-200" /></CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center">
                      <Skeleton className="h-24 w-24 rounded-full mb-4 bg-gray-200" />
                      <Skeleton className="h-6 w-32 mb-2 bg-gray-200" />
                      {Array.from({ length: 4 }).map((_, j) => <Skeleton key={j} className="h-4 w-full mb-2 bg-gray-200" />)}
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
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 text-gray-700"><ArrowLeft className="h-4 w-4" /></Button>
            <h1 className="text-xl font-bold text-gray-900">Détails de la demande</h1>
          </div>
          <Card>
            <CardContent className="pt-6 text-center py-10">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="font-medium text-lg mb-2 text-gray-900">Erreur de chargement</h3>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} className="bg-gray-900 hover:bg-gray-800 text-white">Réessayer</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!demande || !student) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 space-y-3 sm:space-y-4 md:space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 text-gray-700"><ArrowLeft className="h-4 w-4" /></Button>
            <h1 className="text-xl font-bold text-gray-900">Détails de la demande</h1>
          </div>
          <Card>
            <CardContent className="pt-6 text-center py-10">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="font-medium text-lg mb-2 text-gray-900">Demande non trouvée</h3>
              <p className="text-sm text-gray-600">La demande que vous recherchez n'existe pas ou a été supprimée.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const actions = getActions();
  const daysSinceSubmission = calculateDaysSinceSubmission();

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-3 sm:space-y-4 md:space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 text-gray-700 hover:bg-gray-100 hover:border-gray-300">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Détails de la demande</h1>
                <p className="text-sm text-gray-600">N° {demande.tracking_id} • {daysSinceSubmission === 0 ? "Soumise aujourd'hui" : `Soumise il y a ${daysSinceSubmission} jour(s)`}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsRequestInfoModalOpen(true)} className="gap-2 hidden sm:flex text-gray-700 hover:bg-gray-100 hover:border-gray-300">
                <MessageSquare className="h-4 w-4" /><span className="hidden sm:inline">Plus d'infos</span>
              </Button>
              <Button variant="outline" size="icon" onClick={() => refreshData()} title="Rafraîchir" className="text-gray-700 hover:bg-gray-100 hover:border-gray-300">
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Barre statut */}
          <Card className="overflow-hidden">
            <CardContent className="p-4 sm:p-6 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100 text-gray-600"><FileCheck className="h-5 w-5" /></div>
                  <div>
                    <p className="font-medium text-sm text-gray-700">Statut actuel</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={demande.statut_stage} />
                      <span className="text-xs text-gray-600">Soumise le {new Date(demande.date_soumission).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:hidden">
                  <Button variant="ghost" onClick={() => setIsRequestInfoModalOpen(true)} className="gap-2 text-gray-700">
                    <MessageSquare className="h-4 w-4" />Plus d'infos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 sm:gap-4 md:gap-6 md:grid-cols-3">
          {/* COLONNE GAUCHE */}
          <div className="md:col-span-2 space-y-3 sm:space-y-4 md:space-y-6">

            {/* Profil / Résumé */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                  <div>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 mb-1 text-gray-900">
                      {student.name}
                      {student.resume && (
                        <Button variant="ghost" size="sm" onClick={handlePrintResume} disabled={isPrintingResume}
                          className="h-8 w-8 p-0 hover:bg-gray-100 text-gray-700" title="Imprimer le résumé">
                          {isPrintingResume ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                        </Button>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="gap-1 text-xs bg-gray-100 text-gray-700">
                        <BookOpen className="h-3 w-3" />{student.program}
                      </Badge>
                      <Badge variant="outline" className="gap-1 text-xs bg-gray-100 text-gray-700">
                        <GraduationCap className="h-3 w-3" />{student.year}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  {student.resume ? (
                    <div className="text-sm text-justify leading-relaxed prose prose-sm max-w-none text-gray-800"
                      dangerouslySetInnerHTML={{ __html: formatResumeHtml(student.resume) }} />
                  ) : (
                    <div className="space-y-3">
                      <span className="text-gray-600 italic">Aucun CV n'a été fourni par l'étudiant.</span>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-yellow-600" />
                          <p className="text-sm text-yellow-700">Aucun résumé disponible pour ce candidat.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Informations demande */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-gray-900">
                  <Briefcase className="h-5 w-5" />Informations de la demande
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-red-100 text-red-600 mt-0.5"><BookOpen className="h-4 w-4" /></div>
                      <div><p className="text-xs text-gray-600">Spécialité</p><p className="font-medium text-gray-900">{student.program}</p></div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-red-100 text-red-600 mt-0.5"><User className="h-4 w-4" /></div>
                      <div><p className="text-xs text-gray-600">Niveau d'étude</p><p className="font-medium text-gray-900">{student.year}</p></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-red-100 text-red-600 mt-0.5"><FileCheck className="h-4 w-4" /></div>
                      <div><p className="text-xs text-gray-600">Type de stage</p><p className="font-medium text-gray-900">{demande.type_stage}</p></div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-red-100 text-red-600 mt-0.5"><Calendar className="h-4 w-4" /></div>
                      <div>
                        <p className="text-xs text-gray-600">Date de soumission</p>
                        <p className="font-medium text-gray-900">{new Date(demande.date_soumission).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                    {demande.existe_entretien && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600 mt-0.5"><ClipboardList className="h-4 w-4" /></div>
                        <div><p className="text-xs text-yellow-600">Entretien</p><p className="font-medium text-yellow-800">Programmé</p></div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Motif de refus */}
            {demande.statut_stage === "Refusée" && (
              <Card className="border-red-100 bg-white shadow-sm">
                <CardHeader className="border-b border-red-100 bg-red-50/30">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-gray-900">
                    <XCircle className="h-5 w-5 text-red-600" />Motif du refus
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <MessageSquare className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Raison communiquée</p>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <p className="text-sm text-gray-800 leading-relaxed">{demande.raison_refus || "Aucun motif spécifié"}</p>
                        </div>
                      </div>
                    </div>
                    {demande.raison_refus && (
                      <div className="flex items-start gap-2 pt-2 border-t border-gray-100">
                        <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                        <p className="text-xs text-gray-600">Cette information a été transmise à l'étudiant par notification.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-gray-900">
                  <FileText className="h-5 w-5" />Documents
                </CardTitle>
                <CardDescription className="text-gray-600">Documents fournis par le demandeur</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">{renderDocuments()}</div>
              </CardContent>
            </Card>
          </div>

          {/* COLONNE DROITE */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6">

            {/* Demandeur */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-gray-900">
                  <User className="h-5 w-5" />Demandeur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center text-center mb-4">
                  <Avatar className="h-24 w-24 mb-4 cursor-pointer" onClick={() => student.photo && setIsPhotoDialogOpen(true)}>
                    <AvatarImage src={student.photo} className="object-cover" />
                    <AvatarFallback className="text-lg sm:text-xl md:text-2xl font-bold bg-red-100 text-red-700">{student.avatar}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-lg text-gray-900">{student.name}</h3>
                  <p className="text-sm text-gray-600">{student.program}, {student.year}</p>
                </div>
                <div className="w-full space-y-3">
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                    <Mail className="h-4 w-4 text-gray-600 flex-shrink-0" />
                    <a href={`mailto:${student.email}`} className="text-sm hover:underline truncate text-gray-800">{student.email}</a>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                    <Phone className="h-4 w-4 text-gray-600 flex-shrink-0" />
                    <a href={`tel:${student.phone}`} className="text-sm hover:underline truncate text-gray-800">{student.phone}</a>
                  </div>
                  {student.gender && (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <Users className="h-4 w-4 text-gray-600 flex-shrink-0" />
                      <p className="text-sm capitalize truncate text-gray-800">{student.gender.toLowerCase()}</p>
                    </div>
                  )}
                  {student.country && (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <Flag className="h-4 w-4 text-gray-600 flex-shrink-0" />
                      <p className="text-sm truncate text-gray-800">{student.country}</p>
                    </div>
                  )}
                  {student.address && (
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-gray-50">
                      <MapPin className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-left text-gray-800">{student.address}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Établissement */}
            {school && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-gray-900">
                    <div className="p-2 rounded-lg bg-red-100 text-red-600"><GraduationCap className="h-4 w-4" /></div>
                    Établissement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="pb-2 border-b">
                      <h4 className="font-medium text-sm text-gray-900 truncate">{school.name}</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      {school.location && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-gray-600" /><span className="truncate text-gray-800">{school.location}</span></div>}
                      {school.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-gray-600" /><a href={`mailto:${school.email}`} className="hover:underline truncate text-gray-800">{school.email}</a></div>}
                      {school.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-gray-600" /><a href={`tel:${school.phone}`} className="hover:underline truncate text-gray-800">{school.phone}</a></div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            {actions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-gray-900">
                    <Award className="h-5 w-5" />Actions
                  </CardTitle>
                  <CardDescription className="text-gray-600">Gérer cette demande de stage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {actions.map((action, i) => (
                    <Button
                      key={i}
                      variant={action.variant}
                      onClick={action.onClick}
                      disabled={action.disabled || processingAction === action.label}
                      {...(action.variant === "default" && { className: "w-full gap-2 justify-start bg-primary hover:bg-primary/80 text-white" })}
                      {...(action.variant === "outline" && { className: "w-full gap-2 justify-start text-gray-700 hover:bg-gray-100 hover:text-gray-800 hover:border-gray-300" })}
                      {...(action.variant === "destructive" && { className: "w-full gap-2 justify-start text-red-600 hover:text-red-700 hover:bg-red-50" })}
                    >
                      {processingAction === action.label ? <Loader2 className="h-4 w-4 animate-spin" /> : <action.icon className="h-4 w-4" />}
                      {action.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Modals */}
        {demande && (
          <AcceptInternshipModal
            open={isAcceptModalOpen}
            onOpenChange={setIsAcceptModalOpen}
            demandeId={demande.id}
            studentName={student?.name || ""}
            existingData={{ type_stage: demande.type_stage, specialite: student?.program || "" }}
            onSuccess={(data) => {
              refreshData(false);
              if (data?.pdf_url) {
                toast({ title: "Lettre de stage générée", description: "La lettre de stage a été générée avec succès.", variant: "default" });
                setConventionTemporaireUrl(data.pdf_url);
              } else {
                toast({ title: "Succès", description: "La demande a été pré-acceptée", variant: "default" });
              }
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

        <RequestInfoModal
          open={isRequestInfoModalOpen}
          onOpenChange={setIsRequestInfoModalOpen}
          studentName={student?.name || ""}
          studentEmail={student?.email || ""}
          demandeId={demande?.id || 0}
        />

        {isFinalizeModalOpen && demande && (
          <FinalizeAcceptanceModal
            open={isFinalizeModalOpen}
            onOpenChange={setIsFinalizeModalOpen}
            demandeId={demande.id}
            studentName={student?.name || ""}
            conventionTemporaireUrl={conventionTemporaireUrl || demande.convention_temporaire_url}
            onSuccess={() => {
              refreshData(false);
              toast({ title: "Succès", description: "L'acceptation a été finalisée et le stagiaire créé", variant: "default" });
            }}
          />
        )}

        {demande && (
          <SignatoryModal
            open={isSignatoryModalOpen}
            onOpenChange={setIsSignatoryModalOpen}
            demandeId={demande.id}
            conventionTemporaireUrl={conventionTemporaireUrl || demande.convention_temporaire_url}
            onSuccess={(pdfUrl) => {
              setConventionTemporaireUrl(pdfUrl);
              refreshData(false);
              toast({ title: "Lettre de stage prête", description: "La lettre de stage a été générée avec le signataire choisi." });
            }}
          />
        )}

      </div>
    </DashboardLayout>
  );
};

export default InternshipDetailsPage;
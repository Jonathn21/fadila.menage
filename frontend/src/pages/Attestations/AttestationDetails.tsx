import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Eye, Download, XCircle, CheckCircle,
  Mail, Phone, User, Calendar, ArrowLeft, Briefcase,
  Clock, Loader2, RefreshCcw, Upload, Award,
  AlertCircle, MapPin, PenLine, X
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import apiClient from "@/lib/apiClient";

// ---- Types ----
interface DemandeAttestation {
  id: string;
  stagiaire: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    direction: string;
    service: string;
    date_debut: string;
    date_fin: string;
    statut: string;
    duree_jours?: number;
    duree_mois?: number;
    type_stage?: string;
    specialite?: string;
    remunere?: boolean;
    montant_remuneration?: number;
    lieu_stage?: string;
    superviseur?: string;
    photo_passeport?: string | null;
    genre?: string;
    pays_residence?: string;
    adresse?: string;
    niveau_etude?: string;
    etablissement?: {
      nom: string;
      email: string;
    };
  };
  fichiers: {
    rapport_stage: string | null;
    demande_manuscrite: string | null;
    attestation_generee: string | null;
    attestation_signee: string | null;
  };
  statut: 'en_attente' | 'approuvee' | 'refusee' | 'traitee';
  motif_refus: string | null;
  date_demande: string;
  date_traitement: string | null;
  date_upload_attestation_signee: string | null;
}

const SIGNATAIRES = [
  { id: "DG", titre: "Directeur Général", nom: "Dr. Karimou CHABI SIKA" },
  { id: "DGA", titre: "Directeur Général Adjoint", nom: "M. Damipi NOUPOKOU" },
];

// ---- Badge statut ----
const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { label: string; className: string }> = {
    en_attente: { label: "En attente", className: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50" },
    approuvee: { label: "Approuvée", className: "bg-green-50 text-green-700 border-green-200 hover:bg-green-50" },
    refusee: { label: "Refusée", className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50" },
    traitee: { label: "Traitée", className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50" },
  };
  const c = config[status] || { label: status, className: "bg-gray-50 text-gray-700" };
  return <Badge variant="outline" className={`capitalize px-2.5 py-0.5 text-xs ${c.className}`}>{c.label}</Badge>;
};

// ---- Page ----
const AttestationDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demande, setDemande] = useState<DemandeAttestation | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // Modals
  const [isRefuseDialogOpen, setIsRefuseDialogOpen] = useState(false);
  const [motifRefus, setMotifRefus] = useState("");
  const [isSignatoryModalOpen, setIsSignatoryModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{ title: string; url: string } | null>(null);

  // Upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Signatory
  const [signataire, setSignataire] = useState("DG");
  const [isGenerating, setIsGenerating] = useState(false);

  // ---- Fetch ----
  const fetchDemande = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/demandes-attestation/${id}/detail/`);
      if (res.data.success) {
        setDemande(res.data.data);
      } else {
        setError(res.data.message || "Erreur inconnue");
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || "Erreur inconnue";
      setError(message);
      toast({ title: "Erreur", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { fetchDemande(); }, [fetchDemande]);

  const refreshData = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiClient.get(`/demandes-attestation/${id}/detail/`);
      if (res.data.success) setDemande(res.data.data);
    } catch {
      toast({ title: "Erreur", description: "Impossible de rafraîchir", variant: "destructive" });
    }
  }, [id, toast]);

  // ---- Formatage ----
  const formatDateFr = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return 'Date invalide'; }
  }, []);

  const formatPeriode = useCallback((debut: string, fin: string) => {
    return `${formatDateFr(debut)} - ${formatDateFr(fin)}`;
  }, [formatDateFr]);

  const calculerDuree = useCallback((debut: string, fin: string) => {
    const d = new Date(debut);
    const f = new Date(fin);
    return Math.ceil(Math.abs(f.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  }, []);

  // ---- Actions ----
  const handleApprouver = useCallback(async () => {
    if (!demande) return;
    setProcessingAction("Approuver");
    try {
      const res = await apiClient.post(`/demandes-attestation/${demande.id}/approuver/`);
      if (res.data.success) {
        toast({ title: "Demande approuvée", description: res.data.message });
        await refreshData();
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.response?.data?.message || "Impossible d'approuver", variant: "destructive" });
    } finally {
      setProcessingAction(null);
    }
  }, [demande, toast, refreshData]);

  const handleRefuser = useCallback(async () => {
    if (!demande || !motifRefus.trim()) return;
    if (motifRefus.trim().length < 10) {
      toast({ title: "Motif trop court", description: "Le motif doit contenir au moins 10 caractères.", variant: "destructive" });
      return;
    }
    setProcessingAction("Refuser");
    try {
      const res = await apiClient.post(`/demandes-attestation/${demande.id}/refuser/`, { motif_refus: motifRefus.trim() });
      if (res.data.success) {
        toast({ title: "Demande refusée", description: res.data.message });
        setIsRefuseDialogOpen(false);
        setMotifRefus("");
        await refreshData();
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.response?.data?.message || "Impossible de refuser", variant: "destructive" });
    } finally {
      setProcessingAction(null);
    }
  }, [demande, motifRefus, toast, refreshData]);

  const handleRegenerarAttestation = useCallback(async () => {
    if (!demande) return;
    setIsGenerating(true);
    try {
      const res = await apiClient.post(`/demandes-attestation/${demande.id}/regenerer-attestation/`, { signataire });
      if (res.data.success) {
        toast({ title: "Attestation générée", description: `Attestation signée par le ${SIGNATAIRES.find(s => s.id === signataire)?.titre}` });
        setIsSignatoryModalOpen(false);
        await refreshData();
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.response?.data?.message || "Impossible de générer", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }, [demande, signataire, toast, refreshData]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        toast({ title: "Format invalide", description: "Seuls les fichiers PDF sont acceptés.", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Fichier trop volumineux", description: "Taille max: 5 Mo.", variant: "destructive" });
        return;
      }
      setUploadFile(file);
    }
  }, [toast]);

  const handleUploadAttestation = useCallback(async () => {
    if (!demande || !uploadFile) return;
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('attestation_signee', uploadFile);
      const res = await apiClient.post(
        `/demandes-attestation/${demande.id}/upload-attestation/`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            const pct = e.total ? Math.round((e.loaded * 100) / e.total) : 0;
            setUploadProgress(pct);
          },
        }
      );
      if (res.data.success) {
        toast({ title: "Attestation signée uploadée", description: res.data.message });
        setIsUploadModalOpen(false);
        setUploadFile(null);
        await refreshData();
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.response?.data?.message || "Impossible d'uploader", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }, [demande, uploadFile, toast, refreshData]);

  const telechargerDocument = useCallback((url: string, nom: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = nom;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // ---- Helpers ----
  const daysSinceRequest = useMemo(() => {
    if (!demande?.date_demande) return 0;
    return Math.floor((new Date().getTime() - new Date(demande.date_demande).getTime()) / (1000 * 3600 * 24));
  }, [demande]);

  const isFonctionnel = useMemo(() => {
    return demande?.stagiaire.type_stage?.toLowerCase() === 'fonctionnel';
  }, [demande]);

  const getActions = useCallback(() => {
    if (!demande) return [];
    const actions: { icon: any; label: string; onClick: () => void; variant: "default" | "outline"; disabled?: boolean }[] = [];

    if (demande.statut === 'en_attente') {
      actions.push({ icon: CheckCircle, label: "Approuver la demande", onClick: handleApprouver, variant: "default" });
      actions.push({ icon: XCircle, label: "Refuser la demande", onClick: () => setIsRefuseDialogOpen(true), variant: "outline" });
    }

    if (demande.statut === 'approuvee') {
      actions.push({ icon: PenLine, label: "Faire signer (choisir signataire)", onClick: () => setIsSignatoryModalOpen(true), variant: "default" });
      if (demande.fichiers?.attestation_generee && !demande.fichiers?.attestation_signee) {
        actions.push({ icon: Upload, label: "Uploader l'attestation signée", onClick: () => setIsUploadModalOpen(true), variant: "outline" });
      }
    }

    return actions;
  }, [demande, handleApprouver]);

  // ---- Loading / Error states ----
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
                  <CardHeader className="pb-3"><Skeleton className="h-6 w-40 mb-2 bg-gray-200" /><Skeleton className="h-4 w-24 bg-gray-200" /></CardHeader>
                  <CardContent className="space-y-4"><Skeleton className="h-4 w-full bg-gray-200" /><Skeleton className="h-4 w-3/4 bg-gray-200" /></CardContent>
                </Card>
              ))}
            </div>
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader><Skeleton className="h-6 w-32 bg-gray-200" /></CardHeader>
                  <CardContent><Skeleton className="h-24 w-full bg-gray-200" /></CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !demande) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 space-y-3 sm:space-y-4 md:space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 text-gray-700"><ArrowLeft className="h-4 w-4" /></Button>
            <h1 className="text-xl font-bold text-gray-900">Détails de la demande d'attestation</h1>
          </div>
          <Card>
            <CardContent className="pt-6 text-center py-10">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="font-medium text-lg mb-2 text-gray-900">{error ? "Erreur de chargement" : "Demande non trouvée"}</h3>
              <p className="text-sm text-gray-600 mb-4">{error || "La demande que vous recherchez n'existe pas."}</p>
              <Button onClick={() => window.location.reload()} className="bg-gray-900 hover:bg-gray-800 text-white">Réessayer</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const actions = getActions();
  const stagiaire = demande.stagiaire;

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
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Demande d'attestation</h1>
                <p className="text-sm text-gray-600">
                  Demande #{demande.id} {daysSinceRequest === 0 ? "Soumise aujourd'hui" : `Soumise il y a ${daysSinceRequest} jour(s)`}
                </p>
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={() => refreshData()} title="Rafraîchir" className="text-gray-700 hover:bg-gray-100 hover:border-gray-300">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Barre statut */}
          <Card className="overflow-hidden">
            <CardContent className="p-4 sm:p-6 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100 text-gray-600"><FileText className="h-5 w-5" /></div>
                  <div>
                    <p className="font-medium text-sm text-gray-700">Statut actuel</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={demande.statut} />
                      <span className="text-xs text-gray-600">Demandée le {formatDateFr(demande.date_demande)}</span>
                    </div>
                  </div>
                </div>
                {demande.date_traitement && (
                  <div className="text-xs text-gray-600">
                    Traitée le {formatDateFr(demande.date_traitement)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 sm:gap-4 md:gap-6 md:grid-cols-3">
          {/* COLONNE GAUCHE */}
          <div className="md:col-span-2 space-y-3 sm:space-y-4 md:space-y-6">

            {/* Informations du stage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-gray-900">
                  <Briefcase className="h-5 w-5" />Informations du stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-red-100 text-red-600 mt-0.5"><User className="h-4 w-4" /></div>
                      <div><p className="text-xs text-gray-600">Stagiaire</p><p className="font-medium text-gray-900">{stagiaire.nom} {stagiaire.prenom}</p></div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-red-100 text-red-600 mt-0.5"><Briefcase className="h-4 w-4" /></div>
                      <div><p className="text-xs text-gray-600">Type de stage</p><p className="font-medium text-gray-900">{stagiaire.type_stage || "Non spécifié"}</p></div>
                    </div>
                    {stagiaire.specialite && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-red-100 text-red-600 mt-0.5"><Award className="h-4 w-4" /></div>
                        <div><p className="text-xs text-gray-600">Spécialité</p><p className="font-medium text-gray-900">{stagiaire.specialite}</p></div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-red-100 text-red-600 mt-0.5"><Calendar className="h-4 w-4" /></div>
                      <div>
                        <p className="text-xs text-gray-600">Période de stage</p>
                        <p className="font-medium text-gray-900">{formatPeriode(stagiaire.date_debut, stagiaire.date_fin)}</p>
                        <p className="text-xs text-gray-500">{calculerDuree(stagiaire.date_debut, stagiaire.date_fin)} jours</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-red-100 text-red-600 mt-0.5"><MapPin className="h-4 w-4" /></div>
                      <div>
                        <p className="text-xs text-gray-600">Direction / Service</p>
                        <p className="font-medium text-gray-900">{stagiaire.direction || "—"} / {stagiaire.service || "—"}</p>
                      </div>
                    </div>
                    {stagiaire.superviseur && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-red-100 text-red-600 mt-0.5"><User className="h-4 w-4" /></div>
                        <div><p className="text-xs text-gray-600">Superviseur</p><p className="font-medium text-gray-900">{stagiaire.superviseur}</p></div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Motif de refus */}
            {demande.statut === 'refusee' && demande.motif_refus && (
              <Card className="border-red-100 bg-white shadow-sm">
                <CardHeader className="border-b border-red-100 bg-red-50/30">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-gray-900">
                    <XCircle className="h-5 w-5 text-red-600" />Motif du refus
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-800 leading-relaxed">{demande.motif_refus}</p>
                  </div>
                  {demande.date_traitement && (
                    <div className="flex items-start gap-2 pt-2 mt-3 border-t border-gray-100">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                      <p className="text-xs text-gray-600">Refusée le {formatDateFr(demande.date_traitement)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-gray-900">
                  <FileText className="h-5 w-5" />Documents
                </CardTitle>
                <CardDescription className="text-gray-600">Documents fournis et générés</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Demande manuscrite */}
                  {demande.fichiers?.demande_manuscrite && (
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-red-100"><FileText className="h-4 w-4 text-red-600" /></div>
                        <div><p className="font-medium text-sm text-gray-900">Demande manuscrite</p><p className="text-xs text-gray-600">Document PDF</p></div>
                      </div>
                      <div className="flex gap-2 self-end sm:self-center">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedDocument({ title: "Demande manuscrite", url: demande.fichiers.demande_manuscrite! })} className="h-8 gap-1 hover:bg-gray-100 text-gray-700">
                          <Eye className="h-3.5 w-3.5" /><span className="hidden sm:inline">Voir</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => telechargerDocument(demande.fichiers.demande_manuscrite!, `demande_manuscrite_${stagiaire.nom}.pdf`)} className="h-8 gap-1 text-gray-700 hover:bg-gray-100 hover:border-gray-300">
                          <Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Télécharger</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Rapport de stage - masqué pour stages fonctionnels */}
                  {!isFonctionnel && demande.fichiers?.rapport_stage && (
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-red-100"><FileText className="h-4 w-4 text-red-600" /></div>
                        <div><p className="font-medium text-sm text-gray-900">Rapport de stage</p><p className="text-xs text-gray-600">Document PDF</p></div>
                      </div>
                      <div className="flex gap-2 self-end sm:self-center">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedDocument({ title: "Rapport de stage", url: demande.fichiers.rapport_stage! })} className="h-8 gap-1 hover:bg-gray-100 text-gray-700">
                          <Eye className="h-3.5 w-3.5" /><span className="hidden sm:inline">Voir</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => telechargerDocument(demande.fichiers.rapport_stage!, `rapport_stage_${stagiaire.nom}.pdf`)} className="h-8 gap-1 text-gray-700 hover:bg-gray-100 hover:border-gray-300">
                          <Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Télécharger</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Attestation générée */}
                  {demande.fichiers?.attestation_generee && (
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors border-green-200 bg-green-50/30">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-green-100"><FileText className="h-4 w-4 text-green-600" /></div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">Attestation générée</p>
                          <p className="text-xs text-green-600">PDF prêt pour signature</p>
                        </div>
                      </div>
                      <div className="flex gap-2 self-end sm:self-center">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedDocument({ title: "Attestation générée", url: demande.fichiers.attestation_generee! })} className="h-8 gap-1 hover:bg-gray-100 text-gray-700">
                          <Eye className="h-3.5 w-3.5" /><span className="hidden sm:inline">Voir</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => telechargerDocument(demande.fichiers.attestation_generee!, `attestation_generee_${stagiaire.nom}.pdf`)} className="h-8 gap-1 text-gray-700 hover:bg-gray-100 hover:border-gray-300">
                          <Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Télécharger</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Attestation signée */}
                  {demande.fichiers?.attestation_signee && (
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors border-blue-200 bg-blue-50/30">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-blue-100"><CheckCircle className="h-4 w-4 text-blue-600" /></div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">Attestation signée</p>
                          <p className="text-xs text-blue-600">
                            Document final
                            {demande.date_upload_attestation_signee && ` - Uploadée le ${formatDateFr(demande.date_upload_attestation_signee)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 self-end sm:self-center">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedDocument({ title: "Attestation signée", url: demande.fichiers.attestation_signee! })} className="h-8 gap-1 hover:bg-gray-100 text-gray-700">
                          <Eye className="h-3.5 w-3.5" /><span className="hidden sm:inline">Voir</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => telechargerDocument(demande.fichiers.attestation_signee!, `attestation_signee_${stagiaire.nom}.pdf`)} className="h-8 gap-1 text-gray-700 hover:bg-gray-100 hover:border-gray-300">
                          <Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Télécharger</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Message si pas de documents */}
                  {!demande.fichiers?.demande_manuscrite && !demande.fichiers?.rapport_stage && !demande.fichiers?.attestation_generee && !demande.fichiers?.attestation_signee && (
                    <div className="text-center py-4 sm:py-6 md:py-8 border rounded-lg bg-gray-50">
                      <FileText className="h-10 w-10 mx-auto text-red-400 mb-3" />
                      <p className="text-sm text-gray-600">Aucun document disponible</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* COLONNE DROITE */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6">

            {/* Stagiaire */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-gray-900">
                  <User className="h-5 w-5" />Stagiaire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center text-center mb-4">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={stagiaire.photo_passeport || undefined} className="object-cover" />
                    <AvatarFallback className="text-xl font-bold bg-red-100 text-red-700">
                      {(stagiaire.prenom?.[0] || "")}{(stagiaire.nom?.[0] || "")}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-lg text-gray-900">{stagiaire.nom} {stagiaire.prenom}</h3>
                  <p className="text-sm text-gray-600">{stagiaire.direction} / {stagiaire.service}</p>
                  {stagiaire.type_stage && (
                    <Badge variant="outline" className="mt-2 gap-1 text-xs bg-gray-100 text-gray-700">
                      <Briefcase className="h-3 w-3" />{stagiaire.type_stage}
                    </Badge>
                  )}
                </div>
                <div className="w-full space-y-3">
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                    <Mail className="h-4 w-4 text-gray-600 flex-shrink-0" />
                    <a href={`mailto:${stagiaire.email}`} className="text-sm hover:underline truncate text-gray-800">{stagiaire.email}</a>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                    <Phone className="h-4 w-4 text-gray-600 flex-shrink-0" />
                    <a href={`tel:${stagiaire.telephone}`} className="text-sm hover:underline truncate text-gray-800">{stagiaire.telephone}</a>
                  </div>
                  {stagiaire.lieu_stage && (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <MapPin className="h-4 w-4 text-gray-600 flex-shrink-0" />
                      <p className="text-sm text-gray-800">{stagiaire.lieu_stage}</p>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-gray-700 hover:bg-gray-100 hover:border-gray-300"
                    onClick={() => navigate(`/stagiaires/${stagiaire.id}`)}
                  >
                    <User className="h-4 w-4" />Voir le profil complet
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Établissement */}
            {stagiaire.etablissement && stagiaire.etablissement.nom && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-gray-900">
                    <div className="p-2 rounded-lg bg-red-100 text-red-600"><Award className="h-4 w-4" /></div>
                    Établissement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="pb-2 border-b">
                      <h4 className="font-medium text-sm text-gray-900">{stagiaire.etablissement.nom}</h4>
                    </div>
                    {stagiaire.etablissement.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3.5 w-3.5 text-gray-600" />
                        <a href={`mailto:${stagiaire.etablissement.email}`} className="hover:underline truncate text-gray-800">{stagiaire.etablissement.email}</a>
                      </div>
                    )}
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
                  <CardDescription className="text-gray-600">Gérer cette demande d'attestation</CardDescription>
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

        {/* ---- MODALS ---- */}

        {/* Modal de visualisation de document */}
        <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
          <DialogContent className="max-w-5xl max-h-[90dvh] p-0 sm:rounded-lg">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between gap-2 p-3 md:p-4 lg:p-6 border-b bg-gray-50/30">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 md:h-5 md:w-5 text-gray-600 flex-shrink-0" />
                  <DialogTitle className="text-gray-900 m-0 truncate text-sm md:text-base lg:text-lg">
                    {selectedDocument?.title} - {stagiaire.nom} {stagiaire.prenom}
                  </DialogTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDocument(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 p-3 md:p-4 lg:p-6 overflow-auto">
                {selectedDocument?.url ? (
                  <div className="border rounded-lg overflow-hidden bg-white min-h-[300px] md:min-h-[400px] lg:min-h-[500px]">
                    <iframe src={selectedDocument.url} className="w-full h-full min-h-[300px] md:min-h-[400px] lg:min-h-[500px]" title={selectedDocument.title} style={{ border: 'none' }} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600">Document non disponible</p>
                  </div>
                )}
              </div>
              <div className="p-3 md:p-4 lg:p-6 border-t bg-gray-50/30">
                <div className="flex justify-end gap-2">
                  {selectedDocument?.url && (
                    <Button variant="outline" size="sm" onClick={() => telechargerDocument(selectedDocument.url, `${selectedDocument.title}_${stagiaire.nom}.pdf`)} className="text-gray-700 hover:bg-gray-50">
                      <Download className="h-4 w-4 mr-2" />Télécharger
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setSelectedDocument(null)} className="text-gray-700 hover:bg-gray-50">Fermer</Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de refus */}
        <Dialog open={isRefuseDialogOpen} onOpenChange={setIsRefuseDialogOpen}>
          <DialogContent className="max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-900">
                <XCircle className="h-5 w-5 text-red-500" />
                Refuser la demande d'attestation
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Veuillez indiquer le motif du refus pour {stagiaire.nom} {stagiaire.prenom}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="motif-refus" className="text-gray-900">Motif du refus <span className="text-red-500">*</span></Label>
                <Textarea
                  id="motif-refus"
                  placeholder="Ex: Le rapport de stage ne respecte pas les critères exigés..."
                  value={motifRefus}
                  onChange={(e) => setMotifRefus(e.target.value)}
                  className="min-h-[120px] resize-y text-gray-900"
                  disabled={processingAction === "Refuser"}
                />
                <p className="text-xs text-gray-600">Minimum 10 caractères. Ce motif sera visible par le stagiaire.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-900">Suggestions</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {[
                    "Rapport de stage incomplet ou non conforme",
                    "Absence de demande manuscrite signée",
                    "Période de stage non validée par le tuteur",
                    "Documents manquants ou illisibles",
                  ].map((m, i) => (
                    <Button key={i} type="button" variant="outline" size="sm"
                      className="justify-start h-auto py-2 px-3 text-xs text-gray-700 hover:bg-gray-50 text-left"
                      onClick={() => setMotifRefus(prev => prev ? `${prev} ${m}` : m)}
                      disabled={processingAction === "Refuser"}
                    >{m}</Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsRefuseDialogOpen(false)} disabled={processingAction === "Refuser"} className="text-gray-700 hover:bg-gray-50">Annuler</Button>
              <Button variant="destructive" onClick={handleRefuser} disabled={processingAction === "Refuser" || !motifRefus.trim() || motifRefus.trim().length < 10}>
                {processingAction === "Refuser" ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Traitement...</> : <><XCircle className="h-4 w-4 mr-2" />Confirmer le refus</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal choix signataire */}
        <Dialog open={isSignatoryModalOpen} onOpenChange={setIsSignatoryModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-900">
                <PenLine className="h-5 w-5" />
                Choisir le signataire
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Sélectionnez le signataire de l'attestation de stage.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <RadioGroup value={signataire} onValueChange={setSignataire} className="space-y-3">
                {SIGNATAIRES.map((s) => (
                  <label
                    key={s.id}
                    htmlFor={`sig-${s.id}`}
                    className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      signataire === s.id ? "border-primary bg-primary/5" : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <RadioGroupItem value={s.id} id={`sig-${s.id}`} className="mt-0.5" />
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-gray-100"><User className="h-4 w-4 text-gray-600" /></div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{s.titre}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.nom}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsSignatoryModalOpen(false)} disabled={isGenerating} className="text-gray-700 hover:bg-gray-100">Annuler</Button>
              <Button onClick={handleRegenerarAttestation} disabled={isGenerating} className="bg-primary hover:bg-primary/80 text-white gap-2">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                Générer l'attestation
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal upload attestation signée */}
        <Dialog open={isUploadModalOpen} onOpenChange={(open) => { if (!open) { setUploadFile(null); } setIsUploadModalOpen(open); }}>
          <DialogContent className="max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-900">
                <Upload className="h-5 w-5 text-gray-600" />
                Uploader l'attestation signée
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Uploadez l'attestation signée pour {stagiaire.nom} {stagiaire.prenom}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {demande.fichiers?.attestation_generee && (
                <Card className="border-blue-200 bg-blue-50/30">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 mb-1">Attestation générée disponible</p>
                        <p className="text-xs text-blue-700">Téléchargez-la, faites-la signer, puis uploadez la version signée.</p>
                        <Button variant="outline" size="sm" className="mt-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={() => telechargerDocument(demande.fichiers.attestation_generee!, `attestation_${stagiaire.nom}.pdf`)}
                        >
                          <Download className="h-3 w-3 mr-2" />Télécharger l'attestation à signer
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="space-y-2">
                <Label htmlFor="attestation-file" className="text-gray-900">Sélectionner l'attestation signée <span className="text-red-500">*</span></Label>
                <Input id="attestation-file" type="file" accept=".pdf" onChange={handleFileSelect} disabled={isUploading} />
                <p className="text-xs text-gray-600">Format: PDF uniquement. Taille max: 5 Mo</p>
              </div>
              {uploadFile && (
                <Card className="bg-gray-50/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-gray-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{uploadFile.name}</p>
                        <p className="text-xs text-gray-600">{(uploadFile.size / 1024).toFixed(2)} Ko</p>
                      </div>
                      {!isUploading && (
                        <Button variant="ghost" size="sm" onClick={() => setUploadFile(null)}><X className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Upload en cours...</span>
                    <span className="text-gray-900 font-medium">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-primary h-2.5 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
              <Card className="border-yellow-200 bg-yellow-50/30">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-800">
                      Une fois uploadée, l'attestation signée sera automatiquement envoyée au stagiaire par email. Le statut passera à "Traitée".
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setIsUploadModalOpen(false); setUploadFile(null); }} disabled={isUploading} className="text-gray-700 hover:bg-gray-50">Annuler</Button>
              <Button onClick={handleUploadAttestation} disabled={!uploadFile || isUploading} className="bg-primary hover:bg-primary/80 text-white gap-2">
                {isUploading ? <><Loader2 className="h-4 w-4 animate-spin" />Upload en cours...</> : <><Upload className="h-4 w-4" />Uploader et envoyer</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
};

export default AttestationDetailsPage;

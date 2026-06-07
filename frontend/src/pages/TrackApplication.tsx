import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Search, Clock, CheckCircle, XCircle, AlertTriangle, Calendar, User, Mail, Phone, FileText, Coins, Edit, Save, X, GraduationCap, Image, Download, Eye, BookOpen, File, Upload, XIcon, Plus, Building, MapPin, Briefcase, Users, DollarSign, CalendarDays, Clock as ClockIcon, FileCheck, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import apiClient from "@/lib/apiClient";

interface ApplicationStatus {
  tracking_id: string;
  statut_stage: "En attente" | "En cours de traitement" | "Acceptée" | "Refusée" | "Pré-acceptée";
  date_soumission: string;
  date_maj: string;
  stagiaire: {
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    adresse?: string;
    specialite?: string;
    niveau?: string;
    genre?: string;
    pays_residence?: string;
  };
  type_stage: string;
  etablissement?: {
    nom: string;
    email?: string;
    adresse?: string;
    telephone?: string;
  };
  prochaines_etapes?: string;
  infos_supplementaires?: string;
  date_examen?: string;
  motif_refus?: string;
  documents?: Array<{
    nom: string;
    url: string;
    type?: string;
    id?: string;
  }>;
  
  photo_passeport?: string;
  
  stage?: {
    id: number;
    nom: string;
    prenom: string;
    email?: string;
    telephone?: string;
    niveau_etude?: string;
    specialite?: string;
    genre?: string;
    type_stage: string;
    remunere: boolean;
    montant_remuneration?: number;
    direction?: string;
    service?: string;
    lieu_stage?: string;
    date_accord?: string;
    date_debut: string;
    date_fin: string;
    statut_actuel: string;
    duree_jours?: number;
    duree_mois?: number;
    jours_restants?: number;
    superviseur?: string;
    a_ete_renouvele?: boolean;
    stage_renouvele_id?: string;
    convention?: {
      numero_convention: string;
      date_creation?: string;
      fichier_url?: string;
      est_temporaire?: boolean;
    };
    attestation?: {
      date_generation?: string;
      fichier_url?: string;
    };
    documents?: Array<{
      nom: string;
      type: string;
      url: string;
    }>;
    etablissement?: {
      nom?: string;
      email?: string;
      adresse?: string;
      telephone?: string;
    };
    demande_attestation?: {
      id?: number;
      date_demande: string;
      fichier_url?: string;
      fichiers?: {
        rapport_stage?: string;
        demande_manuscrite?: string;
        attestation_signee?: string;
        attestation_generee?: string;
        [key: string]: string | undefined;
      };
      statut: 'en_attente' | 'refusee' | 'approuvee' | 'traitee';
      motif_refus?: string;
      peut_retenter?: boolean;
      date_refus?: string;
    };
  };
  statut_detaille?: string;
}

interface DocumentFile {
  file: File;
  type: string;
  nom: string;
  replacesExisting?: boolean;
  replacesId?: string;
}

const TrackApplication = () => {
  const [trackingCode, setTrackingCode] = useState("");
  const [application, setApplication] = useState<ApplicationStatus | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{ nom: string; url: string; type?: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [newDocuments, setNewDocuments] = useState<DocumentFile[]>([]);
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [documentsToDelete, setDocumentsToDelete] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const diplomeInputRef = useRef<HTMLInputElement>(null);
  
  const [rapportStage, setRapportStage] = useState<File | null>(null);
  const [demandeManuscrite, setDemandeManuscrite] = useState<File | null>(null);
  const [isSubmittingAttestation, setIsSubmittingAttestation] = useState(false);
  const [isSubmittingNewRequest, setIsSubmittingNewRequest] = useState(false);
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  
  const rapportInputRef = useRef<HTMLInputElement>(null);
  const demandeInputRef = useRef<HTMLInputElement>(null);
  
  // États pour les modals
  const [isAttestationModalOpen, setIsAttestationModalOpen] = useState(false);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);

  const { toast } = useToast();

  const getStatusForDisplay = (status: ApplicationStatus["statut_stage"]): string => {
    if (status === "Pré-acceptée") {
      return "En cours de traitement";
    }
    return status;
  };

  const handleSearch = async () => {
    if (!trackingCode.trim()) {
      toast({
        title: "Code requis",
        description: "Veuillez saisir votre code de suivi",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setNotFound(false);
    setApplication(null);
    setIsEditing(false);
    setNewDocuments([]);
    setNewPhoto(null);
    setDocumentsToDelete([]);
    setRapportStage(null);
    setDemandeManuscrite(null);
    setShowNewRequestForm(false);
    setIsSubmittingNewRequest(false);
    setIsAttestationModalOpen(false);
    setIsStageModalOpen(false);

    try {
      const cleanTrackingCode = trackingCode.trim().toUpperCase();
      
      const response = await apiClient.get(`suivi-demande/${cleanTrackingCode}/`);
      const data = response.data;

      if (data.success && data.demande) {
        console.log("📊 Données reçues:", data.demande);
        console.log("📊 Détails demande_attestation:", data.demande.stage?.demande_attestation);
        setApplication(data.demande);
        setNotFound(false);
        toast({
          title: "Demande trouvée",
          description: `Demande de ${data.demande.stagiaire.prenom} ${data.demande.stagiaire.nom}`,
        });
      } else {
        setApplication(null);
        setNotFound(true);
        toast({
          title: "Demande non trouvée",
          description: "Aucune demande correspondante n'a été trouvée",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Erreur lors de la recherche:", error);
      
      if (error.response?.status === 404) {
        setApplication(null);
        setNotFound(true);
        toast({
          title: "Demande non trouvée",
          description: "Aucune demande ne correspond à ce code de suivi",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: error.response?.data?.message || "Une erreur est survenue lors de la recherche",
          variant: "destructive",
        });
        setApplication(null);
        setNotFound(true);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewDocuments([]);
    setNewPhoto(null);
    setDocumentsToDelete([]);
  };

  const handleSave = async () => {
    if (!application?.tracking_id) return;

    if (newDocuments.length === 0 && !newPhoto && documentsToDelete.length === 0) {
      toast({
        title: "Aucune modification",
        description: "Vous n'avez apporté aucune modification aux documents",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      
      newDocuments.forEach((doc, index) => {
        formData.append(`documents`, doc.file);
        formData.append(`document_types`, doc.type);
        if (doc.replacesExisting) {
          formData.append(`replaces_existing`, 'true');
          if (doc.replacesId) {
            formData.append(`replaces_id`, doc.replacesId);
          }
        } else {
          formData.append(`replaces_existing`, 'false');
        }
      });

      if (newPhoto) {
        formData.append('photo_passeport', newPhoto);
      }

      if (documentsToDelete.length > 0) {
        formData.append('documents_to_delete', JSON.stringify(documentsToDelete));
      }

      const response = await apiClient.put(
        `suivi-demande/${application.tracking_id}/modifier/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        setApplication(response.data.demande);
        setIsEditing(false);
        setNewDocuments([]);
        setNewPhoto(null);
        setDocumentsToDelete([]);
        toast({
          title: "Documents mis à jour",
          description: "Vos documents ont été modifiés avec succès",
          variant: "default",
        });
      } else {
        throw new Error(response.data.message || "Erreur lors de la sauvegarde");
      }
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde:", error);
      
      let errorMessage = "Une erreur est survenue lors de la sauvegarde";
      
      if (error.response?.status === 413) {
        errorMessage = "Fichier trop volumineux. Veuillez réduire la taille de vos documents.";
      } else if (error.response?.status === 415) {
        errorMessage = "Format de fichier non supporté. Utilisez PDF, JPG ou PNG.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewDocument = (doc: { nom: string; url: string; type?: string }) => {
    setSelectedDocument(doc);
    setIsModalOpen(true);
  };

  const handleViewPhoto = (photoUrl: string) => {
    setSelectedPhoto(photoUrl);
    setIsPhotoModalOpen(true);
  };

  const handleReplaceDocument = (docType: string, docId?: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
    
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      const file = files[0];
      const newDoc: DocumentFile = {
        file,
        type: docType,
        nom: file.name,
        replacesExisting: true,
        replacesId: docId
      };

      setNewDocuments(prev => [...prev, newDoc]);
    };

    input.click();
  };

  const handleAddDiplome = () => {
    if (diplomeInputRef.current) {
      diplomeInputRef.current.click();
    }
  };

  const handleSubmitAttestation = async () => {
    if (!rapportStage || !demandeManuscrite || !application?.tracking_id) {
      toast({
        title: "Champs requis",
        description: "Veuillez sélectionner le rapport de stage ET la demande manuscrite",
        variant: "destructive",
      });
      return;
    }

    if (!rapportStage.name.toLowerCase().endsWith('.pdf')) {
      toast({
        title: "Format invalide",
        description: "Le rapport de stage doit être au format PDF",
        variant: "destructive",
      });
      return;
    }

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const demandeExt = demandeManuscrite.name.toLowerCase().split('.').pop();
    if (!allowedExtensions.includes(`.${demandeExt}`)) {
      toast({
        title: "Format invalide",
        description: "La demande manuscrite doit être en PDF, JPG ou PNG",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("rapport_stage", rapportStage);
    formData.append("demande_manuscrite", demandeManuscrite);
    formData.append("is_new_attempt", "true");

    setIsSubmittingAttestation(true);

    try {
      console.log("🚀 Envoi de la demande d'attestation...");
      console.log("📁 Fichiers:", {
        rapport: rapportStage.name,
        demande: demandeManuscrite.name,
        trackingId: application.tracking_id
      });

      const response = await apiClient.post(
        `suivi-demande/${application.tracking_id}/demande-attestation/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000,
        }
      );

      console.log("✅ Réponse reçue:", response.data);

      toast({
        title: "Succès !",
        description: response.data.message || "Demande d'attestation envoyée avec succès",
      });

      setRapportStage(null);
      setDemandeManuscrite(null);
      
      setTimeout(() => {
        handleSearch();
      }, 2000);

    } catch (error) {
      console.error("❌ Erreur lors de l'envoi:", error);
      
      let errorMessage = "Une erreur est survenue lors de l'envoi";
      
      if (error.response) {
        console.error("📊 Détails de l'erreur:", error.response.data);
        
        if (error.response.status === 413) {
          errorMessage = "Fichier trop volumineux. Taille maximum: 10MB";
        } else if (error.response.status === 415) {
          errorMessage = "Format de fichier non supporté";
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data?.errors) {
          errorMessage = "Erreur de validation: " + JSON.stringify(error.response.data.errors);
        }
      } else if (error.request) {
        console.error("🌐 Pas de réponse du serveur");
        errorMessage = "Impossible de contacter le serveur. Vérifiez votre connexion.";
      } else {
        console.error("⚙️ Erreur de configuration:", error.message);
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingAttestation(false);
    }
  };

  const handleSubmitNewAttestationRequest = async () => {
    if (!rapportStage || !demandeManuscrite || !application?.tracking_id) {
      toast({
        title: "Champs requis",
        description: "Veuillez sélectionner le rapport de stage ET la demande manuscrite",
        variant: "destructive",
      });
      return;
    }

    if (!rapportStage.name.toLowerCase().endsWith('.pdf')) {
      toast({
        title: "Format invalide",
        description: "Le rapport de stage doit être au format PDF",
        variant: "destructive",
      });
      return;
    }

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const demandeExt = demandeManuscrite.name.toLowerCase().split('.').pop();
    if (!allowedExtensions.includes(`.${demandeExt}`)) {
      toast({
        title: "Format invalide",
        description: "La demande manuscrite doit être en PDF, JPG ou PNG",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("rapport_stage", rapportStage);
    formData.append("demande_manuscrite", demandeManuscrite);
    formData.append("is_new_attempt", "true");

    setIsSubmittingNewRequest(true);

    try {
      console.log("🚀 Envoi d'une nouvelle demande d'attestation...");
      
      const response = await apiClient.post(
        `suivi-demande/${application.tracking_id}/demande-attestation/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000,
        }
      );

      console.log("✅ Réponse reçue:", response.data);

      toast({
        title: "Succès !",
        description: response.data.message || "Nouvelle demande d'attestation envoyée avec succès",
      });

      setRapportStage(null);
      setDemandeManuscrite(null);
      setShowNewRequestForm(false);
      
      setTimeout(() => {
        handleSearch();
      }, 2000);

    } catch (error: any) {
      console.error("❌ Erreur lors de l'envoi:", error);
      
      let errorMessage = "Une erreur est survenue lors de l'envoi";
      
      if (error.response) {
        if (error.response.status === 413) {
          errorMessage = "Fichier trop volumineux. Taille maximum: 10MB";
        } else if (error.response.status === 415) {
          errorMessage = "Format de fichier non supporté";
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = "Impossible de contacter le serveur. Vérifiez votre connexion.";
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingNewRequest(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, documentType?: string, replacesExisting: boolean = false) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: DocumentFile[] = [];
    
    Array.from(files).forEach(file => {
      const detectedType = documentType || getFileTypeFromName(file.name);
      newFiles.push({
        file,
        type: detectedType,
        nom: file.name,
        replacesExisting: replacesExisting
      });
    });

    setNewDocuments(prev => [...prev, ...newFiles]);
    
    if (event.target) {
      event.target.value = '';
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner une image (JPG, PNG, JPEG)",
        variant: "destructive",
      });
      return;
    }

    setNewPhoto(file);
    
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const removeNewDocument = (index: number) => {
    setNewDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewPhoto = () => {
    setNewPhoto(null);
  };

  const removeExistingDocument = (docId: string) => {
    const doc = application?.documents?.find(d => d.id === docId);
    if (doc?.type === 'diplome') {
      setDocumentsToDelete(prev => [...prev, docId]);
    } else {
      toast({
        title: "Action non autorisée",
        description: "Vous ne pouvez supprimer que les diplômes. Pour les autres documents, utilisez 'Remplacer'.",
        variant: "destructive",
      });
    }
  };

  const getFileTypeFromName = (fileName: string): string => {
    if (fileName.toLowerCase().includes('cv') || fileName.toLowerCase().includes('curriculum')) return 'cv';
    if (fileName.toLowerCase().includes('lettre') || fileName.toLowerCase().includes('motivation')) return 'lettre_motivation';
    if (fileName.toLowerCase().includes('diplome') || fileName.toLowerCase().includes('attestation')) return 'diplome';
    if (fileName.toLowerCase().includes('convention')) return 'convention';
    if (fileName.toLowerCase().includes('rapport')) return 'rapport';
    if (fileName.toLowerCase().includes('attestation')) return 'attestation';
    if (fileName.toLowerCase().includes('demande')) return 'demande_attestation';
    return 'autre';
  };

  const getStatusIcon = (status: ApplicationStatus["statut_stage"]) => {
    const displayedStatus = getStatusForDisplay(status);
    switch (displayedStatus) {
      case "En attente":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "En cours de traitement":
        return <AlertTriangle className="h-5 w-5 text-blue-500" />;
      case "Acceptée":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "Refusée":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: ApplicationStatus["statut_stage"]) => {
    const displayedStatus = getStatusForDisplay(status);
    switch (displayedStatus) {
      case "En attente":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100";
      case "En cours de traitement":
        return "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100";
      case "Acceptée":
        return "bg-green-100 text-green-800  hover:bg-green-100";
      case "Refusée":
        return "bg-red-100 text-red-800 border-red-200 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100";
    }
  };

  const getStageStatusVariant = (status: string) => {
    switch (status) {
      case "Actuel":
        return "default";
      case "Terminé":
        return "secondary";
      case "À venir":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStageStatusColor = (status: string) => {
    switch (status) {
      case "Actuel":
        return "bg-green-100 text-green-800 ";
      case "Terminé":
        return "bg-red-100 text-red-800 border-red-200";
      case "À venir":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const renderNonEditableField = (
    label: string,
    value: string,
    placeholder: string = "Non renseigné"
  ) => {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {label}
        </Label>
        <div className="text-sm p-2 bg-muted rounded-md min-h-[40px] flex items-center">
          {value || <span className="text-muted-foreground">{placeholder}</span>}
        </div>
      </div>
    );
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

  const getDocumentIcon = (documentType: string) => {
    switch (documentType) {
      case 'cv':
        return <FileText className="h-6 w-6 text-blue-500" />;
      case 'lettre_motivation':
        return <FileText className="h-6 w-6 text-green-500" />;
      case 'diplome':
        return <GraduationCap className="h-6 w-6 text-purple-500" />;
      case 'convention':
        return <FileText className="h-6 w-6 text-orange-500" />;
      case 'rapport':
        return <BookOpen className="h-6 w-6 text-red-500" />;
      case 'attestation':
        return <Award className="h-6 w-6 text-teal-500" />;
      case 'demande_attestation':
        return <Award className="h-6 w-6 text-yellow-500" />;
      default:
        return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  const getDocumentBadgeColor = (documentType: string) => {
    switch (documentType) {
      case 'cv': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'lettre_motivation': return 'bg-green-100 text-green-800 ';
      case 'diplome': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'rapport': return 'bg-red-100 text-red-800 border-red-200';
      case 'demande_attestation': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFileExtension = (url: string) => {
    return url.split('.').pop()?.toUpperCase() || 'PDF';
  };

  const isImageFile = (url: string) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const ext = url.split('.').pop()?.toLowerCase();
    return imageExtensions.includes(ext || '');
  };

  const isPdfFile = (url: string) => {
    return url.toLowerCase().endsWith('.pdf');
  };

  const isDocumentBeingReplaced = (docType: string, docId?: string) => {
    return newDocuments.some(doc => 
      doc.type === docType && 
      doc.replacesExisting && 
      (!docId || doc.replacesId === docId)
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Non définie";
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  const DocumentCard = ({ 
    doc, 
    index,
    isExisting = true
  }: { 
    doc: { nom: string; url: string; type?: string; id?: string }; 
    index: number;
    isExisting?: boolean;
  }) => {
    const isMarkedForDeletion = isExisting && doc.id && documentsToDelete.includes(doc.id);
    const isBeingReplaced = isExisting && doc.type && isDocumentBeingReplaced(doc.type, doc.id);
    
    return (
      <Card className={`border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer group ${
        isMarkedForDeletion ? 'opacity-50 bg-red-50' : ''
      } ${isBeingReplaced ? 'opacity-50 bg-yellow-50' : ''}`}>
        <CardContent className="p-4 sm:p-6" onClick={() => !isMarkedForDeletion && !isBeingReplaced && handleViewDocument(doc)}>
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              {isImageFile(doc.url) ? (
                <Image className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
              ) : isPdfFile(doc.url) ? (
                <FileText className="h-4 w-4 sm:h-6 sm:w-6 text-red-500" />
              ) : (
                <File className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
              )}
            </div>

            <div>
              <h3 className="font-medium mb-1 sm:mb-2 text-xs sm:text-sm line-clamp-2">
                {doc.nom}
                {isBeingReplaced && <Badge variant="secondary" className="ml-1 sm:ml-2 bg-yellow-500 text-white text-xs">Remp.</Badge>}
              </h3>
              <p className="text-xs text-muted-foreground mb-3 sm:mb-4">
                {getFileExtension(doc.url)} • {doc.type ? doc.type.replace('_', ' ') : 'Document'}
                {isMarkedForDeletion && <span className="text-red-500 ml-1 sm:ml-2">(Suppr.)</span>}
              </p>
            </div>

            <div className="flex gap-1 sm:gap-2 justify-center flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="text-xs sm:text-sm flex-1 min-w-[70px] sm:min-w-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDocument(doc);
                }}
                disabled={isMarkedForDeletion || isBeingReplaced}
              >
                <Eye className="h-3 w-3 mr-1" />
                <span className="hidden xs:inline">Voir</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs sm:text-sm flex-1 min-w-[70px] sm:min-w-0"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(doc.url, '_blank');
                }}
                disabled={isMarkedForDeletion || isBeingReplaced}
              >
                <Download className="h-3 w-3 mr-1" />
                <span className="hidden xs:inline">Téléc.</span>
              </Button>
              {isEditing && isExisting && doc.id && (
                <>
                  {doc.type !== 'diplome' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs sm:text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReplaceDocument(doc.type!, doc.id);
                      }}
                      disabled={isBeingReplaced}
                    >
                      <Upload className="h-3 w-3" />
                      <span className="hidden sm:inline ml-1">Rempl.</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="text-xs sm:text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeExistingDocument(doc.id!);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </>
              )}
              {isEditing && !isExisting && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="text-xs sm:text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNewDocument(index);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const FileUploadCard = ({ 
    title, 
    required = false,
    accept,
    file,
    onFileSelect,
    onFileRemove,
    inputRef,
    description
  }: { 
    title: string;
    required?: boolean;
    accept: string;
    file: File | null;
    onFileSelect: (files: FileList | null) => void;
    onFileRemove: () => void;
    inputRef: React.RefObject<HTMLInputElement>;
    description?: string;
  }) => {
    return (
      <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors">
        <CardContent className="p-4 sm:p-6">
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-lg flex items-center justify-center">
              <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
            </div>
            
            <div>
              <h3 className="font-medium mb-1 sm:mb-2 text-sm sm:text-base">
                {title}
                {required && <span className="text-red-500 ml-1">*</span>}
              </h3>
              <p className="text-xs text-muted-foreground mb-3 sm:mb-4">
                {description || "Cliquez ou déplacez un fichier dans cette zone pour le téléverser"}
              </p>
              
              <input
                type="file"
                accept={accept}
                onChange={(e) => onFileSelect(e.target.files)}
                className="hidden"
                id={`file-${title.replace(/\s+/g, '-').toLowerCase()}`}
                ref={inputRef}
              />
              
              <label
                htmlFor={`file-${title.replace(/\s+/g, '-').toLowerCase()}`}
                className="inline-flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm border border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-md cursor-pointer transition-colors"
              >
                <Upload className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Choisir un fichier
              </label>
            </div>
            
            {/* Fichier sélectionné */}
            {file && (
              <div className="mt-2 p-2 sm:p-3 bg-green-50 border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <div className="flex items-center">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-green-600" />
                  <div className="text-left">
                    <span className="text-xs sm:text-sm font-medium text-green-700 block truncate max-w-[150px] sm:max-w-xs">
                      {file.name}
                    </span>
                    <span className="text-xs text-green-600">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onFileRemove}
                  className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <div 
        className="relative text-white py-12 sm:py-16"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(5, 150, 105, 0.8), rgba(4, 120, 87, 0.8)), url('https://images.unsplash.com/photo-1636955816868-fcb881e57954?q=80&w=2070&auto=format&fit=crop')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-lg sm:text-xl md:text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">SUIVI DE DEMANDE</h1>
          <p className="text-base sm:text-lg opacity-90 max-w-2xl mx-auto">
            Suivez l'état de votre demande de stage en temps réel
          </p>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-6xl">
        
        <Card className="mb-6 sm:mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              Rechercher ma demande
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <Label htmlFor="tracking-code" className="text-sm">Code de suivi</Label>
                <Input
                  id="tracking-code"
                  placeholder="Code de suivi (ex: CEB-ABC123XYZ)"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleSearch} 
                  disabled={isSearching} 
                  className="w-full sm:w-auto h-10 sm:h-11 px-4 sm:px-6"
                >
                  {isSearching ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                      <span className="text-sm">Recherche...</span>
                    </>
                  ) : (
                    "Rechercher"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {notFound && (
          <Alert className="mb-6 sm:mb-8">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="text-sm sm:text-base">
              Aucune demande trouvée avec ce code de suivi. Vérifiez que vous avez bien saisi le code complet.
            </AlertDescription>
          </Alert>
        )}

        {application && (
          <div className="py-4 sm:py-6 space-y-4 sm:space-y-6">
            {isEditing && (
              <Alert className="mb-3 sm:mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Mode édition activé</strong> - Vous pouvez uniquement modifier les documents joints et la photo d'identité.
                  Les informations personnelles ne sont pas modifiables après soumission.
                </AlertDescription>
              </Alert>
            )}

            {/* État de la demande */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    {getStatusIcon(application.statut_stage)}
                    <div>
                      <CardTitle className="text-lg sm:text-xl">État de votre demande</CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Code de suivi: {application.tracking_id}
                        {application.statut_detaille && ` `}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={`text-xs sm:text-sm border ${getStatusVariant(application.statut_stage)}`}>
                      {getStatusForDisplay(application.statut_stage)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <span>
                      <strong>Soumise le:</strong> {formatDate(application.date_soumission)}
                    </span>
                  </div>

                </div>

                {application.date_examen && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <span>
                      <strong>Date d'examen prévue:</strong> {formatDate(application.date_examen)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Photo d'identité */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Image className="h-4 w-4 sm:h-5 sm:w-5" />
                    Photo d'identité
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-3 sm:space-y-4">

                  {(newPhoto || application.photo_passeport) ? (
                    <div className="space-y-3 sm:space-y-4 w-full">
                      <div className="text-center">
                        <h4 className="font-medium mb-2 sm:mb-4 text-sm sm:text-base">
                          Aperçu de votre photo
                        </h4>

                        <div
                          className="
                            relative
                            w-48 h-48
                            sm:w-44 sm:h-44
                            md:w-50 md:h-50
                            lg:w-66 lg:h-66
                            border-2 border-primary rounded-lg
                            overflow-hidden bg-muted mx-auto
                            cursor-pointer hover:border-primary/70 transition-colors
                          "
                          onClick={() =>
                            handleViewPhoto(
                              newPhoto
                                ? URL.createObjectURL(newPhoto)
                                : application.photo_passeport!
                            )
                          }
                        >
                          <img
                            src={
                              newPhoto
                                ? URL.createObjectURL(newPhoto)
                                : application.photo_passeport!
                            }
                            alt={`Photo de ${application.stagiaire.prenom} ${application.stagiaire.nom}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center w-full">
                      <h4 className="font-medium mb-2 sm:mb-4 text-sm sm:text-base">Aperçu de votre photo</h4>
                      <div className="w-32 h-32 sm:w-40 sm:h-40 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center mx-auto">
                        <p className="text-xs sm:text-sm text-muted-foreground text-center px-3 sm:px-4">
                          Aucune photo disponible
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Informations personnelles */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    Informations personnelles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {renderNonEditableField("Nom", application.stagiaire.nom)}
                    {renderNonEditableField("Prénom", application.stagiaire.prenom)}
                    {renderNonEditableField("Email", application.stagiaire.email)}
                    {renderNonEditableField("Téléphone", application.stagiaire.telephone)}
                    {renderNonEditableField("Adresse", application.stagiaire.adresse || "")}
                    {renderNonEditableField("Genre", application.stagiaire.genre || "")}
                    {renderNonEditableField("Pays de résidence", application.stagiaire.pays_residence || "")}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Informations complémentaires - AVEC l'établissement */}
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
                    {renderNonEditableField("Spécialité", application.stagiaire.specialite || "")}
                    {renderNonEditableField("Niveau d'étude", application.stagiaire.niveau || "")}
                    {renderNonEditableField("Type de stage demandé", application.type_stage)}
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

            {/* Section 1: Documents joints (sans les rapports, conventions et attestations) */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                    Mes Documents
                    <Badge variant="outline" className="ml-2">
                      {(() => {
                        let total = 0;
                        if (application.documents) {
                          const filteredDocs = application.documents.filter(doc => 
                            doc.type !== 'rapport' && 
                            !doc.nom.toLowerCase().includes('rapport') &&
                            doc.type !== 'convention' &&
                            doc.type !== 'attestation' &&
                            !doc.nom.toLowerCase().includes('convention') &&
                            !doc.nom.toLowerCase().includes('attestation')
                          );
                          total += filteredDocs.length;
                        }
                      
                        if (application.stage?.documents) {
                          const filteredStageDocs = application.stage.documents.filter(doc => 
                            doc.type !== 'convention' && 
                            doc.type !== 'attestation' &&
                            !doc.nom.toLowerCase().includes('convention') &&
                            !doc.nom.toLowerCase().includes('attestation')
                          );
                          total += filteredStageDocs.length;
                        }
                        return total;
                      })()}
                    </Badge>
                    {newDocuments.length > 0 && (
                      <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                        +{newDocuments.length} nouveau(x)
                      </Badge>
                    )}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing && (
                  <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
                    <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-1 sm:mb-2 text-sm sm:text-base">Instructions pour la modification</h4>
                      <ul className="text-xs sm:text-sm text-blue-700 space-y-1">
                        <li>• Cliquez sur "Remplacer" pour modifier un document existant</li>
                        <li>• Utilisez "Ajouter un diplôme" pour ajouter de nouveaux diplômes</li>
                        <li>• Les diplômes peuvent être supprimés individuellement</li>
                        <li>• Seule la photo et les documents peuvent être modifiés</li>
                      </ul>
                    </div>
                    
                    <div className="text-center">
                      <input
                        type="file"
                        ref={diplomeInputRef}
                        onChange={(e) => handleFileUpload(e, 'diplome', false)}
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        id="diplome-add"
                      />
                      <label
                        htmlFor="diplome-add"
                        className="inline-flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm border border-dashed border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-md cursor-pointer transition-colors"
                      >
                        <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        Ajouter un diplôme
                      </label>
                    </div>
                  </div>
                )}

                {/* Documents (sans les rapports, conventions et attestations) */}
                {(application.documents && application.documents.filter(doc => 
                  doc.type !== 'rapport' && 
                  !doc.nom.toLowerCase().includes('rapport') &&
                  doc.type !== 'convention' &&
                  doc.type !== 'attestation' &&
                  !doc.nom.toLowerCase().includes('convention') &&
                  !doc.nom.toLowerCase().includes('attestation')
                ).length > 0) || 
                (application.stage?.documents && application.stage.documents.filter(doc => 
                  doc.type !== 'convention' && 
                  doc.type !== 'attestation' &&
                  !doc.nom.toLowerCase().includes('convention') &&
                  !doc.nom.toLowerCase().includes('attestation')
                ).length > 0) || 
                newDocuments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Documents de la demande - FILTRÉS pour exclure les rapports, conventions et attestations */}
                    {application.documents
                      ?.filter(doc => 
                        doc.type !== 'rapport' && 
                        !doc.nom.toLowerCase().includes('rapport') &&
                        doc.type !== 'convention' &&
                        doc.type !== 'attestation' &&
                        !doc.nom.toLowerCase().includes('convention') &&
                        !doc.nom.toLowerCase().includes('attestation')
                      )
                      ?.map((doc, index) => (
                        <DocumentCard key={`demande-${doc.id || index}`} doc={doc} index={index} isExisting={true} />
                      ))}

                    {/* Documents du stage - FILTRÉS pour exclure les conventions et attestations */}
                    {application.stage?.documents
                      ?.filter(doc => 
                        doc.type !== 'convention' && 
                        doc.type !== 'attestation' &&
                        !doc.nom.toLowerCase().includes('convention') &&
                        !doc.nom.toLowerCase().includes('attestation')
                      )
                      ?.map((doc, index) => (
                        <DocumentCard key={`stage-doc-${index}`} doc={doc} index={index} isExisting={true} />
                      ))}

                    {/* Nouveaux documents à ajouter */}
                    {newDocuments.map((doc, index) => (
                      <DocumentCard key={`new-${index}`} doc={{
                        nom: doc.nom,
                        url: URL.createObjectURL(doc.file),
                        type: doc.type
                      }} index={index} isExisting={false} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <FileText className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base text-muted-foreground">Aucun document joint</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bouton pour ouvrir le modal du stage */}
            {application.stage && (
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm sm:text-base">Informations concernant votre stage</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {application.stage.statut_actuel === "Actuel" 
                            ? "Stage en cours" 
                            : application.stage.statut_actuel === "Terminé" 
                            ? "Stage terminé" 
                            : "Stage à venir"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={getStageStatusVariant(application.stage.statut_actuel)} 
                        className={`text-xs sm:text-sm ${getStageStatusColor(application.stage.statut_actuel)}`}
                      >
                        {application.stage.statut_actuel}
                      </Badge>
                      <Button 
                        onClick={() => setIsStageModalOpen(true)}
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir les détails
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bouton pour ouvrir le modal d'attestation */}
            {application?.stage?.statut_actuel === "Terminé" && (
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Award className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm sm:text-base">Attestation de stage</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {application?.stage?.demande_attestation 
                            ? `Statut: ${application.stage.demande_attestation.statut === 'en_attente' ? 'En attente' : 
                               application.stage.demande_attestation.statut === 'approuvee' ? 'Approuvée' :
                               application.stage.demande_attestation.statut === 'traitee' ? 'Traitée' : 'Refusée'}`
                            : 'Documents requis pour obtenir votre attestation'}
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setIsAttestationModalOpen(true)}
                      className="w-full sm:w-auto"
                      size="lg"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Voir les détails
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Prochaines étapes - Ne s'affiche pas si le stage est Actuel ou Terminé */}
            {application.prochaines_etapes && 
             (!application.stage || (application.stage.statut_actuel !== "Actuel" && application.stage.statut_actuel !== "Terminé")) && (
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                    Prochaines étapes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm sm:text-base leading-relaxed">{application.prochaines_etapes}</p>
                </CardContent>
              </Card>
            )}

            {/* Motif du refus */}
            {application.motif_refus && (
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-red-600 text-base sm:text-lg">Motif du refus</CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{application.motif_refus}</AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Modal du stage */}
        {application && (
          <Dialog open={isStageModalOpen} onOpenChange={setIsStageModalOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  Informations concernant votre stage
                </DialogTitle>
                <DialogDescription>
                  Détails de votre stage à la CEB
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 sm:space-y-4 md:space-y-6 py-4">
                {/* En-tête avec statut */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                  <Badge 
                    variant={getStageStatusVariant(application.stage?.statut_actuel || '')} 
                    className={`text-xs sm:text-sm ${getStageStatusColor(application.stage?.statut_actuel || '')}`}
                  >
                    {application.stage?.statut_actuel}
                  </Badge>
                </div>

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
                        <span className="font-medium">{formatDate(application.stage?.date_debut)}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between text-sm gap-2 sm:gap-0">
                        <span className="text-muted-foreground">Fin:</span>
                        <span className="font-medium">{formatDate(application.stage?.date_fin)}</span>
                      </div>
                      {application.stage?.date_accord && (
                        <div className="flex flex-col sm:flex-row sm:justify-between text-sm gap-2 sm:gap-0">
                          <span className="text-muted-foreground">Accordé le:</span>
                          <span className="font-medium">{formatDate(application.stage.date_accord)}</span>
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
                        <span className="font-medium">{application.stage?.duree_jours} jours</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between text-sm gap-2 sm:gap-0">
                        <span className="text-muted-foreground">En mois:</span>
                        <span className="font-medium">{application.stage?.duree_mois} mois</span>
                      </div>
                      {application.stage?.jours_restants && application.stage.statut_actuel === "Actuel" && (
                        <div className="flex flex-col sm:flex-row sm:justify-between text-sm text-green-600 font-medium gap-2 sm:gap-0">
                          <span>Jours restants:</span>
                          <span>{application.stage.jours_restants} jours</span>
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
                        <span className="font-medium">{application.stage?.remunere ? "Payant" : "Non rémunéré"}</span>
                      </div>
                      {application.stage?.remunere && application.stage?.montant_remuneration && (
                        <div className="flex flex-col sm:flex-row sm:justify-between text-sm gap-2 sm:gap-0">
                          <span className="text-muted-foreground">Montant:</span>
                          <span className="font-medium text-green-600">
                            {application.stage.montant_remuneration.toLocaleString()} FCFA
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
                      {renderStageField("Direction", application.stage?.direction, <Briefcase className="h-3 w-3" />)}
                      {renderStageField("Service", application.stage?.service, <Users className="h-3 w-3" />)}
                      {renderStageField("Lieu", application.stage?.lieu_stage, <MapPin className="h-3 w-3" />)}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-sm sm:text-base flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      Détails du stagiaire
                    </h4>
                    <div className="space-y-2">
                      {renderStageField("Niveau d'études", application.stage?.niveau_etude, <GraduationCap className="h-3 w-3" />)}
                      {renderStageField("Spécialité", application.stage?.specialite, <Briefcase className="h-3 w-3" />)}
                      {renderStageField("Type de stage", application.stage?.type_stage, <FileCheck className="h-3 w-3" />)}
                    </div>
                  </div>
                </div>

                {/* Informations supplémentaires si disponibles */}
                {application.stage?.superviseur && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-sm sm:text-base flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4 text-primary" />
                      Supervision
                    </h4>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-sm">
                        <span className="font-medium">Superviseur:</span> {application.stage.superviseur}
                      </p>
                    </div>
                  </div>
                )}

                {/* Renouvellement si applicable */}
                {application.stage?.a_ete_renouvele && (
                  <div className="border-t pt-4">
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-sm text-blue-700">
                        Ce stage a été renouvelé. {application.stage.stage_renouvele_id && 
                          `Nouveau code de suivi: ${application.stage.stage_renouvele_id}`}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Lettre de stage */}
                {application.stage?.convention && (
                  <>
                    <h4 className="font-medium text-sm sm:text-base flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-primary" />
                      Lettre de stage
                    </h4>
                    <Card className="border-2 border-dashed border-muted-foreground/25">
                      <CardContent className="p-4 sm:p-6">
                        <div className="text-center space-y-3 sm:space-y-4">
                          <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileCheck className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                              Lettre de stage
                            </h3>                        
                            {application.stage.convention.date_creation && (
                              <p className="text-xs text-muted-foreground">
                                Créée le {formatDate(application.stage.convention.date_creation)}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 justify-center flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs sm:text-sm"
                              onClick={() => handleViewDocument({
                                nom: `Lettre de stage`,
                                url: application.stage.convention.fichier_url,
                                type: 'convention'
                              })}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Voir
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs sm:text-sm"
                              asChild
                            >
                              <a 
                                href={application.stage.convention.fichier_url} 
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
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setIsStageModalOpen(false)}>
                  Fermer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal d'attestation 
        {application && (
          <Dialog open={isAttestationModalOpen} onOpenChange={setIsAttestationModalOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Award className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  Attestation de stage
                </DialogTitle>
                <DialogDescription>
                  Gérez votre demande d'attestation de stage
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 sm:space-y-4 md:space-y-6 py-4">
                {application?.stage?.demande_attestation ? (
                  // Afficher les documents soumis
                  <>
                    <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        {application.stage.demande_attestation.statut === 'refusee' ? 
                          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" /> :
                          <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        }
                        <div>
                          <h4 className="font-medium mb-1 text-sm sm:text-base">
                            {application.stage.demande_attestation.statut === 'refusee' ? 
                              'Demande refusée' : 
                              application.stage.demande_attestation.statut === 'approuvee' || application.stage.demande_attestation.statut === 'traitee' ?
                              'Demande approuvée' :
                              'Demande soumise avec succès'
                            }
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-700">
                            Votre demande d'attestation a été {application.stage.demande_attestation.statut === 'refusee' ? 'refusée' : 
                            application.stage.demande_attestation.statut === 'approuvee' || application.stage.demande_attestation.statut === 'traitee' ?
                            'traitée' : 'soumise'} le {formatDate(application.stage.demande_attestation.date_demande)}
                          </p>
                          
                          {application.stage.demande_attestation.statut === 'refusee' && application.stage.demande_attestation.motif_refus && (
                            <Alert variant="destructive" className="mt-3">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription className="text-sm">
                                <strong>Motif du refus:</strong> {application.stage.demande_attestation.motif_refus}
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {application.stage.demande_attestation.statut === 'refusee' && (
                            <div className="mt-4">
                              <Button
                                onClick={() => setShowNewRequestForm(true)}
                                variant="outline"
                                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Soumettre une nouvelle demande
                              </Button>
                            </div>
                          )}
                          
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {application.stage.demande_attestation.fichiers?.rapport_stage && (
                        <Card className="border-2 border-dashed border-muted-foreground/25">
                          <CardContent className="p-4 sm:p-6">
                            <div className="text-center space-y-3 sm:space-y-4">
                              <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                              </div>
                              <div>
                                <h3 className="font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                                  Rapport de stage
                                </h3>
                                <p className="text-xs text-muted-foreground mb-3 sm:mb-4">
                                  PDF • Document soumis
                                </p>
                              </div>
                              <div className="flex gap-2 justify-center flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs sm:text-sm"
                                  onClick={() => handleViewDocument({
                                    nom: 'Rapport de stage',
                                    url: application.stage.demande_attestation.fichiers.rapport_stage,
                                    type: 'rapport'
                                  })}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Voir
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs sm:text-sm"
                                  onClick={() => window.open(application.stage.demande_attestation.fichiers.rapport_stage, '_blank')}
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Télécharger
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {application.stage.demande_attestation.fichiers?.demande_manuscrite && (
                        <Card className="border-2 border-dashed border-muted-foreground/25">
                          <CardContent className="p-4 sm:p-6">
                            <div className="text-center space-y-3 sm:space-y-4">
                              <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                              </div>
                              <div>
                                <h3 className="font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                                  Demande manuscrite
                                </h3>
                                <p className="text-xs text-muted-foreground mb-3 sm:mb-4">
                                  {getFileExtension(application.stage.demande_attestation.fichiers.demande_manuscrite)} • Document soumis
                                </p>
                              </div>
                              <div className="flex gap-2 justify-center flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs sm:text-sm"
                                  onClick={() => handleViewDocument({
                                    nom: 'Demande manuscrite',
                                    url: application.stage.demande_attestation.fichiers.demande_manuscrite,
                                    type: 'demande_manuscrite'
                                  })}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Voir
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs sm:text-sm"
                                  onClick={() => window.open(application.stage.demande_attestation.fichiers.demande_manuscrite, '_blank')}
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Télécharger
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {(application.stage.attestation || application.stage.demande_attestation?.fichiers?.attestation_signee) && (
                      <div className="border-t pt-4 sm:pt-6">
                        <h4 className="font-medium text-sm sm:text-base flex items-center gap-2 mb-4">
                          <Award className="h-4 w-4 text-teal-600" />
                          Attestation de stage signée
                        </h4>
                        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-teal-800 mb-1">Votre attestation de stage est disponible</p>
                              <p className="text-sm text-teal-700">
                                Vous pouvez télécharger votre attestation de stage signée
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              className="border-teal-600 text-teal-600 hover:bg-teal-50"
                              onClick={() => window.open(application.stage.attestation?.fichier_url || application.stage.demande_attestation?.fichiers?.attestation_signee, '_blank')}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Télécharger
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {application.stage.demande_attestation.statut === 'refusee' && !showNewRequestForm && (
                      <div className="border-t pt-4">
                        <Button
                          onClick={() => {
                            setShowNewRequestForm(true);
                          }}
                          variant="outline"
                          className="border-blue-600 text-blue-600 hover:bg-blue-50 w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Soumettre une nouvelle demande
                        </Button>
                      </div>
                    )}

                    {showNewRequestForm && (
                      <>
                        <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <h4 className="font-medium text-amber-800 mb-1 sm:mb-2 text-sm sm:text-base">Nouvelle demande d'attestation</h4>
                          <ul className="text-xs sm:text-sm text-amber-700 space-y-1">
                            <li>• Veuillez corriger les éléments mentionnés dans le motif de refus</li>
                            <li>• Téléchargez à nouveau les documents requis</li>
                            <li>• La première page de votre rapport de stage signée au format PDF</li>
                            <li>• La demande manuscrite doit être signée et scannée</li>
                          </ul>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                          <FileUploadCard
                            title="Rapport de stage (signé)"
                            required={true}
                            accept=".pdf"
                            file={rapportStage}
                            onFileSelect={(files) => setRapportStage(files?.[0] || null)}
                            onFileRemove={() => setRapportStage(null)}
                            inputRef={rapportInputRef}
                            description="Format accepté: PDF uniquement. Taille max: 10MB"
                          />

                          <FileUploadCard
                            title="Demande manuscrite signée"
                            required={true}
                            accept=".pdf,.jpg,.jpeg,.png"
                            file={demandeManuscrite}
                            onFileSelect={(files) => setDemandeManuscrite(files?.[0] || null)}
                            onFileRemove={() => setDemandeManuscrite(null)}
                            inputRef={demandeInputRef}
                            description="Formats acceptés: PDF, JPG, PNG. Taille max: 5MB"
                          />
                        </div>

                        <div className="border-t pt-4 sm:pt-6">
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowNewRequestForm(false);
                                setRapportStage(null);
                                setDemandeManuscrite(null);
                              }}
                              className="w-full sm:w-auto"
                            >
                              Annuler
                            </Button>
                            
                            <Button
                              onClick={handleSubmitNewAttestationRequest}
                              disabled={isSubmittingNewRequest || !rapportStage || !demandeManuscrite}
                              className="w-full sm:w-auto"
                              size="lg"
                            >
                              {isSubmittingNewRequest ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                                  <span>Soumission en cours...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                                  <span>Soumettre la nouvelle demande</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}

                    {!showNewRequestForm && application.stage.attestation && (
                      <div className="space-y-3 sm:space-y-4 md:space-y-6">
                        <div className="mt-2">
                          <Card className="border-2 border-dashed border-teal-200">
                            <CardContent className="p-4 sm:p-6">
                              <div className="text-center space-y-3 sm:space-y-4">
                                <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                                  <Award className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600" />
                                </div>
                                <div>
                                  <h3 className="font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                                    Attestation de stage
                                  </h3>
                                  <p className="text-xs text-muted-foreground mb-3 sm:mb-4">
                                    PDF • Attestation officielle
                                  </p>
                                </div>
                                <div className="flex gap-2 justify-center flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs sm:text-sm"
                                    onClick={() => handleViewDocument({
                                      nom: 'Attestation de stage signée',
                                      url: application.stage.attestation.fichier_url,
                                      type: 'attestation_signee'
                                    })}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    Voir
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs sm:text-sm"
                                    onClick={() => window.open(application.stage.attestation.fichier_url, '_blank')}
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    Télécharger
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // Afficher le formulaire de soumission initial (pas de demande précédente)
                  <>
                    <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <h4 className="font-medium text-amber-800 mb-1 sm:mb-2 text-sm sm:text-base">Informations importantes</h4>
                      <ul className="text-xs sm:text-sm text-amber-700 space-y-1">
                        <li>• La première page de votre rapport de stage signée au format PDF</li>
                        <li>• La demande manuscrite doit être signée et scannée</li>
                        <li>• Vous recevrez un email de confirmation après soumission</li>
                      </ul>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <FileUploadCard
                        title="Rapport de stage"
                        required={true}
                        accept=".pdf"
                        file={rapportStage}
                        onFileSelect={(files) => setRapportStage(files?.[0] || null)}
                        onFileRemove={() => setRapportStage(null)}
                        inputRef={rapportInputRef}
                        description="Format accepté: PDF uniquement. Taille max: 10MB"
                      />

                      <FileUploadCard
                        title="Demande manuscrite signée"
                        required={true}
                        accept=".pdf,.jpg,.jpeg,.png"
                        file={demandeManuscrite}
                        onFileSelect={(files) => setDemandeManuscrite(files?.[0] || null)}
                        onFileRemove={() => setDemandeManuscrite(null)}
                        inputRef={demandeInputRef}
                        description="Formats acceptés: PDF, JPG, PNG. Taille max: 5MB"
                      />
                    </div>

                    <div className="border-t pt-4 sm:pt-6">
                      <div className="flex flex-col sm:flex-row items-center justify-end gap-4">
                        <Button
                          onClick={handleSubmitAttestation}
                          disabled={isSubmittingAttestation || !rapportStage || !demandeManuscrite}
                          className="w-full sm:w-auto"
                          size="lg"
                        >
                          {isSubmittingAttestation ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                              <span>Soumission en cours...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                              <span>Soumettre la demande d'attestation</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setIsAttestationModalOpen(false)}>
                  Fermer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

      */}

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] p-0 sm:p-6">
            <DialogHeader className="px-4 pt-4 sm:px-0 sm:pt-0">
              <DialogTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-base sm:text-lg gap-2 sm:gap-0">
                <div className="flex items-center gap-2 truncate">
                  {selectedDocument && getDocumentIcon(selectedDocument.type || 'default')}
                  <span className="truncate">{selectedDocument?.nom}</span>
                </div>
               
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto px-4 pb-4 sm:px-6 sm:pb-6">
              {selectedDocument && (
                <div className="flex flex-col items-center">
                  {isImageFile(selectedDocument.url) ? (
                    <img 
                      src={selectedDocument.url} 
                      alt={selectedDocument.nom}
                      className="max-w-full max-h-[60vh] sm:max-h-[70vh] object-contain rounded-lg"
                    />
                  ) : isPdfFile(selectedDocument.url) ? (
                    <div className="w-full h-[60vh] sm:h-[70vh]">
                      <iframe
                        src={selectedDocument.url}
                        className="w-full h-full rounded-lg border"
                        title={selectedDocument.nom}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8">
                      <File className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                      <p className="text-base sm:text-lg font-medium text-gray-600 mb-2">
                        Aperçu non disponible
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        Ce type de fichier ne peut pas être prévisualisé
                      </p>
                      <Button asChild size="sm" className="text-sm">
                        <a href={selectedDocument.url} download>
                          <Download className="h-3.5 w-3.5" />
                          Télécharger
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedDocument && (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-4 pb-4 sm:px-6 sm:pb-6 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={getDocumentBadgeColor(selectedDocument.type || 'default')}>
                    {selectedDocument.type ? selectedDocument.type.replace('_', ' ') : 'Document'}
                  </Badge>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {getFileExtension(selectedDocument.url)}
                  </span>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="outline" asChild size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                    <a href={selectedDocument.url} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">Ouvrir</span>
                    </a>
                  </Button>
                  <Button asChild size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                    <a href={selectedDocument.url} download>
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">Télécharger</span>
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog pour la visualisation de la photo */}
        <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] p-0 sm:p-6">
            <DialogHeader className="px-4 pt-4 sm:px-0 sm:pt-0">
              <DialogTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-base sm:text-lg gap-2 sm:gap-0">
                <div className="flex items-center gap-2 truncate">
                  <Image className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate">Photo d'identité - {application?.stagiaire.prenom} {application?.stagiaire.nom}</span>
                </div>
              
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto flex items-center justify-center px-4 pb-4 sm:px-6 sm:pb-6">
              {selectedPhoto && (
                <div className="flex flex-col items-center">
                  <img 
                    src={selectedPhoto} 
                    alt={`${application?.stagiaire.nom} - Photo de ${application?.stagiaire.prenom}`}
                    className="max-w-full max-h-[60vh] sm:max-h-[70vh] object-contain rounded-lg shadow-lg"
                  />
                </div>
              )}
            </div>

            {selectedPhoto && (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-4 pb-4 sm:px-6 sm:pb-6 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 text-xs sm:text-sm">
                    Photo d'identité
                  </Badge>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {getFileExtension(selectedPhoto)}
                  </span>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="outline" asChild size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                    <a href={selectedPhoto} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">Ouvrir</span>
                    </a>
                  </Button>
                  <Button asChild size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                    <a href={selectedPhoto} download={`photo-${application?.stagiaire.prenom}-${application?.stagiaire.nom}.${getFileExtension(selectedPhoto).toLowerCase()}`}>
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">Télécharger</span>
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <PublicFooter className="mt-auto" />
    </div>
  );
};

export default TrackApplication;
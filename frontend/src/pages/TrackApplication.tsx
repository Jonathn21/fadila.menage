import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Search, Clock, CheckCircle, XCircle, AlertTriangle, Calendar, User, Mail, Phone, FileText,Coins, Edit, Save, X, GraduationCap, Image, Download, Eye, BookOpen, File, Upload, XIcon, Plus, Building, MapPin, Briefcase, Users, DollarSign, CalendarDays, Clock as ClockIcon, FileCheck, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import apiClient from "@/lib/apiClient";

interface ApplicationStatus {
  tracking_id: string;
  statut_stage: "En attente" | "En cours de traitement" | "Acceptée" | "Refusée" | "Information supplémentaire requise";
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
  
  // Informations du stage
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
    statut_actuel: "Actuel" | "Terminé" | "À venir";
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
    rapports?: Array<{
      titre: string;
      date_ajout?: string;
      fichier_url?: string;
    }>;
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
      date_demande: string;
      fichier_url?: string;
      statut: 'en_attente' | 'en_traitement' | 'generee' | 'refusee';
      motif_refus?: string;
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
  
  // États pour l'ajout de rapport
  const [isAddingRapport, setIsAddingRapport] = useState(false);
  const [newRapportTitre, setNewRapportTitre] = useState("");
  const [newRapportFile, setNewRapportFile] = useState<File | null>(null);
  const [isSubmittingRapport, setIsSubmittingRapport] = useState(false);
  const rapportInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

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
    setIsAddingRapport(false);
    setNewRapportTitre("");
    setNewRapportFile(null);

    try {
      const cleanTrackingCode = trackingCode.trim().toUpperCase();
      
      const response = await apiClient.get(`suivi-demande/${cleanTrackingCode}/`);
      const data = response.data;

      if (data.success && data.demande) {
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

  const handleAddRapport = async () => {
    if (!application?.tracking_id || !application?.stage?.id) return;
    
    if (!newRapportTitre.trim() || !newRapportFile) {
      toast({
        title: "Champs requis",
        description: "Veuillez saisir un titre et sélectionner un fichier",
        variant: "destructive",
      });
      return;
    }

    // Validation du fichier
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (newRapportFile.size > maxSize) {
      toast({
        title: "Fichier trop volumineux",
        description: "Le fichier ne doit pas dépasser 10MB",
        variant: "destructive",
      });
      return;
    }

    if (!allowedTypes.includes(newRapportFile.type)) {
      toast({
        title: "Format non supporté",
        description: "Veuillez utiliser un fichier PDF, DOC ou DOCX",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingRapport(true);
    try {
      const formData = new FormData();
      formData.append('titre', newRapportTitre);
      formData.append('fichier', newRapportFile);
      formData.append('tracking_id', application.tracking_id);

      const response = await apiClient.post(
        `suivi-demande/${application.tracking_id}/ajouter-rapport/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        toast({
          title: "Rapport ajouté",
          description: "Votre rapport de stage a été ajouté avec succès",
          variant: "default",
        });
        
        // Mettre à jour UNIQUEMENT les rapports du stage
        if (application.stage) {
          const updatedApplication = { 
            ...application,
            stage: {
              ...application.stage,
              rapports: [
                ...(application.stage.rapports || []),
                response.data.rapport
              ]
            }
          };
          setApplication(updatedApplication);
        }
        
        // Réinitialiser le formulaire
        setNewRapportTitre("");
        setNewRapportFile(null);
        setIsAddingRapport(false);
      } else {
        throw new Error(response.data.message || "Erreur lors de l'ajout du rapport");
      }
    } catch (error: any) {
      console.error("Erreur lors de l'ajout du rapport:", error);
      
      let errorMessage = "Une erreur est survenue lors de l'ajout du rapport";
      
      if (error.response?.status === 400) {
        errorMessage = error.response.data.message || errorMessage;
      } else if (error.response?.status === 413) {
        errorMessage = "Fichier trop volumineux. Veuillez réduire la taille du fichier.";
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingRapport(false);
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

  const handleRapportFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('application/')) {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner un fichier PDF, DOC ou DOCX",
        variant: "destructive",
      });
      return;
    }

    setNewRapportFile(file);
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
    switch (status) {
      case "En attente":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "En cours de traitement":
        return <AlertTriangle className="h-5 w-5 text-blue-500" />;
      case "Acceptée":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "Refusée":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "Information supplémentaire requise":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: ApplicationStatus["statut_stage"]) => {
    switch (status) {
      case "En attente":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100";
      case "En cours de traitement":
        return "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100";
      case "Acceptée":
        return "bg-green-100 text-green-800 border-green-200 hover:bg-green-100";
      case "Refusée":
        return "bg-red-100 text-red-800 border-red-200 hover:bg-red-100";
      case "Information supplémentaire requise":
        return "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100";
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
        return "bg-green-100 text-green-800 border-green-200";
      case "Terminé":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "À venir":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const canAddRapport = (stage: ApplicationStatus["stage"]) => {
    return stage && stage.statut_actuel && ["Actuel", "Terminé"].includes(stage.statut_actuel);
  };

  const canRequestAttestation = (stage: ApplicationStatus["stage"]) => {
    if (!stage) return false;
    
    // Conditions pour pouvoir demander une attestation :
    // 1. Le stage doit être terminé ou en cours
    // 2. Au moins un rapport doit être ajouté
    // 3. L'attestation n'est pas encore générée
    // 4. Aucune demande d'attestation n'est déjà en cours
    
    const isStageCompletedOrCurrent = stage.statut_actuel && ["Actuel", "Terminé"].includes(stage.statut_actuel);
    const hasRapports = stage.rapports && stage.rapports.length > 0;
    const noAttestationYet = !stage.attestation || !stage.attestation.fichier_url;
    
    // Vérifier si une demande existe déjà
    const hasExistingRequest = stage.demande_attestation && 
                            stage.demande_attestation.statut !== 'refusee' &&
                            stage.demande_attestation.statut !== 'generee';
    
    return isStageCompletedOrCurrent && hasRapports && noAttestationYet && !hasExistingRequest;
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
      case 'lettre_motivation': return 'bg-green-100 text-green-800 border-green-200';
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
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">SUIVI DE DEMANDE</h1>
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
          <div className="space-y-4 sm:space-y-6">
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
                        {application.statut_detaille && ` • ${application.statut_detaille}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={`text-xs sm:text-sm border ${getStatusVariant(application.statut_stage)}`}>
                      {application.statut_stage}
                    </Badge>
                    {/* {!isEditing && application.statut_stage === "En attente" ? (
                      <Button variant="outline" size="sm" onClick={handleEdit} className="text-xs sm:text-sm h-8 sm:h-9">
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span>Modifier</span>
                      </Button>
                    ) : isEditing ? (
                      <div className="flex gap-1 sm:gap-2">
                        <Button variant="outline" size="sm" onClick={handleCancelEdit} className="text-xs sm:text-sm h-8 sm:h-9">
                          <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Annuler</span>
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={isSaving} className="text-xs sm:text-sm h-8 sm:h-9">
                          <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          {isSaving ? (
                            <span>Sauvegarde...</span>
                          ) : (
                            <span className="hidden sm:inline">Sauvegarder</span>
                          )}
                        </Button>
                      </div>
                    ) : null}*/}
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
                  {/* <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <span>
                      <strong>Dernière mise à jour:</strong> {formatDate(application.date_maj)}
                    </span>
                  </div>*/}
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


                      {/* <div className="p-2 sm:p-3 bg-muted rounded-lg flex items-center justify-between">
                        <div className="flex items-center truncate">
                          <Image className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-primary flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-medium truncate">
                            {newPhoto ? newPhoto.name : "Photo passeport"}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() => handleViewPhoto(newPhoto ? URL.createObjectURL(newPhoto) : application.photo_passeport!)}
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            asChild
                          >
                            <a href={newPhoto ? URL.createObjectURL(newPhoto) : application.photo_passeport!} download>
                              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                            </a>
                          </Button>
                          {isEditing && newPhoto && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 sm:h-8 sm:w-8"
                              onClick={removeNewPhoto}
                            >
                              <X className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          )}
                        </div>
                      </div>*/}
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
                <div className="space-y-4 sm:space-y-6">
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
                          // Filtrer les documents pour exclure les rapports, conventions et attestations
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
                          // Filtrer les documents du stage pour exclure les conventions et attestations
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

             {/* Informations du Stage (si disponible) */}
            {application.stage && (
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
                      variant={getStageStatusVariant(application.stage.statut_actuel)} 
                      className={`text-xs sm:text-sm ${getStageStatusColor(application.stage.statut_actuel)}`}
                    >
                      {application.stage.statut_actuel}
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
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Début:</span>
                          <span className="font-medium">{formatDate(application.stage.date_debut)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Fin:</span>
                          <span className="font-medium">{formatDate(application.stage.date_fin)}</span>
                        </div>
                        {application.stage.date_accord && (
                          <div className="flex justify-between text-sm">
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
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">En jours:</span>
                          <span className="font-medium">{application.stage.duree_jours} jours</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">En mois:</span>
                          <span className="font-medium">{application.stage.duree_mois} mois</span>
                        </div>
                        {/* {application.stage.jours_restants !== undefined && application.stage.statut_actuel === "Actuel" && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Jours restants:</span>
                            <span className={`font-medium ${application.stage.jours_restants <= 30 ? 'text-red-600' : 'text-green-600'}`}>
                              {application.stage.jours_restants} jours
                            </span>
                          </div>
                        )}*/}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-sm sm:text-base flex items-center gap-2">
                        <Coins className="h-4 w-4 text-primary" />
                        Rémunération
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="font-medium">{application.stage.remunere ? "Payant" : "Non rémunéré"}</span>
                        </div>
                        {application.stage.remunere && application.stage.montant_remuneration && (
                          <div className="flex justify-between text-sm">
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
                        {renderStageField("Direction", application.stage.direction, <Briefcase className="h-3 w-3" />)}
                        {renderStageField("Service", application.stage.service, <Users className="h-3 w-3" />)}
                        {renderStageField("Lieu", application.stage.lieu_stage, <MapPin className="h-3 w-3" />)}
                        {/*{renderStageField("Superviseur", application.stage.superviseur, <Users className="h-3 w-3" />)}*/}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-sm sm:text-base flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        Détails du stagiaire
                      </h4>
                      <div className="space-y-2">
                        {renderStageField("Niveau d'études", application.stage.niveau_etude, <GraduationCap className="h-3 w-3" />)}
                        {renderStageField("Spécialité", application.stage.specialite, <Briefcase className="h-3 w-3" />)}
                        {renderStageField("Type de stage", application.stage.type_stage, <FileCheck className="h-3 w-3" />)}
                      </div>
                    </div>
                  </div>
                  {/* 🔥 SECTION CONVENTION DE STAGE */}
                  {application.stage.convention && (
                    <div className="border-t pt-4 sm:pt-6">
                      <h4 className="font-medium text-sm sm:text-base flex items-center gap-2 mb-4">
                        <FileCheck className="h-4 w-4 text-primary" />
                        Convention de stage
                      </h4>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-blue-800">
                              N° {application.stage.convention.numero_convention}
                            </p>
                            <p className="text-sm text-blue-700">
                              {application.stage.convention.est_temporaire ? 
                                "Convention temporaire (à signer)" : 
                                "Convention définitive"}
                            </p>
                            {application.stage.convention.date_creation && (
                              <p className="text-xs text-blue-600">
                                Créée le: {formatDate(application.stage.convention.date_creation)}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDocument({
                                nom: `Convention de stage ${application.stage.convention.numero_convention}`,
                                url: application.stage.convention.fichier_url,
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
                      </div>
                    </div>
                  )}

                {/* Rapports de stage 
                {application.stage.rapports && application.stage.rapports.length > 0 && (
                  <div className="border-t pt-4 sm:pt-6">
                    <h4 className="font-medium text-sm sm:text-base flex items-center gap-2 mb-4">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Rapports de stage
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {application.stage.rapports.map((rapport, index) => (
                      <Card key={index} className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer group">
                        <CardContent className="p-4" onClick={() => handleViewDocument({ nom: rapport.titre, url: rapport.fichier_url || '', type: 'rapport' })}>
                            <div className="text-center space-y-3">
                              <div className="mx-auto w-10 h-10 bg-muted rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                <BookOpen className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <h5 className="font-medium text-sm mb-1 line-clamp-2">{rapport.titre}</h5>
                                <p className="text-xs text-muted-foreground">
                                  {rapport.date_ajout ? formatDate(rapport.date_ajout) : "Date non spécifiée"}
                                </p>
                              </div>
                              <div className="flex gap-2 justify-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewDocument({ nom: rapport.titre, url: rapport.fichier_url || '', type: 'rapport' });
                                  }}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Voir
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(rapport.fichier_url, '_blank');
                                  }}
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Téléc.
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}*/}

                {/* Bouton pour ajouter un rapport 
                {canAddRapport(application.stage) && (
                  <div className="border-t pt-4 sm:pt-6">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm sm:text-base">Ajouter un rapport de stage</h4>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsAddingRapport(true)}
                      >
                        <Plus className="h-3 w-3 mr-2" />
                        Ajouter un rapport
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Vous pouvez ajouter vos rapports de stage pour documenter votre parcours.
                    </p>
                  </div>
                )}*/}
                </CardContent>
              </Card>
            )}

            {/* Prochaines étapes */}
            {application.prochaines_etapes && (
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

        {/* Dialog pour la visualisation des documents */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] p-0 sm:p-6">
            <DialogHeader className="px-4 pt-4 sm:px-0 sm:pt-0">
              <DialogTitle className="flex items-center justify-between text-base sm:text-lg">
                <div className="flex items-center gap-2 truncate">
                  {selectedDocument && getDocumentIcon(selectedDocument.type || 'default')}
                  <span className="truncate">{selectedDocument?.nom}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 w-8 sm:h-9 sm:w-9"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
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
                          <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
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
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">Ouvrir</span>
                    </a>
                  </Button>
                  <Button asChild size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                    <a href={selectedDocument.url} download>
                      <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
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
              <DialogTitle className="flex items-center justify-between text-base sm:text-lg">
                <div className="flex items-center gap-2 truncate">
                  <Image className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate">Photo d'identité - {application?.stagiaire.prenom} {application?.stagiaire.nom}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPhotoModalOpen(false)}
                  className="h-8 w-8 sm:h-9 sm:w-9"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto flex items-center justify-center px-4 pb-4 sm:px-6 sm:pb-6">
              {selectedPhoto && (
                <div className="flex flex-col items-center">
                  <img 
                    src={selectedPhoto} 
                    alt={`Photo de ${application?.stagiaire.prenom} ${application?.stagiaire.nom}`}
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
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">Ouvrir</span>
                    </a>
                  </Button>
                  <Button asChild size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                    <a href={selectedPhoto} download={`photo-${application?.stagiaire.prenom}-${application?.stagiaire.nom}.${getFileExtension(selectedPhoto).toLowerCase()}`}>
                      <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">Télécharger</span>
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog pour l'ajout de rapport */}
        <Dialog open={isAddingRapport} onOpenChange={setIsAddingRapport}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Ajouter un rapport de stage
              </DialogTitle>
              <DialogDescription>
                Remplissez les informations pour ajouter votre rapport de stage
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rapport-titre">Titre du rapport *</Label>
                <Input
                  id="rapport-titre"
                  placeholder="Ex: Rapport de stage - Première partie"
                  value={newRapportTitre}
                  onChange={(e) => setNewRapportTitre(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Donnez un titre descriptif à votre rapport
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rapport-file">Fichier du rapport *</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    ref={rapportInputRef}
                    onChange={handleRapportFileSelect}
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    id="rapport-file"
                  />
                  <label
                    htmlFor="rapport-file"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm font-medium">
                      {newRapportFile ? newRapportFile.name : "Cliquez pour sélectionner un fichier"}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      PDF, DOC ou DOCX (max 10MB)
                    </span>
                  </label>
                </div>
                
                {newRapportFile && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium truncate">{newRapportFile.name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setNewRapportFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h5 className="text-sm font-medium text-blue-800 mb-1">Instructions</h5>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Le fichier doit être en format PDF, DOC ou DOCX</li>
                  <li>• Taille maximum : 10MB</li>
                  <li>• Donnez un titre clair et descriptif</li>
                  <li>• Vous pouvez ajouter plusieurs rapports</li>
                </ul>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingRapport(false);
                  setNewRapportTitre("");
                  setNewRapportFile(null);
                }}
                disabled={isSubmittingRapport}
              >
                Annuler
              </Button>
              <Button
                onClick={handleAddRapport}
                disabled={isSubmittingRapport || !newRapportTitre.trim() || !newRapportFile}
              >
                {isSubmittingRapport ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Ajout en cours...
                  </>
                ) : (
                  "Ajouter le rapport"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>

      <PublicFooter className="mt-auto" />
    </div>
  );
};

export default TrackApplication;
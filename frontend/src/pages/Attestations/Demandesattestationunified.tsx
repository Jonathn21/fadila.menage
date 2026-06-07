import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Clock, FileText, Eye, Trash2, Search, Filter, CheckCircle, XCircle, AlertCircle, User, Calendar, ExternalLink, Download, X, ChevronLeft, ChevronRight } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import apiClient from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ==============================
// INTERFACES ET TYPES
// ==============================

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
    remunere?: boolean;
    montant_remuneration?: number;
    lieu_stage?: string;
    superviseur?: string;
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

type SortField = keyof DemandeAttestation | 'nom_complet' | 'periode_stage' | 'date_demande';
type SortDirection = 'asc' | 'desc';

// Configuration des filtres par route
const ROUTE_CONFIG = {
  'toutes': {
    title: 'Demandes d\'attestation',
    endpoint: '/demandes-attestation/',
    filter: null,
    description: 'Gérez toutes les demandes d\'attestation de stage'
  },
  'en-attente': {
    title: 'Demandes d\'attestation en attente',
    endpoint: '/demandes-attestation/en-attente/',
    filter: 'en_attente',
    description: 'Demandes en attente de traitement'
  },
  'approuvees': {
    title: 'Demandes d\'attestation approuvées',
    endpoint: '/demandes-attestation/approuvees/',
    filter: 'approuvee',
    description: 'Demandes approuvées en attente de signature'
  },
  'refusees': {
    title: 'Demandes d\'attestation refusées',
    endpoint: '/demandes-attestation/refusees/',
    filter: 'refusee',
    description: 'Demandes refusées'
  },
  'traitees': {
    title: 'Demandes d\'attestation traitées',
    endpoint: '/demandes-attestation/traitees/',
    filter: 'traitee',
    description: 'Demandes complètement traitées'
  }
};

/**
 * Composant unifié pour la gestion des demandes d'attestation
 */
const DemandesAttestationUnified: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Déterminer le type de filtre basé sur la route actuelle
  const currentFilter = useMemo(() => {
    const path = location.pathname.split('/').pop() || 'toutes';
    return path as keyof typeof ROUTE_CONFIG;
  }, [location.pathname]);
  
  const config = ROUTE_CONFIG[currentFilter] || ROUTE_CONFIG['toutes'];
  
  // ==============================
  // ÉTATS DU COMPOSANT
  // ==============================
  
  const [demandes, setDemandes] = useState<DemandeAttestation[]>([]);
  const [filteredDemandes, setFilteredDemandes] = useState<DemandeAttestation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [directionFilter, setDirectionFilter] = useState("tous");
  const [selectedDelete, setSelectedDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [directions, setDirections] = useState<string[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<{
    open: boolean;
    demande: DemandeAttestation | null;
  }>({
    open: false,
    demande: null,
  });

  const [uploadModal, setUploadModal] = useState<{
    open: boolean;
    demande: DemandeAttestation | null;
    file: File | null;
    isUploading: boolean;
    uploadProgress: number;
  }>({
    open: false,
    demande: null,
    file: null,
    isUploading: false,
    uploadProgress: 0,
  });
  
  // États pour la pagination et le tri
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<SortField>('date_demande');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // État pour le modal de refus
  const [refuseModal, setRefuseModal] = useState<{
    open: boolean;
    demande: DemandeAttestation | null;
    motif: string;
    isSubmitting: boolean;
  }>({
    open: false,
    demande: null,
    motif: "",
    isSubmitting: false,
  });

  // État pour le modal de visualisation de document
  const [documentModal, setDocumentModal] = useState<{
    open: boolean;
    type: 'rapport' | 'demande' | 'attestation_generee' | 'attestation_signee' | null;
    url: string | null;
    title: string;
    stagiaireName: string;
  }>({
    open: false,
    type: null,
    url: null,
    title: '',
    stagiaireName: '',
  });

  // ==============================
  // FONCTIONS DE FORMATAGE DE DATE
  // ==============================

  const formatDateFr = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      const day = date.getDate();
      const month = date.toLocaleDateString('fr-FR', { month: 'long' });
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (error) {
      return 'Date invalide';
    }
  }, []);

  const formatDateCourt = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      return date.toLocaleDateString('fr-FR');
    } catch (error) {
      return 'Date invalide';
    }
  }, []);

  const formatDateHeureFr = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      const day = date.getDate();
      const month = date.toLocaleDateString('fr-FR', { month: 'long' });
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day} ${month} ${year} à ${hours}:${minutes}`;
    } catch (error) {
      return 'Date invalide';
    }
  }, []);

  // ==============================
  // FONCTIONS API
  // ==============================

  const fetchDemandes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(config.endpoint);
      
      let data;
      if (response.data.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (response.data.results && Array.isArray(response.data.results)) {
        data = response.data.results;
      } else if (Array.isArray(response.data)) {
        data = response.data;
      } else {
        data = [];
      }
      
      setDemandes(data);
      
      if (data.length > 0) {
        const uniqueDirections = [...new Set(
          data.map((d: DemandeAttestation) => d.stagiaire.direction).filter(Boolean)
        )] as string[];
        setDirections(uniqueDirections);
      }
      
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: `Impossible de charger les demandes: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [config.endpoint, toast]);

  const traiterDemande = useCallback(async (id: string, action: 'approuver' | 'refuser', motif?: string) => {
    try {
      const endpoint = action === 'approuver' 
        ? `/demandes-attestation/${id}/approuver/`
        : `/demandes-attestation/${id}/refuser/`;
      
      const data = action === 'refuser' ? { motif_refus: motif } : {};
      const response = await apiClient.post(endpoint, data);
      
      if (response.data.success) {
        toast({
          title: action === 'approuver' ? "Demande approuvée" : "Demande refusée",
          description: response.data.message,
          variant: "default",
        });
        fetchDemandes();
        
        if (action === 'refuser') {
          closeRefuseModal();
        }
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.message || `Impossible de ${action} la demande`,
        variant: "destructive",
      });
      
      if (action === 'refuser') {
        setRefuseModal(prev => ({ ...prev, isSubmitting: false }));
      }
    }
  }, [fetchDemandes, toast]);

  const telechargerDocument = useCallback((url: string, nom: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = nom;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const openUploadModal = useCallback((demande: DemandeAttestation) => {
    setUploadModal({
      open: true,
      demande,
      file: null,
      isUploading: false,
      uploadProgress: 0,
    });
  }, []);

  const closeUploadModal = useCallback(() => {
    setUploadModal({
      open: false,
      demande: null,
      file: null,
      isUploading: false,
      uploadProgress: 0,
    });
  }, []);

  const handleCloseDocumentsModal = useCallback(() => {
    setSelectedDocuments({
      open: false,
      demande: null,
    });
  }, []);

  const openRefuseModal = useCallback((demande: DemandeAttestation) => {
    setRefuseModal({
      open: true,
      demande,
      motif: demande.motif_refus || "",
      isSubmitting: false,
    });
  }, []);

  const closeRefuseModal = useCallback(() => {
    setRefuseModal({
      open: false,
      demande: null,
      motif: "",
      isSubmitting: false,
    });
  }, []);

  const submitRefuse = useCallback(async () => {
    if (!refuseModal.demande) return;
    
    if (!refuseModal.motif.trim()) {
      toast({
        title: "Motif requis",
        description: "Veuillez saisir le motif du refus.",
        variant: "destructive",
      });
      return;
    }
    
    if (refuseModal.motif.trim().length < 10) {
      toast({
        title: "Motif trop court",
        description: "Le motif doit contenir au moins 10 caractères.",
        variant: "destructive",
      });
      return;
    }
    
    setRefuseModal(prev => ({ ...prev, isSubmitting: true }));
    await traiterDemande(refuseModal.demande.id, 'refuser', refuseModal.motif.trim());
  }, [refuseModal, toast, traiterDemande]);

  const handleOpenDocumentsModal = useCallback((demande: DemandeAttestation) => {
    setSelectedDocuments({
      open: true,
      demande,
    });
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        toast({
          title: "Format invalide",
          description: "Seuls les fichiers PDF sont acceptés.",
          variant: "destructive",
        });
        return;
      }
      
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "Fichier trop volumineux",
          description: "La taille maximale autorisée est de 5 Mo.",
          variant: "destructive",
        });
        return;
      }
      
      setUploadModal(prev => ({ ...prev, file }));
    }
  }, [toast]);

  const uploadAttestationSignee = useCallback(async () => {
    if (!uploadModal.demande || !uploadModal.file) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier.",
        variant: "destructive",
      });
      return;
    }

    setUploadModal(prev => ({ ...prev, isUploading: true, uploadProgress: 0 }));

    try {
      const formData = new FormData();
      formData.append('attestation_signee', uploadModal.file);

      const response = await apiClient.post(
        `/demandes-attestation/${uploadModal.demande.id}/upload-attestation/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setUploadModal(prev => ({ ...prev, uploadProgress: percentCompleted }));
          },
        }
      );

      if (response.data.success) {
        toast({
          title: "Attestation signée uploadée",
          description: response.data.message || "L'attestation signée a été uploadée avec succès.",
          variant: "default",
        });
        
        fetchDemandes();
        closeUploadModal();
        handleCloseDocumentsModal();
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Impossible d'uploader l'attestation signée",
        variant: "destructive",
      });
    } finally {
      setUploadModal(prev => ({ ...prev, isUploading: false }));
    }
  }, [uploadModal, toast, fetchDemandes, closeUploadModal, handleCloseDocumentsModal]);

  const openDocumentModal = useCallback((
    type: 'rapport' | 'demande' | 'attestation_generee' | 'attestation_signee', 
    url: string, 
    stagiaireName: string
  ) => {
    const titles = {
      'rapport': 'Rapport de stage',
      'demande': 'Demande manuscrite',
      'attestation_generee': 'Attestation générée',
      'attestation_signee': 'Attestation signée'
    };
  
    setDocumentModal({
      open: true,
      type,
      url,
      title: titles[type],
      stagiaireName,
    });
  }, []);

  const closeDocumentModal = useCallback(() => {
    setDocumentModal({
      open: false,
      type: null,
      url: null,
      title: '',
      stagiaireName: '',
    });
  }, []);

  // ==============================
  // FONCTIONS DE TRI ET PAGINATION
  // ==============================

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField, sortDirection]);

  const sortDemandes = useCallback((demandes: DemandeAttestation[]) => {
    return [...demandes].sort((a, b) => {
      let avalue: unknown, bvalue: unknown;
      
      switch (sortField) {
        case 'nom_complet':
          aValue = `${a.stagiaire.nom} ${a.stagiaire.prenom}`.toLowerCase();
          bValue = `${b.stagiaire.nom} ${b.stagiaire.prenom}`.toLowerCase();
          break;
        case 'periode_stage':
          aValue = new Date(a.stagiaire.date_fin).getTime();
          bValue = new Date(b.stagiaire.date_fin).getTime();
          break;
        default:
          aValue = a[sortField as keyof DemandeAttestation];
          bValue = b[sortField as keyof DemandeAttestation];
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [sortField, sortDirection]);

  // ==============================
  // EFFETS
  // ==============================

  useEffect(() => {
    fetchDemandes();
  }, [fetchDemandes]);

  useEffect(() => {
    let result = [...demandes];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(d => 
        d.stagiaire.nom.toLowerCase().includes(query) ||
        d.stagiaire.prenom.toLowerCase().includes(query) ||
        d.stagiaire.email.toLowerCase().includes(query) ||
        d.stagiaire.direction?.toLowerCase().includes(query) ||
        d.stagiaire.service?.toLowerCase().includes(query)
      );
    }

    if (directionFilter !== "tous") {
      result = result.filter(d => d.stagiaire.direction === directionFilter);
    }

    result = sortDemandes(result);
    setCurrentPage(1);
    setFilteredDemandes(result);
  }, [demandes, searchQuery, directionFilter, sortDemandes]);

  // ==============================
  // FONCTIONS D'ACTIONS
  // ==============================

  const handleViewStagiaire = useCallback((stagiaireId: string) => {
    navigate(`/stagiaires/${stagiaireId}`);
  }, [navigate]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const response = await apiClient.delete(`/demandes-attestation/${id}/`);
      
      if (response.data.success || response.status === 204) {
        toast({
          title: "Supprimé",
          description: "La demande d'attestation a été supprimée.",
          variant: "default",
        });
        fetchDemandes();
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
  }, [fetchDemandes, toast]);

  const handleResetFilters = useCallback(() => {
    setSearchQuery("");
    setDirectionFilter("tous");
    setSortField('date_demande');
    setSortDirection('desc');
  }, []);

  // ==============================
  // FONCTIONS UTILITAIRES
  // ==============================

  const getStatusBadgeVariant = useCallback((status: string) => {
    switch (status) {
      case 'en_attente': return 'secondary';
      case 'approuvee': return 'default';
      case 'refusee': return 'destructive';
      default: return 'secondary';
    }
  }, []);

  const formatStatusText = useCallback((status: string) => {
    switch (status) {
      case 'en_attente': return 'En attente';
      case 'approuvee': return 'Approuvée';
      case 'refusee': return 'Refusée';
      default: return status;
    }
  }, []);

  const formatPeriode = useCallback((date_debut: string, date_fin: string) => {
    return `${formatDateFr(date_debut)} - ${formatDateFr(date_fin)}`;
  }, [formatDateFr]);

  const calculerDuree = useCallback((date_debut: string, date_fin: string) => {
    const debut = new Date(date_debut);
    const fin = new Date(date_fin);
    const diffTime = Math.abs(fin.getTime() - debut.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  // ==============================
  // PAGINATION
  // ==============================

  const paginatedDemandes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredDemandes.slice(startIndex, endIndex);
  }, [filteredDemandes, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredDemandes.length / itemsPerPage);
  }, [filteredDemandes.length, itemsPerPage]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const goToPreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  // ==============================
  // STATISTIQUES
  // ==============================

  const stats = useMemo(() => ({
    total: demandes.length,
    en_attente: demandes.filter(d => d.statut === 'en_attente').length,
    approuvees: demandes.filter(d => d.statut === 'approuvee').length,
    refusees: demandes.filter(d => d.statut === 'refusee').length,
  }), [demandes]);

  // ==============================
  // NAVIGATION PAR TABS
  // ==============================
  
  const handleTabChange = useCallback((value: string) => {
    navigate(`/attestations/${value}`);
  }, [navigate]);

  // ==============================
  // RENDU DU COMPOSANT
  // ==============================

  return (
    <DashboardLayout>
      <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* En-tête de la page */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
          <div className="flex flex-col gap-1 md:gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">{config.title}</h1>
            <CardDescription className="text-gray-600 text-sm md:text-base">
              {config.description}
            </CardDescription>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <Card className="col-span-1">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Total demandes</p>
                  <h3 className="text-lg md:text-2xl font-bold text-gray-900">{stats.total}</h3>
                </div>
                <div className="h-8 w-8 md:h-12 md:w-12 rounded-full bg-gray-50 flex items-center justify-center">
                  <FileText className="h-4 w-4 md:h-6 md:w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-1">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">En attente</p>
                  <h3 className="text-lg md:text-2xl font-bold text-gray-900">{stats.en_attente}</h3>
                </div>
                <div className="h-8 w-8 md:h-12 md:w-12 rounded-full bg-yellow-50 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 md:h-6 md:w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-1">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Approuvées</p>
                  <h3 className="text-lg md:text-2xl font-bold text-gray-900">{stats.approuvees}</h3>
                </div>
                <div className="h-8 w-8 md:h-12 md:w-12 rounded-full bg-gray-50 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 md:h-6 md:w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-1">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Refusées</p>
                  <h3 className="text-lg md:text-2xl font-bold text-gray-900">{stats.refusees}</h3>
                </div>
                <div className="h-8 w-8 md:h-12 md:w-12 rounded-full bg-red-50 flex items-center justify-center">
                  <XCircle className="h-4 w-4 md:h-6 md:w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600" />
                <Input
                  placeholder="Rechercher un stagiaire, email, direction..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                <Select value={directionFilter} onValueChange={setDirectionFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Toutes les directions</SelectItem>
                    {directions.map((dir) => (
                      <SelectItem key={dir} value={dir}>{dir}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  className="text-gray-700 hover:bg-gray-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
         
        {/* Tableau des demandes */}
        <Card>
          <CardContent className="pt-4 md:pt-6">
            {loading ? (
              <div className="space-y-3 md:space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full bg-gray-100" />
                ))}
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0 mb-4">
                  <h3 className="font-semibold text-gray-900 text-base md:text-lg">
                    {filteredDemandes.length} demande{filteredDemandes.length !== 1 ? 's' : ''} d'attestation
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Afficher</span>
                    <Select 
                      value={itemsPerPage.toString()} 
                      onValueChange={(value) => setItemsPerPage(Number(value))}
                    >
                      <SelectTrigger className="w-[80px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-600">par page</span>
                  </div>
                </div>
                
                {/* Version Desktop - Table */}
                <div className="hidden lg:block border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/30">
                          <TableHead className="text-gray-900 font-medium">
                            <Button
                              variant="ghost"
                              className="p-0 h-auto font-medium hover:bg-transparent flex items-center gap-1"
                              onClick={() => handleSort('nom_complet')}
                            >
                              <span>Stagiaire</span>
                              {sortField === 'nom_complet' && (
                                <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </Button>
                          </TableHead>
                          <TableHead className="text-gray-900 font-medium">
                            <Button
                              variant="ghost"
                              className="p-0 h-auto font-medium hover:bg-transparent flex items-center gap-1"
                              onClick={() => handleSort('periode_stage')}
                            >
                              <span>Période de stage</span>
                              {sortField === 'periode_stage' && (
                                <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </Button>
                          </TableHead>
                          <TableHead className="text-gray-900 font-medium">
                            <Button
                              variant="ghost"
                              className="p-0 h-auto font-medium hover:bg-transparent flex items-center gap-1"
                              onClick={() => handleSort('statut')}
                            >
                              <span>Statut</span>
                              {sortField === 'statut' && (
                                <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </Button>
                          </TableHead>
                          <TableHead className="text-gray-900 font-medium">
                            <Button
                              variant="ghost"
                              className="p-0 h-auto font-medium hover:bg-transparent flex items-center gap-1"
                              onClick={() => handleSort('date_demande')}
                            >
                              <span>Date demande</span>
                              {sortField === 'date_demande' && (
                                <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </Button>
                          </TableHead>
                          <TableHead className="text-gray-900 font-medium text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedDemandes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="p-4 sm:p-6 md:p-8 text-center">
                              <div className="text-center py-4 sm:py-6 md:py-8 md:py-12">
                                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="font-medium text-lg mb-1">Aucune demande d'attestation</h3>
                                <p className="text-gray-600">
                                  Aucune demande ne correspond à vos critères de recherche
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedDemandes.map((demande) => (
                            <TableRow key={demande.id} className="hover:bg-gray-50/30 transition-colors">
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-900">{demande.stagiaire.nom}</span>
                                  <span className="text-sm text-gray-600">{demande.stagiaire.prenom}</span>
                                  <span className="text-xs text-gray-500 truncate max-w-[200px]">{demande.stagiaire.email}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <div className="flex items-center">
                                    <Calendar className="mr-2 h-4 w-4 text-gray-600" />
                                    <span className="text-sm">{formatPeriode(demande.stagiaire.date_debut, demande.stagiaire.date_fin)}</span>
                                  </div>
                                  <span className="text-xs text-gray-600 ml-6">
                                    {calculerDuree(demande.stagiaire.date_debut, demande.stagiaire.date_fin)} jours
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusBadgeVariant(demande.statut)} className="capitalize">
                                  {formatStatusText(demande.statut)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <Clock className="mr-2 h-4 w-4 text-gray-600" />
                                  <div className="flex flex-col">
                                    <span className="text-sm">{formatDateFr(demande.date_demande)}</span>
                                    <span className="text-xs text-gray-600">
                                      {new Date(demande.date_demande).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="icon"
                                    onClick={() => handleOpenDocumentsModal(demande)}
                                    title="Voir les documents"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {demande.statut === 'en_attente' && (
                                    <>
                                      <Button 
                                        variant="outline" 
                                        size="icon"
                                        onClick={() => traiterDemande(demande.id, 'approuver')}
                                        title="Approuver la demande"
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="icon"
                                        className="border-red-200 text-red-600 hover:bg-red-50"
                                        onClick={() => openRefuseModal(demande)}
                                        title="Refuser la demande"
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                  {demande.statut === 'approuvee' && 
                                   demande.fichiers?.attestation_generee && 
                                   !demande.fichiers?.attestation_signee && (
                                    <Button 
                                      variant="outline" 
                                      size="icon"
                                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                                      onClick={() => openUploadModal(demande)}
                                      title="Uploader l'attestation signée"
                                    >
                                      <Upload className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Version Mobile - Cards */}
                <div className="lg:hidden space-y-3 md:space-y-4">
                  {paginatedDemandes.length === 0 ? (
                    <div className="text-center py-4 sm:py-6 md:py-8 md:py-12">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="font-medium text-lg mb-1">Aucune demande d'attestation</h3>
                      <p className="text-gray-600">
                        Aucune demande ne correspond à vos critères de recherche
                      </p>
                    </div>
                  ) : (
                    paginatedDemandes.map((demande) => (
                      <Card key={demande.id}>
                        <CardContent className="p-3 md:p-4">
                          <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                              <div className="flex-1">
                                <h4 className="font-semibold text-base">
                                  {demande.stagiaire.nom} {demande.stagiaire.prenom}
                                </h4>
                                <p className="text-sm text-gray-600 mt-1 truncate">
                                  {demande.stagiaire.email}
                                </p>
                              </div>
                              <Badge variant={getStatusBadgeVariant(demande.statut)} className="capitalize shrink-0 ml-2">
                                {formatStatusText(demande.statut)}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="space-y-1">
                                <span className="font-medium text-gray-700">Période</span>
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1 text-gray-600" />
                                  <span className="text-xs">{formatPeriode(demande.stagiaire.date_debut, demande.stagiaire.date_fin)}</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="font-medium text-gray-700">Date demande</span>
                                <div className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1 text-gray-600" />
                                  <span className="text-xs">{formatDateFr(demande.date_demande)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleOpenDocumentsModal(demande)}
                              >
                                <Eye className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                                <span className="hidden sm:inline">Documents</span>
                              </Button>
                              
                              {demande.statut === 'en_attente' && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => traiterDemande(demande.id, 'approuver')}
                                  >
                                    <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                                    <span className="hidden sm:inline">Approuver</span>
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="border-red-200 text-red-600 hover:bg-red-50"
                                    onClick={() => openRefuseModal(demande)}
                                  >
                                    <XCircle className="h-3 w-3 md:h-4 md:w-4" />
                                    <span className="hidden sm:inline">Refuser</span>
                                  </Button>
                                </>
                              )}
                              {demande.statut === 'approuvee' && 
                               demande.fichiers?.attestation_generee && 
                               !demande.fichiers?.attestation_signee && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                                  onClick={() => openUploadModal(demande)}
                                >
                                  <Upload className="h-3 w-3 md:h-4 md:w-4" />
                                  <span className="hidden sm:inline">Upload</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {paginatedDemandes.length > 0 && (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-4 md:pt-6 border-t mt-4 md:mt-6">
                    <div className="text-sm text-gray-600">
                      Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, filteredDemandes.length)} sur {filteredDemandes.length} demande{filteredDemandes.length !== 1 ? 's' : ''}
                    </div>
                    
                    <div className="flex items-center gap-1 md:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden md:inline ml-1">Précédent</span>
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => goToPage(pageNum)}
                              className={`${
                                currentPage === pageNum 
                                  ? "bg-red-600 hover:bg-red-700 text-white" 
                                  : ""
                              } min-w-[40px]`}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                      >
                        <span className="hidden md:inline mr-1">Suivant</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedDelete && (
              <DeleteConfirmDialog
                title="Supprimer cette demande d'attestation ?"
                description="Êtes-vous sûr de vouloir supprimer cette demande d'attestation ? Cette action est irréversible."
                onConfirm={() => handleDelete(selectedDelete)}
                open={true}
                onOpenChange={(open) => !open && setSelectedDelete(null)}
              />
            )}
          </CardContent>
        </Card>

        {selectedDocuments.open && selectedDocuments.demande && (
            <Dialog open={selectedDocuments.open} onOpenChange={handleCloseDocumentsModal}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto ">
                <DialogHeader>
                <DialogTitle className="text-gray-900">Documents de la demande d'attestation</DialogTitle>
                <DialogDescription className="text-gray-600">
                    Documents pour {selectedDocuments.demande.stagiaire.nom} {selectedDocuments.demande.stagiaire.prenom}
                </DialogDescription>
                </DialogHeader>
                
                <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
                {/* Informations de la demande */}
                <Card className="">
                    <CardContent className="pt-4 md:pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                        <div className="space-y-1 md:space-y-2">
                        <div>
                            <span className="text-xs md:text-sm font-medium text-gray-600">Stagiaire :</span>
                            <p className="font-medium text-gray-900 text-sm md:text-base">
                            {selectedDocuments.demande.stagiaire.nom} {selectedDocuments.demande.stagiaire.prenom}
                            </p>
                        </div>
                        <div>
                            <span className="text-xs md:text-sm font-medium text-gray-600">Email :</span>
                            <p className="text-gray-900 text-sm md:text-base truncate">{selectedDocuments.demande.stagiaire.email}</p>
                        </div>
                        </div>
                        <div className="space-y-1 md:space-y-2">
                        <div>
                            <span className="text-xs md:text-sm font-medium text-gray-600">Statut :</span>
                            <Badge 
                            variant={getStatusBadgeVariant(selectedDocuments.demande.statut)} 
                            className="ml-1 md:ml-2 capitalize text-xs md:text-sm"
                            >
                            {formatStatusText(selectedDocuments.demande.statut)}
                            </Badge>
                        </div>
                        <div>
                            <span className="text-xs md:text-sm font-medium text-gray-600">Date de demande :</span>
                            <p className="text-gray-900 text-sm md:text-base">
                            {formatDateFr(selectedDocuments.demande.date_demande)}
                            </p>
                        </div>
                        </div>
                        <div className="space-y-1 md:space-y-2">
                        <div>
                            <span className="text-xs md:text-sm font-medium text-gray-600">Période de stage :</span>
                            <p className="text-gray-900 text-sm md:text-base">
                            {formatPeriode(
                                selectedDocuments.demande.stagiaire.date_debut, 
                                selectedDocuments.demande.stagiaire.date_fin
                            )}
                            </p>
                        </div>
                        <div>
                            <span className="text-xs md:text-sm font-medium text-gray-600">Direction/Service :</span>
                            <p className="text-gray-900 text-sm md:text-base truncate">
                            {selectedDocuments.demande.stagiaire.direction} / {selectedDocuments.demande.stagiaire.service}
                            </p>
                        </div>
                        </div>
                    </div>
                    </CardContent>
                </Card>

                {/* Section pour le motif de refus (uniquement si refusée) */}
                {selectedDocuments.demande.statut === 'refusee' && selectedDocuments.demande.motif_refus && (
                    <Card className="border-red-200 bg-red-50/30">
                    <CardHeader className="pb-2 md:pb-3">
                        <CardTitle className="flex items-center text-red-800 text-base md:text-lg">
                        <XCircle className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                        Motif du refus
                        </CardTitle>
                        <CardDescription className="text-red-600 text-xs md:text-sm">
                        Cette demande a été refusée pour le motif suivant :
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="p-3 md:p-4 bg-white rounded-lg border border-red-200">
                        <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                            <div className="flex-1">
                            <p className="text-red-900 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                                {selectedDocuments.demande.motif_refus}
                            </p>
                            </div>
                            <div>
                            {selectedDocuments.demande.date_traitement && (
                                <div className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                                Refusé le {formatDateFr(selectedDocuments.demande.date_traitement)}
                                </div>
                            )}
                            </div>
                        </div>
                        </div>
                    </CardContent>
                    </Card>
                )}

                {/* Documents */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {/* Rapport de stage */}
                    {selectedDocuments.demande.fichiers?.rapport_stage ? (
                    <Card className="">
                        <CardHeader>
                        <CardTitle className="text-base md:text-lg flex items-center text-gray-900">
                            <FileText className="h-4 w-4 md:h-5 md:w-5 mr-2 text-gray-600" />
                            Rapport de stage
                        </CardTitle>
                        </CardHeader>
                        <CardContent>
                        <div className="space-y-3 md:space-y-4">
                            <div className="aspect-video bg-gray-50 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                                <FileText className="h-8 w-8 md:h-12 md:w-12 mx-auto text-gray-400 mb-1 md:mb-2" />
                                <p className="text-xs md:text-sm text-gray-600">Document PDF</p>
                            </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                                variant="default"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => openDocumentModal(
                                'rapport',
                                selectedDocuments.demande!.fichiers.rapport_stage!,
                                `${selectedDocuments.demande!.stagiaire.nom}`
                                )}
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                Visualiser
                            </Button>
                            <Button
                                variant="outline"
                                className=" text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300"
                                onClick={() => telechargerDocument(
                                selectedDocuments.demande!.fichiers.rapport_stage!,
                                `rapport_stage_${selectedDocuments.demande!.stagiaire.nom}.pdf`
                                )}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Télécharger
                            </Button>
                            </div>
                        </div>
                        </CardContent>
                    </Card>
                    ) : (
                    <Card className="">
                        <CardHeader>
                        <CardTitle className="text-base md:text-lg text-gray-900">Rapport de stage</CardTitle>
                        </CardHeader>
                        <CardContent>
                        <div className="text-center py-4 md:py-6">
                            <AlertCircle className="h-8 w-8 md:h-12 md:w-12 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-600 text-sm md:text-base">Aucun rapport de stage disponible</p>
                        </div>
                        </CardContent>
                    </Card>
                    )}

                    {/* Demande manuscrite */}
                    {selectedDocuments.demande.fichiers?.demande_manuscrite ? (
                    <Card className="">
                        <CardHeader>
                        <CardTitle className="text-base md:text-lg flex items-center text-gray-900">
                            <FileText className="h-4 w-4 md:h-5 md:w-5 mr-2 text-gray-600" />
                            Demande manuscrite
                        </CardTitle>
                        </CardHeader>
                        <CardContent>
                        <div className="space-y-3 md:space-y-4">
                            <div className="aspect-video bg-gray-50 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                                <FileText className="h-8 w-8 md:h-12 md:w-12 mx-auto text-gray-400 mb-1 md:mb-2" />
                                <p className="text-xs md:text-sm text-gray-600">Document PDF</p>
                            </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                                variant="default"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => openDocumentModal(
                                'demande',
                                selectedDocuments.demande!.fichiers.demande_manuscrite!,
                                `${selectedDocuments.demande!.stagiaire.nom}`
                                )}
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                Visualiser
                            </Button>
                            <Button
                                variant="outline"
                                className=" text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300"
                                onClick={() => telechargerDocument(
                                selectedDocuments.demande!.fichiers.demande_manuscrite!,
                                `demande_manuscrite_${selectedDocuments.demande!.stagiaire.nom}.pdf`
                                )}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Télécharger
                            </Button>
                            </div>
                        </div>
                        </CardContent>
                    </Card>
                    ) : (
                    <Card className="">
                        <CardHeader>
                        <CardTitle className="text-base md:text-lg text-gray-900">Demande manuscrite</CardTitle>
                        </CardHeader>
                        <CardContent>
                        <div className="text-center py-4 md:py-6">
                            <AlertCircle className="h-8 w-8 md:h-12 md:w-12 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-600 text-sm md:text-base">Aucune demande manuscrite disponible</p>
                        </div>
                        </CardContent>
                    </Card>
                    )}
                    {selectedDocuments.demande.fichiers?.attestation_generee ? (
                    <Card>
                    <CardHeader>
                        <CardTitle className="text-base md:text-lg flex items-center text-gray-900">
                        <FileText className="h-4 w-4 md:h-5 md:w-5 mr-2 text-gray-600" />
                        Attestation générée
                        <Badge variant="default" className="ml-2 text-xs">PDF</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 md:space-y-4">
                        <div className="aspect-video bg-gray-50 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                            <FileText className="h-8 w-8 md:h-12 md:w-12 mx-auto text-gray-400 mb-1 md:mb-2" />
                            <p className="text-xs md:text-sm text-gray-600">Attestation PDF</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                            variant="default"
                            className="bg-gray-600 hover:bg-gray-700 text-white"
                            onClick={() => openDocumentModal(
                                'attestation_generee' as any,
                                selectedDocuments.demande!.fichiers.attestation_generee!,
                                `${selectedDocuments.demande!.stagiaire.nom}`
                            )}
                            >
                            <Eye className="h-4 w-4 mr-2" />
                            Visualiser
                            </Button>
                            <Button
                            variant="outline"
                            className=" text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300"
                            onClick={() => telechargerDocument(
                                selectedDocuments.demande!.fichiers.attestation_generee!,
                                `attestation_generee_${selectedDocuments.demande!.stagiaire.nom}.pdf`
                            )}
                            >
                            <Download className="h-4 w-4 mr-2" />
                            Télécharger
                            </Button>
                        </div>
                        </div>
                    </CardContent>
                    </Card>
                ) : selectedDocuments.demande.statut === 'approuvee' ? (
                    <Card className="border-yellow-200 bg-yellow-50/30">
                    <CardHeader>
                        <CardTitle className="text-base md:text-lg text-yellow-900">Attestation générée</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-4 md:py-6">
                        <AlertCircle className="h-8 w-8 md:h-12 md:w-12 mx-auto text-yellow-400 mb-2" />
                        <p className="text-yellow-600 text-sm md:text-base">
                            Attestation en cours de génération...
                        </p>
                        </div>
                    </CardContent>
                    </Card>
                ) : null}

                {/* ✅ AJOUT: Attestation signée */}
                {selectedDocuments.demande.fichiers?.attestation_signee ? (
                    <Card className=" bg-gray-50/30">
                    <CardHeader>
                        <CardTitle className="text-base md:text-lg flex items-center text-gray-900">
                        <CheckCircle className="h-4 w-4 md:h-5 md:w-5 mr-2 text-gray-600" />
                        Attestation signée
                        <Badge variant="default" className="ml-2 text-xs bg-gray-600">Finale</Badge>
                        </CardTitle>
                        {selectedDocuments.demande.date_upload_attestation_signee && (
                        <p className="text-xs text-gray-600 mt-1">
                            Uploadée le {formatDateHeureFr(selectedDocuments.demande.date_upload_attestation_signee)}
                        </p>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 md:space-y-4">
                        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center border-2 border-gray-300">
                            <div className="text-center">
                            <CheckCircle className="h-8 w-8 md:h-12 md:w-12 mx-auto text-gray-600 mb-1 md:mb-2" />
                            <p className="text-xs md:text-sm text-gray-700 font-medium">Document signé</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                            variant="default"
                            className="bg-gray-600 hover:bg-gray-700 text-white"
                            onClick={() => openDocumentModal(
                                'attestation_signee' as any,
                                selectedDocuments.demande!.fichiers.attestation_signee!,
                                `${selectedDocuments.demande!.stagiaire.nom}`
                            )}
                            >
                            <Eye className="h-4 w-4 mr-2" />
                            Visualiser
                            </Button>
                            <Button
                            variant="outline"
                            className=" text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300"
                            onClick={() => telechargerDocument(
                                selectedDocuments.demande!.fichiers.attestation_signee!,
                                `attestation_signee_${selectedDocuments.demande!.stagiaire.nom}.pdf`
                            )}
                            >
                            <Download className="h-4 w-4 mr-2" />
                            Télécharger
                            </Button>
                        </div>
                        </div>
                    </CardContent>
                    </Card>
                ) : selectedDocuments.demande.statut === 'approuvee' ? (
                    <Card className="border-blue-200 bg-blue-50/30">
                    <CardHeader>
                        <CardTitle className="text-base md:text-lg text-blue-900">Attestation signée</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-4 md:py-6">
                        <Clock className="h-8 w-8 md:h-12 md:w-12 mx-auto text-blue-400 mb-2" />
                        <p className="text-blue-600 text-sm md:text-base">
                            En attente de signature et d'upload
                        </p>
                        </div>
                    </CardContent>
                    </Card>
                ) : null}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-between gap-3 md:gap-0 pt-3 md:pt-4 border-t ">
                    <div>
                    {selectedDocuments.demande.statut === 'en_attente' && (
                        <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            className=" text-gray-600 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300"
                            onClick={() => {
                            handleCloseDocumentsModal();
                            traiterDemande(selectedDocuments.demande!.id, 'approuver');
                            }}
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approuver
                        </Button>
                        <Button
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                            onClick={() => {
                            handleCloseDocumentsModal();
                            openRefuseModal(selectedDocuments.demande!);
                            }}
                        >
                            <XCircle className="h-4 w-4 mr-2" />
                            Refuser
                        </Button>
                        </div>
                    )}
                    
                    {/* NOUVEAU: Bouton pour uploader l'attestation signée */}
                    {selectedDocuments.demande.statut === 'approuvee' && 
                    selectedDocuments.demande.fichiers?.attestation_generee && 
                    !selectedDocuments.demande.fichiers?.attestation_signee && (
                        <Button
                        variant="default"
                        className="bg-gray-600 hover:bg-gray-700 text-white"
                        onClick={() => {
                            handleCloseDocumentsModal();
                            openUploadModal(selectedDocuments.demande!);
                        }}
                        >
                        <Upload className="h-4 w-4 mr-2" />
                        Uploader l'attestation signée
                        </Button>
                    )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={handleCloseDocumentsModal} className=" text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300">
                        Fermer
                    </Button>
                    <Button
                        variant="default"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => handleViewStagiaire(selectedDocuments.demande!.stagiaire.id)}
                    >
                        <User className="h-4 w-4 mr-2" />
                        Profil stagiaire
                    </Button>
                    </div>
                </div>
                </div>
            </DialogContent>
            </Dialog>
        )}

        {/* Modal pour visualiser un document */}
        <Dialog open={documentModal.open} onOpenChange={closeDocumentModal}>
            <DialogContent className="max-w-5xl max-h-[90dvh]  p-0 sm:rounded-lg">
            <div className="flex flex-col h-full">
                {/* En-tête du modal */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 md:gap-3 p-3 md:p-4 lg:p-6 border-b  bg-gray-50/30">
                <div className="flex items-center gap-1 md:gap-2 min-w-0">
                    <FileText className="h-4 w-4 md:h-5 md:w-5 text-gray-600 flex-shrink-0" />
                    <DialogTitle className="text-gray-900 m-0 truncate text-sm md:text-base lg:text-lg">
                    {documentModal.title} - {documentModal.stagiaireName}
                    </DialogTitle>
                </div>
                
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeDocumentModal}
                    className="absolute right-2 top-2 md:relative md:right-0 md:top-0"
                >
                    <X className="h-4 w-4" />
                </Button>
                </div>

                {/* Contenu du document */}
                <div className="flex-1 p-3 md:p-4 lg:p-6 overflow-auto">
                {documentModal.url ? (
                    <div className="h-full flex flex-col">
                    <div className="border  rounded-lg overflow-hidden bg-white flex-1 min-h-[300px] md:min-h-[400px] lg:min-h-[500px]">
                        <iframe
                        src={documentModal.url}
                        className="w-full h-full min-h-[300px] md:min-h-[400px] lg:min-h-[500px]"
                        title={documentModal.title}
                        style={{ border: 'none' }}
                        loading="lazy"
                        />
                    </div>
                    <div className="mt-3 md:mt-4 text-center text-xs md:text-sm text-gray-600">
                        <p>Document PDF - {documentModal.title}</p>
                    </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] py-6 md:py-8 lg:py-12 px-3 md:px-4">
                    <AlertCircle className="h-8 w-8 md:h-12 md:w-12 lg:h-16 lg:w-16 text-gray-400 mb-3 md:mb-4" />
                    <h3 className="text-sm md:text-base lg:text-lg font-medium text-gray-900 mb-1 md:mb-2 text-center">
                        Document non disponible
                    </h3>
                    <p className="text-gray-600 text-xs md:text-sm lg:text-base text-center">
                        Le document demandé n'est pas accessible.
                    </p>
                    </div>
                )}
                </div>

                {/* Pied du modal */}
                <div className="p-3 md:p-4 lg:p-6 border-t  bg-gray-50/30">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 md:gap-4">
                    <div className="text-xs md:text-sm text-gray-600 text-center sm:text-left sm:hidden mb-2">
                    Visualisation intégrée du document
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                    {documentModal.url && (
                        <Button
                        variant="outline"
                        size="sm"
                        className=" text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300 flex-1 sm:flex-none"
                        onClick={() => {
                            telechargerDocument(
                            documentModal.url!,
                            `${documentModal.type === 'rapport' ? 'rapport_stage' : 'demande_manuscrite'}_${documentModal.stagiaireName}.pdf`
                            );
                        }}
                        >
                        <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        <span>Télécharger</span>
                        </Button>
                    )}
                    
                    <Button 
                        variant="outline" 
                        onClick={closeDocumentModal} 
                        className=" text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300 flex-1 sm:flex-none"
                    >
                        Fermer
                    </Button>
                    </div>
                </div>
                </div>
            </div>
            </DialogContent>
        </Dialog>

        {/* Modal pour refuser une demande */}
        <Dialog open={refuseModal.open} onOpenChange={closeRefuseModal}>
            <DialogContent className="max-w-[500px] ">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-gray-900 text-base md:text-lg">
                <XCircle className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
                Refuser la demande d'attestation
                </DialogTitle>
                <DialogDescription className="text-gray-600 text-sm md:text-base">
                Veuillez indiquer le motif du refus pour la demande de 
                {refuseModal.demande && ` ${refuseModal.demande.stagiaire.nom} ${refuseModal.demande.stagiaire.prenom}`}
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 md:space-y-4 py-3 md:py-4">
                <div className="space-y-2">
                <Label htmlFor="motif-refus" className="text-gray-900 text-sm md:text-base">
                    Motif du refus <span className="text-red-500">*</span>
                </Label>
                <Textarea
                    id="motif-refus"
                    placeholder="Ex: Le rapport de stage ne respecte pas les critères exigés, incomplet..."
                    value={refuseModal.motif}
                    onChange={(e) => setRefuseModal(prev => ({ ...prev, motif: e.target.value }))}
                    className="min-h-[100px] md:min-h-[120px] resize-y  focus:border-gray-400 focus:ring-gray-400 text-gray-900 text-sm md:text-base"
                    disabled={refuseModal.isSubmitting}
                />
                
                {/* Section: Motif de refus - Suggestions prédéfinies */}
                <div className="space-y-2">
                    <Label className="text-xs md:text-sm font-medium text-gray-900">
                    Suggestions de motifs courants
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2">
                    {[
                        "Rapport de stage incomplet ou non conforme",
                        "Absence de demande manuscrite signée",
                        "Période de stage non validée par le tuteur",
                        "Évaluation du stage insatisfaisante",
                        "Documents manquants ou illisibles",
                        "Non-respect des délais de soumission",
                    ].map((motif, index) => (
                        <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="justify-start h-auto py-1 md:py-2 px-2 md:px-3 text-xs md:text-sm  text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300 text-left"
                        onClick={() => setRefuseModal(prev => ({ 
                            ...prev, 
                            motif: prev.motif ? `${prev.motif} ${motif}` : motif 
                        }))}
                        disabled={refuseModal.isSubmitting}
                        >
                        <span className="truncate">{motif}</span>
                        </Button>
                    ))}
                    </div>
                </div>

                {/* Section: Historique des refus similaires */}
                {refuseModal.demande && (
                    <div className="space-y-2 pt-3 md:pt-4 border-t ">
                    <Label className="text-xs md:text-sm font-medium text-gray-900">
                        Historique des motifs de refus similaires
                    </Label>
                    <div className="space-y-2 max-h-32 md:max-h-40 overflow-y-auto pr-1 md:pr-2">
                        {demandes
                        .filter(d => 
                            d.statut === 'refusee' && 
                            d.motif_refus && 
                            d.id !== refuseModal.demande?.id &&
                            (d.stagiaire.direction === refuseModal.demande.stagiaire.direction ||
                            d.stagiaire.service === refuseModal.demande.stagiaire.service)
                        )
                        .slice(0, 3) // Limiter à 3 exemples
                        .map((demande, index) => (
                            <div 
                            key={demande.id}
                            className="p-2 md:p-3 bg-gray-50/50 rounded-lg border  hover:bg-gray-100/50 transition-colors cursor-pointer"
                            onClick={() => setRefuseModal(prev => ({ 
                                ...prev, 
                                motif: demande.motif_refus || "" 
                            }))}
                            >
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-2 sm:gap-0">
                                <span className="text-xs md:text-sm font-medium text-gray-900">
                                {demande.stagiaire.nom} {demande.stagiaire.prenom}
                                </span>
                                <span className="text-xs text-gray-600">
                                {formatDateCourt(demande.date_traitement || demande.date_demande)}
                                </span>
                            </div>
                            <p className="text-xs md:text-sm text-gray-700 line-clamp-2">
                                {demande.motif_refus}
                            </p>
                            </div>
                        ))}
                        {demandes.filter(d => d.statut === 'refusee' && d.motif_refus).length === 0 && (
                        <p className="text-xs md:text-sm text-gray-600 italic text-center py-1 md:py-2">
                            Aucun historique de refus disponible
                        </p>
                        )}
                    </div>
                    </div>
                )}
                
                <p className="text-xs md:text-sm text-gray-600">
                    Minimum 10 caractères. Ce motif sera visible par le stagiaire.
                </p>
                </div>
            </div>

            <DialogFooter className="gap-2">
                <Button
                variant="outline"
                onClick={closeRefuseModal}
                disabled={refuseModal.isSubmitting}
                className=" text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300"
                >
                Annuler
                </Button>
                <Button
                variant="destructive"
                onClick={submitRefuse}
                disabled={refuseModal.isSubmitting || !refuseModal.motif.trim() || refuseModal.motif.trim().length < 10}
                >
                {refuseModal.isSubmitting ? (
                    <>
                    <span className="animate-spin mr-2">⟳</span>
                    Traitement...
                    </>
                ) : (
                    <>
                    <XCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    Confirmer le refus
                    </>
                )}
                </Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={uploadModal.open} onOpenChange={closeUploadModal}>
            <DialogContent className="max-w-[500px] ">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-gray-900 text-base md:text-lg">
                <Upload className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
                Uploader l'attestation signée
                </DialogTitle>
                <DialogDescription className="text-gray-600 text-sm md:text-base">
                {uploadModal.demande && (
                    <>
                    Uploadez l'attestation signée pour{' '}
                    <span className="font-medium">
                        {uploadModal.demande.stagiaire.nom} {uploadModal.demande.stagiaire.prenom}
                    </span>
                    </>
                )}
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
                {/* Information sur l'attestation générée */}
                {uploadModal.demande?.fichiers?.attestation_generee && (
                <Card className="border-blue-200 bg-blue-50/30">
                    <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 mb-1">
                            Attestation générée disponible
                        </p>
                        <p className="text-xs text-blue-700">
                            Une attestation a déjà été générée. Veuillez la télécharger, la faire signer, puis uploader la version signée.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                            if (uploadModal.demande?.fichiers?.attestation_generee) {
                                telechargerDocument(
                                uploadModal.demande.fichiers.attestation_generee,
                                `attestation_${uploadModal.demande.stagiaire.nom}.pdf`
                                );
                            }
                            }}
                        >
                            <Download className="h-3 w-3 mr-2" />
                            Télécharger l'attestation à signer
                        </Button>
                        </div>
                    </div>
                    </CardContent>
                </Card>
                )}

                {/* Zone de sélection du fichier */}
                <div className="space-y-2">
                <Label htmlFor="attestation-file" className="text-gray-900">
                    Sélectionner l'attestation signée <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-2">
                    <Input
                    id="attestation-file"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    disabled={uploadModal.isUploading}
                    className=" focus:border-gray-400 focus:ring-gray-400"
                    />
                </div>
                <p className="text-xs text-gray-600">
                    Format accepté: PDF uniquement. Taille maximale: 5 Mo
                </p>
                </div>

                {/* Aperçu du fichier sélectionné */}
                {uploadModal.file && (
                <Card className=" bg-gray-50/30">
                    <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-gray-600" />
                        <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {uploadModal.file.name}
                        </p>
                        <p className="text-xs text-gray-600">
                            {(uploadModal.file.size / 1024).toFixed(2)} Ko
                        </p>
                        </div>
                        {!uploadModal.isUploading && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setUploadModal(prev => ({ ...prev, file: null }))}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                        )}
                    </div>
                    </CardContent>
                </Card>
                )}

                {/* Barre de progression */}
                {uploadModal.isUploading && (
                <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between text-sm gap-2 sm:gap-0">
                    <span className="text-red-700">Upload en cours...</span>
                    <span className="text-red-900 font-medium">{uploadModal.uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-red-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                        className="bg-red-600 h-2.5 transition-all duration-300 ease-out"
                        style={{ width: `${uploadModal.uploadProgress}%` }}
                    />
                    </div>
                </div>
                )}

                {/* Message d'information */}
                <Card className="border-yellow-200 bg-yellow-50/30">
                <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-800">
                        Une fois uploadée, l'attestation signée sera automatiquement envoyée au stagiaire par email. 
                        Le statut de la demande passera à "Traitée".
                    </p>
                    </div>
                </CardContent>
                </Card>
            </div>

            <DialogFooter className="gap-2">
                <Button
                variant="outline"
                onClick={closeUploadModal}
                disabled={uploadModal.isUploading}
                className=" text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300"
                >
                Annuler
                </Button>
                <Button
                variant="default"
                onClick={uploadAttestationSignee}
                disabled={!uploadModal.file || uploadModal.isUploading}
                className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                {uploadModal.isUploading ? (
                    <>
                    <span className="animate-spin mr-2">⟳</span>
                    Upload en cours...
                    </>
                ) : (
                    <>
                    <Upload className="h-4 w-4 mr-2" />
                    Uploader et envoyer
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

export default DemandesAttestationUnified;
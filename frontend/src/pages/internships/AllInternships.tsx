import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, BookOpen, Eye, Trash2, Search, Filter, Users, ChevronUp, ChevronDown, Download, Printer, Info,User } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ScoreBadge from "@/components/ScoreBadge";
import { Sparkles, RefreshCw } from "lucide-react";
import ScoreDetailsModal from "@/components/ScoreDetailsModal"; 

// ==============================
// INTERFACES ET TYPES
// ==============================

/**
 * Interface représentant une demande de stage
 */
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
  score_ia: number; // Score IA de la demande (0-100)
  score_details: any; // Détails détaillés du score
  score_commentaire: string; // Commentaire associé au score
}

/**
 * Type pour les champs de tri possibles
 */
type SortField = keyof Internship | "etudiant_complet";

/**
 * Type pour la direction du tri
 */
type SortDirection = "asc" | "desc" | null;

/**
 * Interface pour la configuration du tri
 */
interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

/**
 * Interface pour les colonnes du tableau
 */
interface Column {
  key: keyof Internship | 'actions';
  label: string;
  sortable: boolean;
  render?: (value: any, item: Internship) => React.ReactNode;
}

// ==============================
// COMPOSANT PRINCIPAL
// ==============================

/**
 * Composant pour la gestion des demandes de stage en attente
 * Affiche la liste des demandes avec filtres, tri et actions
 */
const PendingInternships: React.FC = () => {
  // ==============================
  // ÉTATS DU COMPOSANT
  // ==============================
  
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
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: "etudiant_nom", direction: "asc" });
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

  const { toast } = useToast();
  const navigate = useNavigate();

  // ==============================
  // FONCTIONS API
  // ==============================

  /**
   * Récupère la liste des demandes de stage depuis l'API
   * avec les filtres appliqués
   */
  const fetchInternships = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/demande-toutes/", {
        params: {
          q: searchQuery,
          genre: genderFilter !== "Tous" ? genderFilter : "",
          etudiant_niveau: educationLevelFilter !== "Tous" ? educationLevelFilter : "",
          etudiant_specialite: specializationFilter !== "Toutes" ? specializationFilter : "",
          type_stage: internshipTypeFilter !== "Tous" ? internshipTypeFilter : "",
          statut_stage: statusFilter !== "Tous" ? statusFilter : "", 
        },
      });
      setInternships(response.data.results);
      setFilteredInternships(response.data.results);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les demandes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // FONCTIONS SCORE IA (COMMENTÉES)
  // ==============================

  /**
   * Calcule le score IA pour une demande spécifique
   * @param demandeId - ID de la demande à scorer
   */

  const calculateScore = async (demandeId: string) => {
    try {
      const response = await apiClient.post(`/demandes/${demandeId}/calculer-score/`);
      
      if (response.data.success) {
        toast({
          title: "Score calculé",
          description: `Score IA: ${response.data.score}/100`,
          variant: "default",
        });
        fetchInternships(); // Recharger les données
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de calculer le score",
        variant: "destructive",
      });
    }
  };
 

  /**
   * Lance le calcul des scores IA pour toutes les demandes
   */

  const calculateAllScores = async () => {
    try {
      const response = await apiClient.post('/demandes/calculer-tous-scores/');
      
      if (response.data.success) {
        toast({
          title: "Calcul lancé",
          description: response.data.message,
          variant: "default",
        });
        
        // Recharger après 10 secondes
        setTimeout(() => {
          fetchInternships();
        }, 10000);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de lancer le calcul",
        variant: "destructive",
      });
    }
  };
 

  // ==============================
  // EFFETS
  // ==============================

  /**
   * Effet pour charger les demandes quand les filtres changent
   */
  useEffect(() => {
    fetchInternships();
  }, [searchQuery, specializationFilter, internshipTypeFilter, educationLevelFilter, genderFilter, statusFilter]); 

  /**
   * Effet pour appliquer le tri quand la configuration change
   */
  useEffect(() => {
    if (sortConfig.direction) {
      const sortedData = [...internships].sort((a, b) => {
        let aValue: any = a[sortConfig.field as keyof Internship];
        let bValue: any = b[sortConfig.field as keyof Internship];
        
        // Cas spécial pour le nom complet
        if (sortConfig.field === "etudiant_complet") {
          aValue = `${a.etudiant_nom} ${a.etudiant_prenom}`.toLowerCase();
          bValue = `${b.etudiant_nom} ${b.etudiant_prenom}`.toLowerCase();
        }
        
        // Cas spécial pour les dates
        if (sortConfig.field === "date_soumission") {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }
        
        // Cas spécial pour le statut (ordre personnalisé)
        if (sortConfig.field === "statut_stage") {
          const statusOrder = {
            'en attente': 1,
            'en cours de traitement': 2,
            'acceptee': 3,
            'refusee': 4
          };
          aValue = statusOrder[aValue as keyof typeof statusOrder] || 5;
          bValue = statusOrder[bValue as keyof typeof statusOrder] || 5;
        }
        
        // Conversion en string pour la comparaison
        if (typeof aValue === "string") aValue = aValue.toLowerCase();
        if (typeof bValue === "string") bValue = bValue.toLowerCase();
        
        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
      
      setFilteredInternships(sortedData);
    } else {
      setFilteredInternships([...internships]);
    }
  }, [sortConfig, internships]);

  // ==============================
  // FONCTIONS DE TRI
  // ==============================

  /**
   * Gère le tri des colonnes
   * @param field - Champ à trier
   */
  const handleSort = (field: SortField) => {
    let direction: SortDirection = "asc";
    
    if (sortConfig.field === field) {
      if (sortConfig.direction === "asc") {
        direction = "desc";
      } else if (sortConfig.direction === "desc") {
        direction = null;
      }
    }
    
    const newSortConfig = { field, direction };
    setSortConfig(newSortConfig);
    
    if (!direction) {
      setFilteredInternships([...internships]);
      return;
    }
    
    const sortedData = [...filteredInternships].sort((a, b) => {
      let aValue: any = a[field as keyof Internship];
      let bValue: any = b[field as keyof Internship];
      
      // Cas spécial pour le nom complet (tri alphabétique)
      if (field === "etudiant_complet") {
        aValue = `${a.etudiant_nom} ${a.etudiant_prenom}`.toLowerCase();
        bValue = `${b.etudiant_nom} ${b.etudiant_prenom}`.toLowerCase();
      }
      
      // Cas spécial pour les dates
      if (field === "date_soumission") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      // Cas spécial pour le statut (ordre personnalisé)
      if (field === "statut_stage") {
        const statusOrder = {
          'en attente': 1,
          'en cours de traitement': 2,
          'acceptee': 3,
          'refusee': 4
        };
        aValue = statusOrder[aValue as keyof typeof statusOrder] || 5;
        bValue = statusOrder[bValue as keyof typeof statusOrder] || 5;
      }
      
      // Conversion en string pour la comparaison
      if (typeof aValue === "string") aValue = aValue.toLowerCase();
      if (typeof bValue === "string") bValue = bValue.toLowerCase();
      
      if (aValue < bValue) {
        return direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    
    setFilteredInternships(sortedData);
  };

  /**
   * Retourne l'icône de tri appropriée pour une colonne
   * @param field - Champ de la colonne
   * @returns Icône de tri
   */
  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ChevronUp className="h-4 w-4 opacity-30" />;
    }
    
    switch (sortConfig.direction) {
      case "asc":
        return <ChevronUp className="h-4 w-4" />;
      case "desc":
        return <ChevronDown className="h-4 w-4" />;
      default:
        return <ChevronUp className="h-4 w-4 opacity-30" />;
    }
  };

  // ==============================
  // FONCTIONS D'EXPORT ET IMPRESSION
  // ==============================

  /**
   * Génère et imprime le tableau des demandes
   */
  const printTable = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tableHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Demandes de Stage - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .status-badge { padding: 2px 8px; border-radius: 12px; font-size: 12px; display: inline-block; }
          .status-pending { background-color: #fef3c7; color: #92400e; }
          .status-processing { background-color: #dbeafe; color: #1e40af; }
          .status-accepted { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
          .status-rejected { background-color: #fee2e2; color: #991b1b; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Demandes de Stage</h1>
          <div>Export du ${new Date().toLocaleDateString()}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nom Complet</th>
              <th>Genre</th>
              <th>Spécialité</th>
              <th>Niveau d'étude</th>
              <th>Type de stage</th>
              <th>Statut</th>
              <th>Date soumission</th>
            </tr>
          </thead>
          <tbody>
            ${filteredInternships.map(internship => {
              const statusClass = `status-${internship.statut_stage.replace(' ', '-')}`;
              return `
                <tr>
                  <td>${internship.etudiant_nom} ${internship.etudiant_prenom}</td>
                  <td>${internship.genre}</td>
                  <td>${internship.etudiant_specialite}</td>
                  <td>${internship.etudiant_niveau}</td>
                  <td>${internship.type_stage}</td>
                  <td><span class="status-badge ${statusClass}">${formatStatusText(internship.statut_stage)}</span></td>
                  <td>${new Date(internship.date_soumission).toLocaleDateString()}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        <div style="margin-top: 20px; color: #666;">
          Total: ${filteredInternships.length} demande(s) de stage
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(tableHtml);
    printWindow.document.close();
    printWindow.print();
    
    toast({
      title: "Impression",
      description: "L'impression a été lancée",
      variant: "default",
    });
  };

  // ==============================
  // CONFIGURATION DES FILTRES
  // ==============================

  const filters = [
    {
      name: "gender",
      placeholder: "Genre",
      label: "Genre",
      options: genderOptions.map((option) => ({ value: option, label: option })),
      value: genderFilter,
      onChange: setGenderFilter,
    },
    {
      name: "educationLevel",
      placeholder: "Niveau d'étude",
      label: "Niveau d'étude",
      options: educationLevelOptions.map((option) => ({ value: option, label: option })),
      value: educationLevelFilter,
      onChange: setEducationLevelFilter,
    },
    {
      name: "specialization",
      placeholder: "Spécialité",
      label: "Spécialité",
      options: specializationOptions.map((option) => ({ value: option, label: option })),
      value: specializationFilter,
      onChange: setSpecializationFilter,
    },
    {
      name: "internshipType",
      placeholder: "Type de stage",
      label: "Type de stage",
      options: internshipTypeOptions.map((option) => ({ value: option, label: option })),
      value: internshipTypeFilter,
      onChange: setInternshipTypeFilter,
    },
    {
      name: "status", 
      placeholder: "Statut",
      label: "Statut du stage",
      options: [
        { value: "en attente", label: "En attente" },
        { value: "en cours de traitement", label: "En traitement" },
        { value: "acceptee", label: "Acceptée" },
        { value: "refusee", label: "Refusée" },
      ],
      value: statusFilter,
      onChange: setStatusFilter,
    },
  ];

  // ==============================
  // FONCTIONS D'ACTIONS
  // ==============================

  /**
   * Redirige vers la page de détails d'une demande
   * @param id - ID de la demande
   */
  const handleViewDetails = (id: string) => navigate(`/demandes/${id}`);

  /**
   * Supprime une demande de stage
   * @param id - ID de la demande à supprimer
   */
  const handleDelete = async (id: string) => {
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
      console.error("Erreur suppression:", error);
      
      let errorMessage = "Erreur lors de la suppression";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSelectedDelete(null);
    }
  };

  /**
   * Réinitialise tous les filtres et le tri
   */
  const handleResetFilters = () => {
    setSearchQuery("");
    setEducationLevelFilter("Tous");
    setSpecializationFilter("Toutes");
    setInternshipTypeFilter("Tous");
    setGenderFilter("Tous");
    setStatusFilter("Tous");
    setSortConfig({ field: "etudiant_nom", direction: "asc" });
  };

  /**
   * Ouvre la modal de détails du score IA
   * @param internship - Demande de stage
   */
  const handleViewScoreDetails = (internship: Internship) => {
    if (internship.score_ia === 0 || !internship.score_details) {
      toast({
        title: "Score non disponible",
        description: "Ce candidat n'a pas encore été évalué par l'IA",
        variant: "destructive",
      });
      return;
    }

    setSelectedScoreModal({
      open: true,
      score: internship.score_ia,
      details: internship.score_details,
      commentaire: internship.score_commentaire || "Aucun commentaire disponible",
      nom: `${internship.etudiant_prenom} ${internship.etudiant_nom}`
    });
  };

  // ==============================
  // FONCTIONS UTILITAIRES
  // ==============================

  /**
   * Retourne la variante du badge selon le statut
   * @param status - Statut de la demande
   * @returns Variante du badge
   */
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'en attente': return 'secondary';
      case 'en cours de traitement': return 'default';
      case 'acceptee': return 'outline';
      case 'refusee': return 'destructive';
      default: return 'secondary';
    }
  };

  /**
   * Formate le texte du statut pour l'affichage
   * @param status - Statut brut
   * @returns Statut formaté
   */
  const formatStatusText = (status: string) => {
    switch (status) {
      case 'en attente': return 'En attente';
      case 'en cours de traitement': return 'En traitement';
      case 'acceptee': return 'Acceptée';
      case 'refusee': return 'Refusée';
      default: return status;
    }
  };

  // ==============================
  // CONFIGURATION DES COLONNES
  // ==============================

  const columns: Column[] = [
    { 
      key: "etudiant_nom", 
      label: "Nom",
      sortable: true,
      render: (value: string, item: Internship) => (
        <div className="flex flex-col">
          
          <span className="font-medium">{value}</span>
          <span className="text-sm text-muted-foreground">{item.etudiant_prenom}</span>
        </div>
      ),
    },
    { 
      key: "genre", 
      label: "Genre",
      sortable: true,
      render: (value: string) => (
        <Badge variant="outline" className="capitalize">
          {value}
        </Badge>
      ),
    },
    { 
      key: "etudiant_specialite", 
      label: "Spécialité",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm">{value}</span>
      ),
    },
    { 
      key: "etudiant_niveau", 
      label: "Niveau d'étude",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm">{value}</span>
      ),
    },
    {
      key: "type_stage",
      label: "Type de stage",
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center">
          <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{value}</span>
        </div>
      ),
    },
    {
      key: "statut_stage",
      label: "Statut",
      sortable: true,
      render: (value: string) => (
        <Badge variant={getStatusBadgeVariant(value)} className="capitalize">
          {formatStatusText(value)}
        </Badge>
      ),
    },
    {
      key: "date_soumission",
      label: "Date soumission",
      sortable: true,
      render: (value: string) => {
        const submissionDate = new Date(value);
        const today = new Date();
       
        
        return (
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm">{submissionDate.toLocaleDateString()}</span>
              
            </div>
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      sortable: true,
      render: (_: any, item: Internship) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => handleViewDetails(item.id)}
            title="Voir les détails"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setSelectedDelete(item.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // ==============================
  // COMPOSANT D'EN-TÊTE TRIABLE
  // ==============================

  /**
   * Composant pour l'en-tête de colonne avec fonctionnalité de tri
   */
  const SortableHeader = ({ column }: { column: any }) => {
    if (!column.sortable) {
      return <span>{column.label}</span>;
    }

    return (
      <Button
        variant="ghost"
        className="p-0 h-auto font-medium hover:bg-transparent flex items-center gap-1"
        onClick={() => handleSort(column.key as SortField)}
      >
        <span>{column.label}</span>
        
      </Button>
    );
  };

  // ==============================
  // RENDU DU COMPOSANT
  // ==============================

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* En-tête de la page */}
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Demandes de stage</h1>
              <CardDescription className="text-muted-foreground">
                Gérez et suivez l'ensemble des demandes de stage reçues
              </CardDescription>
            </div>
          </div>
        </div>

        {/* Carte des filtres */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-semibold">Filtres et recherche</h3>
                <p className="text-sm text-muted-foreground">
                  Affinez votre recherche selon différents critères
                </p>
              </div>
              <div className="flex gap-2">
                {/* Bouton pour scorer toutes les demandes (commenté) 
                
                <Button 
                  variant="default" 
                  onClick={calculateAllScores}
                  className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-500 hover:from-red-600 hover:to-red-600"
                >
                  <Sparkles className="h-4 w-4" />
                  Scorer toutes les demandes
                </Button>
                */}
                
                <Button 
                  variant="outline" 
                  onClick={fetchInternships}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  
                </Button>
                {/*
                <Button 
                  variant="outline" 
                  onClick={printTable}
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  
                </Button>
                */}
                <Button 
                  variant="outline" 
                  onClick={handleResetFilters}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* Barre de recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par spécialité, niveau d'étude, étudiant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Filtres */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {filters.map((filter) => (
                  <div key={filter.name} className="space-y-2">
                    <label className="text-sm font-medium">{filter.label}</label>
                    <Select
                      value={filter.value}
                      onValueChange={filter.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={filter.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {filter.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Carte du tableau des demandes */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              // Squelette de chargement
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                {/* En-tête du tableau */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">
                    {filteredInternships.length} demande{filteredInternships.length !== 1 ? 's' : ''} de stage
                  </h3>
                </div>
                
                {/* Version Desktop - Tableau */}
                <div className="hidden md:block border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          {columns.map((column) => (
                            <th key={column.key} className="text-left p-3 font-medium">
                              <SortableHeader column={column} />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInternships.length === 0 ? (
                          // Message quand aucune donnée
                          <tr>
                            <td colSpan={columns.length} className="p-8 text-center">
                              <div className="text-center py-12">
                                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="font-medium text-lg mb-1">Aucune demande de stage</h3>
                                <p className="text-muted-foreground">
                                  Aucune demande ne correspond à vos critères de recherche
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          // Lignes de données
                          filteredInternships.map((internship) => (
                            <tr key={internship.id} className="border-b hover:bg-muted/50 transition-colors">
                              {columns.map((column) => (
                                <td key={column.key} className="p-3">
                                  {column.render 
                                    ? column.render(
                                        internship[column.key as keyof Internship], 
                                        internship
                                      )
                                    : internship[column.key as keyof Internship]
                                  }
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Version Mobile - Cartes */}
                <div className="md:hidden space-y-4">
                  {filteredInternships.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium text-lg mb-1">Aucune demande de stage</h3>
                      <p className="text-muted-foreground">
                        Aucune demande ne correspond à vos critères de recherche
                      </p>
                    </div>
                  ) : (
                    filteredInternships.map((internship) => (
                      <Card key={internship.id}>
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            {/* En-tête avec nom et statut */}
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-semibold text-lg">
                                  {internship.etudiant_nom} {internship.etudiant_prenom}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {internship.etudiant_specialite}
                                </p>
                              </div>
                              <Badge variant={getStatusBadgeVariant(internship.statut_stage)} className="capitalize shrink-0 ml-2">
                                {formatStatusText(internship.statut_stage)}
                              </Badge>
                            </div>

                            {/* Informations principales */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="space-y-1">
                                <span className="font-medium text-muted-foreground">Genre</span>
                                <p>{internship.genre}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="font-medium text-muted-foreground">Niveau</span>
                                <p>{internship.etudiant_niveau}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="font-medium text-muted-foreground">Type</span>
                                <div className="flex items-center">
                                  <BookOpen className="h-3 w-3 mr-1 text-muted-foreground" />
                                  <span>{internship.type_stage}</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="font-medium text-muted-foreground">Soumission</span>
                                <div className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                                  <span>{new Date(internship.date_soumission).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-2 border-t">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewDetails(internship.id)}
                                className="flex items-center gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                Détails
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedDelete(internship.id)}
                                className="flex items-center gap-1 text-destructive border-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                                Supprimer
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </>
            )}

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

            {/* Modal de confirmation de suppression */}
            {selectedDelete && (
              <DeleteConfirmDialog
                title="Supprimer cette demande ?"
                description="Êtes-vous sûr de vouloir supprimer cette demande ? Cette action est irréversible."
                onConfirm={() => handleDelete(selectedDelete)}
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

export default PendingInternships;
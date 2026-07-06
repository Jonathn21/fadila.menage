import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, BookOpen, Eye, Trash2, Search, Filter, Users, ChevronUp, ChevronDown, Download, Printer, Info } from "lucide-react";
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
  score_ia: number; // 
  score_details: any; 
  score_commentaire: string; 
}

type SortField = keyof Internship | "etudiant_complet";
type SortDirection = "asc" | "desc" | null;

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

const PendingInternships: React.FC = () => {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [filteredInternships, setFilteredInternships] = useState<Internship[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("Toutes");
  const [internshipTypeFilter, setInternshipTypeFilter] = useState("Tous");
  const [educationLevelFilter, setEducationLevelFilter] = useState("Tous");
  const [genderFilter, setGenderFilter] = useState("Tous");
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

  // ------------------ FETCH API ------------------
  const fetchInternships = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/demande-acceptees/", {
        params: {
          q: searchQuery,
          genre: genderFilter !== "Tous" ? genderFilter : "",
          etudiant_niveau: educationLevelFilter !== "Tous" ? educationLevelFilter : "",
          etudiant_specialite: specializationFilter !== "Toutes" ? specializationFilter : "",
          type_stage: internshipTypeFilter !== "Tous" ? internshipTypeFilter : "",
        },
      });
      setInternships(response.data.results);
      setFilteredInternships(response.data.results);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les demandes en attente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchInternships();
  }, [searchQuery, specializationFilter, internshipTypeFilter, educationLevelFilter, genderFilter]);

  // ------------------ SORTING LOGIC ------------------
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

  // Appliquer le tri quand sortConfig change
  useEffect(() => {
    if (sortConfig.direction) {
      const sortedData = [...internships].sort((a, b) => {
        let aValue: any = a[sortConfig.field as keyof Internship];
        let bValue: any = b[sortConfig.field as keyof Internship];
        
        if (sortConfig.field === "etudiant_complet") {
          aValue = `${a.etudiant_nom} ${a.etudiant_prenom}`.toLowerCase();
          bValue = `${b.etudiant_nom} ${b.etudiant_prenom}`.toLowerCase();
        }
        
        if (sortConfig.field === "date_soumission") {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }
        
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

  const printTable = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tableHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Demandes Acceptées - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .badge { padding: 2px 8px; border-radius: 12px; font-size: 12px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h3>Demandes Acceptées</h3>
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
              <th>Date soumission</th>
            </tr>
          </thead>
          <tbody>
            ${filteredInternships.map(internship => `
              <tr>
                <td>${internship.etudiant_nom} ${internship.etudiant_prenom}</td>
                <td>${internship.genre}</td>
                <td>${internship.etudiant_specialite}</td>
                <td>${internship.etudiant_niveau}</td>
                <td>${internship.type_stage}</td>
                <td>${new Date(internship.date_soumission).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 20px; color: #666;">
          Total: ${filteredInternships.length} demande(s) acceptée(s)
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

  // ------------------ FILTERS ------------------
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
  ];

  const handleViewDetails = (id: string) => navigate(`/demandes/${id}`);

  // ------------------ DELETE FUNCTION ------------------
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

  const handleResetFilters = () => {
    setSearchQuery("");
    setEducationLevelFilter("Tous");
    setSpecializationFilter("Toutes");
    setInternshipTypeFilter("Tous");
    setGenderFilter("Tous");
    setSortConfig({ field: "etudiant_nom", direction: "asc" });
  };

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

  const columns = [
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

  // Composant d'en-tête avec tri
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

  return (
    <DashboardLayout>
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        {/* En-tête de la page */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">Demandes acceptées</h1>
              <CardDescription className="text-muted-foreground">
                Gérez et suivez l'ensemble des demandes de stage acceptées
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
                <Button 
                  variant="outline" 
                  onClick={fetchInternships}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualiser
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleResetFilters}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Réinitialiser
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
              
              {/* Filtres responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2 sm:gap-0">
                  <h3 className="font-semibold">
                    {filteredInternships.length} demande{filteredInternships.length !== 1 ? 's' : ''} acceptées
                  </h3>
                </div>
                
                {/* Version Desktop - Tableau avec scroll horizontal */}
                <div className="hidden md:block rounded-xl border border-border/80 overflow-hidden shadow-card bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b border-border thead-brushed">
                          {columns.map((column) => (
                            <th key={column.key} className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              <SortableHeader column={column} />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInternships.length === 0 ? (
                          <tr>
                            <td colSpan={columns.length} className="p-4 sm:p-6 md:p-8 text-center">
                              <div className="text-center py-12">
                                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="font-medium text-lg mb-1">Aucune demande acceptée</h3>
                                <p className="text-muted-foreground">
                                  Aucune demande ne correspond à vos critères de recherche
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredInternships.map((internship) => (
                            <tr key={internship.id} className="border-b border-border/50 odd:bg-card even:bg-muted/25 hover:bg-accent/50 transition-colors">
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
                      <h3 className="font-medium text-lg mb-1">Aucune demande acceptée</h3>
                      <p className="text-muted-foreground">
                        Aucune demande ne correspond à vos critères de recherche
                      </p>
                    </div>
                  ) : (
                    filteredInternships.map((internship) => (
                      <Card key={internship.id}>
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            {/* En-tête avec nom */}
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                              <div className="flex-1">
                                <h4 className="font-semibold text-lg">
                                  {internship.etudiant_nom} {internship.etudiant_prenom}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {internship.etudiant_specialite}
                                </p>
                              </div>
                              <Badge variant="outline" className="capitalize shrink-0 ml-2 bg-green-50 text-green-700 border-green-200">
                                Acceptée
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
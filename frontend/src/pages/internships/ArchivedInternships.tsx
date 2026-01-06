import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, BookOpen, Eye, Trash2, Search, Filter, Users } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import DataTable from "@/components/DataTable";
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
}

const PendingInternships: React.FC = () => {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("Toutes");
  const [internshipTypeFilter, setInternshipTypeFilter] = useState("Tous");
  const [educationLevelFilter, setEducationLevelFilter] = useState("Tous");
  const [genderFilter, setGenderFilter] = useState("Tous");
  const [selectedDelete, setSelectedDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // ------------------ FETCH API ------------------
  const fetchInternships = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/demande-archivees/", {
        params: {
          q: searchQuery,
          genre: genderFilter !== "Tous" ? genderFilter : "",
          etudiant_niveau: educationLevelFilter !== "Tous" ? educationLevelFilter : "",
          etudiant_specialite: specializationFilter !== "Toutes" ? specializationFilter : "",
          type_stage: internshipTypeFilter !== "Tous" ? internshipTypeFilter : "",
        },
      });
      setInternships(response.data.results);
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
  };

  const columns = [
    { 
      key: "etudiant_nom", 
      label: "Nom",
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
      render: (value: string) => (
        <Badge variant="outline" className="capitalize">
          {value}
        </Badge>
      ),
    },
    { 
      key: "etudiant_specialite", 
      label: "Spécialité",
      render: (value: string) => (
        <span className="text-sm">{value}</span>
      ),
    },
    { 
      key: "etudiant_niveau", 
      label: "Niveau d'étude",
      render: (value: string) => (
        <span className="text-sm">{value}</span>
      ),
    },
    {
      key: "type_stage",
      label: "Type de stage",
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
          key: "score_ia",
          label: "Score IA",
          sortable: true,
          render: (value: number, item: Internship) => (
            <div className="flex flex-col gap-2">
              <ScoreBadge score={value} showIcon={true} size="md" />
              {value === 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => calculateScore(item.id)}
                  className="text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Calculer
                </Button>
              )}
            </div>
          ),
        },
    {
      key: "actions",
      label: "Actions",
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl">Demandes en attente</CardTitle>
            </div>
            <CardDescription>
              Gérez et suivez l'ensemble des demandes de stage en attente de validation
            </CardDescription>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-semibold">Filtres et recherche</h3>
                <p className="text-sm text-muted-foreground">
                  Affinez votre recherche selon différents critères
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleResetFilters}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Réinitialiser
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par spécialité, niveau d'étude, étudiant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">
                    {internships.length} demande{internships.length !== 1 ? 's' : ''} en attente
                  </h3>
                </div>
                
                <DataTable
                  columns={columns}
                  data={internships}
                  emptyMessage={
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium text-lg mb-1">Aucune demande en attente</h3>
                      <p className="text-muted-foreground">
                        Aucune demande ne correspond à vos critères de recherche
                      </p>
                    </div>
                  }
                  itemsPerPage={10}
                />
              </>
            )}

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
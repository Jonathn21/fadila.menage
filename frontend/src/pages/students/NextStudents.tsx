import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, BookOpen, Eye, Trash2, Search, Filter, Users, ChevronUp, ChevronDown, Download, Printer } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import {
  genderOptions,
  internshipTypeOptions,
  directionOptions,
  serviceOptions,
} from "@/data/internships";
import apiClient from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Stagiaire {
  id: number;
  nom: string;
  prenom: string;
  genre: string;
  specialite: string;
  niveau_etude: string;
  type_stage: string;
  direction: string;
  service: string;
  date_debut: string;
  date_fin: string;
}

type SortField = keyof Stagiaire | "nom_complet";
type SortDirection = "asc" | "desc" | null;

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

const OngoingInternships: React.FC = () => {
  const [stagiaires, setStagiaires] = useState<Stagiaire[]>([]);
  const [filteredStagiaires, setFilteredStagiaires] = useState<Stagiaire[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [internshipTypeFilter, setInternshipTypeFilter] = useState("Tous");
  const [educationLevelFilter, setEducationLevelFilter] = useState("Tous");
  const [directionFilter, setDirectionFilter] = useState("Toutes");
  const [serviceFilter, setServiceFilter] = useState("Tous");
  const [genderFilter, setGenderFilter] = useState("Tous");
  const [selectedDelete, setSelectedDelete] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: "date_debut", direction: "asc" });
  const { toast } = useToast();
  const navigate = useNavigate();

  // ------------------ FETCH API ------------------
  const fetchStagiaires = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/stages/prochains/", {
        params: {
          q: searchQuery,
          genre: genderFilter !== "Tous" ? genderFilter : "",
          etudiant_niveau: educationLevelFilter !== "Tous" ? educationLevelFilter : "",
          type_stage: internshipTypeFilter !== "Tous" ? internshipTypeFilter : "",
          direction: directionFilter !== "Toutes" ? directionFilter : "",
          service: serviceFilter !== "Tous" ? serviceFilter : "",
        },
      });
      setStagiaires(response.data.results);
      setFilteredStagiaires(response.data.results);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les stages prochains.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStagiaires();
  }, [
    searchQuery,
    internshipTypeFilter,
    educationLevelFilter,
    genderFilter,
    directionFilter,
    serviceFilter,
  ]);

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
      setFilteredStagiaires([...stagiaires]);
      return;
    }
    
    const sortedData = [...filteredStagiaires].sort((a, b) => {
      let aValue: any = a[field as keyof Stagiaire];
      let bValue: any = b[field as keyof Stagiaire];
      
      // Cas spécial pour le nom complet (tri alphabétique)
      if (field === "nom_complet") {
        aValue = `${a.nom} ${a.prenom}`.toLowerCase();
        bValue = `${b.nom} ${b.prenom}`.toLowerCase();
      }
      
      // Cas spécial pour les dates
      if (field === "date_debut" || field === "date_fin") {
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
    
    setFilteredStagiaires(sortedData);
  };

  // Appliquer le tri quand sortConfig change
  useEffect(() => {
    if (sortConfig.direction) {
      const sortedData = [...stagiaires].sort((a, b) => {
        let aValue: any = a[sortConfig.field as keyof Stagiaire];
        let bValue: any = b[sortConfig.field as keyof Stagiaire];
        
        if (sortConfig.field === "nom_complet") {
          aValue = `${a.nom} ${a.prenom}`.toLowerCase();
          bValue = `${b.nom} ${b.prenom}`.toLowerCase();
        }
        
        if (sortConfig.field === "date_debut" || sortConfig.field === "date_fin") {
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
      
      setFilteredStagiaires(sortedData);
    } else {
      setFilteredStagiaires([...stagiaires]);
    }
  }, [sortConfig, stagiaires]);

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
        <title>Stages Prochains - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; margin-bottom: 10px; }
          .subtitle { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .status-badge { 
            padding: 4px 8px; 
            border-radius: 12px; 
            font-size: 12px; 
            background-color: #fef3c7; 
            color: #92400e;
            display: inline-block;
          }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .info { margin-bottom: 10px; color: #666; }
          .urgency-high { background-color: #fee2e2; }
          .urgency-medium { background-color: #fef3c7; }
          .summary { margin-top: 20px; padding: 15px; background-color: #f8fafc; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Stages Prochains</h1>
            <div class="subtitle">Planning des stages programmés</div>
          </div>
          <div>Lomé le ${new Date().toLocaleDateString()}</div>
        </div>
        <div class="info">
          <strong>Total: ${filteredStagiaires.length} stage(s) programmé(s)</strong>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nom Complet</th>
              <th>Genre</th>
              <th>Spécialité</th>
              <th>Niveau d'étude</th>
              <th>Type de stage</th>
              <th>Direction</th>
              <th>Service</th>
              <th>Date de début</th>
              <th>Date de fin</th>
              <th>Jours avant début</th>
              <th>Durée</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            ${filteredStagiaires.map(stagiaire => {
              const startDate = new Date(stagiaire.date_debut);
              const endDate = new Date(stagiaire.date_fin);
              const today = new Date();
              const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
              const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
              const urgencyClass = daysUntilStart < 7 ? "urgency-high" : daysUntilStart < 30 ? "urgency-medium" : "";
              
              return `
                <tr class="${urgencyClass}">
                  <td>${stagiaire.nom} ${stagiaire.prenom}</td>
                  <td>${stagiaire.genre}</td>
                  <td>${stagiaire.specialite}</td>
                  <td>${stagiaire.niveau_etude}</td>
                  <td>${stagiaire.type_stage}</td>
                  <td>${stagiaire.direction}</td>
                  <td>${stagiaire.service}</td>
                  <td>${startDate.toLocaleDateString()}</td>
                  <td>${endDate.toLocaleDateString()}</td>
                  <td>${daysUntilStart > 0 ? daysUntilStart : "0"}</td>
                  <td>${duration} jour(s)</td>
                  <td><span class="status-badge">Programmé</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        <div class="summary">
          <h3>Résumé</h3>
          <p><strong>Total des stages programmés:</strong> ${filteredStagiaires.length}</p>
          <p><strong>Prochain stage:</strong> ${filteredStagiaires.length > 0 ? 
            new Date(Math.min(...filteredStagiaires.map(s => new Date(s.date_debut).getTime()))).toLocaleDateString() : 'N/A'}</p>
          <p><strong>Dernier stage programmé:</strong> ${filteredStagiaires.length > 0 ? 
            new Date(Math.max(...filteredStagiaires.map(s => new Date(s.date_debut).getTime()))).toLocaleDateString() : 'N/A'}</p>
        </div>
        <div style="margin-top: 10px; font-size: 12px; color: #999;">
          <strong>Légende:</strong> 
          <span style="background-color: #fee2e2; padding: 2px 6px; margin: 0 5px;">Début dans moins de 7 jours</span> - 
          <span style="background-color: #fef3c7; padding: 2px 6px; margin: 0 5px;">Début dans 7-30 jours</span>
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
      name: "direction",
      placeholder: "Direction",
      label: "Direction",
      options: directionOptions.map((option) => ({ value: option, label: option })),
      value: directionFilter,
      onChange: setDirectionFilter,
    },
    {
      name: "service",
      placeholder: "Service",
      label: "Service",
      options: serviceOptions.map((option) => ({ value: option, label: option })),
      value: serviceFilter,
      onChange: setServiceFilter,
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

  const handleViewDetails = (id: number) => navigate(`/stagiaires/${id}`);
  const handleDelete = (id: number) => {
    toast({
      title: "Stagiaire supprimé",
      description: "Le stagiaire a bien été supprimé.",
      variant: "default",
    });
    setSelectedDelete(null);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setEducationLevelFilter("Tous");
    setInternshipTypeFilter("Tous");
    setGenderFilter("Tous");
    setDirectionFilter("Toutes");
    setServiceFilter("Tous");
    setSortConfig({ field: "date_debut", direction: "asc" });
  };

  // Calculer les jours avant le début du stage
  const calculateDaysUntilStart = (dateDebut: string) => {
    const startDate = new Date(dateDebut);
    const today = new Date();
    const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return daysUntilStart > 0 ? daysUntilStart : 0;
  };

  // Calculer la durée du stage
  const calculateDuration = (dateDebut: string, dateFin: string) => {
    const startDate = new Date(dateDebut);
    const endDate = new Date(dateFin);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    return duration;
  };

  // Obtenir la variante du badge selon le délai
  const getStartBadgeVariant = (daysUntilStart: number) => {
    if (daysUntilStart < 7) return "destructive";
    if (daysUntilStart < 30) return "secondary";
    return "default";
  };

  const columns = [
    { 
      key: "nom", 
      label: "Nom",
      sortable: true,
      render: (value: string, item: Stagiaire) => (
        <div className="flex flex-col">
          <span className="font-medium">{value}</span>
          <span className="text-sm text-muted-foreground">{item.prenom}</span>
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
      key: "specialite", 
      label: "Spécialité",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm">{value}</span>
      ),
    },
    { 
      key: "niveau_etude", 
      label: "Niveau d'étude",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm">{value}</span>
      ),
    },
    { 
      key: "direction", 
      label: "Direction",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm">{value}</span>
      ),
    },
    { 
      key: "service", 
      label: "Service",
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
      key: "date_debut",
      label: "Date de début",
      sortable: true,
      render: (value: string, item: Stagiaire) => {
        const startDate = new Date(value);
        const daysUntilStart = calculateDaysUntilStart(value);
        
        return (
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm">{startDate.toLocaleDateString()}</span>
              <Badge 
                variant={getStartBadgeVariant(daysUntilStart)} 
                className="mt-1 w-fit text-xs"
              >
                {daysUntilStart > 0 ? `Dans ${daysUntilStart} jour(s)` : "Démarre aujourd'hui"}
              </Badge>
            </div>
          </div>
        );
      },
    },
    {
      key: "date_fin",
      label: "Date de fin",
      sortable: true,
      render: (value: string, item: Stagiaire) => {
        const endDate = new Date(value);
        const duration = calculateDuration(item.date_debut, value);
        
        return (
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm">{endDate.toLocaleDateString()}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      sortable: true,
      render: (_: any, item: Stagiaire) => (
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
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">Stages prochains</h1>
              <CardDescription className="text-muted-foreground">
                Gérez et suivez l'ensemble des stages programmés
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
                  placeholder="Rechercher par spécialité, niveau d'étude, stagiaire..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Filtres responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Niveau d'étude</label>
                  <Select
                    value={educationLevelFilter}
                    onValueChange={setEducationLevelFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Niveau d'étude" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tous">Tous les niveaux</SelectItem>
                      <SelectItem value="Licence">Licence</SelectItem>
                      <SelectItem value="Master">Master</SelectItem>
                      <SelectItem value="Doctorat">Doctorat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
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

        {/* Carte du tableau des stages */}
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
                    {filteredStagiaires.length} stage{filteredStagiaires.length !== 1 ? 's' : ''} programmés
                  </h3>
                </div>
                
                {/* Version Desktop - Tableau avec scroll horizontal */}
                <div className="hidden md:block rounded-xl border border-border/80 overflow-hidden shadow-card bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px]">
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
                        {filteredStagiaires.length === 0 ? (
                          <tr>
                            <td colSpan={columns.length} className="p-4 sm:p-6 md:p-8 text-center">
                              <div className="text-center py-12">
                                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="font-medium text-lg mb-1">Aucun stage programmé</h3>
                                <p className="text-muted-foreground">
                                  Aucun stage ne correspond à vos critères de recherche
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredStagiaires.map((stagiaire) => (
                            <tr key={stagiaire.id} className="border-b border-border/50 odd:bg-card even:bg-muted/25 hover:bg-accent/50 transition-colors">
                              {columns.map((column) => (
                                <td key={column.key} className="p-3">
                                  {column.render 
                                    ? column.render(
                                        String(stagiaire[column.key as keyof Stagiaire]), 
                                        stagiaire
                                      )
                                    : stagiaire[column.key as keyof Stagiaire]
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
                  {filteredStagiaires.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium text-lg mb-1">Aucun stage programmé</h3>
                      <p className="text-muted-foreground">
                        Aucun stage ne correspond à vos critères de recherche
                      </p>
                    </div>
                  ) : (
                    filteredStagiaires.map((stagiaire) => {
                      const daysUntilStart = calculateDaysUntilStart(stagiaire.date_debut);
                      const duration = calculateDuration(stagiaire.date_debut, stagiaire.date_fin);
                      
                      return (
                        <Card key={stagiaire.id}>
                          <CardContent className="p-4">
                            <div className="space-y-4">
                              {/* En-tête avec nom et indicateur de délai */}
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-lg">
                                    {stagiaire.nom} {stagiaire.prenom}
                                  </h4>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {stagiaire.specialite}
                                  </p>
                                </div>
                                <Badge 
                                  variant={getStartBadgeVariant(daysUntilStart)} 
                                  className="capitalize shrink-0 ml-2"
                                >
                                  {daysUntilStart}j
                                </Badge>
                              </div>

                              {/* Informations principales */}
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                  <span className="font-medium text-muted-foreground">Genre</span>
                                  <p>{stagiaire.genre}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="font-medium text-muted-foreground">Niveau</span>
                                  <p>{stagiaire.niveau_etude}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="font-medium text-muted-foreground">Direction</span>
                                  <p>{stagiaire.direction}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="font-medium text-muted-foreground">Service</span>
                                  <p>{stagiaire.service}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="font-medium text-muted-foreground">Type</span>
                                  <div className="flex items-center">
                                    <BookOpen className="h-3 w-3 mr-1 text-muted-foreground" />
                                    <span>{stagiaire.type_stage}</span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="font-medium text-muted-foreground">Durée</span>
                                  <p>{duration} jour(s)</p>
                                </div>
                              </div>

                              {/* Dates et indicateur de délai */}
                              <div className={`p-3 rounded-lg text-sm ${
                                daysUntilStart < 7 
                                  ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                                  : daysUntilStart < 30
                                  ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                                  : 'bg-blue-50 text-blue-800 border border-blue-200'
                              }`}>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="font-medium">Début:</span>
                                    <p>{new Date(stagiaire.date_debut).toLocaleDateString()}</p>
                                  </div>
                                  <div>
                                    <span className="font-medium">Fin:</span>
                                    <p>{new Date(stagiaire.date_fin).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 gap-2 sm:gap-0">
                                  <span className="font-medium">
                                    {daysUntilStart < 7 ? 'Début imminent' : 
                                     daysUntilStart < 30 ? 'Début prochain' : 'Programmé'}
                                  </span>
                                  <span>
                                    {daysUntilStart > 0 ? `Dans ${daysUntilStart} jour(s)` : "Démarre aujourd'hui"}
                                  </span>
                                </div>
                                {daysUntilStart < 7 && (
                                  <p className="text-xs mt-1">
                                    Préparer l'accueil du stagiaire
                                  </p>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex justify-end gap-2 pt-2 border-t">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleViewDetails(stagiaire.id)}
                                  className="flex items-center gap-1"
                                >
                                  <Eye className="h-4 w-4" />
                                  Détails
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedDelete(stagiaire.id)}
                                  className="flex items-center gap-1 text-destructive border-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Supprimer
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* Modal de confirmation de suppression */}
            {selectedDelete && (
              <DeleteConfirmDialog
                title="Supprimer ce stagiaire ?"
                description="Êtes-vous sûr de vouloir supprimer ce stagiaire ? Cette action est irréversible."
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

export default OngoingInternships;
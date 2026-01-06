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
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: "date_fin", direction: "desc" });
  const { toast } = useToast();
  const navigate = useNavigate();

  // ------------------ FETCH API ------------------
  const fetchStagiaires = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/stages/termines/", {
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
        description: "Impossible de charger les stages terminés.",
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

  // ------------------ DATE CALCULATION FUNCTIONS ------------------
  const calculateInternshipStatus = (dateDebut: string, dateFin: string) => {
    const today = new Date();
    const startDate = new Date(dateDebut);
    const endDate = new Date(dateFin);

    // Réinitialiser l'heure pour éviter les problèmes de comparaison
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    // Si le stage n'a pas encore commencé
    if (today < startDate) {
      return {
        status: "not_started",
        daysSinceStart: 0,
        daysSinceEnd: 0,
        displayStart: "Non débuté",
        displayEnd: "0 jour(s)"
      };
    }

    // Si le stage est en cours
    if (today <= endDate) {
      const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
      const daysUntilEnd = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      
      return {
        status: "ongoing",
        daysSinceStart,
        daysUntilEnd,
        displayStart: `Il y a ${daysSinceStart} jour(s)`,
        displayEnd: `${daysUntilEnd} jour(s) restant(s)`
      };
    }

    // Si le stage est terminé
    const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    const daysSinceEnd = Math.floor((today.getTime() - endDate.getTime()) / (1000 * 3600 * 24));
    
    return {
      status: "completed",
      daysSinceStart,
      daysSinceEnd,
      displayStart: `Il y a ${daysSinceStart} jour(s)`,
      displayEnd: `Terminé il y a ${daysSinceEnd} jour(s)`
    };
  };

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
        <title>Stages Terminés - ${new Date().toLocaleDateString()}</title>
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
            background-color: #d1fae5; 
            color: #065f46;
            display: inline-block;
          }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .info { margin-bottom: 10px; color: #666; }
          .summary { margin-top: 20px; padding: 15px; background-color: #f8fafc; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Stages Terminés</h1>
            <div class="subtitle">Historique des stages terminés</div>
          </div>
          <div>Lomé le ${new Date().toLocaleDateString()}</div>
        </div>
        <div class="info">
          <strong>Total: ${filteredStagiaires.length} stage(s) terminé(s)</strong>
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
              <th>Durée</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            ${filteredStagiaires.map(stagiaire => {
              const startDate = new Date(stagiaire.date_debut);
              const endDate = new Date(stagiaire.date_fin);
              const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
              
              return `
                <tr>
                  <td>${stagiaire.nom} ${stagiaire.prenom}</td>
                  <td>${stagiaire.genre}</td>
                  <td>${stagiaire.specialite}</td>
                  <td>${stagiaire.niveau_etude}</td>
                  <td>${stagiaire.type_stage}</td>
                  <td>${stagiaire.direction}</td>
                  <td>${stagiaire.service}</td>
                  <td>${startDate.toLocaleDateString()}</td>
                  <td>${endDate.toLocaleDateString()}</td>
                  <td>${duration} jour(s)</td>
                  <td><span class="status-badge">Terminé</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        <div class="summary">
          <h3>Résumé</h3>
          <p><strong>Total des stages:</strong> ${filteredStagiaires.length}</p>
          <p><strong>Période couverte:</strong> Du ${filteredStagiaires.length > 0 ? 
            new Date(Math.min(...filteredStagiaires.map(s => new Date(s.date_debut).getTime()))).toLocaleDateString() : 'N/A'} 
            au ${filteredStagiaires.length > 0 ? 
            new Date(Math.max(...filteredStagiaires.map(s => new Date(s.date_fin).getTime()))).toLocaleDateString() : 'N/A'}</p>
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
    setSortConfig({ field: "date_fin", direction: "desc" });
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
      render: (value: string) => {
        const startDate = new Date(value);
        const statusInfo = calculateInternshipStatus(value, "");
        
        return (
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm">{startDate.toLocaleDateString()}</span>
             
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
        const statusInfo = calculateInternshipStatus(item.date_debut, value);
        
        let variant: "default" | "destructive" | "secondary" = "default";
        
        
        return (
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm">{endDate.toLocaleDateString()}</span>
               {/*<Badge variant={variant} className="mt-1 w-fit">
                {statusInfo.status === "not_started" ? "0 jour(s)" : 
                 statusInfo.status === "ongoing" ? `${statusInfo.daysUntilEnd} jour(s) restant(s)` :
                 `Terminé il y a ${statusInfo.daysSinceEnd} jour(s)`}
              </Badge>*/}
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
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Stages terminés</h1>
            <CardDescription className="text-muted-foreground">
              Gérez et suivez l'ensemble des stages terminés
            </CardDescription>
          </div>
        </div>

        {/* Filtres */}
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
                  placeholder="Rechercher par spécialité, niveau d'étude, stagiaire..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Résultats */}
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
                    {filteredStagiaires.length} stage{filteredStagiaires.length !== 1 ? 's' : ''} terminés
                  </h3>
                </div>

                {/* Version Desktop - Tableau */}
                <div className="hidden md:block border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
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
                        {filteredStagiaires.map((stagiaire) => (
                          <tr key={stagiaire.id} className="border-b hover:bg-muted/50 transition-colors">
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Version Mobile - Cartes */}
                <div className="md:hidden space-y-4">
                  {filteredStagiaires.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium text-lg mb-1">Aucun stage terminé</h3>
                      <p className="text-muted-foreground">
                        Aucun stage ne correspond à vos critères de recherche
                      </p>
                    </div>
                  ) : (
                    filteredStagiaires.map((stagiaire) => (
                      <Card key={stagiaire.id}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* En-tête */}
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold">{stagiaire.nom} {stagiaire.prenom}</h4>
                                <p className="text-sm text-muted-foreground">{stagiaire.specialite}</p>
                              </div>
                              <Badge variant="outline" className="capitalize">
                                {stagiaire.genre}
                              </Badge>
                            </div>

                            {/* Informations principales */}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="font-medium">Niveau:</span>
                                <p>{stagiaire.niveau_etude}</p>
                              </div>
                              <div>
                                <span className="font-medium">Type:</span>
                                <p>{stagiaire.type_stage}</p>
                              </div>
                              <div>
                                <span className="font-medium">Direction:</span>
                                <p>{stagiaire.direction}</p>
                              </div>
                              <div>
                                <span className="font-medium">Service:</span>
                                <p>{stagiaire.service}</p>
                              </div>
                            </div>

                            {/* Dates */}
                            <div className="text-sm space-y-2">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>Début: {new Date(stagiaire.date_debut).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>Fin: {new Date(stagiaire.date_fin).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewDetails(stagiaire.id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Voir
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedDelete(stagiaire.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
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

            {/* Dialog de suppression */}
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
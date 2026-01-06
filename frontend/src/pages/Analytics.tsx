import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, BarChart, LineChart, PieChart } from "@/components/ui/chart";
import { 
  Download, 
  Calendar, 
  TrendingUp, 
  UserPlus, 
  Activity, 
  FileText, 
  BarChart3,
  PieChart as PieChartIcon,
  CalendarRange,
  Target,
  Clock,
  Users,
  FileDown,
  Plus,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  FileCode,
  Filter,
  CalendarDays,
  Hourglass,
  CheckCircle,
  XCircle,
  Clock4,
  ChevronDown
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import apiClient from "@/lib/apiClient";

interface Stats {
  type: 'annuelle' | 'intervalle';
  annee_cible?: number;
  annee_debut?: number;
  annee_fin?: number;
  total_demandes: number;
  taux_acceptation: number;
  delai_moyen: number;
  duree_moyenne_stage: number;
  stages_en_cours: number;
  demandes_en_cours_traitement: number;
  demandes_par_mois: number[];
  repartition_statuts: number[]; // [Acceptée, Refusée, En attente, En cours de traitement]
  perf_hebdo: number[];
  comp_annee: number[];
  comp_annee_labels: number[];
  // Pour les intervalles
  stats_par_annee?: Array<{
    annee: number;
    total_demandes: number;
    demandes_acceptees: number;
    demandes_refusees: number;
    demandes_en_cours: number;
    taux_acceptation: number;
  }>;
  evolution_mensuelle?: Array<{
    annee: number;
    demandes_par_mois: number[];
  }>;
  total_intervalle?: number;
  total_acceptees_intervalle?: number;
  total_refusees_intervalle?: number;
  total_en_cours_intervalle?: number;
  taux_acceptation_intervalle?: number;
  annees_labels?: number[];
}

const Analytics: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [annee, setAnnee] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [intervalleDialog, setIntervalleDialog] = useState(false);
  const [intervalleAnnee, setIntervalleAnnee] = useState({
    debut: new Date().getFullYear() - 4,
    fin: new Date().getFullYear()
  });
  const [modeAffichage, setModeAffichage] = useState<'annuel' | 'intervalle'>('annuel');

  const fetchStats = (params?: string) => {
    setLoading(true);
    setError(null);
    const queryParams = params || `annee=${annee}`;
    
    apiClient
      .get(`/statistiques/?${queryParams}`)
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erreur API:", err);
        setError("Impossible de charger les données statistiques");
        setLoading(false);
      });
  };

  const fetchStatsIntervalle = () => {
    const params = `annee_debut=${intervalleAnnee.debut}&annee_fin=${intervalleAnnee.fin}`;
    setModeAffichage('intervalle');
    setIntervalleDialog(false);
    fetchStats(params);
  };

  useEffect(() => {
    if (modeAffichage === 'annuel') {
      fetchStats();
    }
  }, [annee, modeAffichage]);

  const generateReport = async (format: string, type: string = 'general') => {
    try {
      setExporting(`${format}-${type}`);
      
      let url = `/export-stats/${format}/?annee=${annee}&type=${type}`;
      
      if (modeAffichage === 'intervalle' && stats?.annee_debut && stats?.annee_fin) {
        url = `/export-stats/${format}/?annee_debut=${stats.annee_debut}&annee_fin=${stats.annee_fin}&type=${type}`;
      }

      const response = await apiClient.get(url, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data]);
      const urlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      
      const extension = format.toLowerCase();
      const dateStr = new Date().toISOString().split('T')[0];
      
      let filename = `rapport_stages_${type}_${annee}_${dateStr}.${extension}`;
      if (modeAffichage === 'intervalle' && stats?.annee_debut && stats?.annee_fin) {
        filename = `rapport_stages_${type}_${stats.annee_debut}_${stats.annee_fin}_${dateStr}.${extension}`;
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(urlBlob);

    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      setError('Erreur lors de la génération du rapport');
    } finally {
      setExporting(null);
    }
  };

  const handleQuickExport = (format: 'excel' | 'pdf') => {
    generateReport(format, 'general');
  };

  const resetToCurrentYear = () => {
    setModeAffichage('annuel');
    setAnnee(new Date().getFullYear());
    fetchStats();
  };

  // Données pour les graphiques
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
  const jours = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  const applicationsByMonth = stats?.demandes_par_mois?.map((val, i) => ({
    name: months[i],
    total: val,
  })) || [];

  // Répartition des statuts avec "En cours de traitement"
  const statusDistribution = stats ? [
    { name: "Acceptées", value: stats.repartition_statuts[0] },
    { name: "Refusées", value: stats.repartition_statuts[1] },
    { name: "En attente", value: stats.repartition_statuts[2] },
    { name: "En cours", value: stats.repartition_statuts[3] },
  ] : [];

  const perfHebdo = stats?.perf_hebdo?.map((val, i) => ({
    name: jours[i],
    total: val,
  })) || [];

  const compAnnee = stats?.comp_annee_labels?.map((year, i) => ({
    year: year.toString(),
    total: stats.comp_annee[i],
  })) || [];

  // Données pour l'intervalle d'années
  const evolutionParAnnee = stats?.stats_par_annee?.map(item => ({
    annee: item.annee.toString(),
    total: item.total_demandes,
    acceptees: item.demandes_acceptees,
    refusees: item.demandes_refusees,
    en_cours: item.demandes_en_cours,
    taux: item.taux_acceptation
  })) || [];

  const evolutionMensuelle = stats?.evolution_mensuelle?.flatMap(evolution => 
    evolution.demandes_par_mois.map((total, mois) => ({
      annee: evolution.annee.toString(),
      mois: months[mois],
      total: total
    }))
  ) || [];

  // Couleurs pour les statuts
  const statusColors = {
    "Acceptées": "#10b981",
    "Refusées": "#ef4444", 
    "En attente": "#f59e0b",
    "En cours": "#3b82f6"
  };

  const statusIcons = {
    "Acceptées": CheckCircle,
    "Refusées": XCircle,
    "En attente": Clock,
    "En cours": Hourglass
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="text-center py-10">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">Erreur de chargement</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => fetchStats()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Tableaux de bord et statistiques</h1>
              <CardDescription className="text-muted-foreground">
                {modeAffichage === 'intervalle' && stats ? 
                  `Analyse des stages de ${stats.annee_debut} à ${stats.annee_fin}` :
                  "Analyse des performances et tendances des stages"
                }
              </CardDescription>
            </div>
          </div>
          
          <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
            <div className="flex gap-2">
              {modeAffichage === 'annuel' ? (
                <>
                  <Select 
                    value={annee.toString()} 
                    onValueChange={(val) => setAnnee(parseInt(val))}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Année" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }).map((_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  
                  <Dialog open={intervalleDialog} onOpenChange={setIntervalleDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <CalendarDays className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Analyser un intervalle d'années</DialogTitle>
                        <DialogDescription>
                          Sélectionnez la période à analyser
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="debut">Année de début</Label>
                          <Input
                            id="debut"
                            type="number"
                            value={intervalleAnnee.debut}
                            onChange={(e) => setIntervalleAnnee(prev => ({
                              ...prev,
                              debut: parseInt(e.target.value)
                            }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fin">Année de fin</Label>
                          <Input
                            id="fin"
                            type="number"
                            value={intervalleAnnee.fin}
                            onChange={(e) => setIntervalleAnnee(prev => ({
                              ...prev,
                              fin: parseInt(e.target.value)
                            }))}
                          />
                        </div>
                      </div>
                      <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setIntervalleDialog(false)} className="flex-1">
                          Annuler
                        </Button>
                        <Button onClick={fetchStatsIntervalle} className="flex-1">
                          <Filter className="h-4 w-4 mr-2" />
                          Appliquer
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <Button variant="outline" onClick={resetToCurrentYear} className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Retour à l'année actuelle</span>
                </Button>
              )}
              
              <Button variant="outline" size="icon" onClick={() => fetchStats()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
            {/*<DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" disabled={loading || exporting !== null} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Exporter</span>
                  {exporting && <RefreshCw className="h-3 w-3 animate-spin" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Format d'export</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleQuickExport('excel')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickExport('pdf')}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF (.pdf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>*/}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats Cards */}
        {!loading && stats && (
          <>
            {modeAffichage === 'intervalle' ? (
              // Affichage pour intervalle d'années
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Période analysée</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.annee_debut} - {stats.annee_fin}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.annee_fin! - stats.annee_debut! + 1} années
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Demandes totales</CardTitle>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total_intervalle}</div>
                    <p className="text-xs text-muted-foreground">
                      Moyenne: {Math.round(stats.total_intervalle! / (stats.annee_fin! - stats.annee_debut! + 1))}/an
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Taux d'acceptation</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.taux_acceptation_intervalle}%</div>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge 
                        variant={stats.taux_acceptation_intervalle! >= 70 ? "default" : "secondary"} 
                        className="text-xs"
                      >
                        {stats.taux_acceptation_intervalle! >= 70 ? "Élevé" : "Moyen"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Demandes en cours</CardTitle>
                    <Hourglass className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total_en_cours_intervalle}</div>
                    <p className="text-xs text-muted-foreground">
                      En cours de traitement
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Affichage pour année unique
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Demandes totales</CardTitle>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total_demandes}</div>
                    <p className="text-xs text-muted-foreground">
                      {annee === new Date().getFullYear() ? "Cette année" : `Année ${annee}`}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Taux d'acceptation</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.taux_acceptation}%</div>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge 
                        variant={stats.taux_acceptation >= 70 ? "default" : "secondary"} 
                        className="text-xs"
                      >
                        {stats.taux_acceptation >= 70 ? "Élevé" : "Moyen"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Délai moyen</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.delai_moyen} jours</div>
                    <p className="text-xs text-muted-foreground">Traitement des demandes</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Indicateurs de statuts détaillés */}
            {modeAffichage === 'annuel' && stats && (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {statusDistribution.map((statut, index) => {
                  const IconComponent = statusIcons[statut.name as keyof typeof statusIcons];
                  const color = statusColors[statut.name as keyof typeof statusColors];
                  
                  return (
                    <Card key={statut.name} className="relative overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 w-1 h-full"
                        style={{ backgroundColor: color }}
                      />
                      <CardHeader className="flex flex-row items-center justify-between pb-2 pl-4">
                        <CardTitle className="text-sm font-medium">{statut.name}</CardTitle>
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pl-4">
                        <div className="text-2xl font-bold">{statut.value}%</div>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(stats.total_demandes * statut.value / 100)} demandes
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden xs:inline">Vue d'ensemble</span>
                </TabsTrigger>
                {/*<TabsTrigger value="export" className="flex items-center gap-2">
                  <FileDown className="h-4 w-4" />
                  <span className="hidden xs:inline">Rapports</span>
                </TabsTrigger>*/}
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {modeAffichage === 'intervalle' ? (
                  // Graphiques pour intervalle d'années - CORRIGÉ
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Évolution annuelle des demandes
                        </CardTitle>
                        <CardDescription>
                          Comparaison du nombre de demandes sur la période {stats.annee_debut} - {stats.annee_fin}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="w-full overflow-x-auto">
                          <div className="min-w-[300px] h-[300px] sm:h-[400px]">
                            <BarChart 
                              data={evolutionParAnnee} 
                              index="annee" 
                              categories={["total", "acceptees", "refusees", "en_cours"]} 
                              colors={["blue", "green", "red", "orange"]} 
                              valueFormatter={(val) => `${val} demandes`} 
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <CalendarRange className="h-5 w-5" />
                            Répartition par année
                          </CardTitle>
                          <CardDescription>
                            Taux d'acceptation par année
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="w-full overflow-x-auto">
                            <div className="min-w-[250px] h-[300px]">
                              <BarChart 
                                data={evolutionParAnnee} 
                                index="annee" 
                                categories={["taux"]} 
                                colors={["orange"]} 
                                valueFormatter={(val) => `${val}%`} 
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5" />
                            Synthèse de la période
                          </CardTitle>
                          <CardDescription>
                            Répartition globale des statuts
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center items-center">
                          <div className="w-full max-w-md h-[300px]">
                            <PieChart 
                              data={[
                                { name: "Acceptées", value: stats.taux_acceptation_intervalle! },
                                { name: "Refusées", value: 100 - stats.taux_acceptation_intervalle! }
                              ]} 
                              index="name" 
                              category="value" 
                              valueFormatter={(val) => `${val}%`} 
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  // Graphiques pour année unique - CORRIGÉ
                  <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
                    <Card className="lg:col-span-4">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CalendarRange className="h-5 w-5" />
                          Évolution des demandes par mois
                        </CardTitle>
                        <CardDescription>
                          Nombre de demandes de stage traitées mensuellement
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="w-full overflow-x-auto">
                          <div className="min-w-[300px] h-[300px]">
                            <AreaChart 
                              data={applicationsByMonth} 
                              categories={["total"]} 
                              index="name" 
                              colors={["blue"]} 
                              valueFormatter={(val) => `${val} demandes`} 
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="lg:col-span-3">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <PieChartIcon className="h-5 w-5" />
                          Répartition par statut
                        </CardTitle>
                        <CardDescription>
                          Distribution des demandes selon leur statut
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex justify-center items-center">
                        <div className="w-full max-w-sm h-[300px]">
                          <PieChart 
                            data={statusDistribution} 
                            index="name" 
                            category="value" 
                            valueFormatter={(val) => `${val}%`} 
                          />
                        </div>
                      </CardContent>
                      <CardFooter className="flex flex-wrap justify-center gap-4 pt-0">
                        {statusDistribution.map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div 
                              className="h-3 w-3 rounded-full" 
                              style={{ 
                                backgroundColor: statusColors[item.name as keyof typeof statusColors]
                              }}
                            />
                            <span className="text-sm">{item.name}</span>
                          </div>
                        ))}
                      </CardFooter>
                    </Card>
                  </div>
                )}

                {modeAffichage === 'annuel' && (
                  <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Performance hebdomadaire
                        </CardTitle>
                        <CardDescription>
                          Nombre de demandes traitées par jour de la semaine
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="w-full overflow-x-auto">
                          <div className="min-w-[250px] h-[300px]">
                            <BarChart 
                              data={perfHebdo} 
                              index="name" 
                              categories={["total"]} 
                              colors={["orange"]} 
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          Comparaison annuelle
                        </CardTitle>
                        <CardDescription>
                          Évolution du nombre de demandes sur plusieurs années
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="w-full overflow-x-auto">
                          <div className="min-w-[250px] h-[300px]">
                            <LineChart 
                              data={compAnnee} 
                              index="year" 
                              categories={["total"]} 
                              colors={["green"]} 
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/*<TabsContent value="export" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Rapports disponibles</CardTitle>
                    <CardDescription>
                      Exportez les données pour analyse externe ou archivage
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { 
                          type: "Général", 
                          description: "Rapport complet avec toutes les statistiques",
                          formats: ['excel', 'pdf']
                        },
                        { 
                          type: "Mensuel", 
                          description: "Analyse détaillée mois par mois",
                          formats: ['excel', 'pdf']
                        },
                        { 
                          type: "Trimestriel", 
                          description: "Synthèse trimestrielle des performances",
                          formats: ['excel', 'pdf']
                        },
                        { 
                          type: "Annuel", 
                          description: "Rapport annuel complet avec graphiques",
                          formats: ['excel', 'pdf']
                        },
                      ].map((item, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg gap-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{`Rapport ${item.type}`}</p>
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.formats.map((format) => (
                              <Button 
                                key={format}
                                variant="outline" 
                                size="sm" 
                                onClick={() => generateReport(format, item.type.toLowerCase())}
                                disabled={exporting === `${format}-${item.type.toLowerCase()}`}
                                className="flex items-center gap-1"
                              >
                                {exporting === `${format}-${item.type.toLowerCase()}` ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  getFormatIcon(format)
                                )}
                                <span className="hidden xs:inline">{format.toUpperCase()}</span>
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>*/}
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

// Fonction utilitaire pour obtenir l'icône du format
function getFormatIcon(format: string) {
  switch (format) {
    case 'excel':
      return <FileSpreadsheet className="h-3 w-3" />;
    case 'pdf':
      return <FileText className="h-3 w-3" />;
    default:
      return <FileText className="h-3 w-3" />;
  }
}

export default Analytics;
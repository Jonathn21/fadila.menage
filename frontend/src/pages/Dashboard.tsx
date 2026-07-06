import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Folder, LoaderCircle, Check, X } from "lucide-react";
import DashboardStats from "@/components/dashboard/DashboardStats";
import OverviewTab from "@/components/dashboard/OverviewTab";
import { getStatusBadge } from "@/components/dashboard/StatusBadges";
import { DashboardData, Demande, Entretien } from "@/types";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await apiClient.get<DashboardData>("/dashboard/");
        setData(res.data);
      } catch (err) {
        console.error(err);
        toast({
          title: "Erreur",
          description: "Impossible de charger le tableau de bord.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [toast]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <LoaderCircle className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-primary mx-auto mb-3 sm:mb-4" />
              <p className="text-xs sm:text-sm text-muted-foreground">Chargement du tableau de bord...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) return <div>Chargement...</div>;

  // Statistiques dynamiques
  const stats = [
    {
      title: "Demandes",
      value: data.total_demandes.toString(),
      color: "bg-blue-100",
      icon: <Folder className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />,
    },
    {
      title: "Stages en cours",
      value: data.stages_en_cours.toString(),
      color: "bg-yellow-100",
      icon: <LoaderCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />,
    },
    {
      title: "Demandes acceptées",
      value: data.stages_acceptes.toString(),
      color: "bg-green-100",
      icon: <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />,
    },
    {
      title: "Demandes refusées",
      value: data.stages_refuses.toString(),
      color: "bg-red-100",
      icon: <X className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />,
    },
  ];

  const recentApplications = data.dernieres_demandes.map((d: Demande) => ({
    id: d.id,
    name: `${d.etudiant_nom} ${d.etudiant_prenom}`,
    domain: d.etudiant_specialite,
    date: d.date_soumission,
    status: d.statut_stage,
  }));

  const upcomingEvents = data.entretiens_a_venir.map((e: Entretien) => ({
    id: e.id,
    title: e.titre,
    date: e.date,
    type: "Entretien",
  }));

  return (
    <DashboardLayout>
      <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="relative overflow-hidden rounded-xl border border-border/80 surface-brushed shadow-card px-4 py-4 sm:px-6 sm:py-5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-green-900">Tableau de bord</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Vue d'ensemble des demandes et des stages</p>
        </div>

        {/* Statistiques */}
        <DashboardStats stats={stats} />

        <Tabs
          defaultValue="overview"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4 sm:space-y-6"
        >
          <TabsContent value="overview">
            <OverviewTab
              recentApplications={recentApplications}
              upcomingEvents={upcomingEvents}
              getStatusBadge={getStatusBadge}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
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
      }
    };

    fetchDashboard();
  }, [toast]);

  if (!data) return <div>Chargement...</div>;

  // Statistiques dynamiques
  const stats = [
    {
      title: "Demandes",
      value: data.total_demandes.toString(),
      color: "bg-blue-100",
      icon: <Folder className="h-6 w-6 text-blue-500" />,
    },
    {
      title: "Stages en cours",
      value: data.stages_en_cours.toString(),
      color: "bg-yellow-100",
      icon: <LoaderCircle className="h-6 w-6 text-yellow-500" />,
    },
    {
      title: "Demandes acceptés",
      value: data.stages_acceptes.toString(),
      color: "bg-green-100",
      icon: <Check className="h-6 w-6 text-green-500" />,
    },
    {
      title: "Demandes refusés",
      value: data.stages_refuses.toString(),
      color: "bg-red-100",
      icon: <X className="h-6 w-6 text-red-500" />,
    },
  ];

 // NOUVEAU
  const recentApplications = data.dernieres_demandes.map((d: Demande) => ({
    id: d.id,
    name: `${d.etudiant_nom} ${d.etudiant_prenom}`,
    domain: d.etudiant_specialite,
    date: d.date_soumission, // juste la chaîne YYYY-MM-DD
    status: d.statut_stage,
  }));

  const upcomingEvents = data.entretiens_a_venir.map((e: Entretien) => ({
    id: e.id,
    title: e.titre,
    date: e.date, // juste la chaîne YYYY-MM-DD
    type: "Entretien",
  }));


  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Tableau de bord</h1>

        {/* Statistiques */}
        <DashboardStats stats={stats} />

        <Tabs
          defaultValue="overview"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
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

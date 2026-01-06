import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  RotateCcw, MessageSquare, Archive
} from "lucide-react";
import InternshipHeader from "@/components/internships/InternshipHeader";
import InternshipSummaryCard from "@/components/internships/InternshipSummaryCard";
import StudentProfileCard from "@/components/internships/StudentProfileCard";
import ActionsCard from "@/components/internships/ActionsCard";
import ActivityTimeline from "@/components/internships/ActivityTimeline";
import DocumentsList from "@/components/internships/DocumentsList";
import DocumentPreviewDialog from "@/components/internships/DocumentPreviewDialog";
import SchoolCard from "@/components/internships/schoolCard";

// Données simulées pour les détails du stage rejeté
const internshipData = {
  id: "INT-0003",
  status: "Refusé",
  student: {
    name: "HOUNDONOUGBO Florence",
    email: "sophie.dubois@etudiant.fr",
    phone: "+33 6 23 45 67 89",
    avatar: "SD",
    photo: "/img-student.jpg",
    program: "Secrétariat",
    year: "Licence",
    school: {
      name: "Université de Lomé",
      location: "Lomé",
      logo: "UL",
      contact: "AGBOKOU Blaise",
      contactPhone: "+228 99 99 99 99",
      contactEmail: "b.agbokou@univ-lome.tg",
    },
  },
  dates: {
    submission: new Date(2023, 3, 10),
    // start: new Date(2023, 5, 1),
    // end: new Date(2023, 7, 31),
  },
  description: "InnovateTech recherche un développeur backend stagiaire pour rejoindre l'équipe de développement d'API. Vous travaillerez sur des systèmes distribués et des architectures microservices.",
  skills: ["Python", "Django", "PostgreSQL", "Docker", "API REST"],
  rejectionReason: "Profil ne correspondant pas aux exigences techniques requises. L'étudiant manque d'expérience en développement backend et en bases de données relationnelles.",
  rejectionDate: new Date(2023, 3, 15),
  activities: [
    { 
      date: new Date(2023, 3, 10), 
      action: "Demande soumise", 
      actor: "Sophie Dubois", 
      description: "Candidature envoyée avec CV et lettre de motivation" 
    },
    { 
      date: new Date(2023, 3, 12), 
      action: "Demande examinée", 
      actor: "Pierre Martin (RH)", 
      description: "Examen initial du dossier de candidature" 
    },
    { 
      date: new Date(2023, 3, 14), 
      action: "Évaluation technique", 
      actor: "Laura Petit (Tech Lead)", 
      description: "Évaluation des compétences techniques" 
    },
    { 
      date: new Date(2023, 3, 15), 
      action: "Candidature refusée", 
      actor: "Laura Petit (Tech Lead)", 
      description: "Profil ne correspondant pas aux exigences techniques" 
    }
  ],
  documents: [
    { name: "CV de Sophie Dubois", type: "cv", date: new Date(2023, 3, 10), url: "/placeholder.svg" },
    { name: "Lettre de motivation", type: "letter", date: new Date(2023, 3, 10), url: "/placeholder.svg" },
    { name: "Notification de refus", type: "rejection", date: new Date(2023, 3, 15), url: "/placeholder.svg" }
  ],
  company: {
    name: "InnovateTech",
    location: "Lyon, France",
    email: "rh@innovatetech.fr",
    phone: "+33 4 78 90 12 34",
    employees: "150+ employés"
  },
  notes: [
    {
      author: { name: "Laura Petit", avatar: "LP" },
      date: "il y a 5 jours",
      content: "Le profil de l'étudiante ne correspond pas à nos exigences. Manque d'expérience en développement backend et bases de données."
    },
    {
      author: { name: "Pierre Martin", avatar: "PM" },
      date: "il y a 7 jours",
      content: "Candidature intéressante mais niveau technique insuffisant pour le poste proposé."
    }
  ]
};

const RejectedInternshipDetails = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedDocument, setSelectedDocument] = useState<{name: string, url: string} | null>(null);
  const [currentStatus, setCurrentStatus] = useState(internshipData.status);
  
  const handleReactivate = () => {
    toast({
      title: "Demande réactivée",
      description: "La demande a été remise en attente de traitement",
    });
    navigate("/internships");
  };

  const handleArchive = () => {
    toast({
      title: "Demande archivée",
      description: "La demande a été archivée",
    });
    navigate("/internships/rejected");
  };

  const handleSendMessage = () => {
    toast({
      title: "Message envoyé",
      description: "Un message a été envoyé à l'étudiant",
    });
  };

  const handleViewDocument = (doc: { name: string, url: string }) => {
    setSelectedDocument(doc);
  };

  // Actions spécifiques aux demandes rejetées
  const actions = [
    {
      icon: RotateCcw,
      label: "Réactiver la demande",
      onClick: handleReactivate
    },
    {
      icon: MessageSquare,
      label: "Envoyer un message",
      onClick: handleSendMessage,
      variant: "outline" as const
    },
    {
      icon: Archive,
      label: "Archiver",
      onClick: handleArchive,
      variant: "outline" as const
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <InternshipHeader
          id={params.id || internshipData.id}
          title="Demande rejetée"
          subtitle={`Refusée le ${internshipData.rejectionDate.toLocaleDateString("fr-FR")}`}
          backUrl="/internships/rejected"
        />
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <InternshipSummaryCard
              status={currentStatus}
              // resume={internshipData.resume}
              skills={internshipData.skills}
            />

            {/* Raison du refus */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700">Motif de refus</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-600">{internshipData.rejectionReason}</p>
              </CardContent>
            </Card>
            
            <Tabs defaultValue="activity">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="activity">Activité</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>
              
              <TabsContent value="activity" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Historique de la candidature</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ActivityTimeline activities={internshipData.activities} />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="documents" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DocumentsList 
                      documents={internshipData.documents} 
                      onView={handleViewDocument} 
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="space-y-6">
            <StudentProfileCard student={internshipData.student} />
            <SchoolCard school={internshipData.student.school} />
            <ActionsCard actions={actions} />
          </div>
        </div>
      </div>

      <DocumentPreviewDialog
        document={selectedDocument}
        onClose={() => setSelectedDocument(null)}
      />
    </DashboardLayout>
  );
};

export default RejectedInternshipDetails;
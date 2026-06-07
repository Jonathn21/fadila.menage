import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Briefcase,
  GraduationCap,
  Clock,
  XCircle,
  CheckCircle,
  Archive,
  FileText,
  LayoutDashboard,
  UserCircle,
  Lock,
  Settings2,
  BarChart3,
  FileClock,
  AlertCircle,
  Users2 as Users2Icon,
  FileSignature,
  LogOut,
} from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/hooks/use-logout";

const SidebarNavigation = () => {
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);
  const { handleLogout } = useLogout();

  const [openInternships, setOpenInternships] = useState(
    location.pathname.includes("/internships") || location.pathname.includes("/demandes")
  );
  const [openStudents, setOpenStudents] = useState(
    location.pathname.includes("/students") || location.pathname.includes("/stagiaires")
  );
  const [openAttestations, setOpenAttestations] = useState(
    location.pathname.includes("/attestations") || location.pathname.includes("/attestation")
  );

  const [counts, setCounts] = useState({
    demandes_attente: 0,
    demandes_acceptees: 0,
    demandes_refusees: 0,
    demandes_archivees: 0,
    demandes_traitement: 0,
    demandes_en_acceptation: 0,
    stages_avenir: 0,
    stages_en_cours: 0,
    stages_termines: 0,
    demandes_attestation: 0,
  });

  // Récupérer rôle utilisateur
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await apiClient.get("/me/");
        setUserRole(res.data.role);
      } catch (err) {
        console.error("Impossible de récupérer le rôle de l'utilisateur :", err);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await apiClient.get("/sidebar-counts/");
        setCounts({
          demandes_attente: res.data.count_demandes_attente,
          demandes_acceptees: res.data.count_demandes_acceptees,
          demandes_refusees: res.data.count_demandes_refusees,
          demandes_archivees: res.data.count_demandes_archivees,
          demandes_traitement: res.data.count_demandes_traitement,
          demandes_en_acceptation: res.data.count_demandes_en_acceptation,
          stages_avenir: res.data.count_stages_avenir,
          stages_en_cours: res.data.count_stages_en_cours,
          stages_termines: res.data.count_stages_termines,
          demandes_attestation: res.data.count_demandes_attestation,
        });
      } catch (err) {
        console.error("Impossible de charger les counts :", err);
      }
    };
    fetchCounts();

    const interval = setInterval(fetchCounts, 10000);
    return () => clearInterval(interval);
  }, []);

  const Badge = ({ count, variant = "default" }: { count: number; variant?: "default" | "destructive" | "warning" | "success"; }) => {
    const variantClasses = {
      default: "bg-green-800/70 text-green-100",
      destructive: "bg-red-800/70 text-red-100",
      warning: "bg-yellow-800/70 text-yellow-100",
      success: "bg-emerald-800/70 text-emerald-100",
    };
    return (
      <span className={cn(
        "ml-auto rounded-full px-2 py-0.5 text-xs font-medium min-w-[1.5rem] h-5 flex items-center justify-center",
        variantClasses[variant]
      )}>
        {count}
      </span>
    );
  };

  // Calcul du total des demandes (sans les archivées)
  const totalDemandes = counts.demandes_attente + counts.demandes_acceptees + counts.demandes_refusees + counts.demandes_traitement + counts.demandes_en_acceptation;
  
  // Calcul du total des stagiaires
  const totalStagiaires = counts.stages_avenir + counts.stages_en_cours + counts.stages_termines;

  // Sidebar items
  const navItems = [
    { label: "Tableau de bord", path: "/accueil", icon: <LayoutDashboard className="size-4" /> },
    { label: "Statistiques", path: "/statistiques", icon: <BarChart3 className="size-4" /> },
    { label: "Mon profil", path: "/profil", icon: <UserCircle className="size-4" /> },
    { label: "Sécurité", path: "/securite", icon: <Lock className="size-4" /> },
    { label: "Paramètres", path: "/parametres", icon: <Settings2 className="size-4" /> },
    ...(userRole === "Superutilisateur" ? [{ label: "Utilisateurs", path: "/utilisateurs", icon: <Users2Icon className="size-4" /> }] : []),
  ];

  const internshipSubItems = [
    { 
      label: "Toutes", 
      path: "/demandes/toutes", 
      count: totalDemandes,
      icon: <FileText className="size-3.5" />
    },
    { 
      label: "En attente", 
      path: "/demandes/en-attente", 
      count: counts.demandes_attente, 
      variant: "warning" as const,
      icon: <Clock className="size-3.5" />
    },
    { 
      label: "Validées", 
      path: "/demandes/en-traitement", 
      count: counts.demandes_traitement, 
      variant: "default" as const,
      icon: <FileClock className="size-3.5" />
    },
    { 
      label: "En acceptation", 
      path: "/demandes/en-acceptation", 
      count: counts.demandes_en_acceptation, 
      variant: "default" as const,
      icon: <AlertCircle className="size-3.5" />
    },
    { 
      label: "Acceptées", 
      path: "/demandes/acceptees", 
      count: counts.demandes_acceptees, 
      variant: "success" as const,
      icon: <CheckCircle className="size-3.5" />
    },
    { 
      label: "Refusées", 
      path: "/demandes/rejetees", 
      count: counts.demandes_refusees, 
      variant: "destructive" as const,
      icon: <XCircle className="size-3.5" />
    },
  ];

  const studentSubItems = [
    { 
      label: "Prochains stages", 
      path: "/stages/prochains", 
      count: counts.stages_avenir,
      variant: "default" as const,
      icon: <Clock className="size-3.5" />
    },
    { 
      label: "Stages en cours", 
      path: "/stages/en-cours", 
      count: counts.stages_en_cours, 
      variant: "success" as const,
      icon: <Briefcase className="size-3.5" />
    },
    { 
      label: "Stages terminés", 
      path: "/stages/termines", 
      count: counts.stages_termines,
      variant: "default" as const,
      icon: <GraduationCap className="size-3.5" />
    },
  ];

  const attestationSubItems = [
    { 
      label: "Toutes les attestations", 
      path: "/attestations/toutes", 
      count: counts.demandes_attestation,
      icon: <FileText className="size-3.5" />
    },
    { 
      label: "En attente", 
      path: "/attestations/en-attente", 
      count: 0,
      variant: "warning" as const,
      icon: <Clock className="size-3.5" />
    },
    { 
      label: "Approuvées", 
      path: "/attestations/approuvees", 
      count: 0,
      variant: "success" as const,
      icon: <CheckCircle className="size-3.5" />
    },
    { 
      label: "Réfusées", 
      path: "/attestations/refusees", 
      count: 0,
      variant: "default" as const,
      icon: <XCircle className="size-3.5" />
    },
     { 
      label: "Traitées", 
      path: "/attestations/traitees", 
      count: 0,
      variant: "default" as const,
      icon: <Archive className="size-3.5" />
    },
  ];

  const Logo = () => (
    <div className="flex items-center p-3 mb-6 border-b border-green-800">
      <div className="w-8 h-8 relative flex items-center justify-center">
        <img 
          src="/images/ceb-logo.png" 
          alt="CEB Logo" 
          className="w-full h-full object-contain"
        />
      </div>
      <div className="ml-3">
        <span className="text-base font-bold text-white tracking-tight">
          Gestion des stages
        </span>
        <span className="block text-xs text-green-300 leading-tight">
          Gerez vos demandes de stage
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-green-900 to-emerald-900 border-r border-green-800">
      {/* Logo intégré */}
      <Logo />
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        <SidebarMenu>
          {/* Dashboard */}
          <SidebarMenuItem className="py-1">
            <SidebarMenuButton 
              asChild 
              isActive={location.pathname === "/accueil"} 
              className="text-sm py-2.5 hover:bg-green-800 transition-colors rounded-lg mx-2 data-[active=true]:bg-green-700 data-[active=true]:text-white data-[active=true]:shadow-sm"
            >
              <Link to="/accueil" className="flex items-center">
                <LayoutDashboard className="size-4 text-green-300" />
                <span className="ml-3 font-medium text-white">Tableau de bord</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Demandes */}
          <SidebarMenuItem className="py-1">
            <Collapsible open={openInternships} onOpenChange={setOpenInternships} className="w-full">
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between rounded-lg p-2.5 text-sm hover:bg-green-800 transition-colors mx-2 group text-white">
                  <div className="flex items-center">
                    <Briefcase className="size-4 text-green-300" />
                    <span className="ml-3 font-medium">Demandes</span>
                  </div>
                  <div className="flex items-center">
                    <Badge count={totalDemandes} />
                    {openInternships ? <ChevronDown className="h-4 w-4 ml-2 transition-transform text-green-300" /> : <ChevronRight className="h-4 w-4 ml-2 transition-transform text-green-300" />}
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1 ml-8">
                {internshipSubItems.map((subItem, idx) => {
                  const isActive = location.pathname === subItem.path;
                  return (
                    <Link 
                      key={idx} 
                      to={subItem.path} 
                      className={cn(
                        "flex items-center rounded-lg px-3 py-2 text-xs transition-colors group/subitem text-green-100", 
                        isActive ? "bg-green-700 text-white font-medium shadow-sm" : "hover:bg-green-800/50"
                      )}
                    >
                      <span className={cn("mr-2.5", isActive ? "text-green-200" : "text-green-400")}>
                        {subItem.icon}
                      </span>
                      <span className="flex-1 truncate">{subItem.label}</span>
                      {subItem.count !== undefined && subItem.count > 0 && (
                        <Badge count={subItem.count} variant={subItem.variant} />
                      )}
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenuItem>

          {/* Stagiaires */}
          <SidebarMenuItem className="py-1">
            <Collapsible open={openStudents} onOpenChange={setOpenStudents} className="w-full">
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between rounded-lg p-2.5 text-sm hover:bg-green-800 transition-colors mx-2 group text-white">
                  <div className="flex items-center">
                    <GraduationCap className="size-4 text-green-300" />
                    <span className="ml-3 font-medium">Stages</span>
                  </div>
                  <div className="flex items-center">
                    <Badge count={totalStagiaires} />
                    {openStudents ? <ChevronDown className="h-4 w-4 ml-2 transition-transform text-green-300" /> : <ChevronRight className="h-4 w-4 ml-2 transition-transform text-green-300" />}
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1 ml-8">
                {studentSubItems.map((subItem, idx) => {
                  const isActive = location.pathname === subItem.path;
                  return (
                    <Link 
                      key={idx} 
                      to={subItem.path} 
                      className={cn(
                        "flex items-center rounded-lg px-3 py-2 text-xs transition-colors group/subitem text-green-100", 
                        isActive ? "bg-green-700 text-white font-medium shadow-sm" : "hover:bg-green-800/50"
                      )}
                    >
                      <span className={cn("mr-2.5", isActive ? "text-green-200" : "text-green-400")}>
                        {subItem.icon}
                      </span>
                      <span className="flex-1 truncate">{subItem.label}</span>
                      {subItem.count !== undefined && subItem.count > 0 && (
                        <Badge count={subItem.count} variant={subItem.variant} />
                      )}
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenuItem>

          {/* Demandes d'attestation 
          <SidebarMenuItem className="py-1">
            <Collapsible open={openAttestations} onOpenChange={setOpenAttestations} className="w-full">
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between rounded-lg p-2.5 text-sm hover:bg-green-800 transition-colors mx-2 group text-white">
                  <div className="flex items-center">
                    <FileSignature className="size-4 text-green-300" />
                    <span className="ml-3 font-medium">Attestations</span>
                  </div>
                  <div className="flex items-center">
                    <Badge count={counts.demandes_attestation} variant={counts.demandes_attestation > 0 ? "warning" : "default"} />
                    {openAttestations ? <ChevronDown className="h-4 w-4 ml-2 transition-transform text-green-300" /> : <ChevronRight className="h-4 w-4 ml-2 transition-transform text-green-300" />}
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1 ml-8">
                {attestationSubItems.map((subItem, idx) => {
                  const isActive = location.pathname === subItem.path;
                  return (
                    <Link 
                      key={idx} 
                      to={subItem.path} 
                      className={cn(
                        "flex items-center rounded-lg px-3 py-2 text-xs transition-colors group/subitem text-green-100", 
                        isActive ? "bg-green-700 text-white font-medium shadow-sm" : "hover:bg-green-800/50"
                      )}
                    >
                      <span className={cn("mr-2.5", isActive ? "text-green-200" : "text-green-400")}>
                        {subItem.icon}
                      </span>
                      <span className="flex-1 truncate">{subItem.label}</span>
                      {subItem.count !== undefined && subItem.count > 0 && (
                        <Badge count={subItem.count} variant={subItem.variant} />
                      )}
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenuItem>*/}

          {/* Separator */}
          <div className="my-3 mx-2 h-px bg-green-700"></div>

          {/* Other nav items */}
          {navItems.slice(1).map((item, index) => (
            <SidebarMenuItem key={index + 1} className="py-1">
              <SidebarMenuButton 
                asChild 
                isActive={location.pathname === item.path} 
                className="text-sm py-2.5 hover:bg-green-800 transition-colors rounded-lg mx-2 data-[active=true]:bg-green-700 data-[active=true]:text-white data-[active=true]:shadow-sm"
              >
                <Link to={item.path} className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <span className="text-green-300">{item.icon}</span>
                    <span className="ml-3 font-medium text-white">{item.label}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </div>

      {/* Bouton de déconnexion intégré dans le sidebar */}
      <div className="mt-auto border-t border-green-800 p-3">
        <Button
          onClick={handleLogout}
          className="w-full justify-start py-2.5 text-sm bg-green-800/30 hover:bg-green-700/50 text-white border border-green-700 hover:border-green-600 transition-colors"
        >
          <LogOut className="mr-3 h-4 w-4 text-green-300" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
};

export default SidebarNavigation;
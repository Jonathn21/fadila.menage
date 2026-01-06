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
  Calendar,
  FileClock,
  AlertCircle,
  Users2 as Users2Icon,
  BadgeCheck, 
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

const SidebarNavigation = () => {
  const location = useLocation();
  const [openInternships, setOpenInternships] = useState(
    location.pathname.includes("/internships") || location.pathname.includes("/demandes")
  );
  const [openStudents, setOpenStudents] = useState(
    location.pathname.includes("/students") || location.pathname.includes("/stagiaires")
  );

  // État pour stocker les infos utilisateur
  const [userInfo, setUserInfo] = useState({
    isSuperuser: false,
    isStaff: false,
    role: "",
  });

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
  });

  // Récupérer les infos utilisateur au chargement
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await apiClient.get("/user-info/");
        setUserInfo({
          isSuperuser: res.data.is_superuser,
          isStaff: res.data.is_staff,
          role: res.data.role,
        });
      } catch (err) {
        console.error("Impossible de charger les infos utilisateur:", err);
      }
    };
    fetchUserInfo();
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
      default: "bg-muted text-muted-foreground",
      destructive: "bg-destructive/15 text-destructive",
      warning: "bg-amber-100 text-amber-700",
      success: "bg-green-100 text-green-700",
    };
    return (
      <span className={cn(
        "ml-auto rounded-full px-2 py-0.5 text-xs font-medium min-w-[1.5rem] flex items-center justify-center",
        variantClasses[variant]
      )}>
        {count}
      </span>
    );
  };

  const totalDemandes = counts.demandes_attente + counts.demandes_acceptees + counts.demandes_refusees + counts.demandes_traitement + counts.demandes_en_acceptation;
  const totalStagiaires = counts.stages_avenir + counts.stages_en_cours + counts.stages_termines;

  // Navigation items de base (sans Utilisateurs)
  const baseNavItems = [
    { label: "Tableau de bord", path: "/accueil", icon: <LayoutDashboard className="size-5" /> },
    { label: "Statistiques", path: "/statistiques", icon: <BarChart3 className="size-5" /> },
    { label: "Mon profil", path: "/profil", icon: <UserCircle className="size-5" /> },
    { label: "Sécurité", path: "/securite", icon: <Lock className="size-5" /> },
    { label: "Paramètres", path: "/parametres", icon: <Settings2 className="size-5" /> },
  ];

  // Ajout conditionnel de l'onglet Utilisateurs pour les superutilisateurs
  const navItems = userInfo.isSuperuser 
    ? [...baseNavItems, { label: "Utilisateurs", path: "/utilisateurs", icon: <Users2Icon className="size-5" /> }]
    : baseNavItems;

  const internshipSubItems = [
    { 
      label: "Toutes", 
      path: "/demandes/toutes", 
      count: totalDemandes,
      icon: <FileText className="size-4" />
    },
    { 
      label: "En attente", 
      path: "/demandes/en-attente", 
      count: counts.demandes_attente, 
      variant: "warning" as const,
      icon: <Clock className="size-4" />
    },
    { 
      label: "Validées", 
      path: "/demandes/en-traitement", 
      count: counts.demandes_traitement, 
      variant: "default" as const,
      icon: <FileClock className="size-4" />
    },
    { 
      label: "En acceptation", 
      path: "/demandes/en-acceptation", 
      count: counts.demandes_en_acceptation, 
      variant: "default" as const,
      icon: <AlertCircle className="size-4" />
    },
    { 
      label: "Acceptées", 
      path: "/demandes/acceptees", 
      count: counts.demandes_acceptees, 
      variant: "success" as const,
      icon: <CheckCircle className="size-4" />
    },
    { 
      label: "Refusées", 
      path: "/demandes/rejetees", 
      count: counts.demandes_refusees, 
      variant: "destructive" as const,
      icon: <XCircle className="size-4" />
    },
  ];

  const studentSubItems = [
    { 
      label: "Prochains stages", 
      path: "/stages/prochains", 
      count: counts.stages_avenir,
      variant: "default" as const,
      icon: <Clock className="size-4" />
    },
    { 
      label: "Stages en cours", 
      path: "/stages/en-cours", 
      count: counts.stages_en_cours, 
      variant: "success" as const,
      icon: <Briefcase className="size-4" />
    },
    { 
      label: "Stages terminés", 
      path: "/stages/termines", 
      count: counts.stages_termines,
      variant: "default" as const,
      icon: <GraduationCap className="size-4" />
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
        <SidebarMenu>
          {/* Dashboard */}
          <SidebarMenuItem className="py-1">
            <SidebarMenuButton asChild isActive={location.pathname === "/accueil"} className="text-base py-3 hover:bg-primary/10 transition-colors rounded-lg mx-2 data-[active=true]:bg-primary/15 data-[active=true]:text-primary">
              <Link to="/accueil" className="flex items-center">
                <LayoutDashboard className="size-5" />
                <span className="ml-3 font-medium">Tableau de bord</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Demandes */}
          <SidebarMenuItem className="py-1">
            <Collapsible open={openInternships} onOpenChange={setOpenInternships} className="w-full">
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between rounded-lg p-2 text-base hover:bg-primary/10 transition-colors mx-2 group">
                  <div className="flex items-center">
                    <Briefcase className="size-5" />
                    <span className="ml-3 font-medium">Demandes</span>
                  </div>
                  <div className="flex items-center">
                    <Badge count={totalDemandes} />
                    {openInternships ? <ChevronDown className="h-4 w-4 ml-2 transition-transform" /> : <ChevronRight className="h-4 w-4 ml-2 transition-transform" />}
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1 ml-8">
                {internshipSubItems.map((subItem, idx) => {
                  const isActive = location.pathname === subItem.path;
                  return (
                    <Link key={idx} to={subItem.path} className={cn("flex items-center rounded-lg px-3 py-2 text-sm transition-colors group/subitem", isActive ? "bg-primary/15 text-primary font-medium" : "hover:bg-accent")}>
                      <span className={cn("mr-3", isActive ? "text-primary" : "text-muted-foreground")}>
                        {subItem.icon}
                      </span>
                      <span className="flex-1">{subItem.label}</span>
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
                <button className="flex w-full items-center justify-between rounded-lg p-2 text-base hover:bg-primary/10 transition-colors mx-2 group">
                  <div className="flex items-center">
                    <GraduationCap className="size-5" />
                    <span className="ml-3 font-medium">Stages</span>
                  </div>
                  <div className="flex items-center">
                    <Badge count={totalStagiaires} />
                    {openStudents ? <ChevronDown className="h-4 w-4 ml-2 transition-transform" /> : <ChevronRight className="h-4 w-4 ml-2 transition-transform" />}
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1 ml-8">
                {studentSubItems.map((subItem, idx) => {
                  const isActive = location.pathname === subItem.path;
                  return (
                    <Link key={idx} to={subItem.path} className={cn("flex items-center rounded-lg px-3 py-2 text-sm transition-colors group/subitem", isActive ? "bg-primary/15 text-primary font-medium" : "hover:bg-accent")}>
                      <span className={cn("mr-3", isActive ? "text-primary" : "text-muted-foreground")}>
                        {subItem.icon}
                      </span>
                      <span className="flex-1">{subItem.label}</span>
                      {subItem.count !== undefined && subItem.count > 0 && (
                        <Badge count={subItem.count} variant={subItem.variant} />
                      )}
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenuItem>

          {/* Separator */}
          <div className="my-4 mx-2 h-px bg-border"></div>

          {/* Other nav items (incluant Utilisateurs si superuser) */}
          {navItems.slice(1).map((item, index) => (
            <SidebarMenuItem key={index + 1} className="py-1">
              <SidebarMenuButton asChild isActive={location.pathname === item.path} className="text-base py-3 hover:bg-primary/10 transition-colors rounded-lg mx-2 data-[active=true]:bg-primary/15 data-[active=true]:text-primary">
                <Link to={item.path} className="flex items-center">
                  {item.icon}
                  <span className="ml-3 font-medium">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </div>
    </div>
  );
};

export default SidebarNavigation;
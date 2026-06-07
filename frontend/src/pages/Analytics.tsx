import React, { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar, TrendingUp, UserPlus, Activity, BarChart3,
  CalendarRange, Target, Clock, RefreshCw, AlertCircle,
  CalendarDays, Hourglass, CheckCircle, XCircle,
  GraduationCap, Timer, FileText, FileSpreadsheet,
  Download, Filter, Loader2, History, Trash2, Send,
  Mail, FileSearch, Building2, Shield, Archive,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import apiClient from "@/lib/apiClient";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
  type: "annuelle" | "intervalle";
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
  repartition_statuts: number[];
  perf_hebdo: number[];
  comp_annee: number[];
  comp_annee_labels: number[];
  stats_par_annee?: Array<{
    annee: number;
    total_demandes: number;
    demandes_acceptees: number;
    demandes_refusees: number;
    demandes_en_cours: number;
    taux_acceptation: number;
  }>;
  evolution_mensuelle?: Array<{ annee: number; demandes_par_mois: number[] }>;
  total_intervalle?: number;
  total_acceptees_intervalle?: number;
  total_refusees_intervalle?: number;
  total_en_cours_intervalle?: number;
  taux_acceptation_intervalle?: number;
  annees_labels?: number[];
}

type ReportFormat = "pdf" | "excel";
type ReportStatus = "idle" | "generating" | "success" | "error";

interface ReportParam {
  key: string;
  label: string;
  type: "select" | "year";
  options?: { value: string; label: string }[];
  defaultValue?: string;
}

interface ReportConfig {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  formats: ReportFormat[];
  params: ReportParam[];
  accentColor: string;
  badge?: string;
}

interface HistoryEntry {
  id: string;
  reportId: string;
  reportLabel: string;
  format: ReportFormat;
  params: Record<string, string>;
  date: string;
  status: "success" | "error";
  filename: string;
}

// ─── Constantes ────────────────────────────────────────────────────────────────

const C_ACCEPTED = "#10b981";
const C_REFUSED  = "#ef4444";
const C_PENDING  = "#f59e0b";
const C_ONGOING  = "#3b82f6";
const C_PRIMARY  = "#6366f1";

const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const DAYS   = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

const MONTHS_OPTIONS = MONTHS.map((m, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"][i],
}));

const YEARS = Array.from({ length: 6 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

const DIRECTIONS = [
  { value: "tous", label: "Toutes les directions" },
  { value: "DARH", label: "DARH" }, { value: "DCGIS", label: "DCGIS" },
  { value: "DEPP", label: "DEPP" }, { value: "DT",    label: "DT"    },
  { value: "DM",   label: "DM"   }, { value: "DFC",   label: "DFC"   },
  { value: "DG",   label: "DG"   },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Opérationnel": "bg-amber-50 text-amber-700 border-amber-200",
  "Performance":  "bg-indigo-50 text-indigo-700 border-indigo-200",
  "RH":           "bg-teal-50 text-teal-700 border-teal-200",
  "Conformité":   "bg-slate-100 text-slate-600 border-slate-200",
};

const REPORT_CATALOGUE: ReportConfig[] = [
  {
    id: "demandes_en_cours", label: "Demandes en cours",
    description: "Liste des dossiers actifs avec statut, délai écoulé et alertes de retard",
    icon: <Hourglass size={15}/>, category: "Opérationnel", formats: ["pdf","excel"],
    accentColor: "#f59e0b", badge: "Quotidien",
    params: [
      { key: "statut", label: "Statut", type: "select", defaultValue: "tous", options: [
        { value: "tous", label: "Tous les statuts" },
        { value: "En attente", label: "En attente" },
        { value: "En cours", label: "En cours de traitement" },
        { value: "Pré-acceptée", label: "Pré-acceptées" },
      ]},
      { key: "seuil_jours", label: "Alerter après", type: "select", defaultValue: "14", options: [
        { value: "7", label: "7 jours" }, { value: "14", label: "14 jours" }, { value: "30", label: "30 jours" },
      ]},
    ],
  },
  {
    id: "stages_actifs", label: "Stages actifs",
    description: "Tous les stagiaires actuellement en poste par direction et service",
    icon: <UserPlus size={15}/>, category: "Opérationnel", formats: ["pdf","excel"],
    accentColor: "#3b82f6",
    params: [{ key: "direction", label: "Direction", type: "select", defaultValue: "tous", options: DIRECTIONS }],
  },
  {
    id: "fins_imminentes", label: "Fins de stage imminentes",
    description: "Stages se terminant bientôt — anticiper renouvellements et attestations",
    icon: <Clock size={15}/>, category: "Opérationnel", formats: ["pdf","excel"],
    accentColor: "#ef4444", badge: "Urgent",
    params: [{ key: "horizon_jours", label: "Horizon", type: "select", defaultValue: "15", options: [
      { value: "7", label: "7 jours" }, { value: "15", label: "15 jours" }, { value: "30", label: "30 jours" },
    ]}],
  },
  {
    id: "attestations_en_attente", label: "Attestations en attente",
    description: "Demandes d'attestation non encore traitées avec délai de soumission",
    icon: <FileSearch size={15}/>, category: "Opérationnel", formats: ["pdf","excel"],
    accentColor: "#8b5cf6", params: [],
  },
  {
    id: "synthese_mensuelle", label: "Synthèse mensuelle",
    description: "Volume traité, taux d'acceptation, délai moyen — comparé au mois précédent",
    icon: <BarChart3 size={15}/>, category: "Performance", formats: ["pdf","excel"],
    accentColor: "#6366f1", badge: "Auto le 1er",
    params: [
      { key: "annee", label: "Année", type: "year", defaultValue: String(new Date().getFullYear()) },
      { key: "mois",  label: "Mois",  type: "select", defaultValue: String(new Date().getMonth() + 1).padStart(2,"0"), options: MONTHS_OPTIONS },
    ],
  },
  {
    id: "rapport_annuel", label: "Rapport annuel",
    description: "Synthèse complète de l'année avec graphiques, tendances et répartitions",
    icon: <TrendingUp size={15}/>, category: "Performance", formats: ["pdf","excel"],
    accentColor: "#10b981",
    params: [{ key: "annee", label: "Année", type: "year", defaultValue: String(new Date().getFullYear()) }],
  },
  {
    id: "performance_traitement", label: "Performance de traitement",
    description: "Délais par agent, jours de pic et goulots d'étranglement",
    icon: <TrendingUp size={15}/>, category: "Performance", formats: ["pdf","excel"],
    accentColor: "#f97316",
    params: [
      { key: "annee", label: "Année", type: "year", defaultValue: String(new Date().getFullYear()) },
      { key: "mois", label: "Mois", type: "select", defaultValue: "tous", options: [{ value: "tous", label: "Toute l'année" }, ...MONTHS_OPTIONS] },
    ],
  },
  {
    id: "repartition_directions", label: "Répartition par direction",
    description: "Nombre de stagiaires par direction et service — charge d'accueil",
    icon: <Building2 size={15}/>, category: "RH", formats: ["pdf","excel"],
    accentColor: "#0ea5e9",
    params: [
      { key: "annee", label: "Année", type: "year", defaultValue: String(new Date().getFullYear()) },
      { key: "statut", label: "Statut", type: "select", defaultValue: "tous", options: [
        { value: "tous", label: "Tous" }, { value: "Actuel", label: "Actifs" }, { value: "Terminé", label: "Terminés" },
      ]},
    ],
  },
  {
    id: "profil_stagiaires", label: "Profil démographique",
    description: "Genre, niveau d'études, spécialité, établissement, pays de résidence",
    icon: <GraduationCap size={15}/>, category: "RH", formats: ["pdf","excel"],
    accentColor: "#14b8a6",
    params: [{ key: "annee", label: "Année", type: "year", defaultValue: String(new Date().getFullYear()) }],
  },
  {
    id: "etablissements_partenaires", label: "Établissements partenaires",
    description: "Classement des écoles par volume et taux d'acceptation",
    icon: <Building2 size={15}/>, category: "RH", formats: ["pdf","excel"],
    accentColor: "#84cc16",
    params: [
      { key: "annee", label: "Année", type: "year", defaultValue: String(new Date().getFullYear()) },
      { key: "top", label: "Afficher", type: "select", defaultValue: "10", options: [
        { value: "10", label: "Top 10" }, { value: "20", label: "Top 20" }, { value: "tous", label: "Tous" },
      ]},
    ],
  },
  {
    id: "renouvellements", label: "Renouvellements de stage",
    description: "Stages renouvelés avec lien précédent → nouveau et taux de renouvellement",
    icon: <RefreshCw size={15}/>, category: "RH", formats: ["pdf","excel"],
    accentColor: "#6366f1",
    params: [{ key: "annee", label: "Année", type: "year", defaultValue: String(new Date().getFullYear()) }],
  },
  {
    id: "audit_actions", label: "Audit des actions",
    description: "Journal complet des actions utilisateurs — qui a fait quoi et quand",
    icon: <Shield size={15}/>, category: "Conformité", formats: ["pdf","excel"],
    accentColor: "#64748b",
    params: [
      { key: "annee", label: "Année", type: "year", defaultValue: String(new Date().getFullYear()) },
      { key: "mois", label: "Mois", type: "select", defaultValue: "tous", options: [{ value: "tous", label: "Toute l'année" }, ...MONTHS_OPTIONS] },
      { key: "type_action", label: "Type", type: "select", defaultValue: "tous", options: [
        { value: "tous", label: "Toutes" }, { value: "acceptation", label: "Acceptations" },
        { value: "refus", label: "Refus" }, { value: "modification", label: "Modifications" },
      ]},
    ],
  },
  {
    id: "demandes_archivees", label: "Demandes archivées",
    description: "Dossiers expirés ou archivés automatiquement après 6 mois sans suite",
    icon: <Archive size={15}/>, category: "Conformité", formats: ["pdf","excel"],
    accentColor: "#94a3b8",
    params: [{ key: "annee", label: "Année", type: "year", defaultValue: String(new Date().getFullYear()) }],
  },
];

const REPORT_CATEGORIES = ["Tous", "Opérationnel", "Performance", "RH", "Conformité"];

const HISTORY_KEY = "rapports_history";
const loadHistory  = (): HistoryEntry[] => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; } };
const saveHistory  = (h: HistoryEntry[]) => localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 30)));

// ─── Tooltip Recharts ─────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label, unit = "" }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name ? `${p.name} : ` : ""}{p.value}{unit}
        </p>
      ))}
    </div>
  );
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  title: string; value: React.ReactNode; sub?: React.ReactNode;
  icon: React.ReactNode; accent?: string;
}> = ({ title, value, sub, icon, accent }) => (
  <Card className="relative overflow-hidden border border-gray-200">
    {accent && <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: accent }}/>}
    <CardHeader className="flex flex-col sm:flex-row flex-row sm:items-center sm:justify-between pb-2 pl-4 gap-2 sm:gap-0">
      <CardTitle className="text-xs sm:text-sm font-medium text-gray-900">{title}</CardTitle>
      <span className="text-gray-400">{icon}</span>
    </CardHeader>
    <CardContent className="pl-4">
      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{sub}</div>}
    </CardContent>
  </Card>
);

// ─── ReportCard ───────────────────────────────────────────────────────────────

const ReportCard: React.FC<{
  config: ReportConfig;
  isGenerating: boolean;
  activeFormat: ReportFormat | null;
  onGenerate: (config: ReportConfig, format: ReportFormat, params: Record<string,string>) => void;
}> = ({ config, isGenerating, activeFormat, onGenerate }) => {
  const [open, setOpen] = useState(false);
  const [params, setParams] = useState<Record<string,string>>(
    () => Object.fromEntries(config.params.map(p => [p.key, p.defaultValue || ""]))
  );

  const trigger = (format: ReportFormat) => {
    if (config.params.length === 0) { onGenerate(config, format, params); }
    else { setOpen(true); }
  };

  return (
    <>
      <Card className="relative overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: config.accentColor }}/>
        <CardHeader className="pb-2 pl-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <span style={{ color: config.accentColor }}>{config.icon}</span>
              <CardTitle className="text-xs sm:text-sm font-semibold text-gray-900 leading-snug">{config.label}</CardTitle>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {config.badge && <Badge className="text-[10px] px-1.5 py-0 bg-orange-50 text-orange-600 border-orange-200">{config.badge}</Badge>}
              <Badge className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[config.category]||""}`}>{config.category}</Badge>
            </div>
          </div>
          <CardDescription className="text-xs text-gray-500 mt-1 pl-6">{config.description}</CardDescription>
        </CardHeader>
        <CardContent className="pl-4 pt-0">
          {config.params.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {config.params.slice(0,2).map(p => (
                <span key={p.key} className="text-[10px] bg-gray-50 border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                  <Filter size={8}/> {p.label}
                </span>
              ))}
              {config.params.length > 2 && <span className="text-[10px] text-gray-400">+{config.params.length - 2} filtre(s)</span>}
            </div>
          )}
          <div className="flex items-center gap-2">
            {config.formats.includes("pdf") && (
              <Button size="sm" variant="outline" disabled={isGenerating} onClick={() => trigger("pdf")}
                className="h-8 text-xs gap-1.5 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors">
                {isGenerating && activeFormat === "pdf" ? <Loader2 size={11} className="animate-spin"/> : <FileText size={11}/>} PDF
              </Button>
            )}
            {config.formats.includes("excel") && (
              <Button size="sm" variant="outline" disabled={isGenerating} onClick={() => trigger("excel")}
                className="h-8 text-xs gap-1.5 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors">
                {isGenerating && activeFormat === "excel" ? <Loader2 size={11} className="animate-spin"/> : <FileSpreadsheet size={11}/>} Excel
              </Button>
            )}
            {config.params.length > 0 && (
              <button onClick={() => setOpen(true)} className="ml-auto text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-0.5 transition-colors">
                <Filter size={10}/> Filtres
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <span style={{ color: config.accentColor }}>{config.icon}</span> {config.label}
            </DialogTitle>
            <DialogDescription className="text-xs">{config.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {config.params.map(param => (
              <div key={param.key} className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">{param.label}</Label>
                <Select value={params[param.key]} onValueChange={v => setParams(p => ({ ...p, [param.key]: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {(param.type === "year" ? YEARS : param.options || []).map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="text-xs">Annuler</Button>
            {config.formats.includes("excel") && (
              <Button size="sm" variant="outline" onClick={() => { setOpen(false); onGenerate(config, "excel", params); }}
                className="text-xs gap-1.5 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700">
                <FileSpreadsheet size={11}/> Excel
              </Button>
            )}
            {config.formats.includes("pdf") && (
              <Button size="sm" onClick={() => { setOpen(false); onGenerate(config, "pdf", params); }}
                className="text-xs gap-1.5 bg-gray-900 hover:bg-gray-700 text-white">
                <FileText size={11}/> PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── Analytics page ───────────────────────────────────────────────────────────

const Analytics: React.FC = () => {
  // ── Stats state
  const [stats, setStats]                 = useState<Stats | null>(null);
  const [annee, setAnnee]                 = useState<number>(new Date().getFullYear());
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [modeAffichage, setModeAffichage] = useState<"annuel" | "intervalle">("annuel");

  // ── Rapports state
  const [reportCategory,  setReportCategory]  = useState("Tous");
  const [reportSearch,    setReportSearch]     = useState("");
  const [generating,      setGenerating]       = useState<Record<string, ReportStatus>>({});
  const [activeFormats,   setActiveFormats]    = useState<Record<string, ReportFormat>>({});
  const [history,         setHistory]          = useState<HistoryEntry[]>(loadHistory);
  const [toast,           setToast]            = useState<{ msg: string; type: "success"|"error" } | null>(null);
  const [emailDialog,     setEmailDialog]      = useState(false);
  const [emailConfig,     setEmailConfig]      = useState({ reportId: "", format: "pdf" as ReportFormat, email: "" });
  const toastRef = useRef<ReturnType<typeof setTimeout>>();

  const showToast = (msg: string, type: "success"|"error") => {
    setToast({ msg, type });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch stats
  const fetchStats = (params?: string) => {
    setLoading(true);
    setError(null);
    const q = params || `annee=${annee}`;
    apiClient
      .get(`/statistiques/?${q}`)
      .then(res  => { setStats(res.data); setLoading(false); })
      .catch(()  => { setError("Impossible de charger les données statistiques"); setLoading(false); });
  };

  useEffect(() => { if (modeAffichage === "annuel") fetchStats(); }, [annee, modeAffichage]);

  const resetToCurrentYear = () => { setModeAffichage("annuel"); setAnnee(new Date().getFullYear()); };

  // ── Données graphiques
  const monthlyData = stats?.demandes_par_mois?.map((v, i) => ({ name: MONTHS[i], total: v })) || [];
  const hebdoData   = stats?.perf_hebdo?.map((v, i) => ({ name: DAYS[i], total: v })) || [];
  const compData    = stats?.comp_annee_labels?.map((y, i) => ({ year: String(y), total: stats!.comp_annee[i] })) || [];

  const statusLabels = ["Acceptées","Refusées","En attente","En cours"];
  const statusColors = [C_ACCEPTED, C_REFUSED, C_PENDING, C_ONGOING];
  const statusIcons  = [<CheckCircle size={14}/>,<XCircle size={14}/>,<Clock size={14}/>,<Hourglass size={14}/>];

  const pieData = stats
    ? statusLabels.map((name, i) => ({
        name, color: statusColors[i],
        value: Math.round(stats.total_demandes * stats.repartition_statuts[i] / 100),
        pct:   stats.repartition_statuts[i],
      }))
    : [];

  const evolutionParAnnee = stats?.stats_par_annee?.map(y => ({
    annee: String(y.annee), Total: y.total_demandes,
    Acceptées: y.demandes_acceptees, Refusées: y.demandes_refusees,
    "En cours": y.demandes_en_cours, taux: y.taux_acceptation,
  })) || [];

  const hebdoMax = Math.max(...hebdoData.map(d => d.total), 1);

  // ── Génération rapport
  const doDownload = async (config: ReportConfig, format: ReportFormat, params: Record<string,string>) => {
    const key = `${config.id}-${format}`;
    setGenerating(g => ({ ...g, [key]: "generating" }));
    setActiveFormats(f => ({ ...f, [config.id]: format }));
    const qs = new URLSearchParams({ type: config.id, format, ...params }).toString();
    try {
      const res  = await apiClient.get(`/export-rapport/?${qs}`, { responseType: "blob" });
      const ext  = format === "pdf" ? "pdf" : "xlsx";
      const date = new Date().toISOString().split("T")[0];
      const filename = `${config.id}_${date}.${ext}`;
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const a    = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); window.URL.revokeObjectURL(url);
      const entry: HistoryEntry = { id: String(Date.now()), reportId: config.id, reportLabel: config.label, format, params, date: new Date().toISOString(), status: "success", filename };
      const updated = [entry, ...history]; setHistory(updated); saveHistory(updated);
      setGenerating(g => ({ ...g, [key]: "success" }));
      showToast(`"${config.label}" généré avec succès`, "success");
    } catch {
      const entry: HistoryEntry = { id: String(Date.now()), reportId: config.id, reportLabel: config.label, format, params, date: new Date().toISOString(), status: "error", filename: "" };
      const updated = [entry, ...history]; setHistory(updated); saveHistory(updated);
      setGenerating(g => ({ ...g, [key]: "error" }));
      showToast(`Erreur lors de la génération de "${config.label}"`, "error");
    } finally {
      setTimeout(() => setGenerating(g => ({ ...g, [key]: "idle" })), 2000);
    }
  };

  const getCardGenerating = (config: ReportConfig) =>
    config.formats.some(f => generating[`${config.id}-${f}`] === "generating");

  // ── Rapports filtrés
  const filteredReports = REPORT_CATALOGUE.filter(r => {
    const matchCat = reportCategory === "Tous" || r.category === reportCategory;
    const q = reportSearch.toLowerCase();
    return matchCat && (!q || r.label.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
  });

  const todayCount   = history.filter(e => e.date.startsWith(new Date().toISOString().split("T")[0])).length;
  const successCount = history.filter(e => e.status === "success").length;

  // ── Erreur stats
  if (error) return (
    <DashboardLayout>
      <div className="container mx-auto py-10 text-center space-y-3">
        <AlertCircle className="h-10 w-10 mx-auto text-destructive"/>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button size="sm" onClick={() => fetchStats()}><RefreshCw className="h-4 w-4 mr-2"/> Réessayer</Button>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Tableaux de bord et statistiques</h1>
            <CardDescription className="text-xs sm:text-sm text-gray-600">
              {modeAffichage === "intervalle" && stats
                ? `Analyse des stages de ${stats.annee_debut} à ${stats.annee_fin}`
                : "Analyse des performances et tendances des stages"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {modeAffichage === "annuel" ? (
              <Select value={annee.toString()} onValueChange={v => setAnnee(parseInt(v))} disabled={loading}>
                <SelectTrigger className="w-[130px] text-xs sm:text-sm focus:border-primary focus:ring-primary">
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-gray-400"/>
                  <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }).map((_, i) => {
                    const y = new Date().getFullYear() - i;
                    return <SelectItem key={y} value={y.toString()} className="text-xs sm:text-sm">{y}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            ) : (
              <Button variant="outline" size="sm" onClick={resetToCurrentYear} className="text-xs gap-1.5">
                <Calendar className="h-3.5 w-3.5"/> <span className="hidden sm:inline">Année actuelle</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => fetchStats()} disabled={loading} className="h-9 w-9 p-0 hover:bg-gray-50">
              <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${loading ? "animate-spin" : ""}`}/>
            </Button>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border border-gray-200">
                <CardHeader className="pb-2"><Skeleton className="h-4 w-28"/></CardHeader>
                <CardContent><Skeleton className="h-8 w-16"/><Skeleton className="h-3 w-24 mt-1.5"/></CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Content ── */}
        {!loading && stats && (
          <>
            {/* KPI cards — identiques */}
            {modeAffichage === "intervalle" ? (
              <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <StatCard title="Période analysée" value={`${stats.annee_debut} – ${stats.annee_fin}`} sub={`${stats.annee_fin! - stats.annee_debut! + 1} années`} icon={<Calendar size={16}/>} accent={C_PRIMARY}/>
                <StatCard title="Demandes totales" value={stats.total_intervalle} sub={`Moy. ${Math.round(stats.total_intervalle! / (stats.annee_fin! - stats.annee_debut! + 1))}/an`} icon={<UserPlus size={16}/>} accent={C_PRIMARY}/>
                <StatCard title="Taux d'acceptation" value={`${stats.taux_acceptation_intervalle}%`}
                  sub={<Badge className={`text-[10px] mt-0.5 ${stats.taux_acceptation_intervalle! >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{stats.taux_acceptation_intervalle! >= 70 ? "Élevé" : "Moyen"}</Badge>}
                  icon={<TrendingUp size={16}/>} accent={C_ACCEPTED}/>
                <StatCard title="Demandes en cours" value={stats.total_en_cours_intervalle} sub="En cours de traitement" icon={<Hourglass size={16}/>} accent={C_ONGOING}/>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
                  <StatCard title="Demandes totales" value={stats.total_demandes} sub={annee === new Date().getFullYear() ? "Cette année" : `Année ${annee}`} icon={<UserPlus size={16}/>} accent={C_PRIMARY}/>
                  <StatCard title="Taux d'acceptation" value={`${stats.taux_acceptation}%`}
                    sub={<Badge className={`text-[10px] mt-0.5 ${stats.taux_acceptation >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{stats.taux_acceptation >= 70 ? "Élevé" : "Moyen"}</Badge>}
                    icon={<TrendingUp size={16}/>} accent={C_ACCEPTED}/>
                  <StatCard title="Délai moyen de traitement" value={`${stats.delai_moyen} jours`} sub="De la soumission à la décision" icon={<Clock size={16}/>} accent={C_PENDING}/>
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                  {pieData.map((s, i) => <StatCard key={s.name} title={s.name} value={`${Math.round(s.pct)}%`} sub={`${s.value} demandes`} icon={statusIcons[i]} accent={s.color}/>)}
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
                  <StatCard title="Stages actifs" value={stats.stages_en_cours} sub="En ce moment" icon={<GraduationCap size={16}/>} accent={C_ONGOING}/>
                  <StatCard title="En cours de traitement" value={stats.demandes_en_cours_traitement} sub="Dossiers ouverts" icon={<Activity size={16}/>} accent={C_PENDING}/>
                  <StatCard title="Durée moy. stage" value={`${stats.duree_moyenne_stage} j`} sub="Durée effective des stages" icon={<Timer size={16}/>} accent={C_PRIMARY}/>
                </div>
              </>
            )}

            {/* ── Tabs ── */}
            <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
              <TabsList className="bg-gray-50/50 border border-gray-200 w-fit">
                <TabsTrigger value="overview"    className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"><BarChart3  size={13}/> <span className="hidden xs:inline">Vue d'ensemble</span></TabsTrigger>
                <TabsTrigger value="repartition" className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"><Activity   size={13}/> <span className="hidden xs:inline">Répartition</span></TabsTrigger>
                <TabsTrigger value="tendances"   className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"><TrendingUp size={13}/> <span className="hidden xs:inline">Tendances</span></TabsTrigger>
                <TabsTrigger value="rapports"    className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Download size={13}/> <span className="hidden xs:inline">Rapports</span>
                  {history.length > 0 && <span className="ml-0.5 bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0 rounded-full font-medium">{history.length}</span>}
                </TabsTrigger>
              </TabsList>

              {/* ════ TAB 1 — VUE D'ENSEMBLE ════ */}
              <TabsContent value="overview" className="space-y-4 sm:space-y-6">
                {modeAffichage === "intervalle" ? (
                  <>
                    <Card className="border border-gray-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-gray-900"><TrendingUp size={16}/> Évolution annuelle des demandes</CardTitle>
                        <CardDescription className="text-xs sm:text-sm text-gray-600">Comparaison par statut — {stats.annee_debut} à {stats.annee_fin}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={340}>
                          <BarChart data={evolutionParAnnee} barCategoryGap="25%" barGap={3}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                            <XAxis dataKey="annee" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                            <YAxis tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                            <Tooltip content={<CustomTooltip/>}/><Legend wrapperStyle={{fontSize:11,paddingTop:12}}/>
                            <Bar dataKey="Acceptées" fill={C_ACCEPTED} radius={[4,4,0,0]}/><Bar dataKey="Refusées" fill={C_REFUSED} radius={[4,4,0,0]}/><Bar dataKey="En cours" fill={C_ONGOING} radius={[4,4,0,0]}/>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
                      <Card className="border border-gray-200">
                        <CardHeader><CardTitle className="flex items-center gap-2 text-sm text-gray-900"><CalendarRange size={15}/> Taux d'acceptation par année</CardTitle><CardDescription className="text-xs text-gray-600">Évolution du taux sur la période</CardDescription></CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={evolutionParAnnee}>
                              <defs><linearGradient id="gTaux" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C_ACCEPTED} stopOpacity={0.2}/><stop offset="95%" stopColor={C_ACCEPTED} stopOpacity={0}/></linearGradient></defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                              <XAxis dataKey="annee" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis unit="%" domain={[0,100]} tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                              <Tooltip content={<CustomTooltip unit="%"/>}/>
                              <Area type="monotone" dataKey="taux" name="Taux" stroke={C_ACCEPTED} strokeWidth={2.5} fill="url(#gTaux)" dot={{r:4,fill:C_ACCEPTED,strokeWidth:0}} activeDot={{r:6,fill:C_ACCEPTED,stroke:"#fff",strokeWidth:2}}/>
                            </AreaChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                      <Card className="border border-gray-200">
                        <CardHeader><CardTitle className="flex items-center gap-2 text-sm text-gray-900"><Target size={15}/> Performance hebdomadaire</CardTitle><CardDescription className="text-xs text-gray-600">Demandes traitées par jour (moyenne)</CardDescription></CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={hebdoData} barCategoryGap="35%">
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="name" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><Tooltip content={<CustomTooltip/>}/>
                              <Bar dataKey="total" name="Demandes" radius={[4,4,0,0]}>{hebdoData.map((d,i)=><Cell key={i} fill={d.total===hebdoMax?C_ONGOING:C_PRIMARY} fillOpacity={0.85}/>)}</Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                ) : (
                  <>
                    <Card className="border border-gray-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-gray-900"><CalendarRange size={16}/> Évolution des demandes par mois — {annee}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm text-gray-600">Nombre de demandes de stage traitées mensuellement</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={320}>
                          <AreaChart data={monthlyData}>
                            <defs><linearGradient id="gMonth" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C_PRIMARY} stopOpacity={0.18}/><stop offset="95%" stopColor={C_PRIMARY} stopOpacity={0}/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="name" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                            <Tooltip content={<CustomTooltip unit=" demandes"/>}/>
                            <Area type="monotone" dataKey="total" name="Demandes" stroke={C_PRIMARY} strokeWidth={2.5} fill="url(#gMonth)" dot={{r:4,fill:C_PRIMARY,strokeWidth:0}} activeDot={{r:6,fill:C_PRIMARY,stroke:"#fff",strokeWidth:2}}/>
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
                      <Card className="border border-gray-200">
                        <CardHeader><CardTitle className="flex items-center gap-2 text-sm text-gray-900"><Activity size={15}/> Performance hebdomadaire</CardTitle><CardDescription className="text-xs text-gray-600">Demandes traitées par jour de la semaine</CardDescription></CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={hebdoData} barCategoryGap="35%">
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="name" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><Tooltip content={<CustomTooltip/>}/>
                              <Bar dataKey="total" name="Demandes" radius={[4,4,0,0]}>{hebdoData.map((d,i)=><Cell key={i} fill={d.total===hebdoMax?C_ACCEPTED:C_PRIMARY} fillOpacity={0.85}/>)}</Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                      <Card className="border border-gray-200">
                        <CardHeader><CardTitle className="flex items-center gap-2 text-sm text-gray-900"><Target size={15}/> Comparaison annuelle</CardTitle><CardDescription className="text-xs text-gray-600">Évolution du nombre de demandes sur plusieurs années</CardDescription></CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={compData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="year" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><Tooltip content={<CustomTooltip/>}/>
                              <Line type="monotone" dataKey="total" name="Demandes" stroke={C_PRIMARY} strokeWidth={2.5} dot={{r:5,fill:"#fff",stroke:C_PRIMARY,strokeWidth:2}} activeDot={{r:7,fill:C_PRIMARY}}/>
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* ════ TAB 2 — RÉPARTITION ════ */}
              <TabsContent value="repartition" className="space-y-4 sm:space-y-6">
                <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
                  <Card className="border border-gray-200">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-sm text-gray-900"><BarChart3 size={15}/> Répartition des statuts</CardTitle><CardDescription className="text-xs text-gray-600">Distribution par décision de traitement</CardDescription></CardHeader>
                    <CardContent>
                      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 md:gap-6">
                        <div className="shrink-0">
                          <ResponsiveContainer width={200} height={200}>
                            <PieChart>
                              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={3} dataKey="value" stroke="none">
                                {pieData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                              </Pie>
                              <Tooltip formatter={(v:number,n:string)=>[`${v} demandes`,n]} contentStyle={{borderRadius:10,border:"1px solid #e2e8f0",fontSize:12}}/>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex-1 w-full space-y-3">
                          {pieData.map((d,i) => (
                            <div key={i} className="space-y-1">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-2 sm:gap-0">
                                <span className="flex items-center gap-1.5 text-gray-700 font-medium"><span className="w-2.5 h-2.5 rounded-full" style={{background:d.color}}/>{d.name}</span>
                                <span className="font-bold text-gray-800">{Math.round(d.pct)}% <span className="font-normal text-gray-400">({d.value})</span></span>
                              </div>
                              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{width:`${d.pct}%`,background:d.color}}/></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border border-gray-200">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-sm text-gray-900"><CalendarRange size={15}/> Top mois par volume</CardTitle><CardDescription className="text-xs text-gray-600">Classement des mois par nombre de demandes</CardDescription></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart layout="vertical" data={[...monthlyData].sort((a,b)=>b.total-a.total).slice(0,8)} margin={{left:4,right:24}} barCategoryGap="20%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/><XAxis type="number" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="name" tick={{fontSize:11,fill:"#64748b"}} axisLine={false} tickLine={false} width={28}/><Tooltip content={<CustomTooltip/>}/>
                          <Bar dataKey="total" name="Demandes" radius={[0,4,4,0]}>{[...monthlyData].sort((a,b)=>b.total-a.total).slice(0,8).map((_,i)=><Cell key={i} fill={i===0?C_PRIMARY:i<3?"#818cf8":"#c7d2fe"}/>)}</Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
                {stats?.stats_par_annee && stats.stats_par_annee.length > 1 && (
                  <Card className="border border-gray-200">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-sm text-gray-900"><TrendingUp size={15}/> Évolution des statuts par année</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={evolutionParAnnee} barCategoryGap="20%" barGap={2}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="annee" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><Tooltip content={<CustomTooltip/>}/><Legend wrapperStyle={{fontSize:11,paddingTop:12}}/>
                          <Bar dataKey="Acceptées" fill={C_ACCEPTED} radius={[3,3,0,0]}/><Bar dataKey="Refusées" fill={C_REFUSED} radius={[3,3,0,0]}/><Bar dataKey="En cours" fill={C_ONGOING} radius={[3,3,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ════ TAB 3 — TENDANCES ════ */}
              <TabsContent value="tendances" className="space-y-4 sm:space-y-6">
                <Card className="border border-gray-200">
                  <CardHeader><CardTitle className="flex items-center gap-2 text-sm text-gray-900"><CalendarDays size={15}/> Intensité mensuelle — {annee}</CardTitle><CardDescription className="text-xs text-gray-600">Volume relatif par mois de l'année</CardDescription></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 mt-1">
                      {MONTHS.map((m, i) => {
                        const v = stats?.demandes_par_mois?.[i] ?? 0;
                        const max = Math.max(...(stats?.demandes_par_mois ?? [1]), 1);
                        const r = v / max;
                        const bg = r>0.75?C_PRIMARY:r>0.5?"#818cf8":r>0.25?"#c7d2fe":"#eef2ff";
                        return (
                          <div key={m} className="flex flex-col items-center gap-1.5">
                            <div className="w-full rounded-lg transition-all" style={{height:`${Math.max(r*68,8)}px`,background:bg}}/>
                            <span className="text-[10px] text-gray-400 font-medium">{m}</span>
                            <span className="text-[10px] font-bold text-gray-600">{v}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
                <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
                  <Card className="border border-gray-200">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-sm text-gray-900"><TrendingUp size={15}/> Comparaison annuelle</CardTitle><CardDescription className="text-xs text-gray-600">Évolution du volume — 5 dernières années</CardDescription></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={compData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="year" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><Tooltip content={<CustomTooltip/>}/>
                          <Line type="monotone" dataKey="total" name="Demandes" stroke={C_PRIMARY} strokeWidth={2.5} dot={{r:5,fill:"#fff",stroke:C_PRIMARY,strokeWidth:2}} activeDot={{r:7,fill:C_PRIMARY}}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="border border-gray-200">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-sm text-gray-900"><Activity size={15}/> Activité hebdomadaire</CardTitle><CardDescription className="text-xs text-gray-600">Demandes traitées par jour de la semaine</CardDescription></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={hebdoData} barCategoryGap="35%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="name" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><Tooltip content={<CustomTooltip/>}/>
                          <Bar dataKey="total" name="Demandes" radius={[4,4,0,0]}>{hebdoData.map((d,i)=><Cell key={i} fill={d.total===hebdoMax?C_ACCEPTED:C_PRIMARY} fillOpacity={0.85}/>)}</Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
                <Card className="border border-gray-200">
                  <CardHeader><CardTitle className="flex items-center gap-2 text-sm text-gray-900"><CalendarRange size={15}/> Courbe mensuelle détaillée</CardTitle><CardDescription className="text-xs text-gray-600">Tendance fine des demandes mois par mois</CardDescription></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={monthlyData}>
                        <defs><linearGradient id="gM2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C_ACCEPTED} stopOpacity={0.15}/><stop offset="95%" stopColor={C_ACCEPTED} stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="name" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                        <Tooltip content={<CustomTooltip unit=" demandes"/>}/>
                        <Area type="monotone" dataKey="total" name="Demandes" stroke={C_ACCEPTED} strokeWidth={2} fill="url(#gM2)" dot={{r:3,fill:C_ACCEPTED,strokeWidth:0}} activeDot={{r:5,fill:C_ACCEPTED,stroke:"#fff",strokeWidth:2}}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ════ TAB 4 — RAPPORTS ════ */}
              <TabsContent value="rapports" className="space-y-4 sm:space-y-6">

                {/* Mini stats rapports */}
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                  {[
                    { label: "Rapports disponibles", value: REPORT_CATALOGUE.length, accent: C_PRIMARY,   icon: <FileText size={14}/> },
                    { label: "Générés aujourd'hui",   value: todayCount,              accent: C_ONGOING,   icon: <CalendarDays size={14}/> },
                    { label: "Succès total",          value: successCount,            accent: C_ACCEPTED,  icon: <CheckCircle size={14}/> },
                    { label: "Dans l'historique",     value: history.length,          accent: C_PENDING,   icon: <History size={14}/> },
                  ].map(s => (
                    <Card key={s.label} className="relative overflow-hidden border border-gray-200">
                      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: s.accent }}/>
                      <CardContent className="pl-4 pt-4 pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 gap-2 sm:gap-0">
                          <span className="text-[10px] sm:text-xs text-gray-500">{s.label}</span>
                          <span style={{ color: s.accent }}>{s.icon}</span>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900">{s.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Sous-tabs catalogue / historique */}
                <Tabs defaultValue="catalogue" className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <TabsList className="bg-gray-50/50 border border-gray-200 w-fit">
                      <TabsTrigger value="catalogue"  className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-1.5"><FileText size={12}/> Catalogue</TabsTrigger>
                      <TabsTrigger value="historique" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-1.5">
                        <History size={12}/> Historique
                        {history.length > 0 && <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 rounded-full">{history.length}</span>}
                      </TabsTrigger>
                    </TabsList>
                    {/*<Button variant="outline" size="sm" onClick={() => setEmailDialog(true)}
                      className="text-xs gap-1.5 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700">
                      <Mail size={12}/> Rapport automatique
                    </Button>*/}
                  </div>

                  {/* Catalogue */}
                  <TabsContent value="catalogue" className="space-y-4">
                    {/* Filtres */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1 max-w-xs">
                        <FileSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <Input placeholder="Rechercher…" value={reportSearch} onChange={e => setReportSearch(e.target.value)} className="pl-8 h-9 text-xs border-gray-200"/>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {REPORT_CATEGORIES.map(cat => (
                          <button key={cat} onClick={() => setReportCategory(cat)}
                            className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                              reportCategory === cat
                                ? "bg-gray-900 text-white border-gray-900"
                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}>
                            {cat}
                            {cat !== "Tous" && (
                              <span className={`ml-1.5 text-[10px] ${reportCategory === cat ? "text-gray-400" : "text-gray-400"}`}>
                                {REPORT_CATALOGUE.filter(r => r.category === cat).length}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Grille de rapports, groupée par catégorie si "Tous" */}
                    {filteredReports.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">
                        <FileSearch size={28} className="mx-auto mb-2 opacity-40"/>
                        <p className="text-sm">Aucun rapport trouvé</p>
                      </div>
                    ) : reportCategory === "Tous" ? (
                      REPORT_CATEGORIES.filter(c => c !== "Tous").map(cat => {
                        const items = filteredReports.filter(r => r.category === cat);
                        if (!items.length) return null;
                        return (
                          <div key={cat} className="space-y-3">
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{cat}</h3>
                              <div className="flex-1 h-px bg-gray-100"/>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[cat]||""}`}>{items.length}</span>
                            </div>
                            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                              {items.map(config => (
                                <ReportCard key={config.id} config={config}
                                  isGenerating={getCardGenerating(config)}
                                  activeFormat={activeFormats[config.id] || null}
                                  onGenerate={doDownload}/>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredReports.map(config => (
                          <ReportCard key={config.id} config={config}
                            isGenerating={getCardGenerating(config)}
                            activeFormat={activeFormats[config.id] || null}
                            onGenerate={doDownload}/>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Historique */}
                  <TabsContent value="historique">
                    {history.length === 0 ? (
                      <Card className="border border-gray-200">
                        <CardContent className="py-14 text-center">
                          <History size={32} className="mx-auto mb-3 text-gray-200"/>
                          <p className="text-sm text-gray-400">Aucun rapport généré pour l'instant</p>
                          <p className="text-xs text-gray-300 mt-1">Les téléchargements apparaîtront ici</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border border-gray-200">
                        <CardHeader className="pb-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                            <div>
                              <CardTitle className="text-sm text-gray-900 flex items-center gap-2"><History size={14}/> Historique des téléchargements</CardTitle>
                              <CardDescription className="text-xs text-gray-500 mt-0.5">{history.length} entrée(s) · Stocké localement dans votre navigateur</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => { setHistory([]); saveHistory([]); }}
                              className="text-xs gap-1.5 text-gray-500 hover:text-red-600 hover:border-red-200">
                              <Trash2 size={11}/> Effacer
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {(() => {
                            const groups: Record<string,HistoryEntry[]> = {};
                            history.forEach(e => {
                              const d = new Date(e.date);
                              const today = new Date(); const yest = new Date(today); yest.setDate(today.getDate()-1);
                              const key = d.toDateString()===today.toDateString() ? "Aujourd'hui" : d.toDateString()===yest.toDateString() ? "Hier" : d.toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"});
                              groups[key] = [...(groups[key]||[]), e];
                            });
                            return Object.entries(groups).map(([date, entries]) => (
                              <div key={date} className="mb-4">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 px-2">{date}</p>
                                {entries.map(entry => {
                                  const cfg = REPORT_CATALOGUE.find(r => r.id === entry.reportId);
                                  return (
                                    <div key={entry.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-lg px-2 group transition-colors">
                                      <span style={{ color: cfg?.accentColor||C_PRIMARY }}>
                                        {entry.format==="pdf" ? <FileText size={14}/> : <FileSpreadsheet size={14}/>}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-800 truncate">{entry.reportLabel}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                          {new Date(entry.date).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})} · {entry.format.toUpperCase()}
                                          {Object.values(entry.params).filter(Boolean).length > 0 && " · " + Object.values(entry.params).filter(Boolean).join(", ")}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="sm" variant="ghost" title="Re-télécharger" onClick={() => { if (cfg) doDownload(cfg, entry.format, entry.params); }}
                                          className="h-7 w-7 p-0 text-gray-400 hover:text-indigo-600">
                                          <Download size={12}/>
                                        </Button>
                                        <Button size="sm" variant="ghost" title="Supprimer" onClick={() => { const u = history.filter(e => e.id !== entry.id); setHistory(u); saveHistory(u); }}
                                          className="h-7 w-7 p-0 text-gray-400 hover:text-red-500">
                                          <Trash2 size={12}/>
                                        </Button>
                                      </div>
                                      {entry.status === "error" && <Badge className="text-[10px] bg-red-50 text-red-600 border-red-200 shrink-0">Échec</Badge>}
                                    </div>
                                  );
                                })}
                              </div>
                            ));
                          })()}
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* ── Dialog rapport auto email ── */}
        <Dialog open={emailDialog} onOpenChange={setEmailDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm"><Mail size={15} className="text-indigo-600"/> Rapport automatique par email</DialogTitle>
              <DialogDescription className="text-xs">Envoi automatique le 1er de chaque mois à l'adresse configurée</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Rapport</Label>
                <Select value={emailConfig.reportId} onValueChange={v => setEmailConfig(c => ({ ...c, reportId: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Choisir un rapport…"/></SelectTrigger>
                  <SelectContent>{REPORT_CATALOGUE.map(r => <SelectItem key={r.id} value={r.id} className="text-xs">{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Format</Label>
                <Select value={emailConfig.format} onValueChange={v => setEmailConfig(c => ({ ...c, format: v as ReportFormat }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="pdf" className="text-xs">PDF</SelectItem><SelectItem value="excel" className="text-xs">Excel</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Adresse email</Label>
                <Input type="email" placeholder="direction@ceb.bj" value={emailConfig.email} onChange={e => setEmailConfig(c => ({ ...c, email: e.target.value }))} className="h-9 text-xs"/>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-700">
                Le rapport sera envoyé automatiquement le 1er de chaque mois. Activez le cron Django côté backend.
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setEmailDialog(false)} className="text-xs">Annuler</Button>
              <Button size="sm" disabled={!emailConfig.reportId || !emailConfig.email}
                onClick={() => {
                  apiClient.post("/rapports/planifier-email/", emailConfig)
                    .then(() => { setEmailDialog(false); showToast("Rapport automatique configuré", "success"); })
                    .catch(() => showToast("Erreur de configuration", "error"));
                }}
                className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
                <Send size={12}/> Configurer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Toast ── */}
        {toast && (
          <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium ${
            toast.type === "success" ? "bg-white border-emerald-200 text-emerald-700" : "bg-white border-red-200 text-red-700"
          }`}>
            {toast.type === "success" ? <CheckCircle size={13} className="text-emerald-500 shrink-0"/> : <AlertCircle size={13} className="text-red-500 shrink-0"/>}
            {toast.msg}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
import React, { useEffect, useMemo, useState } from "react"; 
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { departmentDescriptions } from "@/config/sharedConfig"; 

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Mail, Phone, Info, Upload, User, FileText, Eye, AlertCircle, X, FileCheck, GraduationCap, UserCheck, Building2, ClipboardList, MapPin, Download, ArrowLeft, Briefcase, Clock, DollarSign, FileBarChart, CalendarRange, CheckCircle, Edit, Save, Loader2, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import apiClient from "@/lib/apiClient";

import { 
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, differenceInDays, isBefore, isAfter, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";

// Import pour le formulaire de renouvellement
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Import des composants shadcn/ui pour les dates
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar"; // Renommé pour éviter le conflit
import { cn } from "@/lib/utils";

// Import des icônes supplémentaires
import {
  ChevronLeft,
  ChevronRight,
  Users,
  UserCog
} from "lucide-react";

// ========================= //
//     Types et utilitaires  //
// ========================= //
type APIDocument = { 
  nom: string; 
  url: string;
  type?: string;
  date_upload?: string;
  size?: number;
};

type APIEcole = { 
  name: string | null; 
  location?: string | null; 
  email?: string | null; 
  phone?: string | null; 
};

type APIStagiaire = {
  id: string; 
  prenom: string; 
  nom: string; 
  email: string; 
  telephone: string;
  resume?: string | null; 
  adresse?: string | null;
  niveau_etude: string; 
  genre: string;
  superviseur?: string | null;
  type_stage: string; 
  date_debut: string; 
  date_fin: string; 
  duree_jours: number;
  direction?: string | null; 
  service?: string | null; 
  lieu_stage?: string | null;
  specialite: string; 
  etablissement?: APIEcole | null; 
  pays_residence?: string | null; 
  photo_passeport?: string | null;
  resume_cv?: string | null; 
  remunere: boolean; 
  montant_remuneration?: number | null; 
  documents: APIDocument[];
  statut: string;
  a_ete_renouvele?: boolean;
  stage_renouvele_id?: string | null;
  pre_renouvellement_en_cours?: boolean;
  donnees_pre_renouvellement?: any;
  convention_renouvellement_temporaire?: {
    id: string;
    fichier_url: string;
    nom_fichier: string;
  } | null;
  // Champs pour la convention
  convention?: {
    id: string;
    numero_convention: string;
    fichier_url: string | null;
    date_creation: string;
  } | null;
};

// ========================= //
//     Données de configuration //
// ========================= //

const internshipTypes = [
  { value: "Académique", label: "Stage Académique", description: "Stage dans le cadre d'un cursus universitaire" },
  { value: "Fonctionnel", label: "Stage Fonctionnel", description: "Stage d'application professionnelle" },
  { value: "Libre", label: "Stage Libre", description: "Stage hors cadre académique" },
];

const locations = [
  { value: "Direction Générale", label: "Direction Générale", description: "Siège principal de l'entreprise" },
  { value: "DRB", label: "DRB", description: "Direction Régionale de Borgou" },
  { value: "DRT", label: "DRT", description: "Direction Régionale de l'Atacora" },
  { value: "Poste de Kara", label: "Poste de Kara", description: "Unité opérationnelle à Kara" },
  { value: "Poste de Lokossa", label: "Poste de Lokossa", description: "Unité opérationnelle à Lokossa" },
];

const departments = [
  { value: "DARH", label: "DARH", description: "Direction des Affaires et Ressources Humaines" },
  { value: "DCGIS", label: "DCGIS", description: "Direction du Centre de Gestion de l'Information et des Statistiques" },
  { value: "DEPP", label: "DEPP", description: "Direction des Études, Planification et Projets" },
  { value: "DT", label: "DT", description: "Direction Technique" },
  { value: "DM", label: "DM", description: "Direction des Marchés" },
  { value: "DFC", label: "DFC", description: "Direction Financière et Comptable" },
  { value: "DG", label: "DG", description: "Direction Générale" },
];

const servicesByDepartment = {
  DARH: ["Administration et Archives", "Ressources Humaines et Affaires Sociales", "Secrétariat"],
  DCGIS: ["Informatique", "Statistique", "Secrétariat"],
  DM: ["Préparation et Suivi des Marchés", "Exécutions des Marchés, Approvisionnement et Exonérations"],
  DT: ["Mouvements d'Energie - Dispathing", "Entretient et Télécommunications"],
  DEPP: ["Planiification Etudes et Préparation des Projets", "Service Environnement, Génie Civil et Mécanique"],
  DFC: ["Comptabilité", "Finance", "Infrastructures et Logistique"],
  DG: ["Communication", "Gestion des ressources financières"],
};

const supervisorsByService = {
  "Administration et Archives": ["KOUBIRMA-BIGNADI Yada"],
  "Ressources Humaines et Affaires Sociales": ["N'DAH-ABOUKHEDOUD Alida"],
  "Informatique": ["TCHAMDJA Mawababè", "MAISSO Tartien"],
  "Statistique": ["SIMNAGNAN Hadatema"],
  "Préparation et Suivi des Marchés": ["YANDOA Kolani", "DAFIA SANNI Alidou"],
  "Mouvements d'Energie - Dispathing": ["TIDIYE Essoyomewe"],
  "Service Environnement, Génie Civil et Mécanique": ["PASSEM Afeitom"],
};

// Ajoutez cette fonction utilitaire au début de votre composant, après les imports
const formatResumeHtml = (htmlText: string): string => {
  if (!htmlText) return "";
  
  // Remplacer les sauts de ligne HTML par des paragraphes ou des breaks
  const textWithBreaks = htmlText
    .replace(/\n/g, '<br>')
    .replace(/<br><br>/g, '</p><p>')
    .replace(/<strong>/g, '<strong class="font-bold">');
  
  return `<p>${textWithBreaks}</p>`;
};

// ========================= //
//     Enhanced Select       //
// ========================= //
const EnhancedSelect: React.FC<{
  form: any;
  name: string;
  label: string;
  placeholder: string;
  items: { value: string; label: string; description?: string }[];
  icon?: React.ReactNode;
  disabled?: boolean;
}> = ({ form, name, label, placeholder, items, icon, disabled = false }) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }: any) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2 text-sm font-medium">
            {icon}
            {label}
          </FormLabel>
          <Select 
            onValueChange={field.onChange} 
            defaultValue={typeof field.value === "string" ? field.value : ""}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger className="h-11">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="max-h-[300px]">
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value} className="py-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{item.label}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground mt-1">
                        {item.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

// ========================= //
//     Date Picker Field     //
// ========================= //
const DatePickerField: React.FC<{
  form: any;
  name: string;
  label: string;
  disabled?: (date: Date) => boolean;
}> = ({ form, name, label, disabled }) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }: any) => (
        <FormItem className="flex flex-col">
          <FormLabel className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4" />
            {label}
          </FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant={"outline"}
                  className={cn(
                    "h-11 w-full pl-3 text-left font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  {field.value instanceof Date ? (
                    format(field.value, "PPP", { locale: fr })
                  ) : (
                    <span>Sélectionnez une date</span>
                  )}
                  <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={field.value && field.value instanceof Date ? field.value : undefined}
                onSelect={field.onChange}
                disabled={disabled}
                initialFocus
                locale={fr}
                className="pointer-events-auto"
                classNames={{
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground",
                }}
              />
            </PopoverContent>
          </Popover>
          <FormDescription>
            {name === "startDate" 
              ? "Date à laquelle le stage débutera" 
              : "Date à laquelle le stage se terminera"
            }
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

// ========================= //
//     Remuneration Section  //
// ========================= //
const RemunerationSection: React.FC<{
  form: any;
  isPaid: boolean;
}> = ({ form, isPaid }) => {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="isPaid"
        render={({ field }: any) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/20">
            <div className="space-y-0.5">
              <FormLabel className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Stage rémunéré
              </FormLabel>
              <FormDescription>
                Cochez si le stage sera rémunéré
              </FormDescription>
            </div>
            <FormControl>
              <input
                type="checkbox"
                checked={field.value}
                onChange={field.onChange}
                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </FormControl>
          </FormItem>
        )}
      />

      {isPaid && (
        <FormField
          control={form.control}
          name="amount"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Montant de la rémunération (FCFA)</FormLabel>
              <FormControl>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Entrez le montant"
                    className="h-11 pl-10"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </div>
              </FormControl>
              <FormDescription>
                Montant mensuel de la rémunération
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
};

// ========================= //
//     Progress Indicator    //
// ========================= //
const ProgressIndicator: React.FC<{
  currentStep: number;
  steps: { label: string; description: string }[];
}> = ({ currentStep, steps }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start relative">
        {steps.map((step, index) => (
          <div key={step.label} className="flex flex-col items-center flex-1 z-10">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
              index <= currentStep 
                ? "bg-primary border-primary text-primary-foreground shadow-lg scale-110" 
                : index === currentStep + 1
                ? "border-primary/50 text-primary/50 scale-105"
                : "border-muted-foreground/30 text-muted-foreground"
            }`}>
              {index < currentStep ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <span className="font-semibold">{index + 1}</span>
              )}
            </div>
            <div className={`text-sm font-medium mt-3 text-center transition-colors ${
              index <= currentStep ? "text-foreground" : "text-muted-foreground"
            }`}>
              {step.label}
            </div>
            <div className={`text-xs mt-1 text-center max-w-[120px] transition-colors ${
              index <= currentStep ? "text-foreground/70" : "text-muted-foreground/70"
            }`}>
              {step.description}
            </div>
          </div>
        ))}
        
        {/* Ligne de progression */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -translate-y-1/2">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

 // ========================= //
 //     Step Navigation       //
 // ========================= //
 const StepNavigation: React.FC<{
   onPrevious: (e?: React.MouseEvent) => void;
   onNext?: (e?: React.MouseEvent) => void;
   onSubmit?: (e?: React.MouseEvent) => void;
   isNextDisabled?: boolean;
   isLastStep?: boolean;
   isSubmitDisabled?: boolean;
   isSubmitting?: boolean;
 }> = ({ 
   onPrevious, 
   onNext, 
   onSubmit, 
   isNextDisabled = false, 
   isLastStep = false, 
   isSubmitDisabled = false,
   isSubmitting = false 
 }) => {
   return (
     <div className="flex justify-between pt-6">
       <Button 
         type="button" 
         variant="outline" 
         onClick={onPrevious} 
         className="gap-2 min-w-[120px]"
         disabled={isSubmitting}
       >
         <ChevronLeft className="h-4 w-4" />
         Précédent
       </Button>
       
       {isLastStep ? (
         <Button 
           type="button" 
           onClick={onSubmit} 
           disabled={isSubmitDisabled || isSubmitting}
           className="gap-2 min-w-[160px]"
         >
           {isSubmitting ? (
             <>
               <Loader2 className="h-4 w-4 animate-spin" />
               Création...
             </>
           ) : (
             <>
               <CheckCircle className="h-4 w-4" />
               Générer convention
             </>
           )}
         </Button>
       ) : (
         <Button 
           type="button" 
           onClick={onNext} 
           disabled={isNextDisabled || isSubmitting}
           className="gap-2 min-w-[120px]"
         >
           Suivant
           <ChevronRight className="h-4 w-4" />
         </Button>
       )}
     </div>
   );
 };

// ========================= //
//     Summary Preview       //
// ========================= //
const SummaryPreview: React.FC<{
  form: any;
}> = ({ form }) => {
  const values = form.getValues();
  
  if (!values.internshipType && !values.location && !values.department) {
    return null;
  }

  const formatDate = (date: Date) => {
    return date ? format(date, "dd/MM/yyyy", { locale: fr }) : "Non définie";
  };

  return (
    <Card className="bg-muted/20 border-muted">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Info className="h-4 w-4" />
          Aperçu du nouveau stage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {values.internshipType && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type:</span>
            <span className="font-medium">{values.internshipType}</span>
          </div>
        )}
        {values.location && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Lieu:</span>
            <span className="font-medium">{values.location}</span>
          </div>
        )}
        {values.department && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Direction:</span>
            <span className="font-medium">{values.department}</span>
          </div>
        )}
        {values.service && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service:</span>
            <span className="font-medium">{values.service}</span>
          </div>
        )}
        {values.startDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Début:</span>
            <span className="font-medium">{formatDate(values.startDate)}</span>
          </div>
        )}
        {values.endDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fin:</span>
            <span className="font-medium">{formatDate(values.endDate)}</span>
          </div>
        )}
        {values.isPaid && values.amount && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rémunération:</span>
            <span className="font-medium text-green-600">{values.amount?.toLocaleString()} FCFA</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ========================= //
//     Schema de validation  //
// ========================= //
const preRenewalFormSchema = z.object({
  internshipType: z.string().min(1, "Le type de stage est requis"),
  location: z.string().min(1, "Le lieu de stage est requis"),
  department: z.string().min(1, "La direction est requise"),
  service: z.string().min(1, "Le service est requis"),
  supervisor: z.string().optional(),
  startDate: z.date({ required_error: "La date de début est requise" }),
  endDate: z.date({ required_error: "La date de fin est requise" }),
  isPaid: z.boolean().default(false),
  amount: z.number().min(1, "Le montant doit être supérieur à 0").optional(),
  notes: z.string().max(500, "Les notes ne doivent pas dépasser 500 caractères").optional(),
}).refine((data) => {
  if (data.isPaid) {
    return data.amount !== undefined && data.amount > 0;
  }
  return true;
}, {
  message: "Le montant est requis pour un stage rémunéré",
  path: ["amount"]
}).refine((data) => {
  return data.endDate > data.startDate;
}, {
  message: "La date de fin doit être après la date de début",
  path: ["endDate"]
}).refine((data) => {
  const duration = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24));
  return duration <= 730;
}, {
  message: "La durée du stage ne peut pas dépasser 2 ans",
  path: ["endDate"]
});

type PreRenewalFormValues = z.infer<typeof preRenewalFormSchema>;

// ========================= //
//     Composant PreRenewalForm //
// ========================= //
const PreRenewalForm = ({ 
  existingStage, 
  onSuccess, 
  onCancel 
}: { 
  existingStage: APIStagiaire; 
  onSuccess: (data: { pdf_url: string; convention_temporaire_id: number; message: string }) => void; 
  onCancel: () => void;
}) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [availableSupervisors, setAvailableSupervisors] = useState<string[]>([]);

  // Pré-remplissage des valeurs par défaut
  const defaultValues = {
    internshipType: existingStage.type_stage,
    location: existingStage.lieu_stage || "",
    department: existingStage.direction || "",
    service: existingStage.service || "",
    supervisor: existingStage.superviseur || "",
    startDate: addDays(new Date(existingStage.date_fin), 1), // Jour après la fin de l'ancien stage
    endDate: addDays(new Date(existingStage.date_fin), existingStage.duree_jours + 1), // Même durée
    isPaid: existingStage.remunere,
    amount: existingStage.montant_remuneration || undefined,
    notes: `Renouvellement du stage précédent (${format(new Date(existingStage.date_debut), "dd/MM/yyyy")} au ${format(new Date(existingStage.date_fin), "dd/MM/yyyy")})`,
  };

  const form = useForm<PreRenewalFormValues>({
    resolver: zodResolver(preRenewalFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const watchDepartment = form.watch("department");
  const watchService = form.watch("service");
  const watchStartDate = form.watch("startDate");
  const watchEndDate = form.watch("endDate");
  const watchIsPaid = form.watch("isPaid");

  // Mise à jour des services disponibles
  useEffect(() => {
    if (watchDepartment) {
      const services = servicesByDepartment[watchDepartment as keyof typeof servicesByDepartment] || [];
      setAvailableServices(services);
      if (!services.includes(form.getValues("service"))) {
        form.setValue("service", "");
      }
    } else {
      setAvailableServices([]);
      form.setValue("service", "");
    }
  }, [watchDepartment, form]);

  // Mise à jour des superviseurs disponibles
  useEffect(() => {
    if (watchService) {
      const supervisors = supervisorsByService[watchService as keyof typeof supervisorsByService] || [];
      setAvailableSupervisors(supervisors);
      if (!supervisors.includes(form.getValues("supervisor") || "")) {
        form.setValue("supervisor", "");
      }
    } else {
      setAvailableSupervisors([]);
      form.setValue("supervisor", "");
    }
  }, [watchService, form]);

  // Validation des dates spécifique au renouvellement
  const validateDates = (startDate: Date, endDate: Date) => {
    if (!startDate || !endDate) return "Les dates sont requises";
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return "Format de date invalide";
    }

    if (startDate >= endDate) {
      return "La date de début doit être avant la date de fin.";
    }

    if (startDate < today) {
      return "La date de début ne peut pas être dans le passé.";
    }

    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (duration > 730) {
      return "La durée du stage ne peut pas dépasser 2 ans.";
    }

    // Vérification spécifique au renouvellement
    if (existingStage.date_fin) {
      const ancienneFin = new Date(existingStage.date_fin);
      if (startDate <= ancienneFin) {
        return `La date de début doit être après la fin du stage précédent (${format(ancienneFin, "dd/MM/yyyy")})`;
      }
    }

    return null;
  };

  // Fonction onSubmit pour le pré-renouvellement
  const onSubmit = async (values: PreRenewalFormValues) => {
    if (isSubmitting) return;

    const dateError = validateDates(values.startDate, values.endDate);
    if (dateError) {
      toast({
        title: "Erreur de validation",
        description: dateError,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const formatDateToDDMMYYYY = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };

      const requestData = {
        type_stage: values.internshipType,
        lieu: values.location,
        direction: values.department,
        service: values.service,
        tuteur: values.supervisor || null,
        date_debut: formatDateToDDMMYYYY(values.startDate),
        date_fin: formatDateToDDMMYYYY(values.endDate),
        remunere: values.isPaid,
        montant: values.isPaid ? values.amount : null,
        notes: values.notes || "",
      };

      // Appel au nouvel endpoint de pré-renouvellement
      const response = await apiClient.post(`/stagiaires/${existingStage.id}/pre-renouveler/`, requestData);

      if (!response.data.success) {
        throw new Error(response.data.message || "Erreur lors du pré-renouvellement");
      }

      const resultData = {
        pdf_url: response.data.pdf_url,
        convention_temporaire_id: response.data.convention_temporaire_id,
        message: response.data.message
      };
      
      toast({
        title: "Convention temporaire générée",
        description: response.data.message || "La convention temporaire a été générée avec succès. Téléchargez-la pour signature.",
        variant: "default",
      });

      onSuccess(resultData);
      
    } catch (error: any) {
      console.error("Erreur lors du pré-renouvellement:", error);
      
      let errorMessage = "Impossible de générer la convention temporaire";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { label: "Général", description: "Type & Lieu" },
    { label: "Affectation", description: "Direction & Service" },
    { label: "Finalisation", description: "Détails & Validation" },
  ];

  const getStepTitle = () => {
    switch (currentStep) {
      case 0: return "Informations générales du stage";
      case 1: return "Affectation du service";
      case 2: return "Finalisation du stage";
      default: return "Pré-renouvellement du stage";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 0: return "Définissez le type et le lieu du nouveau stage";
      case 1: return "Sélectionnez la direction et le service d'affectation";
      case 2: return "Complétez les détails et générez la convention temporaire";
      default: return "Veuillez remplir le formulaire de pré-renouvellement";
    }
  };

  const isStepValid = (step: number): boolean => {
    const values = form.getValues();

    switch (step) {
      case 0:
        return !!(values.internshipType?.trim() && values.location?.trim());
      case 1:
        return !!(values.department?.trim() && values.service?.trim());
      case 2:
        const hasValidDates = values.startDate && values.endDate;
        const noDateError = hasValidDates && !validateDates(values.startDate, values.endDate);
        const hasValidAmount = !values.isPaid || (values.isPaid && values.amount && values.amount > 0);
        return !!(hasValidDates && noDateError && hasValidAmount);
      default:
        return false;
    }
  };

  const handleNextStep = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (currentStep < steps.length - 1 && isStepValid(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onCancel();
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <Card className="bg-gradient-to-r from-muted/50 to-muted/30">
        <CardContent className="pt-6">
          <ProgressIndicator currentStep={currentStep} steps={steps} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/20">
                  <span className="text-sm font-bold text-primary">{currentStep + 1}</span>
                </div>
                <div>
                  <CardTitle className="text-xl">{getStepTitle()}</CardTitle>
                  <CardDescription className="text-base">
                    {getStepDescription()}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Étape 1: Informations générales */}
                  {currentStep === 0 && (
                    <div className="space-y-6">
                      <EnhancedSelect
                        form={form}
                        name="internshipType"
                        label="Type de stage"
                        placeholder="Sélectionnez un type de stage"
                        items={internshipTypes}
                        icon={<Briefcase className="h-4 w-4" />}
                      />

                      <EnhancedSelect
                        form={form}
                        name="location"
                        label="Lieu du stage"
                        placeholder="Sélectionnez un lieu"
                        items={locations}
                        icon={<MapPin className="h-4 w-4" />}
                      />

                      <StepNavigation
                        onPrevious={() => {}}
                        onNext={handleNextStep}
                        isNextDisabled={!isStepValid(0)}
                      />
                    </div>
                  )}

                  {/* Étape 2: Affectation */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <EnhancedSelect
                        form={form}
                        name="department"
                        label="Direction"
                        placeholder="Sélectionnez une direction"
                        items={departments}
                        icon={<Building2 className="h-4 w-4" />}
                      />

                      <EnhancedSelect
                        form={form}
                        name="service"
                        label="Service"
                        placeholder="Sélectionnez un service"
                        items={availableServices.map(service => ({ value: service, label: service }))}
                        icon={<Users className="h-4 w-4" />}
                        disabled={availableServices.length === 0}
                      />

                      {availableServices.length === 0 && form.watch("department") && (
                        <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                          <div className="flex items-center gap-2 text-blue-800">
                            <Users className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              Services disponibles après sélection de la direction
                            </span>
                          </div>
                        </div>
                      )}

                      <StepNavigation
                        onPrevious={handlePrevStep}
                        onNext={handleNextStep}
                        isNextDisabled={!isStepValid(1)}
                      />
                    </div>
                  )}

                  {/* Étape 3: Finalisation */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <EnhancedSelect
                        form={form}
                        name="supervisor"
                        label="Superviseur de stage"
                        placeholder="Sélectionnez un superviseur"
                        items={availableSupervisors.map(supervisor => ({ value: supervisor, label: supervisor }))}
                        icon={<UserCog className="h-4 w-4" />}
                        disabled={availableSupervisors.length === 0}
                      />

                      {availableSupervisors.length === 0 && form.watch("service") && (
                        <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
                          <div className="flex items-center gap-2 text-amber-800">
                            <UserCog className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              Aucun superviseur disponible pour ce service
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DatePickerField
                          form={form}
                          name="startDate"
                          label="Date de début"
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                        />

                        <DatePickerField
                          form={form}
                          name="endDate"
                          label="Date de fin"
                          disabled={(date) => {
                            const startDate = form.getValues("startDate");
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            
                            if (startDate) {
                              const start = new Date(startDate);
                              start.setHours(0, 0, 0, 0);
                              return date < start || date < today;
                            }
                            
                            return date < today;
                          }}
                        />
                      </div>

                      {/* Affichage de la durée du stage */}
                      {watchStartDate && watchEndDate && watchStartDate < watchEndDate && (
                        <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                          <div className="flex items-center gap-2 text-green-800">
                            <CalendarDays className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              Durée du stage: {Math.ceil((watchEndDate.getTime() - watchStartDate.getTime()) / (1000 * 60 * 60 * 24))} jours
                            </span>
                          </div>
                        </div>
                      )}

                      {watchStartDate && watchEndDate && validateDates(watchStartDate, watchEndDate) && (
                        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                          <AlertDescription className="text-destructive text-sm">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              {validateDates(watchStartDate, watchEndDate)}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      <RemunerationSection form={form} isPaid={watchIsPaid} />

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }: any) => (
                          <FormItem>
                            <FormLabel>Notes supplémentaires</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Ajoutez des informations complémentaires..."
                                className="min-h-[100px] resize-y"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Ces notes seront enregistrées avec le pré-renouvellement
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-blue-800">Étape 1 sur 2 : Pré-renouvellement</h4>
                            <p className="text-sm text-blue-700 mt-1">
                              Après validation, une convention temporaire sera générée. 
                              Vous devrez la télécharger, la faire signer, puis la renvoyer 
                              pour finaliser le renouvellement.
                            </p>
                          </div>
                        </div>
                      </div>

                      <StepNavigation
                        onPrevious={handlePrevStep}
                        onSubmit={() => form.handleSubmit(onSubmit)()}
                        isLastStep={true}
                        isSubmitDisabled={!form.formState.isValid}
                        isSubmitting={isSubmitting}
                      />
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <SummaryPreview form={form} />
          
          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Progression
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Étape actuelle:</span>
                <span className="font-medium">{currentStep + 1}/{steps.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Statut:</span>
                <Badge variant={currentStep === 2 ? "default" : "secondary"}>
                  {currentStep === 2 ? "Finalisation" : "En cours"}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Validation:</span>
                <Badge variant={form.formState.isValid ? "default" : "secondary"}>
                  {form.formState.isValid ? "Valide" : "En attente"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Informations sur l'ancien stage */}
          <Card className="bg-muted/20 border-muted">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Stage précédent
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium">{existingStage.type_stage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Direction/Service:</span>
                <span className="font-medium">{existingStage.direction} / {existingStage.service}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Période:</span>
                <span className="font-medium">
                  {format(new Date(existingStage.date_debut), "dd/MM/yyyy")} - {format(new Date(existingStage.date_fin), "dd/MM/yyyy")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Durée:</span>
                <span className="font-medium">{existingStage.duree_jours} jours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rémunération:</span>
                <span className="font-medium">
                  {existingStage.remunere 
                    ? `${existingStage.montant_remuneration?.toLocaleString()} FCFA` 
                    : "Non rémunéré"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>
            Étape {currentStep + 1} sur {steps.length} • 
            {currentStep === 0 && " Informations générales"}
            {currentStep === 1 && " Affectation"}
            {currentStep === 2 && " Finalisation"}
          </span>
        </div>
      </div>
    </div>
  );
};

// ========================= //
//     Modal de pré-renouvellement //
// ========================= //
const PreRenewalDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingStage: APIStagiaire;
  onSuccess: (data: { pdf_url: string; convention_temporaire_id: number; message: string }) => void;
}> = ({ open, onOpenChange, existingStage, onSuccess }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
              <RefreshCw className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                Pré-renouvellement du stage
              </DialogTitle>
              <DialogDescription className="text-base">
                Étape 1/2 : Créez une convention temporaire pour signature pour {existingStage.prenom} {existingStage.nom}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <PreRenewalForm
          existingStage={existingStage}
          onSuccess={onSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

// ========================= //
//     Modal de finalisation //
// ========================= //
const FinalizeRenewalDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stagiaireId: string;
  previousStage: APIStagiaire;
  conventionTemporaireUrl?: string;
  onSuccess: () => void;
}> = ({ open, onOpenChange, stagiaireId, previousStage, conventionTemporaireUrl, onSuccess }) => {
  const { toast } = useToast();
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Format invalide",
          description: "Seuls les fichiers PDF sont acceptés",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast({
          title: "Fichier trop volumineux",
          description: "Le fichier ne doit pas dépasser 10MB",
          variant: "destructive",
        });
        return;
      }
      setSignedFile(file);
    }
  };

  const handleDownloadTemporaryConvention = async () => {
    if (!conventionTemporaireUrl) return;
    
    setIsDownloading(true);
    try {
      const response = await apiClient.get(conventionTemporaireUrl, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `convention_temporaire_${previousStage.nom}_${previousStage.prenom}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Convention téléchargée",
        description: "La convention temporaire a été téléchargée avec succès",
      });
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger la convention",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSubmit = async () => {
    if (!signedFile) {
      toast({
        title: "Fichier manquant",
        description: "Veuillez sélectionner le fichier signé",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('fichier_signe', signedFile);

      const response = await apiClient.post(
        `/stagiaires/${stagiaireId}/finaliser-renouvellement/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Erreur lors de la finalisation");
      }

      const nouveauStageId = response.data.nouveau_stage?.id;
      
      toast({
        title: "Renouvellement finalisé",
        description: response.data.message || "Le stage a été renouvelé avec succès",
        variant: "default",
      });

      onSuccess();
      onOpenChange(false);

      // Rediriger vers le nouveau stage si disponible
      if (nouveauStageId) {
        setTimeout(() => {
          window.location.href = `/stagiaires/${nouveauStageId}`;
        }, 1500);
      }
      
    } catch (error: any) {
      console.error("Erreur lors de la finalisation:", error);
      
      let errorMessage = "Impossible de finaliser le renouvellement";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                Finaliser le renouvellement
              </DialogTitle>
              <DialogDescription className="text-base">
                Étape 2/2 : Téléversez la convention signée pour {previousStage.prenom} {previousStage.nom}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Étape 1 : Télécharger la convention temporaire */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Étape 1 : Télécharger la convention
              </CardTitle>
              <CardDescription>
                Téléchargez la convention temporaire et faites-la signer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conventionTemporaireUrl ? (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="font-medium">Convention temporaire</p>
                        <p className="text-sm text-muted-foreground">
                          Générée le {format(new Date(), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={handleDownloadTemporaryConvention}
                      disabled={isDownloading}
                      className="gap-2"
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Télécharger
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg bg-muted/20">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Aucune convention temporaire disponible</p>
                  </div>
                )}
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-yellow-800">Instructions</p>
                      <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                        <li>Téléchargez la convention temporaire ci-dessus</li>
                        <li>Imprimez-la et faites-la signer par toutes les parties</li>
                        <li>Scannez ou photographiez la convention signée</li>
                        <li>Téléversez le fichier PDF signé dans l'étape suivante</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Étape 2 : Téléverser la convention signée */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Étape 2 : Téléverser la convention signée
              </CardTitle>
              <CardDescription>
                Sélectionnez le fichier PDF de la convention signée
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer bg-muted/10">
                  <input
                    type="file"
                    id="signed-convention"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="signed-convention" className="cursor-pointer">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="font-medium mb-1">
                      {signedFile ? signedFile.name : "Cliquez pour sélectionner un fichier"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Format accepté : PDF (max 10MB)
                    </p>
                    <Button variant="outline" className="mt-4" type="button">
                      Sélectionner un fichier
                    </Button>
                  </label>
                </div>

                {signedFile && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                    <div className="flex items-center gap-3">
                      <FileCheck className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="font-medium">{signedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(signedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSignedFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Ce qui se passera ensuite :</p>
                      <ul className="text-sm text-blue-700 mt-1 space-y-1">
                        <li>• Un nouveau stage sera créé avec les informations du pré-renouvellement</li>
                        <li>• L'ancien stage sera marqué comme "renouvelé"</li>
                        <li>• Vous serez redirigé vers la page du nouveau stage</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!signedFile || isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Finalisation...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Finaliser le renouvellement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ========================= //
//     Composant principal   //
// ========================= //
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    "Actuel": { label: "En cours", variant: "default" },
    "À venir": { label: "À venir", variant: "outline" },
    "Terminé": { label: "Terminé", variant: "secondary" },
    "Renouvelé": { label: "Renouvelé", variant: "outline" },
    "Annulé": { label: "Annulé", variant: "destructive" },
  };
  const config = statusConfig[status] || { label: status, variant: "outline" };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const XofIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className} role="img">
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="700" fill="currentColor">
      XOF
    </text>
  </svg>
);

const OngoingInternshipDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stagiaire, setStagiaire] = useState<APIStagiaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<APIDocument | null>(null);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [isEditPeriodOpen, setIsEditPeriodOpen] = useState(false);
  const [newStartDate, setNewStartDate] = useState<Date>();
  const [newEndDate, setNewEndDate] = useState<Date>();
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [isPreRenewDialogOpen, setIsPreRenewDialogOpen] = useState(false);
  const [isFinalizeRenewDialogOpen, setIsFinalizeRenewDialogOpen] = useState(false);
  const [conventionRenouvellementData, setConventionRenouvellementData] = useState<{
    pdf_url?: string;
    convention_temporaire_id?: number;
    message?: string;
  } | null>(null);

  // ---- State pour l'édition du résumé ----
  const [isEditingResume, setIsEditingResume] = useState(false);
  const [editedResume, setEditedResume] = useState("");
  const [isSavingResume, setIsSavingResume] = useState(false);

  // Fonction pour charger les données du stagiaire
  const fetchStagiaire = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!id) return;
      const res = await apiClient.get(`/stagiaires/${id}/`);
      const data: APIStagiaire = res.data.stagiaire;
      setStagiaire(data);
      // Initialiser le résumé édité avec la valeur actuelle
      setEditedResume(data.resume_cv || data.resume || "");
      setNewStartDate(new Date(data.date_debut));
      setNewEndDate(new Date(data.date_fin));
    } catch (e: any) {
      setError(e.message || "Impossible de charger le stagiaire");
      toast({ 
        title: "Erreur", 
        description: "Impossible de charger les données du stagiaire", 
        variant: "destructive" 
      });
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchStagiaire();
  }, [id, toast]);

  // ---- Fonction pour sauvegarder le résumé ----
  const handleSaveResume = async () => {
    if (!stagiaire) return;

    setIsSavingResume(true);
    try {
      // Utiliser PATCH avec le nouvel endpoint
      await apiClient.patch(`/stagiaires/${stagiaire.id}/`, {
        resume_cv: editedResume
      });

      // Mettre à jour l'état local
      setStagiaire(prev => prev ? {
        ...prev,
        resume_cv: editedResume
      } : null);

      setIsEditingResume(false);
      
      toast({
        title: "Succès",
        description: "Le résumé a été mis à jour avec succès",
      });
      
    } catch (err: any) {
      console.error("Erreur lors de la sauvegarde du résumé:", err);
      
      let errorMessage = "Impossible de mettre à jour le résumé";
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.status === 405) {
        errorMessage = "Méthode non autorisée. Contactez l'administrateur.";
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSavingResume(false);
    }
  };

  // ---- Fonction pour annuler l'édition ----
  const handleCancelEdit = () => {
    setEditedResume(stagiaire?.resume_cv || stagiaire?.resume || "");
    setIsEditingResume(false);
  };

  const handleAnnulerRenouvellement = async () => {
    if (!stagiaire) return;

    try {
      await apiClient.post(`/stagiaires/${stagiaire.id}/annuler-pre-renouvellement/`);
      
      // Rafraîchir les données
      fetchStagiaire();
      
      toast({
        title: "Pré-renouvellement annulé",
        description: "La demande de pré-renouvellement a été annulée",
        variant: "default",
      });
    } catch (err: any) {
      console.error("Erreur annulation pré-renouvellement:", err);
      
      let errorMessage = "Impossible d'annuler le pré-renouvellement";
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Fonction pour vérifier si le stage a commencé
  const hasInternshipStarted = useMemo(() => {
    if (!stagiaire?.date_debut) return false;
    const startDate = new Date(stagiaire.date_debut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return startDate <= today;
  }, [stagiaire]);

  // Fonction pour vérifier si le stage n'a pas encore commencé
  const hasInternshipNotStarted = useMemo(() => {
    if (!stagiaire?.date_debut) return false;
    const startDate = new Date(stagiaire.date_debut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return startDate > today;
  }, [stagiaire]);

  // Calcul de la progression du stage
  const calculateProgress = () => {
    if (!stagiaire) return 0;
    const start = new Date(stagiaire.date_debut).getTime();
    const end = new Date(stagiaire.date_fin).getTime();
    const now = new Date().getTime();
    if (now >= end) return 100;
    if (now <= start) return 0;
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.round((elapsed / total) * 100));
  };

  // Données étudiant transformées
  const student = useMemo(() => {
    if (!stagiaire) return null;
    return {
      name: `${stagiaire.nom} ${stagiaire.prenom}`,
      email: stagiaire.email,
      phone: stagiaire.telephone,
      photo: stagiaire.photo_passeport || undefined,
      avatar: `${stagiaire.prenom?.[0] || ""}${stagiaire.nom?.[0] || ""}`.toUpperCase() || "ET",
      program: stagiaire.specialite,
      year: stagiaire.niveau_etude,
      resume: stagiaire.resume_cv || stagiaire.resume || "",
      address: stagiaire.adresse || "",
      country: stagiaire.pays_residence || "",
      gender: stagiaire.genre || "",
      documents: stagiaire.documents || [],
      statut: stagiaire.statut,
      startDate: stagiaire.date_debut,
      endDate: stagiaire.date_fin,
      duration: stagiaire.duree_jours,
    };
  }, [stagiaire]);

  // Données école
  const school = useMemo(() => {
    if (!stagiaire || !stagiaire.etablissement) return null;
    const s = stagiaire.etablissement;
    return {
      name: s.name || "Non spécifié",
      location: s.location || undefined,
      email: s.email || undefined,
      phone: s.phone || undefined,
    };
  }, [stagiaire]);

  // Fonction pour visualiser un document
  const handleViewDocument = (doc: APIDocument) => setSelectedDocument(doc);

  // Fonction pour télécharger un document
  const handleDownloadDocument = async (doc: APIDocument) => {
    if (!stagiaire) return;

    const fileName = `${doc.nom.replace(/\s+/g, "_")}_${stagiaire.nom}_${stagiaire.prenom}`;

    try {
      const response = await apiClient.get(doc.url, { responseType: "blob" });
      const blob = response.data;

      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: "Fichiers autorisés",
              accept: {
                "application/pdf": [".pdf"],
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
                "image/jpeg": [".jpg", ".jpeg"],
                "image/png": [".png"],
              },
            },
          ],
        });

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: "Téléchargement réussi",
        description: `Le document "${doc.nom}" a été téléchargé.`,
      });
    } catch (err: any) {
      console.error("Erreur lors du téléchargement :", err);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le document.",
        variant: "destructive",
      });
    }
  };

  // ---- Fonction pour télécharger le résumé en PDF ----
  const handleDownloadResume = async () => {
    if (!stagiaire || !student?.resume) {
      toast({
        title: "Aucun résumé",
        description: "Aucun résumé disponible pour le téléchargement",
        variant: "destructive",
      });
      return;
    }

    try {
      const { jsPDF } = await import('jspdf');
      
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 25;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Espace pour le papier entête
      const headerSpace = 20;
      yPosition += headerSpace;

      // Titre principal centré
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RÉSUMÉ DU CURRICULUM VITAE', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Ligne de séparation sous le titre
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 25;

      // Section Informations personnelles avec photo
      const photoSize = 40;
      const photoX = pageWidth - margin - photoSize;
      const photoY = yPosition;

      // Ajouter la photo si disponible
      let photoAdded = false;
      if (student.photo) {
        try {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.src = student.photo;
          
          await new Promise((resolve, reject) => {
            img.onload = () => {
              try {
                // Cadre autour de la photo
                pdf.setDrawColor(150, 150, 150);
                pdf.setLineWidth(0.5);
                pdf.rect(photoX - 2, photoY - 2, photoSize + 4, photoSize + 4);
                
                // Ajouter la photo
                pdf.addImage(img, 'JPEG', photoX, photoY, photoSize, photoSize);
                photoAdded = true;
                resolve(undefined);
              } catch (error) {
                reject(error);
              }
            };
            img.onerror = reject;
            
            setTimeout(() => reject(new Error('Timeout loading image')), 5000);
          });
          
        } catch (photoError) {
          console.warn("Impossible de charger la photo:", photoError);
          photoAdded = false;
        }
      }

      // Titre de la section
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INFORMATIONS PERSONNELLES', margin, yPosition);
      pdf.line(margin, yPosition + 1, margin + 70, yPosition + 1);
      yPosition += 15;

      // Contenu informations personnelles
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const textMaxWidth = photoAdded ? pageWidth - margin - photoSize - 20 : maxWidth;
      
      pdf.text(`Nom complet : ${student.name}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Spécialité : ${student.program}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Niveau d'étude : ${student.year}`, margin, yPosition);
      yPosition += 6;
      
      if (school) {
        pdf.text(`Établissement : ${school.name}`, margin, yPosition);
        yPosition += 6;
      }
      
      pdf.text(`Email : ${student.email}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Téléphone : ${student.phone}`, margin, yPosition);
      
      // Ajuster la position si la photo est plus haute que le texte
      if (photoAdded) {
        const photoBottom = photoY + photoSize;
        if (photoBottom > yPosition) {
          yPosition = photoBottom + 10;
        } else {
          yPosition += 15;
        }
      } else {
        yPosition += 15;
      }

      // Section Présentation professionnelle
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PRÉSENTATION PROFESSIONNELLE', margin, yPosition);
      pdf.line(margin, yPosition + 1, margin + 85, yPosition + 1);
      yPosition += 10;

      // Ajouter le texte du résumé
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const lines = pdf.splitTextToSize(student.resume, maxWidth);
      const lineHeight = 5;
      
      for (let i = 0; i < lines.length; i++) {
        if (yPosition + lineHeight > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(lines[i], margin, yPosition);
        yPosition += lineHeight;
      }

      // Pied de page
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Page ${i} sur ${totalPages}`, pageWidth / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
      }

      const fileName = `Resume_CV_${stagiaire.nom}_${stagiaire.prenom}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Résumé téléchargé",
        description: "Le résumé du CV a été téléchargé au format PDF",
      });
      
    } catch (err: any) {
      console.error("Erreur lors de la génération du PDF:", err);
      
      // Fallback vers le format texte
      try {
        const blob = new Blob([student.resume], { type: 'text/plain;charset=utf-8' });
        const fileName = `resume_${stagiaire.nom}_${stagiaire.prenom}.txt`;
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Résumé téléchargé (format texte)",
          description: "Le PDF n'a pas pu être généré",
          variant: "default",
        });
      } catch (fallbackError) {
        toast({
          title: "Erreur",
          description: "Impossible de télécharger le résumé",
          variant: "destructive",
        });
      }
    }
  };

  // Fonction pour clôturer un stage
  const handleEndEarly = async () => {
    if (!stagiaire) return;

    try {
      await apiClient.post(`/stagiaires/${stagiaire.id}/fin-anticipee/`);
      toast({
        title: "Stage clôturé",
        description: `Le stage de ${stagiaire.prenom} ${stagiaire.nom} a été clôturé avec succès.`,
      });
      setStagiaire({ ...stagiaire, statut: "Terminé", date_fin: new Date().toISOString() });
    } catch (err: any) {
      console.error("Erreur fin anticipée :", err);
      toast({
        title: "Erreur",
        description: "Impossible de clôturer le stage",
        variant: "destructive",
      });
    }
  };

  // Fonction pour mettre à jour la période du stage
  const handleUpdatePeriod = async () => {
    if (!stagiaire || !newStartDate || !newEndDate) return;

    setLoadingPeriod(true);
    try {
      const formatDateToDDMMYYYY = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };

      const res = await apiClient.post(`/stagiaires/${stagiaire.id}/modifier-periode/`, {
        date_debut: formatDateToDDMMYYYY(newStartDate),
        date_fin: formatDateToDDMMYYYY(newEndDate),
      });

      setStagiaire((prev) => prev ? { 
        ...prev, 
        date_debut: newStartDate.toISOString(), 
        date_fin: newEndDate.toISOString(),
        duree_jours: differenceInDays(newEndDate, newStartDate) + 1,
      } : prev);
      
      toast({ title: "Succès", description: "Période mise à jour", variant: "default" });
      setIsEditPeriodOpen(false);
    } catch (err: any) {
      console.error(err);
      toast({ 
        title: "Erreur", 
        description: err.response?.data?.message || "Impossible de mettre à jour la période", 
        variant: "destructive" 
      });
    } finally {
      setLoadingPeriod(false);
    }
  };

  // Fonction pour générer une attestation
  const handleGenererAttestation = async () => {
    if (!stagiaire) return;

    try {
      const response = await apiClient.get(
        `/stagiaires/${stagiaire.id}/generer-attestation/`,
        { responseType: "blob" }
      );

      const blob = response.data;
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `attestation_${stagiaire.nom || "stagiaire"}_${stagiaire.prenom || ""}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Succès",
        description: "L'attestation de stage a été générée et téléchargée.",
      });
    } catch (err: any) {
      console.error("Erreur attestation :", err);
      toast({
        title: "Erreur",
        description: "L'attestation de stage sera disponible une fois le stage terminé.",
        variant: "destructive",
      });
    }
  };

  // Fonction utilitaire pour vérifier la présence de documents de rapport
  const hasRapportDocuments = useMemo(() => {
    if (!student?.documents || student.documents.length === 0) return false;
    
    // Vérifier si au moins un document contient "rapport" dans son nom (insensible à la casse)
    return student.documents.some(doc => 
      doc.nom.toLowerCase().includes('rapport') || 
      doc.nom.toLowerCase().includes('report')
    );
  }, [student?.documents]);

  // Fonction pour télécharger la convention
  const handleDownloadConvention = async () => {
    if (!stagiaire?.convention?.fichier_url) {
      toast({
        title: "Aucune convention",
        description: "Aucune convention disponible pour le téléchargement",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiClient.get(stagiaire.convention.fichier_url, { responseType: "blob" });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `convention_${stagiaire.nom}_${stagiaire.prenom}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Convention téléchargée",
        description: "La convention de stage a été téléchargée.",
      });
    } catch (err: any) {
      console.error("Erreur téléchargement convention :", err);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger la convention.",
        variant: "destructive",
      });
    }
  };

  // Fonction pour gérer le succès du pré-renouvellement
  const handlePreRenewalSuccess = (data: { pdf_url: string; convention_temporaire_id: number; message: string }) => {
    setConventionRenouvellementData(data);
    setIsPreRenewDialogOpen(false);
    // Rafraîchir les données pour afficher le statut de pré-renouvellement
    fetchStagiaire();
    // Ouvrir le modal de finalisation
    setIsFinalizeRenewDialogOpen(true);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/stages/en_cours")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Skeleton className="h-8 w-64" />
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full mb-3" />
                  ))}
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3 items-center">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/students/ongoing")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Détails du stagiaire</h1>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-10">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Erreur de chargement</h3>
                <p className="text-muted-foreground mb-4">
                  {error}
                </p>
                <Button onClick={fetchStagiaire}>
                  Réessayer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!stagiaire || !student) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/students/ongoing")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Détails du stagiaire</h1>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-10">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Stagiaire non trouvé</h3>
                <p className="text-muted-foreground">
                  Le stagiaire que vous recherchez n'existe pas ou a été supprimé.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header avec bouton retour */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Détails du stagiaire</h1>
            <p className="text-muted-foreground">
              Informations complètes sur {student.name} et son stage
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            {/* En-tête avec statut et progression */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {student.name}
                      <StatusBadge status={student.statut} />
                      {stagiaire.pre_renouvellement_en_cours && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Pré-renouvellement
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {student.program} • {student.year}
                    </CardDescription>
                  </div>
                  
                  {/* Boutons d'action pour le résumé */}
                  <div className="flex gap-2">
                    {/* Bouton de téléchargement du résumé */}
                    {student.resume && !isEditingResume && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadResume}
                        className="gap-2"
                        title="Télécharger le résumé"
                      >
                        <Download className="h-4 w-4" />
                        Télécharger
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Progression du stage</span>
                    <span>{calculateProgress()}%</span>
                  </div>
                  <Progress value={calculateProgress()} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{new Date(student.startDate).toLocaleDateString("fr-FR")}</span>
                    <span>{new Date(student.endDate).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                {/* Section résumé éditable */}
                <div className="mb-4">
                  {isEditingResume ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editedResume}
                        onChange={(e) => setEditedResume(e.target.value)}
                        placeholder="Entrez le résumé du candidat..."
                        className="min-h-[120px] resize-y font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Vous pouvez modifier le résumé du candidat. Les modifications seront sauvegardées immédiatement.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {student.resume ? (
                        <div 
                          className="text-sm text-justify leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: formatResumeHtml(student.resume) }}
                        />
                      ) : (
                        <div className="space-y-3">
                          <span className="text-muted-foreground italic">
                            Aucun résumé n'a été fourni par l'étudiant.
                          </span>
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-amber-600" />
                              <p className="text-sm text-amber-700">
                                Aucun résumé disponible. Vous pouvez en ajouter un en cliquant sur "Modifier".
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Informations de stage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Informations de stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                  {/* Colonne gauche */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Direction</p>
                        <p className="font-medium">{stagiaire.direction || "—"}</p>
                        {stagiaire.direction && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {departmentDescriptions[stagiaire.direction]}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-100 text-cyan-600">
                        <ClipboardList className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Service</p>
                        <p className="font-medium">{stagiaire.service || "—"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100 text-green-600">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Lieu</p>
                        <p className="font-medium">{stagiaire.lieu_stage || "—"}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Colonne droite */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                        <FileCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Type de stage</p>
                        <p className="font-medium">{stagiaire.type_stage}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                        <CalendarRange className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Période</p>
                        <p className="font-medium">
                          {new Date(stagiaire.date_debut).toLocaleDateString("fr-FR")} — {" "}
                          {new Date(stagiaire.date_fin).toLocaleDateString("fr-FR")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {stagiaire.duree_jours} jours
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Rémunération</p>
                        <p className="font-medium">
                          {stagiaire.remunere ? (
                            <span className="flex items-center gap-1">
                              {stagiaire.montant_remuneration?.toLocaleString() || "N/A"}
                               FCFA
                            </span>
                          ) : (
                            "Non rémunéré"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents
                </CardTitle>
                <CardDescription>
                  Documents associés au stagiaire
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {student.documents.length > 0 ? (
                    student.documents.map((doc, index) => (
                      <div
                        key={`${doc.nom}-${index}`}
                        className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-md bg-primary/10">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{doc.nom}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.url.split('.').pop()?.toUpperCase()} •{" "}
                              {doc.url.includes('http') ? 'Lien externe' : 'Document'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                            className="h-9 gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Voir
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleDownloadDocument(doc)}
                            className="h-9 gap-1"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Télécharger
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 border rounded-lg bg-muted/20">
                      <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Aucun document disponible</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite : Stagiaire + Établissement + Superviseur + Actions */}
          <div className="space-y-6">
            {/* Stagiaire */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Stagiaire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-4 cursor-pointer" onClick={() => setIsPhotoDialogOpen(true)}>
                    <AvatarImage src={student.photo} className="object-cover" />
                    <AvatarFallback className="text-2xl font-bold">{student.avatar}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-lg">{student.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{student.program}, {student.year}</p>
                  
                  <div className="w-full space-y-3">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`mailto:${student.email}`} 
                        className="text-sm hover:underline truncate"
                        title={student.email}
                      >
                        {student.email}
                      </a>
                    </div>
                    
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`tel:${student.phone}`} 
                        className="text-sm hover:underline"
                      >
                        {student.phone}
                      </a>
                    </div>
                    {student.gender && (
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm capitalize">{student.gender.toLowerCase()}</p>
                      </div>
                    )}

                    {student.country && (
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{student.country}</p>
                      </div>
                    )}
                    
                    {student.address && (
                      <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <p className="text-sm">{student.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Établissement */}
            {school && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-green-100 text-green-600">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    Établissement scolaire
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="pb-2 border-b">
                      <h4 className="font-medium text-sm text-foreground">{school.name}</h4>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {school.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span>{school.location}</span>
                        </div>
                      )}
                      
                      {school.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <a href={`mailto:${school.email}`} className="hover:underline truncate">
                            {school.email}
                          </a>
                        </div>
                      )}
                      
                      {school.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <a href={`tel:${school.phone}`} className="hover:underline">
                            {school.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Superviseur */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Superviseur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-full bg-red-100 text-red-600">
                    <UserCheck size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" title={stagiaire.superviseur || "Non spécifié"}>
                      {stagiaire.superviseur || "Non spécifié"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {stagiaire.service || "Service non spécifié"}
                      {stagiaire.direction && `, ${stagiaire.direction}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Actions
                  
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Bouton "Modifier la période" TOUJOURS visible */}
                {stagiaire.statut !== "Terminé" && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      setNewStartDate(new Date(stagiaire.date_debut));
                      setNewEndDate(new Date(stagiaire.date_fin));
                      setIsEditPeriodOpen(true);
                    }}
                  >
                    <CalendarRange className="h-4 w-4" />
                    Modifier la période
                  </Button>
                )}

                {/* Boutons pour le renouvellement en deux étapes */}
                {stagiaire.statut === "Terminé" && (
                  <div className="space-y-2">
                    {/* État : Pré-renouvellement en cours */}
                    {stagiaire.pre_renouvellement_en_cours ? (
                      <>
                        {/* Étape 1 déjà faite : télécharger convention temporaire si disponible */}
                        {stagiaire.convention_renouvellement_temporaire && (
                          <Button
                            variant="default"
                            className="w-full gap-2"
                            onClick={() => {
                              // Ouvrir le modal de finalisation avec l'URL de la convention
                              setConventionRenouvellementData({
                                pdf_url: stagiaire.convention_renouvellement_temporaire?.fichier_url || "",
                                convention_temporaire_id: parseInt(stagiaire.convention_renouvellement_temporaire?.id || "0"),
                                message: "Convention temporaire générée"
                              });
                              setIsFinalizeRenewDialogOpen(true);
                            }}
                          >
                            <FileCheck className="h-4 w-4" />
                            Finaliser le renouvellement
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={handleAnnulerRenouvellement}
                        >
                          <X className="h-4 w-4" />
                          Annuler le pré-renouvellement
                        </Button>
                      </>
                    ) : (
                      /* État : Déjà renouvelé */
                      stagiaire.a_ete_renouvele ? (
                        <div className="p-3 border border-green-200 bg-green-50 rounded-lg text-center">
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
                          <p className="text-sm font-medium text-green-700">Stage renouvelé</p>
                          <p className="text-xs text-green-600 mt-1">
                            Ce stage a déjà été renouvelé
                          </p>
                          {stagiaire.stage_renouvele_id && (
                            <Button
                              variant="link"
                              className="h-auto p-0 text-xs text-green-600 hover:text-green-700"
                              onClick={() => navigate(`/stagiaires/${stagiaire.stage_renouvele_id}`)}
                            >
                              Voir le nouveau stage →
                            </Button>
                          )}
                        </div>
                      ) : (
                        /* État : Prêt pour pré-renouvellement */
                        <Button
                          variant="default"
                          className="w-full gap-2 bg-green-600 hover:bg-green-700"
                          onClick={() => setIsPreRenewDialogOpen(true)}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Renouveler le stage
                        </Button>
                      )
                    )}
                  </div>
                )}

                {/* Afficher seulement si le stage n'est PAS terminé ET a déjà débuté */}
                {stagiaire.statut !== "Terminé" && hasInternshipStarted && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleEndEarly}
                  >
                    <Clock className="h-4 w-4" />
                    Mettre fin au stage
                  </Button>
                )}

                {/* Afficher un message si le stage n'a pas encore débuté */}
                {hasInternshipNotStarted && (
                  <div className="p-3 border border-blue-200 bg-blue-50 rounded-lg text-center">
                    <Info className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                    <p className="text-sm font-medium text-blue-700">Stage programmé</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Le stage débutera le {format(new Date(student.startDate), "dd/MM/yyyy")}
                    </p>
                  </div>
                )}

                {/* Génération d'attestation */}
                {hasInternshipStarted && (
                  hasRapportDocuments ? (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleGenererAttestation}
                    >
                      <FileText className="h-4 w-4" />
                      Générer une attestation
                    </Button>
                  ) : (
                    <div className="p-3 border border-amber-200 bg-amber-50 rounded-lg text-center">
                      <AlertCircle className="h-4 w-4 text-amber-600 mx-auto mb-1" />
                      <p className="text-sm font-medium text-amber-700">Attestation indisponible</p>
                      <p className="text-xs text-amber-600 mt-1">
                        Ajoutez d'abord un rapport pour générer l'attestation
                      </p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modal document */}
        <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{selectedDocument?.nom}</DialogTitle>
              <DialogDescription>
                Visualisation du document
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center p-4 bg-muted/30 rounded-lg">
              {selectedDocument?.url?.endsWith(".pdf") ? 
                <iframe 
                  src={selectedDocument.url} 
                  className="w-full h-[70vh] border rounded-md"
                  title={selectedDocument.nom}
                /> : 
                <img 
                  src={selectedDocument?.url} 
                  alt={selectedDocument?.nom} 
                  className="max-w-full max-h-[70vh] object-contain border rounded-md"
                />
              }
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setSelectedDocument(null)}
              >
                Fermer
              </Button>
              <Button 
                onClick={() => selectedDocument && handleDownloadDocument(selectedDocument)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal photo */}
        <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden bg-transparent border-none">
            <img 
              src={student.photo} 
              alt={student.name} 
              className="w-full h-auto object-contain rounded-lg shadow-lg"
            />
          </DialogContent>
        </Dialog>

        {/* Modal modification période */}
        <Dialog open={isEditPeriodOpen} onOpenChange={setIsEditPeriodOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4 mx-auto">
                <CalendarDays className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center text-xl">
                Modifier la période du stage
              </DialogTitle>
              <DialogDescription className="text-center">
                {hasInternshipStarted 
                  ? "Ajustez la date de fin du stage (le stage a déjà débuté)"
                  : "Ajustez les dates de début et de fin du stage"
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Affichage conditionnel selon l'état du stage */}
              {hasInternshipNotStarted && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <p className="text-sm text-blue-700">
                      Le stage n'a pas encore débuté. Vous pouvez modifier les deux dates.
                    </p>
                  </div>
                </div>
              )}

              {hasInternshipStarted && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <p className="text-sm text-amber-700">
                      Le stage a déjà débuté. Vous ne pouvez modifier que la date de fin.
                    </p>
                  </div>
                </div>
              )}

              {newStartDate && newEndDate && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Durée du stage :</span>
                    <Badge variant="outline">
                      {differenceInDays(newEndDate, newStartDate) + 1} jours
                    </Badge>
                  </div>
                </div>
              )}

              {newStartDate && newEndDate && isBefore(newEndDate, newStartDate) && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                  <AlertDescription className="text-destructive text-sm">
                    ⚠️ La date de fin ne peut pas être antérieure à la date de début
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 gap-4">
                {/* Date de début - désactivée si le stage a déjà commencé */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Date de début {hasInternshipStarted && "(Non modifiable)"}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newStartDate && "text-muted-foreground"
                        )}
                        disabled={hasInternshipStarted}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {newStartDate ? (
                          format(newStartDate, "PPP", { locale: fr })
                        ) : (
                          <span>Sélectionnez une date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={newStartDate}
                        onSelect={setNewStartDate}
                        disabled={(date) => hasInternshipStarted || date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {hasInternshipStarted && (
                    <p className="text-xs text-muted-foreground">
                      La date de début ne peut pas être modifiée car le stage a déjà commencé
                    </p>
                  )}
                </div>

                {/* Date de fin - toujours modifiable */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Date de fin *
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {newEndDate ? (
                          format(newEndDate, "PPP", { locale: fr })
                        ) : (
                          <span>Sélectionnez une date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={newEndDate}
                        onSelect={setNewEndDate}
                        disabled={(date) => date < (hasInternshipStarted ? new Date(stagiaire.date_debut) : (newStartDate || new Date()))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsEditPeriodOpen(false)}
                disabled={loadingPeriod}
              >
                Annuler
              </Button>
              <Button 
                onClick={handleUpdatePeriod}
                disabled={
                  loadingPeriod || 
                  !newStartDate || 
                  !newEndDate ||
                  isBefore(newEndDate, newStartDate)
                }
                className="gap-2"
              >
                {loadingPeriod ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  <>
                    <CalendarDays className="h-4 w-4" />
                    Valider les modifications
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de pré-renouvellement */}
        <PreRenewalDialog 
          open={isPreRenewDialogOpen} 
          onOpenChange={setIsPreRenewDialogOpen}
          existingStage={stagiaire}
          onSuccess={handlePreRenewalSuccess}
        />

        {/* Modal de finalisation */}
        <FinalizeRenewalDialog
          open={isFinalizeRenewDialogOpen}
          onOpenChange={setIsFinalizeRenewDialogOpen}
          stagiaireId={stagiaire.id}
          previousStage={stagiaire}
          conventionTemporaireUrl={conventionRenouvellementData?.pdf_url}
          onSuccess={() => {
            fetchStagiaire();
            setConventionRenouvellementData(null);
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default OngoingInternshipDetails;
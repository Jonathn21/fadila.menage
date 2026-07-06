// components/stagiaires/modals/RenewalModal.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react"; // ✅
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Coins } from 'lucide-react';
import {
  CheckCircle,
  Calendar,
  Building2,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Briefcase,
  UserCog,
  Info,
  CalendarDays,
  Clock,
  ArrowLeft,
  Download,
  FileText,
  RefreshCw,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, differenceInDays, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import apiClient from "@/lib/apiClient";

// ========================= //
//     Validation Schema     //
// ========================= //
const formSchema = z.object({
  internshipType: z.string().min(1, "Le type de stage est requis"),
  location: z.string().min(1, "Le lieu de stage est requis"),
  department: z.string().min(1, "La direction est requise"),
  service: z.string().min(1, "Le service est requis"),
  supervisor: z.string().optional(),
  startDate: z.date({
    required_error: "La date de début est requise",
  }),
  endDate: z.date({
    required_error: "La date de fin est requise",
  }),
  isPaid: z.boolean().default(false),
  amount: z.number().min(0, "Le montant doit être positif").optional(),
  notes: z.string().max(500, "Les notes ne doivent pas dépasser 500 caractères").optional(),
}).refine((data) => data.startDate < data.endDate, {
  message: "La date de fin doit être postérieure à la date de début",
  path: ["endDate"],
});

type FormValues = z.infer<typeof formSchema>;

// ========================= //
//     Data Configurations   //
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
  { value: "DARH", label: "DARH", description: "Direction de l'Administration et Ressources Humaines" },
  { value: "DCGIS", label: "DCGIS", description: "Direction du Contrôle et de Gestion de l’Informatique et de la Statistique" },
  { value: "DEPP", label: "DEPP", description: "Direction des Études, de la Planification et des Projets" },
  { value: "DT", label: "DT", description: "Direction Technique" },
  { value: "DM", label: "DM", description: "Direction des Marchés" },
  { value: "DFC", label: "DFC", description: "Direction des Finances et de la Comptabilité" },
  { value: "DG", label: "DG", description: "Direction Générale" },
];

const servicesByDepartment = {
  DARH: ["Administration et Archives", "Ressources Humaines et Affaires Sociales", "Secrétariat"],
  DCGIS: ["Informatique et Statistique", "Contrôle et Suivi du Budget et des Coûts et Prix","Budget", "Secrétariat"],
  DM: ["Préparation et Suivi des Marchés", "Exécutions des Marchés, Approvisionnement et Exonérations", "Secrétariat"],
  DT: ["Mouvements d'Energie - Dispathing", "Entretien et Télécommunications", "Secrétariat"],
  DEPP: ["Planification Etudes et Préparation des Projets", "Service Environnement, Génie Civil et Mécanique", "Suivi,Contrôle et Exécution des Projets", "Secrétariat"],
  DFC: ["Comptabilité", "Finance", "Infrastructures et Logistique", "Secrétariat"],
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

// ========================= //
//     Progress Indicator    //
// ========================= //
const ProgressIndicator: React.FC<{
  currentStep: number;
  steps: { label: string; description: string }[];
}> = ({ currentStep, steps }) => {
  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start relative gap-2 sm:gap-0">
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
  minDate?: Date;
}> = ({ form, name, label, disabled, minDate }) => {
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
                disabled={(date) => {
                  if (minDate) {
                    return date < minDate;
                  }
                  return disabled ? disabled(date) : false;
                }}
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
              ? "Date à laquelle le nouveau stage débutera" 
              : "Date à laquelle le nouveau stage se terminera"
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
          <FormItem className="flex flex-col sm:flex-row flex-row sm:items-center sm:justify-between rounded-lg border p-4 bg-muted/20 gap-2 sm:gap-0">
            <div className="space-y-0.5">
              <FormLabel className="text-base flex items-center gap-2">
                <Coins className="h-4 w-4" />
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
                className="h-5 w-5 cursor-pointer rounded border-border accent-primary focus:ring-primary/30"
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
    <div className="flex flex-col sm:flex-row sm:justify-between pt-6 gap-2 sm:gap-0">
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
              Génération...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Générer le renouvellement
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
  stagiaire: any;
}> = ({ form, stagiaire }) => {
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
          <RefreshCw className="h-4 w-4" />
          Aperçu du renouvellement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {values.internshipType && (
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0">
            <span className="text-muted-foreground">Type:</span>
            <span className="font-medium">{values.internshipType}</span>
          </div>
        )}
        {values.location && (
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0">
            <span className="text-muted-foreground">Lieu:</span>
            <span className="font-medium">{values.location}</span>
          </div>
        )}
        {values.department && (
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0">
            <span className="text-muted-foreground">Direction:</span>
            <span className="font-medium">{values.department}</span>
          </div>
        )}
        {values.service && (
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0">
            <span className="text-muted-foreground">Service:</span>
            <span className="font-medium">{values.service}</span>
          </div>
        )}
        {values.startDate && (
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0">
            <span className="text-muted-foreground">Début:</span>
            <span className="font-medium">{formatDate(values.startDate)}</span>
          </div>
        )}
        {values.endDate && (
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0">
            <span className="text-muted-foreground">Fin:</span>
            <span className="font-medium">{formatDate(values.endDate)}</span>
          </div>
        )}
        {values.isPaid && values.amount && (
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0">
            <span className="text-muted-foreground">Rémunération:</span>
            <span className="font-medium text-green-600">{values.amount?.toLocaleString()} FCFA</span>
          </div>
        )}
        {values.startDate && values.endDate && (
          <div className="pt-2 mt-2 border-t">
            <div className="flex flex-col sm:flex-row sm:justify-between font-medium gap-2 sm:gap-0">
              <span className="text-muted-foreground">Durée:</span>
              <span className="text-primary">
                {differenceInDays(values.endDate, values.startDate)} jours
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ========================= //
//     Composant principal   //
// ========================= //
interface RenewalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stagiaire: {
    id: string;
    prenom: string;
    nom: string;
    type_stage: string;
    specialite: string;
    date_fin: string;
    duree_jours: number;
    direction?: string | null;
    service?: string | null;
    lieu_stage?: string | null;
    remunere: boolean;
    montant_remuneration?: number | null;
  };
  onSuccess: (data?: {
    convention_temporaire_url?: string;
    convention_temporaire_id?: number;
    message?: string;
  }) => void;
}

const RenewalModal: React.FC<RenewalModalProps> = ({
  open,
  onOpenChange,
  stagiaire,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [availableSupervisors, setAvailableSupervisors] = useState<string[]>([]);
  const [generatedPdf, setGeneratedPdf] = useState<{
    url: string;
    id: number;
  } | null>(null);

  // Date minimale pour le début (jour suivant la fin du stage actuel)
  const minStartDate = useMemo(() => {
    const endDate = new Date(stagiaire.date_fin);
    return addDays(endDate, 1);
  }, [stagiaire.date_fin]);

  // Formulaire
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      internshipType: stagiaire.type_stage || "",
      location: stagiaire.lieu_stage || "",
      department: stagiaire.direction || "",
      service: stagiaire.service || "",
      supervisor: "",
      startDate: minStartDate,
      endDate: addDays(minStartDate, stagiaire.duree_jours), // Même durée par défaut
      isPaid: stagiaire.remunere,
      amount: stagiaire.montant_remuneration || undefined,
      notes: "",
    },
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

  // Mise à jour de la date de fin quand la date de début change
  useEffect(() => {
    if (watchStartDate && !form.getValues("endDate")) {
      form.setValue("endDate", addDays(watchStartDate, stagiaire.duree_jours));
    }
  }, [watchStartDate, form, stagiaire.duree_jours]);

  // Fonction onSubmit (PRÉ-RENOUVELLEMENT)
  const onSubmit = async (values: FormValues) => {
    if (isSubmitting) return;

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
        ancien_stage_id: stagiaire.id,
      };

      console.log("📤 Envoi des données (pré-renouvellement):", requestData);

      // Endpoint de pré-renouvellement
      const response = await apiClient.post(`/stagiaires/${stagiaire.id}/pre-renouveler/`, requestData);

      if (!response.data.success) {
        throw new Error(response.data.message || "Erreur lors du pré-renouvellement");
      }

      // Si un PDF a été généré, le stocker
      if (response.data.convention_temporaire_url && response.data.convention_temporaire_id) {
        setGeneratedPdf({
          url: response.data.convention_temporaire_url,
          id: response.data.convention_temporaire_id
        });
      }

      toast({
        title: "Pré-renouvellement réussi",
        description: response.data.message || "La convention de renouvellement a été générée. Téléchargez-la pour signature.",
        variant: "default",
      });

      // Appeler onSuccess avec les données du PDF
      onSuccess({
        convention_temporaire_url: response.data.convention_temporaire_url,
        convention_temporaire_id: response.data.convention_temporaire_id,
        message: response.data.message
      });
      
    } catch (error: any) {
      console.error("Erreur lors du pré-renouvellement:", error);
      
      let errorMessage = "Impossible de générer le renouvellement";
      
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

  // Fonction pour télécharger le PDF généré
  const handleDownloadPdf = async () => {
    if (!generatedPdf?.url) return;

    try {
      const response = await apiClient.get(generatedPdf.url, {
        responseType: "blob",
      });
      
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `renouvellement_${stagiaire.prenom}_${stagiaire.nom}_a_signer.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Téléchargement réussi",
        description: "La convention de renouvellement est prête à être signée",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger la convention",
        variant: "destructive",
      });
    }
  };

  const steps = [
    { label: "Général", description: "Type & Lieu" },
    { label: "Affectation", description: "Direction & Service" },
    { label: "Finalisation", description: "Détails & Validation" },
  ];

  const getStepTitle = () => {
    switch (currentStep) {
      case 0: return "Informations générales du renouvellement";
      case 1: return "Affectation du service";
      case 2: return generatedPdf ? "Convention générée" : "Finalisation du renouvellement";
      default: return "Renouvellement de stage";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 0: return "Définissez le type et le lieu du nouveau stage";
      case 1: return "Sélectionnez la direction et le service d'affectation";
      case 2: return generatedPdf 
        ? "Téléchargez la convention de renouvellement pour signature" 
        : "Complétez les détails et générez la convention de renouvellement";
      default: return "Veuillez remplir le formulaire de renouvellement";
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
        { const hasValidDates = values.startDate && values.endDate;
        const noDateError = hasValidDates && values.startDate < values.endDate;
        const hasValidAmount = !values.isPaid || (values.isPaid && values.amount && values.amount > 0);
        return !!(hasValidDates && noDateError && hasValidAmount); }
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
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setGeneratedPdf(null);
    setCurrentStep(0);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
              <RefreshCw className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">
                {generatedPdf ? "Convention de renouvellement générée" : "Renouveler le stage"}
              </DialogTitle>
              <DialogDescription className="text-base">
                {generatedPdf 
                  ? "Téléchargez la convention de renouvellement pour signature" 
                  : `Créer un nouveau stage pour ${stagiaire.prenom} ${stagiaire.nom}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 md:space-y-6">
          {/* Progress Indicator */}
          <Card className="bg-gradient-to-r from-muted/50 to-muted/30">
            <CardContent className="pt-6">
              <ProgressIndicator currentStep={currentStep} steps={steps} />
            </CardContent>
          </Card>

          {/* Affichage du PDF généré */}
          {generatedPdf && (
            <Card className="bg-green-50/20">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Convention de renouvellement générée avec succès</h3>
                    <p className="text-muted-foreground mt-1">
                      La convention de renouvellement a été générée. Téléchargez-la pour la faire signer.
                    </p>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button
                      onClick={handleDownloadPdf}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Télécharger la convention
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleClose}
                    >
                      Fermer
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Après signature, uploadez la convention signée depuis la page de finalisation.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formulaire (uniquement si pas de PDF généré) */}
          {!generatedPdf && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
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
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4 md:space-y-6">
                        {/* Étape 1: Informations générales */}
                        {currentStep === 0 && (
                          <div className="space-y-3 sm:space-y-4 md:space-y-6">
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
                              onPrevious={handlePrevStep}
                              onNext={handleNextStep}
                              isNextDisabled={!isStepValid(0)}
                            />
                          </div>
                        )}

                        {/* Étape 2: Affectation */}
                        {currentStep === 1 && (
                          <div className="space-y-3 sm:space-y-4 md:space-y-6">
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
                          <div className="space-y-3 sm:space-y-4 md:space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                              <DatePickerField
                                form={form}
                                name="startDate"
                                label="Date de début"
                                minDate={minStartDate}
                              />

                              <DatePickerField
                                form={form}
                                name="endDate"
                                label="Date de fin"
                                disabled={(date) => {
                                  const startDate = form.getValues("startDate");
                                  if (startDate) {
                                    return date < startDate;
                                  }
                                  return false;
                                }}
                              />
                            </div>

                            {/* Affichage de la durée du stage */}
                            {watchStartDate && watchEndDate && watchStartDate < watchEndDate && (
                              <div className="rounded-lg bg-green-50 p-4 border">
                                <div className="flex items-center gap-2 text-green-800">
                                  <Calendar className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    Durée du nouveau stage: {differenceInDays(watchEndDate, watchStartDate)} jours
                                  </span>
                                </div>
                              </div>
                            )}

                            <RemunerationSection form={form} isPaid={watchIsPaid} />

                            <FormField
                              control={form.control}
                              name="notes"
                              render={({ field }: any) => (
                                <FormItem>
                                  <FormLabel>Notes additionnelles</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Ajoutez des notes ou commentaires..."
                                      className="resize-none"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Informations complémentaires pour ce renouvellement
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

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
              <div className="space-y-3 sm:space-y-4 md:space-y-6">
                <SummaryPreview form={form} stagiaire={stagiaire} />
                
                {/* Informations sur le stage actuel */}
                <Card className="bg-muted/20 border-muted">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Stage actuel
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">{stagiaire.type_stage}</span>
                    </div>
                    {stagiaire.direction && (
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0">
                        <span className="text-muted-foreground">Direction:</span>
                        <span className="font-medium">{stagiaire.direction}</span>
                      </div>
                    )}
                    {stagiaire.service && (
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0">
                        <span className="text-muted-foreground">Service:</span>
                        <span className="font-medium">{stagiaire.service}</span>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0">
                      <span className="text-muted-foreground">Fin le:</span>
                      <span className="font-medium">{format(new Date(stagiaire.date_fin), "dd/MM/yyyy")}</span>
                    </div>
                    <div className="pt-2 mt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Le nouveau stage débutera après la fin du stage actuel.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          {!generatedPdf && (
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
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RenewalModal;
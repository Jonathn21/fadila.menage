import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
import { 
  Save, 
  ArrowLeft, 
  MessageSquare, 
  CheckCircle, 
  Calendar,
  Building2,
  Users,
  UserCheck,
  DollarSign,
  FileText,
  ChevronLeft,
  ChevronRight,
  Send,
  Clock,
  Loader2,
  MapPin,
  Briefcase,
  UserCog
} from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import RequestMoreInfoDialog from "@/components/RequestMoreInfoDialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
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

export type FormValues = z.infer<typeof formSchema>;

// ========================= //
//     Data Configurations   //
// ========================= //
export const internshipTypes = [
  { value: "Académique", label: "Stage Académique", description: "Stage dans le cadre d'un cursus universitaire" },
  { value: "Fonctionnel", label: "Stage Fonctionnel", description: "Stage d'application professionnelle" },
  { value: "Libre", label: "Stage Libre", description: "Stage hors cadre académique" },
];

export const locations = [
  { value: "Direction Générale", label: "Direction Générale", description: "Siège principal de l'entreprise" },
  { value: "DRB", label: "DRB", description: "Direction Régionale de Borgou" },
  { value: "DRT", label: "DRT", description: "Direction Régionale de l'Atacora" },
  { value: "Poste de Kara", label: "Poste de Kara", description: "Unité opérationnelle à Kara" },
  { value: "Poste de Lokossa", label: "Poste de Lokossa", description: "Unité opérationnelle à Lokossa" },
];

// Définitions des directions avec leurs significations
export const departments = [
  { value: "DARH", label: "DARH", description: "Direction des Affaires et Ressources Humaines" },
  { value: "DCGIS", label: "DCGIS", description: "Direction du Centre de Gestion de l'Information et des Statistiques" },
  { value: "DEPP", label: "DEPP", description: "Direction des Études, Planification et Projets" },
  { value: "DT", label: "DT", description: "Direction Technique" },
  { value: "DM", label: "DM", description: "Direction des Marchés" },
  { value: "DFC", label: "DFC", description: "Direction Financière et Comptable" },
  { value: "DG", label: "DG", description: "Direction Générale" },
];

export const servicesByDepartment = {
  DARH: ["Administration et Archives", "Ressources Humaines et Affaires Sociales", "Secrétariat"],
  DCGIS: ["Informatique", "Statistique", "Secrétariat"],
  DM: ["Préparation et Suivi des Marchés", "Exécutions des Marchés, Approvisionnement et Exonérations"],
  DT: ["Mouvements d'Energie - Dispathing", "Entretient et Télécommunications"],
  DEPP: ["Planiification Etudes et Préparation des Projets", "Service Environnement, Génie Civil et Mécanique"],
  DFC: ["Comptabilité", "Finance", "Infrastructures et Logistique"],
  DG: ["Communication", "Gestion des ressources financières"],
};

export const supervisorsByService = {
  "Administration et Archives": ["KOUBIRMA-BIGNADI Yada"],
  "Ressources Humaines et Affaires Sociales": ["N'DAH-ABOUKHEDOUD Alida"],
  "Informatique": ["TCHAMDJA Mawababè", "MAISSO Tartien"],
  "Statistique": ["SIMNAGNAN Hadatema"],
  "Préparation et Suivi des Marchés": ["YANDOA Kolani", "DAFIA SANNI Alidou"],
  "Mouvements d'Energie - Dispathing": ["TIDIYE Essoyomewe"],
  "Service Environnement, Génie Civil et Mécanique": ["PASSEM Afeitom"],
};

// ========================= //
//     Custom Hooks          //
// ========================= //
export const useProcessInternshipForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      internshipType: "",
      location: "",
      department: "",
      service: "",
      supervisor: "",
      isPaid: false,
      amount: undefined,
      notes: "",
    },
    mode: "onChange",
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [availableSupervisors, setAvailableSupervisors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Simulation du chargement des données existantes
  useEffect(() => {
    const loadExistingData = async () => {
      try {
        // Simuler un chargement
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement:", error);
        setIsLoading(false);
      }
    };

    loadExistingData();
  }, [id]);

  const areDatesValid = () => {
    const startDate = form.getValues("startDate");
    const endDate = form.getValues("endDate");
    return startDate && endDate && startDate < endDate;
  };

  const onSubmit = async (values: FormValues) => {
    console.log("🚀 Début de onSubmit");
    console.log("📝 Données du formulaire:", values);
    
    setIsSubmitting(true);
    try {
      const formatDateForBackend = (date: Date): string => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };

      const montantValue = values.isPaid && values.amount ? values.amount : 0;

      const formattedData = {
        type_stage: values.internshipType,
        lieu: values.location,
        direction: values.department,
        service: values.service,
        tuteur: values.supervisor || "",
        date_debut: formatDateForBackend(values.startDate),
        date_fin: formatDateForBackend(values.endDate),
        remunere: values.isPaid,
        montant: montantValue,
        notes: values.notes || "",
      };

      console.log("📤 Données formatées pour API:", formattedData);

      const response = await apiClient.post(`/demandes/${id}/accepter/`, formattedData);
      
      console.log("📨 Réponse complète:", response);
      console.log("📨 Données de la réponse:", response.data);

      if (!response.data.success) {
        throw new Error(response.data.message || "Erreur lors de l'acceptation de la demande");
      }

      toast({
        title: "Demande acceptée avec succès",
        description: `Le stage a été planifié et le demandeur a été notifié.`,
      });
      navigate(`/demandes/${id}`);
      
    } catch (error: any) {
      console.error("💥 Erreur complète:", error);
      
      let errorMessage = "Une erreur s'est produite lors du traitement de la demande.";
      
      if (error.response) {
        console.error("📨 Données d'erreur:", error.response.data);
        
        if (error.response.status === 400) {
          errorMessage = error.response.data.message || "Données invalides. Vérifiez les informations saisies.";
        } else if (error.response.status === 404) {
          errorMessage = "La demande spécifiée n'a pas été trouvée.";
        } else if (error.response.status === 500) {
          errorMessage = "Erreur interne du serveur. Veuillez réessayer plus tard.";
        } else {
          errorMessage = error.response.data.message || `Erreur ${error.response.status}: ${error.response.statusText}`;
        }
      } else if (error.request) {
        errorMessage = "Impossible de contacter le serveur. Vérifiez votre connexion internet.";
      } else {
        errorMessage = error.message || errorMessage;
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

  const handleSaveAsDraft = () => {
    const values = form.getValues();
    console.log("Saved as draft:", values);
    toast({
      title: "Brouillon enregistré",
      description: "Vos modifications ont été sauvegardées en tant que brouillon.",
    });
  };

  return {
    form,
    currentStep,
    setCurrentStep,
    availableServices,
    setAvailableServices,
    availableSupervisors,
    setAvailableSupervisors,
    onSubmit,
    handleSaveAsDraft,
    areDatesValid,
    isSubmitting,
    isLoading,
  };
};

// ========================= //
//     Skeleton Loader       //
// ========================= //
const FormSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex justify-between pt-6">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
};

// ========================= //
//     Step Navigation       //
// ========================= //
const StepNavigation: React.FC<{
  onPrevious: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
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
              Traitement...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              Créer le stage
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
//     Enhanced Select       //
// ========================= //
const EnhancedSelect: React.FC<{
  form: UseFormReturn<FormValues>;
  name: keyof FormValues;
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
      render={({ field }) => (
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
//     Date Picker SHADCN    //
// ========================= //
const DatePickerField: React.FC<{
  form: UseFormReturn<FormValues>;
  name: keyof FormValues;
  label: string;
  disabled?: (date: Date) => boolean;
}> = ({ form, name, label, disabled }) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" />
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
                  <Calendar className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={field.value && field.value instanceof Date ? field.value : undefined}
                onSelect={field.onChange}
                disabled={(date) => {
                  // Désactiver les dates passées
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  // Si c'est la date de fin, désactiver les dates avant la date de début
                  if (name === "endDate" && form.getValues("startDate")) {
                    const startDate = new Date(form.getValues("startDate"));
                    startDate.setHours(0, 0, 0, 0);
                    return date < startDate || date < today;
                  }
                  
                  // Pour la date de début, désactiver seulement les dates passées
                  return date < today;
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
  form: UseFormReturn<FormValues>;
  isPaid: boolean;
}> = ({ form, isPaid }) => {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="isPaid"
        render={({ field }) => (
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
          render={({ field }) => (
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
//    STEP 1 - General Info  //
// ========================= //
const GeneralInfoStep: React.FC<{
  form: UseFormReturn<FormValues>;
  onNext: () => void;
}> = ({ form, onNext }) => {
  const isStepValid = () => {
    const values = form.getValues();
    return values.internshipType && values.location;
  };

  return (
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
        onNext={onNext}
        isNextDisabled={!isStepValid()}
      />
    </div>
  );
};

// ========================= //
//    STEP 2 - Department    //
// ========================= //
const DepartmentStep: React.FC<{
  form: UseFormReturn<FormValues>;
  availableServices: string[];
  onPrevious: () => void;
  onNext: () => void;
}> = ({ form, availableServices, onPrevious, onNext }) => {
  const isStepValid = () => {
    const values = form.getValues();
    return values.department && values.service;
  };

  return (
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
        onPrevious={onPrevious}
        onNext={onNext}
        isNextDisabled={!isStepValid()}
      />
    </div>
  );
};

// ========================= //
//   STEP 3 - Finalization   //
// ========================= //
const FinalizationStep: React.FC<{
  form: UseFormReturn<FormValues>;
  availableSupervisors: string[];
  isSubmitting: boolean;
  onPrevious: () => void;
  onSubmit: () => void;
}> = ({ form, availableSupervisors, isSubmitting, onPrevious, onSubmit }) => {
  const watchIsPaid = form.watch("isPaid");
  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");

  return (
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
        />

        <DatePickerField
          form={form}
          name="endDate"
          label="Date de fin"
        />
      </div>

      {/* Affichage de la durée du stage */}
      {startDate && endDate && startDate < endDate && (
        <div className="rounded-lg bg-green-50 p-4 border border-green-200">
          <div className="flex items-center gap-2 text-green-800">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">
              Durée du stage: {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} jours
            </span>
          </div>
        </div>
      )}

      <RemunerationSection form={form} isPaid={watchIsPaid} />


      <StepNavigation
        onPrevious={onPrevious}
        onSubmit={onSubmit}
        isLastStep={true}
        isSubmitDisabled={!form.formState.isValid}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

// ========================= //
//   Progress Indicator      //
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
//   Summary Preview         //
// ========================= //
const SummaryPreview: React.FC<{
  form: UseFormReturn<FormValues>;
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
          <CheckCircle className="h-4 w-4" />
          Aperçu du stage
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
            <span className="font-medium text-green-600">{values.amount} FCFA</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ========================= //
//   MAIN COMPONENT          //
// ========================= //
const ProcessInternship = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isRequestInfoDialogOpen, setIsRequestInfoDialogOpen] = useState(false);

  const {
    form,
    currentStep,
    setCurrentStep,
    availableServices,
    setAvailableServices,
    availableSupervisors,
    setAvailableSupervisors,
    onSubmit,
    handleSaveAsDraft,
    isSubmitting,
    isLoading,
  } = useProcessInternshipForm();

  const watchDepartment = form.watch("department");
  const watchService = form.watch("service");

  useEffect(() => {
    if (watchDepartment) {
      const services =
        servicesByDepartment[watchDepartment as keyof typeof servicesByDepartment] || [];
      setAvailableServices(services);
      form.setValue("service", "");
      form.setValue("supervisor", "");
    }
  }, [watchDepartment, form, setAvailableServices]);

  useEffect(() => {
    if (watchService) {
      const supervisors =
        supervisorsByService[watchService as keyof typeof supervisorsByService] || [];
      setAvailableSupervisors(supervisors);
      form.setValue("supervisor", "");
    }
  }, [watchService, form, setAvailableSupervisors]);

  const handleRequestMoreInfo = (message: string) => {
    console.log("Requesting more info:", message);
    toast({
      title: "📩 Demande d'informations envoyée",
      description: "L'étudiant recevra votre message par email.",
    });
    setIsRequestInfoDialogOpen(false);
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
      default: return "Traitement de la demande";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 0: return "Définissez le type et le lieu du stage";
      case 1: return "Sélectionnez la direction et le service d'affectation";
      case 2: return "Complétez les détails et validez le stage";
      default: return "Veuillez remplir le formulaire d'affectation";
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 space-y-6 max-w-4xl">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Card>
            <CardContent className="pt-6">
              <FormSkeleton />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6 max-w-4xl">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(`/demandes/${id}`)}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight  bg-clip-text ">
                Traitement de la demande
              </h1>
              <div className="flex items-center gap-2 mt-1">
                
                <span className="text-sm text-muted-foreground">
                  Formulaire d'acceptation
                </span>
              </div>
            </div>
          </div>
          
          
        </div>

        {/* Progress Indicator */}
        <Card className="bg-gradient-to-r from-muted/50 to-muted/30">
          <CardContent className="pt-6">
            <ProgressIndicator currentStep={currentStep} steps={steps} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card >
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
                    {currentStep === 0 && (
                      <GeneralInfoStep 
                        form={form}  
                        onNext={() => setCurrentStep(1)} 
                      />
                    )}
                    
                    {currentStep === 1 && (
                      <DepartmentStep
                        form={form}
                        availableServices={availableServices}
                        onPrevious={() => setCurrentStep(0)}
                        onNext={() => setCurrentStep(2)}
                      />
                    )}
                    
                    {currentStep === 2 && (
                      <FinalizationStep
                        form={form}
                        availableSupervisors={availableSupervisors}
                        isSubmitting={isSubmitting}
                        onPrevious={() => setCurrentStep(1)}
                        onSubmit={() => form.handleSubmit(onSubmit)()}
                      />
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

      <RequestMoreInfoDialog
        open={isRequestInfoDialogOpen}
        onClose={() => setIsRequestInfoDialogOpen(false)}
        onSend={handleRequestMoreInfo}
      />
    </DashboardLayout>
  );
};

export default ProcessInternship;
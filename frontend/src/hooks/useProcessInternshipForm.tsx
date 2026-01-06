import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

// Form schema
const formSchema = z.object({
  verifiedFields: z.array(z.string()).optional(),
  internshipType: z.string({
    required_error: "Veuillez sélectionner un type de stage",
  }),
  location: z.string({
    required_error: "Veuillez sélectionner un lieu de stage",
  }),
  department: z.string({
    required_error: "Veuillez sélectionner une direction",
  }),
  service: z.string({
    required_error: "Veuillez sélectionner un service",
  }),
  supervisor: z.string().optional(),
  startDate: z.date({
    required_error: "Veuillez sélectionner une date de début",
  }),
  endDate: z.date({
    required_error: "Veuillez sélectionner une date de fin",
  }),
  isPaid: z.boolean().default(false),
  remunerationAmount: z.number().optional(),
});

export type FormValues = z.infer<typeof formSchema>;

export const useProcessInternshipForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); // récupération de l’ID depuis l’URL
  const [currentStep, setCurrentStep] = useState(0);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [availableSupervisors, setAvailableSupervisors] = useState<string[]>([]);
  const [isDraft, setIsDraft] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      internshipType: "",
      location: "",
      department: "",
      service: "",
      supervisor: "",
      isPaid: false,
      remunerationAmount: undefined,
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      toast({
        title: "Traitement en cours",
        description: "Veuillez patienter...",
      });

      const payload = {
        type_stage: data.internshipType,
        lieu: data.location,
        direction: data.department,
        service: data.service,
        tuteur: data.supervisor || null,
        date_debut: data.startDate
          ? new Date(data.startDate).toLocaleDateString("fr-FR")
          : null,
        date_fin: data.endDate
          ? new Date(data.endDate).toLocaleDateString("fr-FR")
          : null,
        remunere: data.isPaid,
        montant: data.isPaid ? data.remunerationAmount?.toString() : null,
      };

      const response = await axios.post(`http://127.0.0.1:8000/api/demandes/${id}/accepter/`, payload);

      if (response.data.success) {
        toast({
          title: "Succès",
          description: response.data.message,
        });
        navigate(`/stagiaires/${response.data.stagiaire.id}`);
      } else {
        toast({
          title: "Erreur",
          description: response.data.message || "Une erreur est survenue.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Erreur API:", error);
      toast({
        title: "Erreur serveur",
        description: error.response?.data?.message || "Veuillez réessayer plus tard.",
        variant: "destructive",
      });
    }
  };

  const handleSaveAsDraft = () => {
    const currentValues = form.getValues();
    console.log("Saving draft:", currentValues);
    setIsDraft(true);

    toast({
      title: "Brouillon enregistré",
      description: "Le traitement a été enregistré en tant que brouillon.",
    });
  };

  const areDatesValid = () => {
    const startDate = form.getValues("startDate");
    const endDate = form.getValues("endDate");

    if (startDate && endDate) {
      return startDate < endDate;
    }
    return true;
  };

  return {
    form,
    currentStep,
    setCurrentStep,
    availableServices,
    setAvailableServices,
    availableSupervisors,
    setAvailableSupervisors,
    isDraft,
    setIsDraft,
    onSubmit,
    handleSaveAsDraft,
    areDatesValid,
  };
};

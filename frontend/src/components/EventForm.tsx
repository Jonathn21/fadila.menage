import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Calendar, Clock, Loader2, User, CalendarDays, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

const interviewFormSchema = z.object({
  titre: z.string().optional(),
  demandeur_id: z.string().min(1, "Le demandeur est obligatoire"),
  date: z.date({ required_error: "La date est obligatoire" }),
  heure_debut: z.string().min(1, "L'heure de début est obligatoire"),
});

type InterviewFormValues = z.infer<typeof interviewFormSchema>;

interface InterviewFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitSuccess?: () => void;
  editingEvent?: any | null;
  initialDate?: Date | null;
  onDelete?: (eventId: string) => void;
}

interface Demande {
  id: string;
  nom: string; // Format: "Nom Prénom" depuis l'API entretiens
}

const InterviewForm: React.FC<InterviewFormProps> = ({
  open,
  onOpenChange,
  onSubmitSuccess,
  editingEvent,
  initialDate,
  onDelete,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loadingDemandes, setLoadingDemandes] = useState(false);

  const form = useForm<InterviewFormValues>({
    resolver: zodResolver(interviewFormSchema),
    defaultValues: { 
      titre: "", 
      demandeur_id: "", 
      heure_debut: "" 
    },
  });

  useEffect(() => {
    if (open) {
      fetchDemandes();
      if (editingEvent) {
        const demandeurId = demandes.find(d => d.nom === editingEvent.demandeur)?.id || "";
        form.reset({
          titre: editingEvent.titre || "",
          demandeur_id: demandeurId,
          date: editingEvent.date ? new Date(editingEvent.date) : undefined,
          heure_debut: editingEvent.heure_debut || "",
        });
      } else if (initialDate) {
        form.reset({
          titre: "",
          demandeur_id: "",
          date: initialDate,
          heure_debut: "",
        });
      } else {
        form.reset({
          titre: "",
          demandeur_id: "",
          heure_debut: "",
        });
      }
    }
  }, [open, editingEvent, initialDate]); // 🔥 ENLÈVE demandes ici


  const fetchDemandes = async () => {
    if (loadingDemandes) return; // Éviter les appels multiples
    
    setLoadingDemandes(true);
    try {
      // Utiliser l'endpoint qui retourne demandes ET entretiens
      const response = await apiClient.get("/entretiens/");
      const data = response.data;
      
      // Extraire les demandes de la réponse
      setDemandes(data.demandes || []);
    } catch (error: any) {
      console.error("Erreur lors du chargement des demandes:", error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de charger la liste des demandeurs",
        variant: "destructive",
      });
    } finally {
      setLoadingDemandes(false);
    }
  };

  const onSubmit = async (data: InterviewFormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        titre: data.titre?.trim() || "Entretien de stage",
        demandeur_id: data.demandeur_id,
        date: format(data.date, "yyyy-MM-dd"),
        heure_debut: data.heure_debut,
      };

      let response;
      if (editingEvent) {
        // Modification d'un entretien existant
        response = await apiClient.put(`/entretiens/${editingEvent.id}/`, payload);
      } else {
        // Création d'un nouvel entretien
        response = await apiClient.post("/entretiens/", payload);
      }

      // L'API Django retourne directement les données de l'entretien
      if (response.status === 200 || response.status === 201) {
        toast({
          title: editingEvent ? "✅ Entretien modifié" : "✅ Entretien planifié",
          description: editingEvent 
            ? "L'entretien a été modifié avec succès." 
            : "L'entretien a été ajouté avec succès.",
        });
        form.reset();
        onOpenChange(false);
        onSubmitSuccess?.();
      }
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde de l'entretien:", error);
      
      let errorMessage = "Erreur lors de la sauvegarde de l'entretien";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 400) {
        errorMessage = "Données invalides. Vérifiez les informations saisies.";
      } else if (error.response?.status === 404) {
        errorMessage = "Demandeur non trouvé.";
      }
      
      toast({
        title: "❌ Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (editingEvent && onDelete) {
      try {
        setIsLoading(true);
        await apiClient.delete(`/entretiens/${editingEvent.id}/`);
        
        toast({
          title: "✅ Entretien supprimé",
          description: "L'entretien a été supprimé avec succès.",
        });
        onDelete(editingEvent.id);
        onOpenChange(false);
      } catch (error: any) {
        console.error("Erreur lors de la suppression:", error);
        
        let errorMessage = "Erreur lors de la suppression de l'entretien";
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        }
        
        toast({
          title: "❌ Erreur",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const selectedDemande = demandes.find(d => d.id === form.watch("demandeur_id"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] rounded-lg">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4 mx-auto">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            {editingEvent ? "Modifier l'entretien" : "Planifier un entretien"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {editingEvent 
              ? "Modifiez les détails de cet entretien"
              : "Créez un nouvel entretien avec un demandeur de stage"
            }
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField 
              control={form.control} 
              name="titre" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre de l'entretien</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Entretien technique - Développement web" 
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Optionnel - Par défaut "Entretien de stage"
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField 
              control={form.control} 
              name="demandeur_id" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Demandeur *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={loadingDemandes || isLoading}>
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={loadingDemandes ? "Chargement des demandeurs..." : "Sélectionner un demandeur"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {demandes.map((demande) => (
                        <SelectItem key={demande.id} value={demande.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{demande.nom}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedDemande && (
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Demandeur sélectionné :</span>
                  <span>{selectedDemande.nom}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField 
                control={form.control} 
                name="date" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button 
                            variant="outline" 
                            className={cn(
                              "h-11 pl-3 text-left font-normal w-full",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: fr })
                            ) : (
                              "Sélectionner une date"
                            )}
                            <Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="p-3 pointer-events-auto"
                          disabled={(date) => {
                            // Désactiver les dates passées et les week-ends
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const dayOfWeek = date.getDay();
                            return date < today || dayOfWeek === 0 || dayOfWeek === 6;
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Week-ends et dates passées désactivées
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField 
                control={form.control} 
                name="heure_debut" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure de début *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="time" 
                          className="pl-10 h-11"
                          {...field} 
                          disabled={isLoading}
                          min="08:00"
                          max="18:00"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Entre 08:00 et 18:00
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {editingEvent ? "Modification..." : "Planification..."}
                  </>
                ) : (
                  <>
                    <CalendarDays className="h-4 w-4" />
                    {editingEvent ? "Modifier l'entretien" : "Planifier l'entretien"}
                  </>
                )}
              </Button>
              {editingEvent && onDelete && (
                <div className="w-full sm:w-auto">
                  <DeleteConfirmDialog
                    title="Supprimer l'entretien"
                    description="Êtes-vous sûr de vouloir supprimer cet entretien ? Cette action est irréversible."
                    onConfirm={handleDelete}
                    trigger={
                      <Button variant="destructive" className="w-full gap-2" disabled={isLoading}>
                        <Trash2 className="h-4 w-4" />
                        Supprimer l'entretien
                      </Button>
                    }
                  />
                </div>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default InterviewForm;
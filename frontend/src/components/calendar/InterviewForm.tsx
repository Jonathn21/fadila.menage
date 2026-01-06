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
import { Calendar, Clock, Loader2, User, CalendarDays, Trash2, Ban, Eye, Edit, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/apiClient";
import DeleteConfirmDialog from "../DeleteConfirmDialog";
import { Badge } from "@/components/ui/badge";

// ✅ Schéma de validation
const interviewFormSchema = z.object({
  titre: z.string().optional(),
  demandeur_id: z.string().min(1, "Le demandeur est obligatoire"),
  date: z.date({ required_error: "La date est obligatoire" }),
  heure_debut: z.string().min(1, "L'heure de début est obligatoire"),
});

type InterviewFormValues = z.infer<typeof interviewFormSchema>;

// ✅ Props
interface InterviewFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitSuccess?: (action: "create" | "update") => void;
  editingEvent?: any | null;
  initialDate?: Date | null;
  onDelete?: (eventId: string) => void;
  onCancel?: (event: any) => void;
  onComplete?: (event: any) => void;
  canCancelEvent?: (event: any) => boolean;
  canCompleteEvent?: (event: any) => boolean;
  mode?: "create" | "edit" | "view";
  onEdit?: () => void;
}

interface Demande {
  id: string;
  nom: string;
}

// 🕐 Génération des créneaux horaires (08:00 - 18:00, par intervalles de 30 minutes)
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 7; hour <= 16; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === 16 && minute > 0) break; // Arrêter à 18:00
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeString);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const InterviewForm: React.FC<InterviewFormProps> = ({
  open,
  onOpenChange,
  onSubmitSuccess,
  editingEvent,
  initialDate,
  onDelete,
  onCancel,
  onComplete,
  canCancelEvent,
  canCompleteEvent,
  mode = "create",
  onEdit,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loadingDemandes, setLoadingDemandes] = useState(false);
  const [isViewMode, setIsViewMode] = useState(mode === "view");

  const form = useForm<InterviewFormValues>({
    resolver: zodResolver(interviewFormSchema),
    defaultValues: { 
      titre: "", 
      demandeur_id: "", 
      heure_debut: "" 
    },
  });

  // 1️⃣ Charger les demandes uniquement à l'ouverture
  useEffect(() => {
    if (open) {
      fetchDemandes();
    }
  }, [open]);

  // 2️⃣ Réinitialiser le form selon le contexte
  useEffect(() => {
    if (!open) return;

    setIsViewMode(mode === "view");

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
  }, [open, editingEvent, initialDate, demandes, mode]);

  // 🔹 Charger les demandeurs
  const fetchDemandes = async () => {
    setLoadingDemandes(true);
    try {
      const response = await apiClient.get("/entretiens/");
      const data = response.data;
      setDemandes(data.demandes || []);
    } catch (error: any) {
      console.error("Erreur lors du chargement des demandeurs:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des demandeurs",
        variant: "destructive",
      });
    } finally {
      setLoadingDemandes(false);
    }
  };

  // 🔹 Créer / Modifier un entretien
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
        response = await apiClient.put(`/entretiens/${editingEvent.id}/`, payload);
      } else {
        response = await apiClient.post("/entretiens/", payload);
      }

      if (response.status === 200 || response.status === 201) {
        toast({
          title: editingEvent ? "Entretien modifié" : "Entretien planifié",
          description: editingEvent 
            ? "L'entretien a été modifié avec succès." 
            : "L'entretien a été ajouté avec succès.",
        });
        form.reset();
        onOpenChange(false);

        // ✅ On passe explicitement le type d'action
        onSubmitSuccess?.(editingEvent ? "update" : "create");
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
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 Supprimer un entretien
  const handleDelete = () => {
    if (editingEvent && onDelete) {
      onDelete(editingEvent.id);
      onOpenChange(false);
    }
  };

  // 🔹 Annuler un entretien
  const handleCancel = () => {
    if (editingEvent && onCancel) {
      onCancel(editingEvent);
      onOpenChange(false);
    }
  };

  // 🔹 Terminer un entretien
  const handleComplete = () => {
    if (editingEvent && onComplete) {
      onComplete(editingEvent);
      onOpenChange(false);
    }
  };

  // 🔹 Passer en mode édition
  const handleEdit = () => {
    if (onEdit) {
      onEdit();
      setIsViewMode(false);
    }
  };

  // 🔹 Obtenir la variante du badge selon le statut
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'planifié': return 'secondary';
      case 'confirmé': return 'default';
      case 'annulé': return 'destructive';
      case 'terminé': return 'outline';
      default: return 'secondary';
    }
  };

  const selectedDemande = demandes.find(d => d.id === form.watch("demandeur_id"));
  const canCancel = editingEvent && canCancelEvent ? canCancelEvent(editingEvent) : false;
  const canComplete = editingEvent && canCompleteEvent ? canCompleteEvent(editingEvent) : false;
  
  // 🔥 MODIFICATION : canDelete seulement pour les entretiens annulés ou terminés
  const canDelete = editingEvent && onDelete && 
    (editingEvent.status === 'annulé' || editingEvent.status === 'terminé');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] rounded-lg">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4 mx-auto">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            {isViewMode ? "Détails de l'entretien" : 
             editingEvent ? "Modifier l'entretien" : "Planifier un entretien"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isViewMode 
              ? "Consultez les informations de cet entretien"
              : editingEvent 
                ? "Modifiez les détails de cet entretien"
                : "Créez un nouvel entretien avec un demandeur de stage"}
          </DialogDescription>

          {/* Badge de statut en mode vue */}
          {isViewMode && editingEvent && (
            <div className="flex justify-center mt-2">
              <Badge variant={getStatusBadgeVariant(editingEvent.status)} className="text-sm">
                {editingEvent.status}
              </Badge>
            </div>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* 🔹 Affichage du motif d'annulation en mode vue */}
            {isViewMode && editingEvent?.status === 'annulé' && editingEvent?.motif_annulation && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <Ban className="h-4 w-4" />
                  <span className="font-medium">Entretien annulé</span>
                </div>
                <p className="text-sm text-destructive">
                  <strong>Motif :</strong> {editingEvent.motif_annulation}
                </p>
              </div>
            )}

            {/* 🔹 Affichage du statut terminé en mode vue */}
            {isViewMode && editingEvent?.status === 'terminé' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Entretien terminé</span>
                </div>
                <p className="text-sm text-green-700">
                  Cet entretien a été marqué comme terminé.
                </p>
              </div>
            )}

            {/* 🔹 Champ titre */}
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
                      disabled={isLoading || isViewMode}
                      readOnly={isViewMode}
                    />
                  </FormControl>
                  <FormDescription>
                    Optionnel - Par défaut "Entretien de stage"
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 🔹 Champ demandeur */}
            <FormField 
              control={form.control} 
              name="demandeur_id" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Demandeur *</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value} 
                    disabled={loadingDemandes || isLoading || isViewMode}
                  >
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

            {/* 🔹 Date + Heure */}
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
                            disabled={isLoading || isViewMode}
                            type="button"
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
              
              {/* 🕐 CHAMP HEURE AVEC SELECT SHADCN/UI */}
              <FormField 
                control={form.control} 
                name="heure_debut" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure de début *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={isLoading || isViewMode}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Sélectionner une heure" />
                          </div>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px]">
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={time} value={time}>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span>{time}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Entre 07:00 et 16:00 
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 🔹 Footer */}
            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
              {isViewMode ? (
                // Mode vue - Boutons Voir/Annuler/Terminer/Supprimer
                <>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => onOpenChange(false)} 
                  >
                    Fermer
                  </Button>
                  
                  <div className="flex gap-2 flex-wrap">
                    {/* Bouton Modifier - seulement pour les entretiens actifs */}
                    {editingEvent?.status !== 'annulé' && editingEvent?.status !== 'terminé' && (
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={handleEdit}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Modifier
                      </Button>
                    )}
                    
                    {/* Bouton Terminer - seulement pour les entretiens actifs */}
                    {canComplete && (
                      <Button 
                        type="button" 
                        variant="default"
                        onClick={handleComplete}
                        className="gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Terminer
                      </Button>
                    )}
                    
                    {/* Bouton Annuler - seulement pour les entretiens actifs */}
                    {canCancel && (
                      <Button 
                        type="button" 
                        variant="destructive"
                        onClick={handleCancel}
                        className="gap-2"
                      >
                        <Ban className="h-4 w-4" />
                        Annuler 
                      </Button>
                    )}
                    
                    {/* 🔥 BOUTON SUPPRIMER - UNIQUEMENT POUR LES ENTRETIENS ANNULÉS OU TERMINÉS */}
                    {canDelete && (
                      <DeleteConfirmDialog
                        title={
                          editingEvent?.status === 'annulé' 
                            ? "Supprimer l'entretien annulé" 
                            : "Supprimer l'entretien terminé"
                        }
                        description={
                          editingEvent?.status === 'annulé' 
                            ? "Êtes-vous sûr de vouloir supprimer définitivement cet entretien annulé ? Cette action est irréversible."
                            : "Êtes-vous sûr de vouloir supprimer définitivement cet entretien terminé ? Cette action est irréversible."
                        }
                        onConfirm={handleDelete}
                        trigger={
                          <Button variant="destructive" className="gap-2">
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </Button>
                        }
                      />
                    )}
                  </div>
                </>
              ) : (
                // Mode création/édition - Boutons standards
                <>
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
                  
                  {/* 🔥 SUPPRESSION POUR LES ENTRETIENS EN MODE ÉDITION - UNIQUEMENT SI ANNULÉ/TERMINÉ */}
                  {canDelete && (
                    <DeleteConfirmDialog
                      title={
                        editingEvent?.status === 'annulé' 
                          ? "Supprimer l'entretien annulé" 
                          : "Supprimer l'entretien terminé"
                      }
                      description={
                        editingEvent?.status === 'annulé' 
                          ? "Êtes-vous sûr de vouloir supprimer définitivement cet entretien annulé ? Cette action est irréversible."
                          : "Êtes-vous sûr de vouloir supprimer définitivement cet entretien terminé ? Cette action est irréversible."
                      }
                      onConfirm={handleDelete}
                      trigger={
                        <Button variant="destructive" className="gap-2" disabled={isLoading}>
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </Button>
                      }
                    />
                  )}
                </>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default InterviewForm;
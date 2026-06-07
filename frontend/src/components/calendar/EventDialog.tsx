import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  User, 
  Edit, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarEventData } from "./CalendarEvent";

interface EventDialogProps {
  event: CalendarEventData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (event: CalendarEventData) => void;
  onDelete: (eventId: string) => void;
}

const EventDialog: React.FC<EventDialogProps> = ({
  event,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}) => {
  if (!event) return null;

  const handleEdit = () => {
    onEdit(event);
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet entretien ?")) {
      onDelete(event.id);
      onOpenChange(false);
    }
  };

  // Fonction pour obtenir le badge et l'icône selon le statut
  const getStatusInfo = () => {
    switch (event.status) {
      case 'annulé':
        return {
          badge: <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Annulé
          </Badge>,
          icon: <XCircle className="h-4 w-4 text-red-500" />
        };
      case 'terminé':
        return {
          badge: <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3" />
            Terminé
          </Badge>,
          icon: <CheckCircle className="h-4 w-4 text-green-500" />
        };
      case 'planifié':
      default:
        return {
          badge: <Badge variant="outline" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Planifié
          </Badge>,
          icon: <AlertCircle className="h-4 w-4 text-blue-500" />
        };
    }
  };

  const { badge, icon } = getStatusInfo();

  // Vérifier si l'entretien peut être modifié (pas annulé ni terminé)
  const canEdit = event.status === 'planifié';
  const canDelete = true; // On peut toujours supprimer (au niveau business logic)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            Détails de l'entretien
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Titre et Statut */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <h3 className="font-semibold text-lg">{event.titre}</h3>
            {badge}
          </div>
          
          {/* Demandeur */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{event.demandeur}</span>
          </div>
          
          {/* Date */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(event.date), "EEEE d MMMM yyyy", { locale: fr })}
            </span>
          </div>
          
          {/* Heure */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {event.heure_debut}
              {event.heure_fin && ` - ${event.heure_fin}`}
            </span>
          </div>

          {/* Motif d'annulation si applicable */}
          {event.status === 'annulé' && event.motif_annulation && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 text-sm">Motif d'annulation</p>
                  <p className="text-red-700 text-sm mt-1">{event.motif_annulation}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          
          {canEdit && (
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          )}
          
          {canDelete && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventDialog;
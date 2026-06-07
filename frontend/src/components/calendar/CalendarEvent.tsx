import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Clock, User, AlertCircle, CheckCircle, XCircle, Ban, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface CalendarEventData {
  id: string;
  titre: string;
  demandeur: string;
  date: string;        // format YYYY-MM-DD (string, pas Date)
  heure_debut: string; // "HH:MM"
  heure_fin?: string | null;  // null dans votre modèle
  status: 'planifié' | 'annulé' | 'terminé';
  motif_annulation?: string;
}

interface CalendarEventProps {
  event: CalendarEventData;
  onClick: (event: CalendarEventData) => void;
  onCancel?: (event: CalendarEventData) => void;
  canCancel?: boolean;
}

const CalendarEvent: React.FC<CalendarEventProps> = ({ 
  event, 
  onClick,
  onCancel,
  canCancel = false 
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: event.id,
      data: event,
      disabled: event.status === 'annulé' || event.status === 'terminé',
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick(event);
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCancel) {
      onCancel(event);
    }
  };

  // Couleurs et icônes selon le statut
  const getStatusStyle = () => {
    switch (event.status) {
      case 'annulé':
        return {
          bgColor: 'bg-red-50 border-red-200 text-red-700',
          icon: <XCircle className="h-3 w-3" />,
          textColor: 'text-red-700'
        };
      case 'terminé':
        return {
          bgColor: 'bg-green-50  text-green-700',
          icon: <CheckCircle className="h-3 w-3" />,
          textColor: 'text-green-700'
        };
      case 'planifié':
      default:
        return {
          bgColor: 'bg-primary/10 border-primary/20 text-primary',
          icon: <AlertCircle className="h-3 w-3" />,
          textColor: 'text-primary'
        };
    }
  };

  const { bgColor, icon, textColor } = getStatusStyle();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        ${bgColor} border p-2 rounded text-xs cursor-pointer hover:opacity-80 transition-all relative group
        ${isDragging ? 'shadow-lg z-50' : ''}
        ${event.status === 'annulé' ? 'opacity-70' : ''}
        ${event.status === 'terminé' ? 'opacity-80' : ''}
      `}
    >
      {/* Menu déroulant pour les actions - seulement si on peut annuler */}
      {(onCancel && canCancel) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity ${textColor}`}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem 
              onClick={handleCancelClick}
              className="text-destructive focus:text-destructive"
            >
              <Ban className="h-4 w-4 mr-2" />
              Annuler l'entretien
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Drag handle - seulement si pas annulé/terminé */}
      {event.status !== 'annulé' && event.status !== 'terminé' && (
        <div
          {...listeners}
          {...attributes}
          className="absolute top-1 right-1 w-3 h-3 cursor-move opacity-50 hover:opacity-100"
          title="Glisser pour déplacer"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-2 gap-px">
            <div className="w-1 h-1 bg-current rounded-full"></div>
            <div className="w-1 h-1 bg-current rounded-full"></div>
            <div className="w-1 h-1 bg-current rounded-full"></div>
            <div className="w-1 h-1 bg-current rounded-full"></div>
          </div>
        </div>
      )}

      {/* Contenu cliquable */}
      <div onClick={handleClick} className={`pr-4 ${event.status === 'annulé' ? 'opacity-80' : ''}`}>
        {/* Titre avec indicateur de statut */}
        <div className="flex items-center gap-1 font-medium truncate">
          {icon}
          <span className="truncate">{event.titre}</span>
        </div>
        
        {/* Demandeur */}
        <div className="flex items-center gap-1 text-xs opacity-75 mt-1">
          <User className="h-3 w-3" />
          <span className="truncate">{event.demandeur}</span>
        </div>
        
        {/* Heure */}
        <div className="flex items-center gap-1 text-xs opacity-75">
          <Clock className="h-3 w-3" />
          <span>{event.heure_debut}</span>
          {event.heure_fin && <span>- {event.heure_fin}</span>}
        </div>

        {/* Motif d'annulation si applicable */}
        {event.status === 'annulé' && event.motif_annulation && (
          <div 
            className="text-xs mt-1 opacity-75 truncate" 
            title={event.motif_annulation}
          >
            Motif: {event.motif_annulation}
          </div>
        )}

        {/* Indicateur d'annulation (petite icône en plus) */}
        {event.status === 'annulé' && (
          <div className="absolute bottom-1 right-1">
            <Ban className="h-3 w-3 text-red-500" />
          </div>
        )}
      </div>

      {/* Overlay pour les événements annulés ou terminés */}
      {(event.status === 'annulé' || event.status === 'terminé') && (
        <div 
          className="absolute inset-0 bg-white/30 rounded flex items-center justify-center pointer-events-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`text-xs font-medium ${textColor} bg-white/80 px-2 py-1 rounded`}>
            {event.status === 'annulé' ? 'Annulé' : 'Terminé'}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarEvent;
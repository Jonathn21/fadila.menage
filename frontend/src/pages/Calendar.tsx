import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Calendar as CalendarIcon,
  ArrowLeft,
  ArrowRight,
  Plus,
  Loader2,
  Clock,
  User,
  AlertCircle,
  Filter,
  RefreshCw,
  Eye,
  Grid,
  List,
  X,
  Ban,
  Trash2,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { format, addMonths, subMonths, isBefore, startOfDay, isToday, isTomorrow } from "date-fns";
import { fr } from "date-fns/locale";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import InterviewForm from "@/components/calendar/InterviewForm";
import { CalendarEventData } from "@/components/calendar/CalendarEvent";
import apiClient from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

const Calendar = () => {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEventData[]>([]);
  const [openInterviewForm, setOpenInterviewForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEventData | null>(null);
  const [draggedDate, setDraggedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("calendar");
  const [viewMode, setViewMode] = useState<"create" | "edit" | "view">("create");
  const [searchQuery, setSearchQuery] = useState("");

  // États pour l'annulation
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [eventToCancel, setEventToCancel] = useState<CalendarEventData | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // États pour la terminaison
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [eventToComplete, setEventToComplete] = useState<CalendarEventData | null>(null);
  const [completing, setCompleting] = useState(false);

  const hasInitialized = useRef(false);
  const isLoading = useRef(false);

  const fetchEvents = async () => {
    if (isLoading.current) return;

    isLoading.current = true;
    
    try {
      setLoading(true);
      const response = await apiClient.get("/entretiens/");
      const data = response.data;
      
      const entretiens: CalendarEventData[] = data.entretiens || [];
      setEvents(entretiens);
    } catch (error) {
      console.error("Erreur lors du chargement des entretiens:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les entretiens",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      isLoading.current = false;
    }
  };

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchEvents();
    }
  }, []);

  const handleAddInterview = () => {
    setEditingEvent(null);
    setSelectedEvent(null);
    setDraggedDate(null);
    setViewMode("create");
    setOpenInterviewForm(true);
  };

  const handleInterviewFormSuccess = () => {
    toast({
      title: "Succès",
      description: "L'entretien a été planifié avec succès.",
    });
    setOpenInterviewForm(false);
    setEditingEvent(null);
    setSelectedEvent(null);
    fetchEvents();
  };

  const handleViewEvent = (event: CalendarEventData) => {
    setSelectedEvent(event);
    setEditingEvent(null);
    setViewMode("view");
    setOpenInterviewForm(true);
  };

  const handleEditEvent = (event: CalendarEventData) => {
    setEditingEvent(event);
    setSelectedEvent(null);
    setViewMode("edit");
    setOpenInterviewForm(true);
  };

  // Fonction pour ouvrir le dialogue d'annulation
  const handleOpenCancelDialog = (event: CalendarEventData) => {
    setEventToCancel(event);
    setCancelReason("");
    setCancelDialogOpen(true);
  };

  // Fonction pour annuler un entretien
  const handleCancelEvent = async () => {
    if (!eventToCancel || !cancelReason.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un motif d'annulation",
        variant: "destructive",
      });
      return;
    }

    setCancelling(true);
    try {
      const response = await apiClient.post(`/entretiens/${eventToCancel.id}/annuler/`, {
        motif_annulation: cancelReason.trim()
      });

      if (response.data.success) {
        // Mettre à jour l'état local
        setEvents(prev => prev.map(event => 
          event.id === eventToCancel.id 
            ? { ...event, status: 'annulé', motif_annulation: cancelReason.trim() }
            : event
        ));

        toast({
          title: "Entretien annulé",
          description: "L'entretien a été annulé avec succès.",
        });

        setCancelDialogOpen(false);
        setEventToCancel(null);
        setCancelReason("");

        // Fermer le formulaire d'édition si ouvert
        if (openInterviewForm && (editingEvent?.id === eventToCancel.id || selectedEvent?.id === eventToCancel.id)) {
          setOpenInterviewForm(false);
          setEditingEvent(null);
          setSelectedEvent(null);
        }
      }
    } catch (error: any) {
      console.error("Erreur lors de l'annulation:", error);
      toast({
        title: "Erreur",
        description: error.response?.data?.error || "Impossible d'annuler l'entretien",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  // Fonction pour ouvrir le dialogue de terminaison
  const handleOpenCompleteDialog = (event: CalendarEventData) => {
    setEventToComplete(event);
    setCompleteDialogOpen(true);
  };

  // Fonction pour terminer un entretien
  const handleCompleteEvent = async () => {
    if (!eventToComplete) return;

    setCompleting(true);
    try {
      const response = await apiClient.post(`/entretiens/${eventToComplete.id}/terminer/`);

      if (response.data.success) {
        // Mettre à jour l'état local
        setEvents(prev => prev.map(event => 
          event.id === eventToComplete.id 
            ? { ...event, status: 'terminé' }
            : event
        ));

        toast({
          title: "Entretien terminé",
          description: response.data.message || "L'entretien a été marqué comme terminé avec succès.",
        });

        setCompleteDialogOpen(false);
        setEventToComplete(null);

        // Fermer le formulaire d'édition si ouvert
        if (openInterviewForm && (editingEvent?.id === eventToComplete.id || selectedEvent?.id === eventToComplete.id)) {
          setOpenInterviewForm(false);
          setEditingEvent(null);
          setSelectedEvent(null);
        }
      }
    } catch (error: any) {
      console.error("Erreur lors de la terminaison:", error);
      toast({
        title: "Erreur",
        description: error.response?.data?.error || "Impossible de terminer l'entretien",
        variant: "destructive",
      });
    } finally {
      setCompleting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      setUpdating(true);
      const response = await apiClient.delete(`/entretiens/${eventId}/`);

      if (response.status === 200 || response.status === 204) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
        setEditingEvent(null);
        setSelectedEvent(null);
        setOpenInterviewForm(false);

        toast({
          title: "Entretien supprimé",
          description: "L'entretien a été supprimé définitivement du calendrier.",
        });
      }
    } catch (error: any) {
      console.error("Erreur lors de la suppression:", error);
      if (error.response?.status === 404) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
        setEditingEvent(null);
        setSelectedEvent(null);
        setOpenInterviewForm(false);

        toast({
          title: "Déjà supprimé",
          description: "Cet entretien n'existe plus en base.",
        });
      } else {
        toast({
          title: "Erreur",
          description: error.response?.data?.error || "Impossible de supprimer l'entretien",
          variant: "destructive",
        });
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleCloseForm = () => {
    setOpenInterviewForm(false);
    setEditingEvent(null);
    setSelectedEvent(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.data.current) {
      const eventData = active.data.current as CalendarEventData;
      
      if (eventData.status === 'annulé' || eventData.status === 'terminé') {
        toast({
          title: "Déplacement impossible",
          description: `Un entretien ${eventData.status} ne peut pas être déplacé.`,
          variant: "destructive",
        });
        return;
      }

      const newDate = new Date(over.id as string);
      const dayOfWeek = newDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        toast({
          title: "Date invalide",
          description: "Les entretiens ne peuvent pas être programmés les week-ends.",
          variant: "destructive",
        });
        return;
      }

      const today = startOfDay(new Date());
      const targetDate = startOfDay(newDate);
      if (isBefore(targetDate, today)) {
        toast({
          title: "Date invalide",
          description: "Impossible de programmer un entretien dans le passé",
          variant: "destructive",
        });
        return;
      }

      try {
        setUpdating(true);
        
        const updatedEvent = {
          ...eventData,
          date: newDate.toISOString().split("T")[0]
        };
        
        await apiClient.put(`/entretiens/${eventData.id}/`, updatedEvent);

        setEvents((prev) =>
          prev.map((e) => 
            e.id === eventData.id 
              ? { ...e, date: newDate.toISOString().split("T")[0] } 
              : e
          )
        );

        toast({
          title: "Entretien déplacé",
          description: `L'entretien a été déplacé au ${format(newDate, "d MMMM yyyy", { locale: fr })}.`,
        });
      } catch (error) {
        console.error("Erreur lors du déplacement:", error);
        toast({
          title: "Erreur",
          description: "Impossible de déplacer l'entretien",
          variant: "destructive",
        });
      } finally {
        setUpdating(false);
      }
    }
  };

  const nextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));
  const prevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
  const goToToday = () => setCurrentDate(new Date());

  const getValidEvents = () => {
    return (events || []).filter(
      (event) => event && event.date && !isNaN(new Date(event.date).getTime())
    );
  };

  const getFilteredEvents = () => {
    const validEvents = getValidEvents();
    let filtered = validEvents;
    
    // Filtre par statut
    if (statusFilter !== "all") {
      filtered = filtered.filter(event => event.status === statusFilter);
    }
    
    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        (event.titre && event.titre.toLowerCase().includes(query)) ||
        (event.demandeur && event.demandeur.toLowerCase().includes(query)) 
      );
    }
    
    return filtered;
  };

  const getUpcomingEvents = () => {
    const validEvents = getFilteredEvents();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return validEvents
      .filter((event) => {
        try {
          const eventDate = new Date(event.date);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate >= today;
        } catch (error) {
          return false;
        }
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'planifié': return 'secondary';
      case 'confirmé': return 'default';
      case 'annulé': return 'destructive';
      case 'terminé': return 'outline';
      default: return 'secondary';
    }
  };

  const getEventDateInfo = (date: string) => {
    const eventDate = new Date(date);
    if (isToday(eventDate)) return "Aujourd'hui";
    if (isTomorrow(eventDate)) return "Demain";
    return format(eventDate, "d MMM", { locale: fr });
  };

  // Vérifier si un entretien peut être annulé
  const canCancelEvent = (event: CalendarEventData) => {
    return event.status !== 'annulé' && event.status !== 'terminé';
  };

  // Vérifier si un entretien peut être terminé
  const canCompleteEvent = (event: CalendarEventData) => {
    return event.status === 'planifié';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <Skeleton className="h-9 w-64" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-48" />
            </div>
          </div>
          
          <div className="flex gap-4 mb-6">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
          </div>
          
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* En-tête amélioré avec navigation et actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Calendrier des entretiens</h1>
              <p className="text-muted-foreground">Gérez et planifiez vos entretiens de stage</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={() => fetchEvents()} 
                    variant="outline" 
                    size="sm"
                    disabled={updating}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
                    Actualiser
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Rafraîchir les données</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button onClick={handleAddInterview} disabled={updating} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvel entretien
            </Button>
          </div>
        </div>

        {/* Navigation du mois et actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Aujourd'hui
            </Button>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={prevMonth} disabled={updating}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth} disabled={updating}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-xl font-semibold ml-2">
              {format(currentDate, "MMMM yyyy", { locale: fr })}
            </h2>
          </div>
          
          <div className="flex gap-2 items-center w-full sm:w-auto">
            <Input
              placeholder="Rechercher un entretien..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64"
            />
            {/*<Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="planifié">Planifié</SelectItem>
                <SelectItem value="confirmé">Confirmé</SelectItem>
                <SelectItem value="annulé">Annulé</SelectItem>
                <SelectItem value="terminé">Terminé</SelectItem>
              </SelectContent>
            </Select>*/}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Grid className="h-4 w-4" />
              Vue calendrier
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Liste des entretiens
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <Card>
              <CardContent className="pt-6 relative min-h-[500px]">
                {updating && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50 rounded-lg">
                    <div className="flex items-center gap-2 bg-background p-4 rounded-lg shadow-lg">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="font-medium">Mise à jour...</span>
                    </div>
                  </div>
                )}
                <DndContext onDragEnd={handleDragEnd}>
                  <CalendarGrid
                    currentDate={currentDate}
                    events={getFilteredEvents()}
                    onEventClick={handleViewEvent}
                    onEventCancel={handleOpenCancelDialog}
                    canCancelEvent={canCancelEvent}
                  />
                </DndContext>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upcoming">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Entretiens à venir</CardTitle>
                  <Badge variant="outline" className="text-sm">
                    {getUpcomingEvents().length} entretien{getUpcomingEvents().length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <CardDescription>
                  Prochains entretiens programmés
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getUpcomingEvents().map((event) => (
                    <div
                      key={event.id}
                      className="flex justify-between items-start p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => handleViewEvent(event)}
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold group-hover:text-primary transition-colors">
                            {event.titre || "Entretien de stage"}
                          </h4>
                          <Badge variant={getStatusBadgeVariant(event.status || 'planifié')}>
                            {event.status || 'planifié'}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{event.demandeur || "Non spécifié"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{event.heure_debut || "HH:MM"}</span>
                            {event.heure_fin && <span>- {event.heure_fin}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <div className="text-sm font-medium text-primary">
                          {getEventDateInfo(event.date)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(event.date), "d MMMM yyyy", { locale: fr })}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewEvent(event);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Voir
                          </Button>
                          
                          {/* Bouton Terminer pour les entretiens actifs */}
                          {canCompleteEvent(event) && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCompleteDialog(event);
                              }}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Terminer
                            </Button>
                          )}
                          
                          {/* Bouton Annuler pour les entretiens actifs */}
                          {canCancelEvent(event) && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCancelDialog(event);
                              }}
                            >
                              <Ban className="h-3 w-3 mr-1" />
                              Annuler
                            </Button>
                          )}
                          
                          {/* Bouton Supprimer pour les entretiens annulés ou terminés */}
                          {(event.status === 'annulé' || event.status === 'terminé') && (
                            <DeleteConfirmDialog
                              title={
                                event.status === 'annulé' 
                                  ? "Supprimer l'entretien annulé" 
                                  : "Supprimer l'entretien terminé"
                              }
                              description={
                                event.status === 'annulé' 
                                  ? "Êtes-vous sûr de vouloir supprimer définitivement cet entretien annulé ? Cette action est irréversible."
                                  : "Êtes-vous sûr de vouloir supprimer définitivement cet entretien terminé ? Cette action est irréversible."
                              }
                              onConfirm={() => handleDeleteEvent(event.id)}
                              trigger={
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Supprimer
                                </Button>
                              }
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {getUpcomingEvents().length === 0 && (
                    <div className="text-center py-12">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium text-lg mb-2">Aucun entretien à venir</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchQuery || statusFilter !== "all" 
                          ? "Aucun entretien ne correspond aux critères sélectionnés"
                          : "Planifiez votre premier entretien pour commencer"
                        }
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Formulaire d'entretien */}
        <InterviewForm
          open={openInterviewForm}
          onOpenChange={setOpenInterviewForm}
          onSubmitSuccess={handleInterviewFormSuccess}
          editingEvent={editingEvent || selectedEvent}
          initialDate={draggedDate}
          onDelete={handleDeleteEvent}
          mode={viewMode}
          onEdit={() => {
            if (selectedEvent) {
              setViewMode("edit");
              setEditingEvent(selectedEvent);
              setSelectedEvent(null);
            }
          }}
          onCancel={handleOpenCancelDialog}
          onComplete={handleOpenCompleteDialog}
          canCancelEvent={canCancelEvent}
          canCompleteEvent={canCompleteEvent}
        />

        {/* Dialogue de confirmation d'annulation */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Ban className="h-5 w-5" />
                Annuler l'entretien
              </DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir annuler cet entretien ? Cette action enverra une notification au candidat.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <h4 className="font-medium mb-1">Entretien concerné :</h4>
                <p className="text-sm">{eventToCancel?.titre || "Entretien de stage"}</p>
                <p className="text-xs text-muted-foreground">
                  {eventToCancel?.date && format(new Date(eventToCancel.date), "d MMMM yyyy", { locale: fr })}
                  {eventToCancel?.heure_debut && ` à ${eventToCancel.heure_debut}`}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancel-reason">Motif d'annulation *</Label>
                <Textarea
                  id="cancel-reason"
                  placeholder="Veuillez saisir le motif de l'annulation..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  Ce motif sera communiqué au candidat.
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(false)}
                disabled={cancelling}
              >
                Retour
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelEvent}
                disabled={cancelling || !cancelReason.trim()}
                className="gap-2"
              >
                {cancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                Confirmer l'annulation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialogue de confirmation pour terminer un entretien */}
        <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Terminer l'entretien
              </DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir marquer cet entretien comme terminé ? Cette action est définitive.
              </DialogDescription>
            </DialogHeader>
            
            <div className="bg-muted/50 p-3 rounded-lg">
              <h4 className="font-medium mb-1">Entretien concerné :</h4>
              <p className="text-sm">{eventToComplete?.titre || "Entretien de stage"}</p>
              <p className="text-xs text-muted-foreground">
                {eventToComplete?.date && format(new Date(eventToComplete.date), "d MMMM yyyy", { locale: fr })}
                {eventToComplete?.heure_debut && ` à ${eventToComplete.heure_debut}`}
              </p>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setCompleteDialogOpen(false)}
                disabled={completing}
              >
                Retour
              </Button>
              <Button
                variant="default"
                onClick={handleCompleteEvent}
                disabled={completing}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {completing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Confirmer la terminaison
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Calendar;
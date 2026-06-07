import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Bell, 
  Mail, 
  MessageCircle, 
  Calendar, 
  ArrowLeft, 
  Trash2, 
  ExternalLink,
  Eye,
  EyeOff,
  Clock,
  User,
  Loader2,
  AlertCircle,
  Archive
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import apiClient from "@/lib/apiClient";

interface Notification {
  id: number;
  titre: string;
  message: string;
  url?: string;
  lu: boolean;
  date_creation: string;
  type: "alert" | "message" | "email" | "info";
  icone?: string;
  expediteur?: string;
}

const NotificationDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const fetchNotification = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // ✅ CORRECTION : Utiliser le bon endpoint
        const response = await apiClient.get(`/notifications/${id}/`);
        
        // ✅ CORRECTION : Adapter selon la structure de votre API
        // Si votre API retourne { notification: {...} }
        const data: Notification = response.data.notification || response.data;
        
        setNotification(data);
        
        // Marquer comme lu si ce n'est pas déjà fait
        if (!data.lu) {
          markAsRead(data.id);
        }
      } catch (error: any) {
        console.error("Erreur lors du chargement de la notification:", error);
        toast({
          title: "Erreur",
          description: error.response?.data?.message || "Erreur lors du chargement de la notification",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchNotification();
  }, [id, toast]);

  const markAsRead = async (notificationId: number) => {
    setMarkingAsRead(true);
    try {
      // ✅ CORRECTION : Utiliser le bon endpoint
      await apiClient.patch(`/notifications/${notificationId}/mark-read/`);
      setNotification(prev => prev ? { ...prev, lu: true } : null);
      
      toast({
        title: "Notification marquée comme lue",
        description: "La notification a été marquée comme lue.",
      });
    } catch (error: any) {
      console.error("Erreur lors du marquage comme lu:", error);
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Impossible de marquer comme lu",
        variant: "destructive",
      });
    } finally {
      setMarkingAsRead(false);
    }
  };

  const deleteNotification = async () => {
    if (!id) return;
    
    setDeleting(true);
    try {
      // ✅ CORRECTION : Utiliser le bon endpoint
      await apiClient.delete(`/notifications/${id}/delete/`);
      
      toast({
        title: "Notification supprimée",
        description: "La notification a été supprimée avec succès.",
      });
      navigate("/notifications");
    } catch (error: any) {
      console.error("Erreur lors de la suppression:", error);
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Erreur lors de la suppression",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getNotificationIcon = (type?: Notification["type"]) => {
    switch (type) {
      case "alert":
        return <AlertCircle className="h-12 w-12 text-amber-500" />;
      case "message":
        return <MessageCircle className="h-12 w-12 text-green-500" />;
      case "email":
        return <Mail className="h-12 w-12 text-blue-500" />;
      default:
        return <Bell className="h-12 w-12 text-gray-500" />;
    }
  };

  const getTypeName = (type?: Notification["type"]) => {
    switch (type) {
      case "alert":
        return "Alerte";
      case "message":
        return "Message";
      case "email":
        return "Email";
      case "info":
        return "Information";
      default:
        return "Notification";
    }
  };

  const getTypeBadgeVariant = (type?: Notification["type"]) => {
    switch (type) {
      case "alert":
        return "destructive";
      case "message":
        return "default";
      case "email":
        return "secondary";
      default:
        return "outline";
    }
  };

  const navigateToRelated = () => {
    if (notification?.url) {
      // Si l'URL est relative, utiliser navigate
      if (notification.url.startsWith('/')) {
        navigate(notification.url);
      } else {
        // Si c'est une URL absolue, ouvrir dans un nouvel onglet
        window.open(notification.url, '_blank');
      }
    }
  };

  const goBack = () => {
    navigate("/notifications");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      full: date.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
      relative: getRelativeTime(date)
    };
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "À l'instant";
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 2592000) return `Il y a ${Math.floor(diffInSeconds / 86400)} j`;
    
    return date.toLocaleDateString("fr-FR");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 space-y-3 sm:space-y-4 md:space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Skeleton className="h-8 w-64" />
          </div>
          
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row sm:justify-between pt-6 gap-2 sm:gap-0">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-40" />
            </CardFooter>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!notification) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 space-y-3 sm:space-y-4 md:space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Détails de la notification</h1>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-10">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                <h3 className="text-lg font-medium mb-2">Notification non trouvée</h3>
                <p className="text-muted-foreground">
                  La notification que vous recherchez n'existe pas ou a été supprimée.
                </p>
                <Button onClick={goBack} className="mt-4">
                  Retour aux notifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const dateInfo = formatDate(notification.date_creation);

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-3 sm:space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">Détails de la notification</h1>
            <p className="text-muted-foreground">Informations complètes sur cette notification</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-muted">
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-xl">{notification.titre}</CardTitle>
                  <Badge variant={getTypeBadgeVariant(notification.type)}>
                    {getTypeName(notification.type)}
                  </Badge>
                  {!notification.lu && (
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      Non lu
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span title={dateInfo.full}>{dateInfo.relative}</span>
                  </div>
                  
                  {notification.expediteur && (
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>{notification.expediteur}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    {notification.lu ? (
                      <>
                        <Eye className="h-4 w-4" />
                        <span>Lu</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4" />
                        <span>Non lu</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-base leading-relaxed whitespace-pre-line">
                  {notification.message}
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row justify-between gap-4 pt-6">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Supprimer
              </Button>
              
              {!notification.lu && (
                <Button 
                  variant="outline" 
                  onClick={() => markAsRead(notification.id)}
                  disabled={markingAsRead}
                >
                  {markingAsRead ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Marquer comme lu
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              {notification.url && (
                <Button onClick={navigateToRelated} className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Voir l'élément associé
                </Button>
              )}
              <Button variant="outline" onClick={goBack}>
                Retour aux notifications
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer cette notification ? Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Annuler
              </Button>
              <Button 
                variant="destructive" 
                onClick={deleteNotification}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default NotificationDetails;
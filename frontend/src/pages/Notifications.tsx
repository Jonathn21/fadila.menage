// components/Notifications.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  Bell, 
  Mail, 
  MessageCircle, 
  Trash2, 
  Eye, 
  CheckCircle,
  RefreshCw,
  Search,
  AlertCircle,
  WifiOff,
  Calendar,
  Pencil,
  TriangleAlert,
  Cog,
  Play,
  Inbox,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle as XCircleIcon,
  Edit,
  RotateCcw,
  Filter,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// 🔥 MAPPING DES ICÔNES REACT
const NOTIFICATION_ICONS: { [key: string]: React.ComponentType<any> } = {
  // Icônes du service de notification Django
  'CalendarIcon': Calendar,
  'EditIcon': Edit,
  'PencilIcon': Pencil,
  'XCircleIcon': XCircleIcon,
  'CheckCircleIcon': CheckCircle2,
  'BellIcon': Bell,
  'InboxIcon': Inbox,
  'ClockIcon': Clock,
  'ShieldCheckIcon': ShieldCheck,
  'CogIcon': Cog,
  'PlayIcon': Play,
  'RefreshIcon': RotateCcw,
  'TrashIcon': Trash2,
  
  // Fallbacks par type
  'alert': AlertCircle,
  'message': MessageCircle,
  'email': Mail,
  'success': CheckCircle2,
  'error': XCircleIcon,
  'warning': TriangleAlert,
  'default': Bell
};

// 🔥 COMPOSANT DE PAGINATION
const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  itemsPerPage,
  totalItems 
}: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
      <div className="text-sm text-muted-foreground">
        Affichage de {startItem} à {endItem} sur {totalItems} notification{totalItems !== 1 ? 's' : ''}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {/* Pages visibles */}
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }

          return (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              className="w-10 h-10 p-0"
            >
              {pageNum}
            </Button>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// 🔥 COMPOSANT OPTIMISÉ POUR LES ITEMS DE NOTIFICATION
const NotificationItem = React.memo(({ 
  notification, 
  isConnected,
  onMarkAsRead,
  onViewDetails,
  onDelete,
  getNotificationIcon,
}: { 
  notification: Notification;
  isConnected: boolean;
  onMarkAsRead: (id: string | number) => void;
  onViewDetails: (id: string | number) => void;
  onDelete: (id: string | number) => void;
  getNotificationIcon: (type: string, customIcon?: string | null) => JSX.Element;
  getNotificationBadge: (type: string) => JSX.Element;
}) => {
  const isNewNotification = useMemo(() => {
    return isConnected && Date.now() - new Date(notification.date_creation).getTime() < 60000;
  }, [notification.date_creation, isConnected]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return (
        <>
          <div className="text-sm font-medium">Aujourd'hui</div>
          <div className="text-xs text-muted-foreground">
            {date.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit"
            })}
          </div>
        </>
      );
    }
    
    return (
      <>
        <div className="text-sm font-medium">
          {date.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
          })}
        </div>
        <div className="text-xs text-muted-foreground">
          {date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit"
          })}
        </div>
      </>
    );
  }, []);

  return (
    <>
      {/* Version Desktop */}
      <div className="hidden md:flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
        {/* Indicateur non lu */}
        <div className="flex justify-center w-4">
          {!notification.lu && <div className="h-2 w-2 rounded-full bg-blue-500"></div>}
        </div>
        
        {/* Icône */}
        <div className="flex justify-center">
          {getNotificationIcon(notification.type, notification.icone)}
        </div>
        
        {/* Contenu */}
        <div className="flex-1 space-y-1 min-w-0">
          <div className="font-medium flex items-center gap-2 flex-wrap">
            <span className="truncate">{notification.titre}</span>
           
          </div>
          <div className="text-sm text-muted-foreground line-clamp-2">
            {notification.message}
          </div>
        </div>
        
        {/* Date */}
        <div className="text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
          {formatDate(notification.date_creation)}
        </div>
        
        {/* Actions */}
        <div className="flex gap-1 justify-end flex-shrink-0">
          {!notification.lu && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              title="Marquer comme lu"
              className="h-8 w-8 p-0"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(notification.id);
            }}
            title="Voir les détails"
            className="h-8 w-8 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Version Mobile */}
      <div className="md:hidden p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
        <div className="space-y-3">
          {/* En-tête avec statut et date */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              {!notification.lu && <div className="h-2 w-2 rounded-full bg-blue-500"></div>}
              {getNotificationIcon(notification.type, notification.icone)}
            </div>
            <div className="text-right text-sm">
              {formatDate(notification.date_creation)}
            </div>
          </div>

          {/* Titre et message */}
          <div className="space-y-2">
            <div className="font-medium flex items-center gap-2 flex-wrap">
              <span>{notification.titre}</span>
             
            </div>
            <div className="text-sm text-muted-foreground">
              {notification.message}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            {!notification.lu && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                className="flex items-center gap-1"
              >
                <CheckCircle className="h-4 w-4" />
                Lu
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(notification.id);
              }}
              className="flex items-center gap-1"
            >
              <Eye className="h-4 w-4" />
              Détails
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex items-center gap-1 text-destructive border-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>
      </div>
    </>
  );
});

NotificationItem.displayName = 'NotificationItem';

const Notifications: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterUnread, setFilterUnread] = useState<boolean>(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  
  // 🔥 UTILISATION DES HOOKS AVEC MÉMOISATION
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchAllNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    addNotification,
    clearError
  } = useNotifications();

  // 🔥 CALLBACK OPTIMISÉ POUR LES NOUVELLES NOTIFICATIONS
  const handleNewNotification = useCallback((newNotification: any) => {
    console.log('🆕 Nouvelle notification reçue:', newNotification);
    
    if (newNotification.type === 'notification') {
      const notificationData = newNotification.notification;
      const formattedNotification: Notification = {
        ...notificationData,
        id: notificationData.id.toString()
      };
      
      addNotification(formattedNotification);
      
      if (!formattedNotification.lu) {
        toast({
          title: formattedNotification.titre,
          description: formattedNotification.message,
          duration: 3000,
        });
      }
    } else if (newNotification.type === 'connection_established') {
      console.log('✅ Connexion WebSocket établie');
    } else if (newNotification.type === 'existing_notification') {
      const notificationData = newNotification.notification;
      const formattedNotification: Notification = {
        ...notificationData,
        id: notificationData.id.toString()
      };
      addNotification(formattedNotification);
    }
  }, [addNotification, toast]);

  // 🔥 INITIALISATION WEBSOCKET
  const { isConnected, disconnect, reconnectAttempts } = useWebSocket(handleNewNotification);

  useEffect(() => {
    const loadNotifications = async () => {
      if (isInitialized) return;
      
      try {
        await fetchAllNotifications();
        setIsInitialized(true);
      } catch (error) {
        console.error("❌ Erreur chargement notifications:", error);
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger les notifications",
          variant: "destructive",
        });
      }
    };

    loadNotifications();
  }, [fetchAllNotifications, toast, isInitialized]);

  // 🔥 NETTOYAGE
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // 🔥 EFFACER LES ERREURS
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [error, clearError]);

  // 🔥 FILTRAGE OPTIMISÉ DES NOTIFICATIONS
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    if (selectedType !== "all") {
      filtered = filtered.filter(n => n.type === selectedType);
    }

    if (filterUnread) {
      filtered = filtered.filter(n => !n.lu);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(n => 
        n.titre.toLowerCase().includes(term) ||
        n.message.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [notifications, selectedType, filterUnread, searchTerm]);

  // 🔥 PAGINATION DES NOTIFICATIONS FILTRÉES
  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredNotifications.slice(startIndex, endIndex);
  }, [filteredNotifications, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);

  // 🔥 RÉINITIALISER LA PAGE QUAND LES FILTRES CHANGENT
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterUnread, selectedType]);

  // 🔥 FONCTION MÉMOISÉE POUR OBTENIR L'ICÔNE
  const getNotificationIcon = useCallback((type: string, customIcon?: string | null) => {
    if (customIcon && NOTIFICATION_ICONS[customIcon]) {
      const IconComponent = NOTIFICATION_ICONS[customIcon];
      return <IconComponent className="h-4 w-4 text-blue-500" />;
    }
    
    switch (type) {
      case "alert":
        return <TriangleAlert className="h-4 w-4 text-amber-500" />;
      case "message":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case "email":
        return <Mail className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  }, []);

  // 🔥 FONCTION MÉMOISÉE POUR LE BADGE DE TYPE
  const getNotificationBadge = useCallback((type: string) => {
    switch (type) {
      case "alert":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Alerte</Badge>;
      case "message":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Message</Badge>;
      case "email":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Email</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">Info</Badge>;
    }
  }, []);

  // 🔥 HANDLERS MÉMOISÉS POUR LES ACTIONS
  const handleMarkAsRead = useCallback(async (id: string | number) => {
    try {
      await markAsRead(id);
      toast({
        title: "Notification marquée comme lue",
        duration: 2000,
      });
    } catch (error) {
      console.error("❌ Erreur marquage comme lu:", error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer comme lu",
        variant: "destructive",
      });
    }
  }, [markAsRead, toast]);

  const handleMarkAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return;
    
    try {
      await markAllAsRead();
      toast({
        title: "Toutes les notifications marquées comme lues",
        description: `${unreadCount} notification(s) marquée(s) comme lue(s)`,
      });
    } catch (error) {
      console.error("❌ Erreur marquage toutes comme lues:", error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer toutes comme lues",
        variant: "destructive",
      });
    }
  }, [markAllAsRead, unreadCount, toast]);

  const handleDeleteNotification = useCallback(async (id: string | number) => {
    try {
      await deleteNotification(id);
      toast({
        title: "Notification supprimée",
        duration: 2000,
      });
    } catch (error) {
      console.error("❌ Erreur suppression notification:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la notification",
        variant: "destructive",
      });
    }
  }, [deleteNotification, toast]);

  const handleDeleteAllNotifications = useCallback(async () => {
    if (notifications.length === 0) return;
    
    try {
      await deleteAllNotifications();
      toast({
        title: "Toutes les notifications supprimées",
        description: `${notifications.length} notification(s) supprimée(s)`,
      });
    } catch (error) {
      console.error("❌ Erreur suppression toutes:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer toutes les notifications",
        variant: "destructive",
      });
    }
  }, [deleteAllNotifications, notifications.length, toast]);

  const handleViewDetails = useCallback((id: string | number) => {
    navigate(`/notifications/${id}`);
  }, [navigate]);

  const refreshNotifications = useCallback(async () => {
    try {
      await fetchAllNotifications();
      toast({
        title: "Notifications actualisées",
        duration: 2000,
      });
    } catch (error) {
      console.error("❌ Erreur actualisation:", error);
      toast({
        title: "Erreur d'actualisation",
        description: "Impossible de rafraîchir les notifications",
        variant: "destructive",
      });
    }
  }, [fetchAllNotifications, toast]);

  const handleResetFilters = useCallback(() => {
    setSearchTerm("");
    setFilterUnread(false);
    setSelectedType("all");
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    // Scroll vers le haut quand on change de page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // 🔥 AFFICHAGE ERREUR
  if (error && !isInitialized) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="text-center py-10">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">Erreur de chargement</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={refreshNotifications}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* En-tête de la page */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
              <CardDescription className="text-muted-foreground">
                Gérez et consultez toutes vos notifications
                {unreadCount > 0 && (
                  <span className="ml-2">
                    <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                      {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                    </Badge>
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          
          {/* Actions principales */}
          <div className="flex flex-col xs:flex-row gap-2">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={refreshNotifications} 
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualiser</span>
              </Button>
              {unreadCount > 0 && (
                <Button 
                  variant="outline" 
                  onClick={handleMarkAllAsRead} 
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Tout marquer comme lu</span>
                </Button>
              )}
              {notifications.length > 0 && (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAllNotifications} 
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Tout supprimer</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Carte des filtres */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-semibold">Filtres et recherche</h3>
                <p className="text-sm text-muted-foreground">
                  Affinez votre recherche selon différents critères
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleResetFilters}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* Barre de recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par titre ou message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Filtres responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Filtre par type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type de notification</label>
                  <Select
                    value={selectedType}
                    onValueChange={setSelectedType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      <SelectItem value="alert">Alertes</SelectItem>
                      <SelectItem value="message">Messages</SelectItem>
                      <SelectItem value="email">Emails</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Switch non lues seulement */}
                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="unread-only"
                    checked={filterUnread}
                    onCheckedChange={setFilterUnread}
                    disabled={loading}
                  />
                  <Label htmlFor="unread-only" className="text-sm cursor-pointer">
                    Non lues seulement
                  </Label>
                </div>

                {/* Statut connexion */}
                <div className="flex items-center space-x-2 pt-8">
                  <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <Label className="text-sm">
                    {isConnected ? 'Connecté' : 'Déconnecté'}
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Carte des notifications */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Mes notifications</CardTitle>
                <CardDescription>
                  {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''} 
                  {searchTerm && ` contenant "${searchTerm}"`}
                  {filterUnread && ' non lues'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {loading && notifications.length === 0 ? (
              // Squelettes de chargement
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              // État vide
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-1">Aucune notification</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || filterUnread || selectedType !== "all" 
                    ? "Aucune notification ne correspond à vos filtres" 
                    : "Vous n'avez aucune notification pour le moment"
                  }
                </p>
                {(searchTerm || filterUnread || selectedType !== "all") && (
                  <Button variant="outline" onClick={handleResetFilters}>
                    Réinitialiser les filtres
                  </Button>
                )}
                {!isConnected && (
                  <p className="text-sm text-amber-600 mt-4 flex items-center justify-center gap-1">
                    <WifiOff className="h-4 w-4" />
                    Connexion interrompue - les nouvelles notifications peuvent ne pas apparaître
                  </p>
                )}
              </div>
            ) : (
              // Liste des notifications avec pagination
              <>
                <div className="space-y-3">
                  {paginatedNotifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      onClick={() => {
                        if (!notification.lu) {
                          handleMarkAsRead(notification.id);
                        }
                        handleViewDetails(notification.id);
                      }}
                      className="cursor-pointer"
                    >
                      <NotificationItem
                        notification={notification}
                        isConnected={isConnected}
                        onMarkAsRead={handleMarkAsRead}
                        onViewDetails={handleViewDetails}
                        onDelete={handleDeleteNotification}
                        getNotificationIcon={getNotificationIcon}
                        getNotificationBadge={getNotificationBadge}
                      />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredNotifications.length}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
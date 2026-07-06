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
  TriangleAlert,        // ExclamationTriangleIcon
  Cog,
  Play,
  Inbox,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle as XCircleIcon,
  Edit,
  RotateCcw,            // RefreshIcon
  Filter,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  
  // ✅ AJOUTS NÉCESSAIRES :
  Info,                 // Pour InformationCircleIcon
  FileText,             // Pour DocumentTextIcon
  FileCheck,            // Pour DocumentCheckIcon
  GraduationCap,        // Pour AcademicCapIcon
  MessageSquare,        // Alternative pour ChatBubbleLeftRightIcon
  
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// 🔥 MAPPING DES ICÔNES REACT
// 🔥 MAPPING DES ICÔNES REACT - VERSION COMPLÈTE
const NOTIFICATION_ICONS: { [key: string]: React.ComponentType<any> } = {
  // Icônes Heroicons → Lucide-react
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
  
  // ✅ AJOUTS MANQUANTS
  'InformationCircleIcon': Info,
  'DocumentTextIcon': FileText,
  'DocumentCheckIcon': FileCheck,
  'AcademicCapIcon': GraduationCap,
  'ChatBubbleLeftRightIcon': MessageSquare,
  'ExclamationTriangleIcon': TriangleAlert,
  
  // Fallbacks par type
  'alert': AlertCircle,
  'message': MessageCircle,
  'email': Mail,
  'success': CheckCircle2,
  'error': XCircleIcon,
  'warning': TriangleAlert,
  'default': Bell
};

// 🔥 COMPOSANT DE PAGINATION RESPONSIVE
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
      <div className="text-sm md:text-base text-muted-foreground">
        Affichage de {startItem} à {endItem} sur {totalItems} notification{totalItems !== 1 ? 's' : ''}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 sm:h-10 sm:w-10 p-0"
        >
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        
        {/* Pages visibles - version mobile réduite */}
        <div className="hidden sm:flex items-center gap-2">
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
                className="h-8 w-8 p-0 text-xs sm:h-10 sm:w-10 sm:text-sm"
              >
                {pageNum}
              </Button>
            );
          })}
        </div>
        
        {/* Version mobile simplifiée */}
        <div className="sm:hidden flex items-center">
          <span className="text-sm px-2">
            Page {currentPage} sur {totalPages}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 sm:h-10 sm:w-10 p-0"
        >
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  );
};

// 🔥 COMPOSANT RESPONSIVE POUR LES ITEMS DE NOTIFICATION
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
}) => {
  const isNewNotification = useMemo(() => {
    return isConnected && Date.now() - new Date(notification.date_creation).getTime() < 60000;
  }, [notification.date_creation, isConnected]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / (3600000 * 24));

    // Pour mobile, afficher format court
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      if (diffMinutes < 1) return "À l'instant";
      if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      if (diffDays === 1) return "Hier";
      if (diffDays < 7) return `Il y a ${diffDays} j`;
    }

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
    
    if (diffDays === 1) {
      return (
        <>
          <div className="text-sm font-medium">Hier</div>
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

  // 🔥 HANDLERS POUR MOBILE
  const handleMarkAsReadMobile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead(notification.id);
  }, [notification.id, onMarkAsRead]);

  const handleViewDetailsMobile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails(notification.id);
  }, [notification.id, onViewDetails]);

  const handleDeleteMobile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  }, [notification.id, onDelete]);

  return (
    <>
      {/* Version Desktop */}
      <div className="hidden lg:flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
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
          <div className="font-medium flex items-center gap-2 flex-wrap text-base">
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
              onClick={handleMarkAsReadMobile}
              title="Marquer comme lu"
              className="h-8 w-8 p-0"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleViewDetailsMobile}
            title="Voir les détails"
            className="h-8 w-8 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDeleteMobile}
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Version Tablette */}
      <div className="hidden md:flex lg:hidden p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
        <div className="flex items-start gap-3 w-full">
          {/* Icône et statut */}
          <div className="flex flex-col items-center gap-2">
            {getNotificationIcon(notification.type, notification.icone)}
            {!notification.lu && <div className="h-2 w-2 rounded-full bg-blue-500"></div>}
          </div>
          
          {/* Contenu principal */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-2 sm:gap-0">
              <div className="font-medium text-base truncate mr-2">
                {notification.titre}
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                {formatDate(notification.date_creation)}
              </div>
            </div>
            <div className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {notification.message}
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              {!notification.lu && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMarkAsReadMobile}
                  className="text-xs h-7"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Marquer lu
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleViewDetailsMobile}
                className="text-xs h-7"
              >
                <Eye className="h-3 w-3 mr-1" />
                Détails
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 text-destructive border-destructive hover:bg-destructive/10"
                onClick={handleDeleteMobile}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Version Mobile */}
      <div className="md:hidden p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer active:bg-muted">
        <div className="space-y-3">
          {/* En-tête avec statut et date */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
            <div className="flex items-center gap-2">
              {!notification.lu && <div className="h-2 w-2 rounded-full bg-blue-500"></div>}
              {getNotificationIcon(notification.type, notification.icone)}
              <span className="font-medium text-sm truncate flex-1">
                {notification.titre}
              </span>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {formatDate(notification.date_creation)}
            </div>
          </div>

          {/* Message */}
          <div className="text-xs text-muted-foreground line-clamp-3">
            {notification.message}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-1 pt-2 border-t">
            {!notification.lu && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleMarkAsReadMobile}
                title="Marquer comme lu"
                className="h-6 w-6 p-0"
              >
                <CheckCircle className="h-3 w-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleViewDetailsMobile}
              title="Voir les détails"
              className="h-6 w-6 p-0"
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDeleteMobile}
              title="Supprimer"
            >
              <Trash2 className="h-3 w-3" />
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
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
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
      return <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />;
    }
    
    switch (type) {
      case "alert":
        return <TriangleAlert className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />;
      case "message":
        return <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />;
      case "email":
        return <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />;
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
    setShowFilters(false);
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
        <div className="container mx-auto py-4 px-3 sm:py-6 sm:px-4">
          <div className="text-center py-4 sm:py-6 md:py-8 sm:py-10">
            <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-destructive mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-medium mb-2">Erreur de chargement</h3>
            <p className="text-muted-foreground mb-4 text-sm sm:text-base">{error}</p>
            <Button onClick={refreshNotifications} size="sm" className="sm:text-base">
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 py-4 sm:py-6">
        {/* En-tête de la page - RESPONSIVE */}
        <div className="relative overflow-hidden rounded-xl border border-border/80 surface-brushed shadow-card px-4 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-col gap-1 sm:gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Notifications</h1>
              {unreadCount > 0 && (
                <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs sm:text-sm">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              Gérez et consultez toutes vos notifications
            </p>
          </div>
          
          {/* Actions principales - RESPONSIVE */}
          <div className="flex flex-col xs:flex-row gap-2">
            <div className="flex gap-2">
              {/* Bouton Filtres pour mobile */}
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="lg:hidden flex items-center gap-2"
                  >
                    <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Filtres</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <div className="mt-6 space-y-3 sm:space-y-4 md:space-y-6">
                    <div>
                      <h3 className="font-semibold mb-4 text-sm">Filtres et recherche</h3>
                      
                      {/* Barre de recherche */}
                      <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="text-xs sm:text-sm  focus:border-green-400 focus:ring-green-400 pl-10"
                        />
                      </div>
                      
                      {/* Filtre par type */}
                      <div className="space-y-2 mb-6">
                        <label className="text-sm font-medium">Type de notification</label>
                        <Select
                          value={selectedType}
                          onValueChange={setSelectedType}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Tous les types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="text-sm">Tous les types</SelectItem>
                            <SelectItem value="alert" className="text-sm">Alertes</SelectItem>
                            <SelectItem value="message" className="text-sm">Messages</SelectItem>
                            <SelectItem value="email" className="text-sm">Emails</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Switch non lues seulement */}
                      <div className="flex items-center space-x-2 mb-6">
                        <Switch
                          id="unread-only-mobile"
                          checked={filterUnread}
                          onCheckedChange={setFilterUnread}
                          disabled={loading}
                        />
                        <Label htmlFor="unread-only-mobile" className="text-sm cursor-pointer">
                          Non lues seulement
                        </Label>
                      </div>

                     

                      <Button 
                        variant="outline" 
                        onClick={handleResetFilters}
                        className="w-full text-sm"
                      >
                        Réinitialiser les filtres
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Button 
                variant="outline" 
                onClick={refreshNotifications} 
                disabled={loading}
                className="flex items-center gap-2 text-xs sm:text-sm"
                size="sm"
              >
                <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualiser</span>
              </Button>
              
              {unreadCount > 0 && (
                <Button 
                  variant="outline" 
                  onClick={handleMarkAllAsRead} 
                  disabled={loading}
                  className="flex items-center gap-2 text-xs sm:text-sm"
                  size="sm"
                >
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Tout marquer lu</span>
                </Button>
              )}
              
              {notifications.length > 0 && (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAllNotifications} 
                  disabled={loading}
                  className="flex items-center gap-2 text-xs sm:text-sm"
                  size="sm"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Tout supprimer</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Carte des filtres - Version Desktop */}
        <Card className="hidden lg:block border ">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-semibold text-sm">Filtres et recherche</h3>
                <p className="text-sm text-muted-foreground">
                  Affinez votre recherche selon différents critères
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleResetFilters}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
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
                  className="text-xs sm:text-sm  focus:border-green-400 focus:ring-green-400 pl-10"
                />
              </div>
              
              {/* Filtres responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Filtre par type */}
                <div className="space-y-2">
                  <label className="font-medium text-xs sm:text-sm  focus:border-green-400 focus:ring-green-400">Type de notification</label>
                  <Select
                    value={selectedType}
                    onValueChange={setSelectedType}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Tous les types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-sm">Tous les types</SelectItem>
                      <SelectItem value="alert" className="text-sm">Alertes</SelectItem>
                      <SelectItem value="message" className="text-sm">Messages</SelectItem>
                      <SelectItem value="email" className="text-sm">Emails</SelectItem>
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

               
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Carte des notifications */}
        <Card className="border ">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-semibold">Mes notifications</h3>
                <p className="text-sm text-muted-foreground">
                  {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''} 
                  {searchTerm && ` contenant "${searchTerm}"`}
                  {filterUnread && ' non lues'}
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="px-2 sm:px-6">
            {loading && notifications.length === 0 ? (
              // Squelettes de chargement RESPONSIVE
              <div className="space-y-3 sm:space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 border rounded-lg">
                    <Skeleton className="h-3 w-3 sm:h-4 sm:w-4 rounded-full" />
                    <Skeleton className="h-5 w-5 sm:h-6 sm:w-6 rounded-full" />
                    <div className="space-y-1 sm:space-y-2 flex-1">
                      <Skeleton className="h-3 sm:h-4 w-1/4" />
                      <Skeleton className="h-2 sm:h-3 w-3/4" />
                    </div>
                    <Skeleton className="h-6 sm:h-8 w-16 sm:w-20" />
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              // État vide
              <div className="text-center py-4 sm:py-6 md:py-8 sm:py-12">
                <Bell className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <h3 className="font-medium text-sm mb-1">Aucune notification</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  {searchTerm || filterUnread || selectedType !== "all" 
                    ? "Aucune notification ne correspond à vos filtres" 
                    : "Vous n'avez aucune notification pour le moment"
                  }
                </p>
                {(searchTerm || filterUnread || selectedType !== "all") && (
                  <Button variant="outline" onClick={handleResetFilters} size="sm" className="text-sm">
                    Réinitialiser les filtres
                  </Button>
                )}
                {!isConnected && (
                  <p className="text-xs sm:text-sm text-amber-600 mt-4 flex items-center justify-center gap-1">
                    <WifiOff className="h-3 w-3 sm:h-4 sm:w-4" />
                    Connexion interrompue - les nouvelles notifications peuvent ne pas apparaître
                  </p>
                )}
              </div>
            ) : (
              // Liste des notifications avec pagination
              <>
                <div className="space-y-2 sm:space-y-3">
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

        {/* Barre d'actions flottante pour mobile */}
        <div className="lg:hidden fixed bottom-4 right-4 z-50">
          <div className="flex flex-col items-end gap-2">
            {notifications.length > 0 && unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                size="sm"
                className="rounded-full shadow-lg h-10 w-10 p-0 bg-blue-500 hover:bg-blue-600"
                title="Tout marquer comme lu"
              >
                <CheckCircle className="h-5 w-5" />
              </Button>
            )}
            <Button
              onClick={refreshNotifications}
              size="sm"
              className="rounded-full shadow-lg h-10 w-10 p-0"
              title="Actualiser"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
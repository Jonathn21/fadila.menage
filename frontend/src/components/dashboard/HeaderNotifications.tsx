// components/HeaderNotifications.tsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  ArrowRight
  
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useNotifications, Notification } from "@/hooks/useNotifications";

// 🔥 MAPPING DES ICÔNES REACT
const NOTIFICATION_ICONS: { [key: string]: React.ComponentType<any> } = {
  // Icônes du service de notification
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

// 🔥 COMPOSANT OPTIMISÉ POUR LES ITEMS DE NOTIFICATION
const NotificationItem = React.memo(({ 
  notification, 
  isConnected,
  onClick,
  getNotificationIcon,
  getRelativeTime
}: { 
  notification: Notification;
  isConnected: boolean;
  onClick: (notification: Notification) => void;
  getNotificationIcon: (type: string, customIcon?: string | null) => JSX.Element;
  getRelativeTime: (dateString: string) => string;
}) => {
  const isNewNotification = useMemo(() => {
    return isConnected && Date.now() - new Date(notification.date_creation).getTime() < 60000;
  }, [notification.date_creation, isConnected]);

  return (
    <DropdownMenuItem 
      className={`p-2 sm:p-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
        !notification.lu ? "hover:bg-blue-50/50" : "hover:bg-gray-50/50"
      }`}
      onClick={() => onClick(notification)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick(notification);
        }
      }}
    >
      <div className="flex items-start gap-2 sm:gap-3 w-full">
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type, notification.icone)}
        </div>
        
        <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
          <div className="flex items-start justify-between">
            <p className={`text-xs sm:text-sm font-medium line-clamp-1 ${
              !notification.lu ? "text-gray-900 font-semibold" : "text-gray-700"
            }`}>
              {notification.titre}
            </p>
            {!notification.lu && (
              <div 
                className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-blue-500 flex-shrink-0 ml-1 sm:ml-2 mt-1 sm:mt-1.5 animate-pulse"
                title="Non lue"
              />
            )}
          </div>
          
          <p className="text-[10px] sm:text-xs text-gray-600 line-clamp-2">
            {notification.message}
          </p>
          
          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-gray-500">
            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span>{getRelativeTime(notification.date_creation)}</span>
            {isNewNotification && isConnected && (
              <Badge variant="outline" className="bg-green-50 text-green-700  text-[10px] sm:text-xs">
                Nouveau
              </Badge>
            )}
          </div>
        </div>
      </div>
    </DropdownMenuItem>
  );
});

NotificationItem.displayName = 'NotificationItem';

const HeaderNotifications: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  // ✅ CORRECTION : Utiliser useRef pour éviter les re-renders
  const notificationsRef = useRef<HTMLDivElement>(null);
  
  // 🔥 HOOKS PERSONNALISÉS AVEC TYPES
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchRecentNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    clearError
  } = useNotifications();

  // ✅ CORRECTION : Callback stable avec useCallback et typage
  const handleNewNotification = useCallback((newNotification: any) => {
    console.log('🆕 Nouvelle notification reçue dans le header:', newNotification);
    
    // Gérer différents types de messages WebSocket
    if (newNotification.type === 'notification') {
      const notificationData = newNotification.notification;
      const formattedNotification: Notification = {
        ...notificationData,
        id: notificationData.id.toString()
      };

      addNotification(formattedNotification);

      // Signaler aux autres composants (sidebar) qu'un événement métier vient
      // d'arriver : ils rafraîchissent leurs compteurs sans polling agressif.
      window.dispatchEvent(new CustomEvent('app:activity'));
      
      // 🔥 TOAST POUR NOUVELLES NOTIFICATIONS
      if (!formattedNotification.lu) {
        toast({
          title: formattedNotification.titre,
          description: formattedNotification.message,
          duration: 4000,
        });
      }
    } else if (newNotification.type === 'connection_established') {
      console.log('✅ Connexion WebSocket établie pour le header');
    } else if (newNotification.type === 'existing_notification') {
      const notificationData = newNotification.notification;
      const formattedNotification: Notification = {
        ...notificationData,
        id: notificationData.id.toString()
      };
      addNotification(formattedNotification);
    }
  }, [addNotification, toast]);

  // ✅ CORRECTION : Initialisation WebSocket avec gestion du statut
  const { isConnected, disconnect, reconnectAttempts } = useWebSocket(handleNewNotification);
  
  // ✅ CORRECTION : Effacer les erreurs quand le dropdown s'ouvre
  useEffect(() => {
    if (open && error) {
      clearError();
    }
  }, [open, error, clearError]);

  // ✅ CORRECTION : Charger initialement seulement une fois
  useEffect(() => {
    if (!isInitialized) {
      fetchRecentNotifications(5).catch(error => {
        console.error("❌ Erreur chargement notifications header:", error);
      }).finally(() => {
        setIsInitialized(true);
      });
    }
  }, [isInitialized, fetchRecentNotifications]);

  // ✅ CORRECTION : Charger les notifications détaillées quand le dropdown est ouvert
  useEffect(() => {
    if (open) {
      fetchRecentNotifications(10).catch(error => {
        console.error("❌ Erreur chargement notifications détaillées:", error);
      });
    }
  }, [open, fetchRecentNotifications]);

  // ✅ CORRECTION : Nettoyage WebSocket
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // 🔥 GESTION CLIC NOTIFICATION OPTIMISÉE
  const handleNotificationClick = useCallback(async (notification: Notification) => {
    try {
      // Marquer comme lu si ce n'est pas déjà fait
      if (!notification.lu) {
        await markAsRead(notification.id);
      }

      if (notification.url) {
        navigate(notification.url);
      } else {
        navigate(`/notifications/${notification.id}`);
      }
      setOpen(false);
    } catch (error) {
      console.error("❌ Erreur lors du clic sur la notification", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir la notification",
        variant: "destructive",
      });
    }
  }, [markAsRead, navigate, toast]);

  // 🔥 MARQUER TOUTES COMME LUES OPTIMISÉ
  const handleMarkAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return;
    
    try {
      await markAllAsRead();
      toast({
        title: "Notifications marquées comme lues",
        description: `${unreadCount} notification(s) marquée(s) comme lue(s)`,
        duration: 3000,
      });
    } catch (error) {
      console.error("❌ Erreur lors du marquage comme lu", error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer toutes les notifications comme lues",
        variant: "destructive",
      });
    }
  }, [markAllAsRead, unreadCount, toast]);

  // 🔥 OBTENIR L'ICÔNE DE NOTIFICATION AVEC SUPPORT DES ICÔNES REACT
  const getNotificationIcon = useCallback((type: string, customIcon?: string | null) => {
    // Priorité à l'icône personnalisée du backend
    if (customIcon && NOTIFICATION_ICONS[customIcon]) {
      const IconComponent = NOTIFICATION_ICONS[customIcon];
      return <IconComponent className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />;
    }
    
    // Fallback par type de notification
    switch (type) {
      case "alert":
        return <TriangleAlert className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />;
      case "message":
        return <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />;
      case "email":
        return <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />;
      case "success":
        return <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />;
      case "error":
        return <XCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />;
      default:
        return <Bell className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />;
    }
  }, []);

  // 🔥 TEMPS RELATIF MÉMOISÉ
  const getRelativeTime = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "À l'instant";
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 2592000) return `Il y a ${Math.floor(diffInSeconds / 86400)} j`;
    
    return date.toLocaleDateString("fr-FR");
  }, []);

  // 🔥 ACTUALISER LES NOTIFICATIONS OPTIMISÉ
  const handleRefresh = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetchRecentNotifications(10);
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
  }, [fetchRecentNotifications, toast]);

  // 🔥 NOTIFICATIONS À AFFICHER (mémoïsé)
  const displayedNotifications = useMemo(() => {
    return notifications.slice(0, 10);
  }, [notifications]);

  // 🔥 SKELETONS DE CHARGEMENT
  const loadingSkeletons = useMemo(() => (
    <div className="space-y-1 sm:space-y-2 p-1 sm:p-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start space-x-2 sm:space-x-3 p-1.5 sm:p-2 rounded-lg">
          <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-gray-100" />
          <div className="space-y-1 sm:space-y-2 flex-1">
            <Skeleton className="h-3 sm:h-4 w-2/3 sm:w-3/4 bg-gray-100" />
            <Skeleton className="h-2.5 sm:h-3 w-full bg-gray-100" />
            <Skeleton className="h-2.5 sm:h-3 w-1/3 sm:w-1/2 bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  ), []);

  // 🔥 CONTENU DES NOTIFICATIONS (mémoïsé)
  const notificationsContent = useMemo(() => {
    if (loading && notifications.length === 0) {
      return loadingSkeletons;
    }

    if (error) {
      return (
        <div className="text-center py-4 sm:py-6 px-2 sm:px-4">
          <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-red-600 mb-1 sm:mb-2" />
          <p className="text-xs sm:text-sm text-gray-600">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-1 sm:mt-2 text-xs sm:text-sm border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300"
            onClick={handleRefresh}
          >
            Réessayer
          </Button>
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="text-center py-4 sm:py-6 px-2 sm:px-4">
          <Bell className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-gray-300 mb-1 sm:mb-2" />
          <p className="text-xs sm:text-sm text-gray-500">Aucune notification</p>
          {!isConnected && (
            <p className="text-[10px] sm:text-xs text-amber-600 mt-0.5 sm:mt-1 flex items-center justify-center gap-1">
              <WifiOff className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Connexion temps réel interrompue
            </p>
          )}
        </div>
      );
    }

    return displayedNotifications.map((notification) => (
      <NotificationItem
        key={notification.id}
        notification={notification}
        isConnected={isConnected}
        onClick={handleNotificationClick}
        getNotificationIcon={getNotificationIcon}
        getRelativeTime={getRelativeTime}
      />
    ));
  }, [
    loading,
    notifications,
    error,
    isConnected,
    displayedNotifications,
    loadingSkeletons,
    handleRefresh,
    handleNotificationClick,
    getNotificationIcon,
    getRelativeTime
  ]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative hover:bg-gray-100 transition-colors group h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10"
          disabled={loading}
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
          
          {/* Compteur de notifications non lues */}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] px-0.5 sm:px-1 flex items-center justify-center text-[10px] sm:text-xs animate-pulse bg-red-500 hover:bg-red-600"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-[280px] sm:w-[320px] md:w-[350px] lg:w-96 max-h-[70vh] sm:max-h-[80vh] overflow-hidden border-gray-200 bg-white shadow-lg"
      >
        <div className="flex items-center justify-between px-2 py-1 sm:px-2 sm:py-1.5 bg-gray-50/50">
          <DropdownMenuLabel className="text-sm sm:text-base font-semibold flex items-center gap-1 sm:gap-2 text-gray-900">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="outline" className="ml-1 sm:ml-2 text-[10px] sm:text-xs bg-green-50 text-green-700 ">
                {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
          </DropdownMenuLabel>
          
          <div className="flex items-center gap-0.5 sm:gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 sm:h-7 sm:w-7 hover:bg-gray-100 text-gray-600 hover:text-gray-800"
              onClick={handleRefresh}
              title="Actualiser"
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${loading ? 'animate-spin' : ''} text-gray-500`} />
            </Button>
            
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 sm:h-7 sm:w-7 hover:bg-gray-100 text-gray-600 hover:text-gray-800"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAllAsRead();
                }}
                title="Tout marquer comme lu"
                disabled={loading}
              >
                <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500" />
              </Button>
            )}
          </div>
        </div>
        
        <DropdownMenuSeparator className="bg-gray-200" />
        
        <div className="max-h-[250px] sm:max-h-[300px] overflow-y-auto" ref={notificationsRef}>
          {notificationsContent}
        </div>
        
        <DropdownMenuSeparator className="bg-gray-200" />
        
        <DropdownMenuItem asChild className="cursor-pointer hover:bg-gray-50">
          <Link 
            to="/notifications" 
            className="flex items-center justify-between w-full px-2 py-1.5 text-xs sm:text-sm font-medium hover:bg-gray-50 rounded-md text-gray-900 hover:text-gray-800"
            onClick={() => setOpen(false)}
          >
            <span>Voir toutes les notifications</span>
            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default HeaderNotifications;
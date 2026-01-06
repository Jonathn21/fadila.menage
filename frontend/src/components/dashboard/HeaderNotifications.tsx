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
  Wifi,
  WifiOff,
  Filter,
  Calendar,
  Pencil,
  XCircle,
  TriangleAlert,
  FileText,
  GraduationCap,
  Cog,
  Play,
  Inbox,
  Clock,
  ShieldCheck,
 
  CheckCircle2,
  XCircle as XCircleIcon,
  Edit,
  ArrowRight,
  User,
  Settings,
  Download,
  RotateCcw,
  PlusCircle
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
      className={`p-3 cursor-pointer border-b last:border-b-0 transition-colors ${
        !notification.lu ? " hover:bg-blue-100/50" : "hover:bg-muted/50"
      }`}
      onClick={() => onClick(notification)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick(notification);
        }
      }}
    >
      <div className="flex items-start gap-3 w-full">
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type, notification.icone)}
        </div>
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between">
            <p className={`text-sm font-medium line-clamp-1 ${
              !notification.lu ? "text-foreground font-semibold" : "text-muted-foreground"
            }`}>
              {notification.titre}
            </p>
            {!notification.lu && (
              <div 
                className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 ml-2 mt-1.5 animate-pulse"
                title="Non lue"
              />
            )}
          </div>
          
          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{getRelativeTime(notification.date_creation)}</span>
            {isNewNotification && isConnected && (
              <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
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
      return <IconComponent className="h-4 w-4 text-blue-500" />;
    }
    
    // Fallback par type de notification
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
    <div className="space-y-2 p-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start space-x-3 p-2 rounded-lg">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
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
        <div className="text-center py-6 px-4">
          <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={handleRefresh}
          >
            Réessayer
          </Button>
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="text-center py-6 px-4">
          <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Aucune notification</p>
          {!isConnected && (
            <p className="text-xs text-amber-600 mt-1 flex items-center justify-center gap-1">
              <WifiOff className="h-3 w-3" />
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
          className="relative hover:bg-muted/50 transition-colors group"
          disabled={loading}
        >
          <Bell className="h-5 w-5" />
          
          {/* Compteur de notifications non lues */}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-xs animate-pulse"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          
          {/* Indicateur de statut WebSocket */}
         
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-96 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="text-base font-semibold flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
            
          </DropdownMenuLabel>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              title="Actualiser"
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAllAsRead();
                }}
                title="Tout marquer comme lu"
                disabled={loading}
              >
                <CheckCircle className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <div className="max-h-[300px] overflow-y-auto" ref={notificationsRef}>
          {notificationsContent}
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link 
            to="/notifications" 
            className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium hover:bg-muted/50 rounded-md"
            onClick={() => setOpen(false)}
          >
            <span>Voir toutes les notifications</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default HeaderNotifications;
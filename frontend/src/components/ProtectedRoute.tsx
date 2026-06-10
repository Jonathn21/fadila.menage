import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { usePermissions, Permission } from "@/hooks/usePermissions";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Permission requise pour accéder à la route */
  permission: Permission;
  /** Où rediriger si l'accès est refusé (par défaut: tableau de bord) */
  redirectTo?: string;
}

/**
 * Garde de route basée sur les permissions.
 *
 * Le backend reste l'autorité (chaque endpoint vérifie les permissions),
 * mais cette garde évite d'afficher des pages d'administration aux comptes
 * qui n'y ont pas droit.
 */
const ProtectedRoute = ({ children, permission, redirectTo = "/accueil" }: ProtectedRouteProps) => {
  const { hasPermission, loading } = usePermissions();

  // Pas de token => l'utilisateur n'est pas connecté
  const isAuthenticated = !!localStorage.getItem("access");
  if (!isAuthenticated) {
    return <Navigate to="/connexion" replace />;
  }

  // En attente de la réponse de /me/
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasPermission(permission)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

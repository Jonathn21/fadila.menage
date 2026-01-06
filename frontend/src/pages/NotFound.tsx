import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg border-0">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 bg-destructive/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
              <div className="absolute -top-2 -right-2 bg-background rounded-full p-1 shadow-md">
                <span className="text-2xl font-bold text-destructive">404</span>
              </div>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">Page non trouvée</h1>
          
          <p className="text-muted-foreground mb-6">
            Oups ! La page que vous recherchez semble introuvable.
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4 mb-6 text-sm">
            <p className="font-medium mb-1">Route attemptée :</p>
            <code className="text-destructive break-all">{location.pathname}</code>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline" className="flex items-center gap-2">
              <Link to="..">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Link>
            </Button>
            <Button asChild className="flex items-center gap-2">
              <Link to="/">
                <Home className="h-4 w-4" />
                Accueil
              </Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            Si vous pensez qu'il s'agit d'une erreur, contactez le support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
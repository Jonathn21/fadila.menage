import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Award, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { AttestationRequest } from "@/components/TrackApplication/AttestationRequest";
import apiClient from "@/lib/apiClient";

const PublicAttestationRequest = () => {
  const [trackingId, setTrackingId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [verified, setVerified] = useState(false);
  const [stagiaireInfo, setStagiaireInfo] = useState<{
    nom: string;
    prenom: string;
    statut: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!trackingId.trim()) {
      toast({
        title: "Champ requis",
        description: "Veuillez saisir votre code de suivi",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setError(null);
    setVerified(false);
    setStagiaireInfo(null);

    try {
      const res = await apiClient.get(`suivi-demande/${trackingId.trim()}/`);
      const data = res.data.demande;

      // Vérifier que le stage existe et est terminé
      if (!data.stage) {
        setError("Aucun stage n'est associé à cette demande. La demande d'attestation n'est possible que pour les stages terminés.");
        return;
      }

      if (data.stage.statut_actuel !== "Terminé") {
        setError(`Votre stage est actuellement "${data.stage.statut_actuel}". La demande d'attestation n'est possible que lorsque le stage est terminé.`);
        return;
      }

      // Vérifier si une demande d'attestation existe déjà
      if (data.stage.demande_attestation) {
        setError("Une demande d'attestation a déjà été soumise pour ce stage.");
        return;
      }

      setStagiaireInfo({
        nom: data.stagiaire.nom,
        prenom: data.stagiaire.prenom,
        statut: data.stage.statut_actuel,
      });
      setVerified(true);
    } catch (e: any) {
      if (e.response?.status === 404) {
        setError("Code de suivi introuvable. Vérifiez votre code et réessayez.");
      } else {
        setError("Erreur lors de la vérification. Veuillez réessayer.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleRefresh = async () => {
    setVerified(false);
    setStagiaireInfo(null);
    setError(null);
    await handleSearch();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicHeader />

      <main className="flex-1 container mx-auto px-4 py-8 sm:py-12 max-w-2xl">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 mb-3 sm:mb-4">
            <Award className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Demande d'attestation de stage
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
            Soumettez votre demande d'attestation en fournissant votre code de suivi
          </p>
        </div>

        {/* Étape 1 : Saisie du code de suivi */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              Code de suivi
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Saisissez le code de suivi reçu lors de votre demande de stage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="tracking-id" className="sr-only">Code de suivi</Label>
                <Input
                  id="tracking-id"
                  placeholder="Ex: CEB-STG-XXXXXXXX"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="text-sm sm:text-base"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching || !trackingId.trim()}
                className="sm:w-auto"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Vérifier
                  </>
                )}
              </Button>
            </div>

            {/* Erreur */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Succès - info stagiaire */}
            {verified && stagiaireInfo && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <div className="text-sm text-green-700">
                  <span className="font-medium">{stagiaireInfo.prenom} {stagiaireInfo.nom}</span>
                  {" — "}
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-xs">
                    Stage {stagiaireInfo.statut.toLowerCase()}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Étape 2 : Formulaire d'attestation */}
        {verified && (
          <AttestationRequest
            trackingId={trackingId.trim()}
            onSearch={handleRefresh}
          />
        )}
      </main>

      <PublicFooter />
    </div>
  );
};

export default PublicAttestationRequest;

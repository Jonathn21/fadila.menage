import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "../ui/textarea";
import { AlertCircle, X, Loader2, AlertTriangle } from "lucide-react";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";

export function RefuseDialog({ 
  open, 
  onOpenChange, 
  motifRefus, 
  setMotifRefus, 
  onConfirm, 
  loading = false,
  studentName = "cette candidature"
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motifRefus: string;
  setMotifRefus: (val: string) => void;
  onConfirm: () => void;
  loading?: boolean;
  studentName?: string;
}) {
  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  const isMotifValid = motifRefus.trim().length >= 10;
  const caractèresRestants = 500 - motifRefus.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 bg-destructive/10 rounded-full mb-4 mx-auto">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center text-xl">
            Refuser la candidature
          </DialogTitle>
          <DialogDescription className="text-center">
            Vous êtes sur le point de refuser <span className="font-semibold">{studentName}</span>. 
            Veuillez indiquer un motif de refus constructif.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              Cette action est irréversible. Le motif sera communiqué à l'étudiant.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <Label htmlFor="motif-refus" className="text-sm font-medium">
                Motif de refus *
              </Label>
              <Badge 
                variant={caractèresRestants < 0 ? "destructive" : "outline"} 
                className="text-xs"
              >
                {caractèresRestants} caractères
              </Badge>
            </div>
            <Textarea
              id="motif-refus"
              value={motifRefus}
              onChange={(e) => setMotifRefus(e.target.value)}
              placeholder="Exemple : Le profil ne correspond pas aux compétences recherchées pour ce stage. Nous recherchons spécifiquement des compétences en développement frontend avec React..."
              className="min-h-[120px] resize-vertical"
              disabled={loading}
              maxLength={500}
            />
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs text-muted-foreground gap-2 sm:gap-0">
              <span>
                Minimum 10 caractères recommandés
                {!isMotifValid && motifRefus.length > 0 && (
                  <span className="text-destructive ml-1">(trop court)</span>
                )}
              </span>
              <span>{motifRefus.length}/500</span>
            </div>
          </div>

          {motifRefus.length > 0 && !isMotifValid && (
            <Alert variant="destructive" className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                Pour aider l'étudiant à progresser, veuillez fournir un motif plus détaillé 
                (au moins 10 caractères).
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={loading}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Annuler
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
            disabled={loading || !isMotifValid || motifRefus.trim().length === 0}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Refus en cours...
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                Confirmer le refus
              </>
            )}
          </Button>
        </DialogFooter>

        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          <p>💡 Conseil : Soyez constructif dans votre feedback pour aider l'étudiant à progresser.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
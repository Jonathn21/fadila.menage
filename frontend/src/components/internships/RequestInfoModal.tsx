// components/internships/RequestInfoModal.tsx
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail } from "lucide-react";
import apiClient from "@/lib/apiClient"; // ✅ Import ajouté

interface RequestInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  studentEmail: string;
  demandeId: number;
}

export const RequestInfoModal: React.FC<RequestInfoModalProps> = ({
  open,
  onOpenChange,
  studentName,
  studentEmail,
  demandeId,
}) => {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        title: "Message requis",
        description: "Veuillez saisir votre demande d'information",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // ✅ Appel API réel avec le bon endpoint
      const response = await apiClient.post(
        `/demandes/${demandeId}/demander-information/`,
        {
          message: message.trim(),
        }
      );

      // ✅ Vérifier la réponse
      if (response.data.success) {
        toast({
          title: "Demande envoyée",
          description: response.data.message || `Votre demande d'information a été envoyée à ${studentName}`,
          variant: "default",
        });

        setMessage("");
        onOpenChange(false);
      } else {
        throw new Error(response.data.message || "Erreur lors de l'envoi");
      }
    } catch (error: any) {
      console.error("❌ Erreur lors de l'envoi de la demande d'information:", error);
      
      const errorMessage = 
        error.response?.data?.message || 
        error.response?.data?.error ||
        error.message ||
        "Impossible d'envoyer la demande d'information";
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setMessage("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Demander plus d'informations
          </DialogTitle>
          <DialogDescription>
            Envoyez une demande d'information complémentaire à {studentName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="info-message">Message</Label>
            <Textarea
              id="info-message"
              placeholder="Précisez les informations supplémentaires dont vous avez besoin..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] resize-y"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Ce message sera envoyé par email à l'étudiant avec les détails de sa candidature.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Cette demande sera envoyée par email à :</p>
                <p className="mt-1">{studentName} &lt;{studentEmail}&gt;</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !message.trim()}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Envoyer la demande
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
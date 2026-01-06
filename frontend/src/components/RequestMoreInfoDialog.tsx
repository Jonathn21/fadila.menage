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
import { MessageSquare, Send } from "lucide-react";

interface RequestMoreInfoDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
}

const RequestMoreInfoDialog: React.FC<RequestMoreInfoDialogProps> = ({
  open,
  onClose,
  onSend,
}) => {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = () => {
    setIsSending(true);
    // Simulate sending delay
    setTimeout(() => {
      onSend(message);
      setMessage("");
      setIsSending(false);
      onClose();
    }, 500);
  };

  const handleCancel = () => {
    setMessage("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            Demander plus d'informations
          </DialogTitle>
          <DialogDescription>
            Rédigez votre demande d'informations complémentaires. L'étudiant recevra ce message par email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="info-request">Message à l'étudiant *</Label>
            <Textarea
              id="info-request"
              placeholder="Bonjour, nous avons besoin d'informations complémentaires concernant votre demande de stage..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Annuler
          </Button>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="flex items-center gap-2"
          >
            {isSending ? (
              "Envoi en cours..."
            ) : (
              <>
                <Send className="h-4 w-4" />
                Envoyer la demande
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestMoreInfoDialog;
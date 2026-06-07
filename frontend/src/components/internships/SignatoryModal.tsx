import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, PenLine, User } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

const SIGNATAIRES = [
  {
    id: "DG",
    titre: "Directeur Général",
    nom: "Dr. Karimou CHABI SIKA",
    label: "DG",
  },
  {
    id: "DGA",
    titre: "Directeur Général Adjoint",
    nom: "M. Damipi NOUPOKOU",
    label: "DGA",
  },
];

interface SignatoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandeId: number;
  conventionTemporaireUrl?: string | null;
  onSuccess?: (pdfUrl: string) => void;
  endpoint?: string;
}

const SignatoryModal: React.FC<SignatoryModalProps> = ({
  open,
  onOpenChange,
  demandeId,
  conventionTemporaireUrl,
  onSuccess,
  endpoint,
}) => {
  const { toast } = useToast();
  const [signataire, setSignataire] = useState<string>("DG");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const url = endpoint ?? `/demandes/${demandeId}/regenerer-convention/`;
      const response = await apiClient.post(url, { signataire });

      if (!response.data.success) {
        throw new Error(response.data.message || "Erreur lors de la génération");
      }

      toast({
        title: "Convention générée",
        description: `Convention signée par le ${
          SIGNATAIRES.find((s) => s.id === signataire)?.titre
        }`,
      });

      onSuccess?.(response.data.pdf_url);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erreur",
        description:
          err.response?.data?.message ||
          err.message ||
          "Impossible de générer la convention",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <PenLine className="h-5 w-5" />
            Choisir le signataire
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Sélectionnez le signataire de la convention de stage.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={signataire}
            onValueChange={setSignataire}
            className="space-y-3"
          >
            {SIGNATAIRES.map((s) => (
              <label
                key={s.id}
                htmlFor={s.id}
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  signataire === s.id
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <RadioGroupItem value={s.id} id={s.id} className="mt-0.5" />
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{s.titre}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.nom}</p>
                  </div>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-gray-700 hover:bg-gray-100"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-primary hover:bg-primary/80 text-white gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PenLine className="h-4 w-4" />
            )}
            Générer la convention
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignatoryModal;
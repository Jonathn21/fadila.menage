import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export type DocumentData = {
  nom: string;
  url: string;
};

interface DocumentPreviewDialogProps {
  document: DocumentData | null;
  onClose: () => void;
  onDownload: (doc: DocumentData) => void;
}

const DocumentPreviewDialog: React.FC<DocumentPreviewDialogProps> = ({ document, onClose, onDownload }) => {
  if (!document) return null;

  return (
    <Dialog open={!!document} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{document.nom}</DialogTitle>
          <DialogDescription>Visualisation du document</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center p-4 bg-muted/30 rounded-lg">
          {document.url.endsWith(".pdf") ? (
            <iframe
              src={document.url}
              title={document.nom}
              className="w-full h-[70vh] border rounded-md"
            />
          ) : (
            <img
              src={document.url}
              alt={document.nom}
              className="max-w-full max-h-[70vh] object-contain border rounded-md"
            />
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button onClick={() => onDownload(document)} className="gap-2">
            <Download className="h-4 w-4" />
            Télécharger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreviewDialog;

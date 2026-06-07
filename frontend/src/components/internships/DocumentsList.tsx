import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, Eye } from "lucide-react";

interface Document {
  name: string;
  type: string;
  date: Date;
  url: string;
}

interface DocumentsListProps {
  documents: Document[];
  onView: (doc: { name: string; url: string }) => void;
  showAddButton?: boolean;
  onAddDocument?: () => void;
}

const DocumentsList = ({ 
  documents, 
  onView, 
  showAddButton = false,
  onAddDocument 
}: DocumentsListProps) => {
  return (
    <div className="space-y-4">
      {documents.map((doc, index) => (
        <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 border rounded-md gap-2 sm:gap-0">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">{doc.name}</p>
              <p className="text-xs text-muted-foreground">
                Ajouté le {doc.date.toLocaleDateString("fr-FR")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onView(doc)}>
              <Eye className="h-4 w-4 mr-1" />
              Voir
            </Button>
            <Button variant="outline" size="sm">Télécharger</Button>
          </div>
        </div>
      ))}
      
      {showAddButton && (
        <div className="mt-4 flex justify-end">
          <Button onClick={onAddDocument}>
            Ajouter un document
          </Button>
        </div>
      )}
    </div>
  );
};

export default DocumentsList;
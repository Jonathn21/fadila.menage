// components/TrackApplication/DocumentViewer.tsx
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Download, File, FileText, Image as ImageIcon, XIcon } from "lucide-react";
import { Document } from "./types";

interface DocumentViewerProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  isOpen,
  onClose
}) => {
  if (!document) return null;

  const getFileExtension = (url: string) => {
    return url.split('.').pop()?.toUpperCase() || 'PDF';
  };

  const isImageFile = (url: string) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const ext = url.split('.').pop()?.toLowerCase();
    return imageExtensions.includes(ext || '');
  };

  const isPdfFile = (url: string) => {
    return url.toLowerCase().endsWith('.pdf');
  };

  const getDocumentIcon = () => {
    if (isImageFile(document.url)) {
      return <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />;
    }
    if (isPdfFile(document.url)) {
      return <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />;
    }
    return <File className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />;
  };

  const getDocumentBadgeColor = (type?: string) => {
    switch (type) {
      case 'cv': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'lettre_motivation': return 'bg-green-100 text-green-800 ';
      case 'diplome': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'rapport': return 'bg-red-100 text-red-800 border-red-200';
      case 'demande_attestation': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDocumentTypeLabel = (type?: string) => {
    if (!type) return 'Document';
    return type.replace('_', ' ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] p-0 sm:p-6">
        <DialogHeader className="px-4 pt-4 sm:px-0 sm:pt-0">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-base sm:text-lg gap-2 sm:gap-0">
            <div className="flex items-center gap-2 truncate">
              {getDocumentIcon()}
              <span className="truncate">{document.nom}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="flex flex-col items-center">
            {isImageFile(document.url) ? (
              <img 
                src={document.url} 
                alt={document.nom}
                className="max-w-full max-h-[60vh] sm:max-h-[70vh] object-contain rounded-lg"
              />
            ) : isPdfFile(document.url) ? (
              <div className="w-full h-[60vh] sm:h-[70vh]">
                <iframe
                  src={document.url}
                  className="w-full h-full rounded-lg border"
                  title={document.nom}
                />
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <File className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <p className="text-base sm:text-lg font-medium text-gray-600 mb-2">
                  Aperçu non disponible
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Ce type de fichier ne peut pas être prévisualisé
                </p>
                <Button asChild size="sm" className="text-sm">
                  <a href={document.url} download>
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Télécharger
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-4 pb-4 sm:px-6 sm:pb-6 border-t pt-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={getDocumentBadgeColor(document.type)}>
              {getDocumentTypeLabel(document.type)}
            </Badge>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {getFileExtension(document.url)}
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" asChild size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
              <a href={document.url} target="_blank" rel="noopener noreferrer">
                <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Ouvrir</span>
              </a>
            </Button>
            <Button asChild size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
              <a href={document.url} download>
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Télécharger</span>
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
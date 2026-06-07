// components/TrackApplication/PhotoViewer.tsx
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Download, Image as ImageIcon, XIcon } from "lucide-react";
import { Stagiaire } from "./types";

interface PhotoViewerProps {
  photoUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
  stagiaire?: Stagiaire;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photoUrl,
  isOpen,
  onClose,
  stagiaire
}) => {
  if (!photoUrl) return null;

  const getFileExtension = (url: string) => {
    return url.split('.').pop()?.toUpperCase() || 'JPG';
  };

  const getFileName = () => {
    if (stagiaire) {
      return `photo-${stagiaire.prenom}-${stagiaire.nom}.${getFileExtension(photoUrl).toLowerCase()}`;
    }
    return `photo-identite.${getFileExtension(photoUrl).toLowerCase()}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] p-0 sm:p-6">
        <DialogHeader className="px-4 pt-4 sm:px-0 sm:pt-0">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-base sm:text-lg gap-2 sm:gap-0">
            <div className="flex items-center gap-2 truncate">
              <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="truncate">
                Photo d'identité - {stagiaire?.prenom} {stagiaire?.nom}
              </span>
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
        
        <div className="flex-1 overflow-auto flex items-center justify-center px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="flex flex-col items-center">
            <img 
              src={photoUrl} 
              alt={`Photo de ${stagiaire?.prenom} ${stagiaire?.nom}`}
              className="max-w-full max-h-[60vh] sm:max-h-[70vh] object-contain rounded-lg shadow-lg"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-4 pb-4 sm:px-6 sm:pb-6 border-t pt-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 text-xs sm:text-sm">
              Photo d'identité
            </Badge>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {getFileExtension(photoUrl)}
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" asChild size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
              <a href={photoUrl} target="_blank" rel="noopener noreferrer">
                <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Ouvrir</span>
              </a>
            </Button>
            <Button asChild size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
              <a href={photoUrl} download={getFileName()}>
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
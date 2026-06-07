// components/TrackApplication/DocumentCard.tsx
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Download, 
  Upload, 
  X, 
  Image, 
  FileText, 
  File 
} from "lucide-react";
import { Document } from "./types";

interface DocumentCardProps {
  doc: Document;
  isExisting?: boolean;
  isMarkedForDeletion?: boolean;
  isBeingReplaced?: boolean;
  onView: () => void;
  onDownload: () => void;
  onReplace?: () => void;
  onDelete?: () => void;
  isEditing?: boolean;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  doc,
  isExisting = true,
  isMarkedForDeletion = false,
  isBeingReplaced = false,
  onView,
  onDownload,
  onReplace,
  onDelete,
  isEditing = false,
}) => {
  const getFileIcon = (url: string) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const ext = url.split('.').pop()?.toLowerCase();
    
    if (imageExtensions.includes(ext || '')) {
      return <Image className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />;
    }
    if (url.toLowerCase().endsWith('.pdf')) {
      return <FileText className="h-4 w-4 sm:h-6 sm:w-6 text-red-500" />;
    }
    return <File className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />;
  };

  const getFileExtension = (url: string) => {
    return url.split('.').pop()?.toUpperCase() || 'PDF';
  };

  return (
    <Card 
      className={`border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer group ${
        isMarkedForDeletion ? 'opacity-50 bg-red-50' : ''
      } ${isBeingReplaced ? 'opacity-50 bg-yellow-50' : ''}`}
      onClick={() => !isMarkedForDeletion && !isBeingReplaced && onView()}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            {getFileIcon(doc.url)}
          </div>

          <div>
            <h3 className="font-medium mb-1 sm:mb-2 text-xs sm:text-sm line-clamp-2">
              {doc.nom}
              {isBeingReplaced && (
                <Badge variant="secondary" className="ml-1 sm:ml-2 bg-yellow-500 text-white text-xs">
                  Remp.
                </Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground mb-3 sm:mb-4">
              {getFileExtension(doc.url)} • {doc.type ? doc.type.replace('_', ' ') : 'Document'}
              {isMarkedForDeletion && (
                <span className="text-red-500 ml-1 sm:ml-2">(Suppr.)</span>
              )}
            </p>
          </div>

          <div className="flex gap-1 sm:gap-2 justify-center flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="text-xs sm:text-sm flex-1 min-w-[70px] sm:min-w-0"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              disabled={isMarkedForDeletion || isBeingReplaced}
            >
              <Eye className="h-3 w-3 mr-1" />
              <span className="hidden xs:inline">Voir</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs sm:text-sm flex-1 min-w-[70px] sm:min-w-0"
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              disabled={isMarkedForDeletion || isBeingReplaced}
            >
              <Download className="h-3 w-3 mr-1" />
              <span className="hidden xs:inline">Téléc.</span>
            </Button>
            
            {isEditing && isExisting && (
              <>
                {doc.type !== 'diplome' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs sm:text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReplace?.();
                    }}
                    disabled={isBeingReplaced}
                  >
                    <Upload className="h-3 w-3" />
                    <span className="hidden sm:inline ml-1">Rempl.</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs sm:text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.();
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
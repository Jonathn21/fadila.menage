// components/TrackApplication/FileUploadCard.tsx
import React, { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X } from "lucide-react";

interface FileUploadCardProps {
  title: string;
  required?: boolean;
  accept: string;
  file: File | null;
  onFileSelect: (files: FileList | null) => void;
  onFileRemove: () => void;
  description?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export const FileUploadCard: React.FC<FileUploadCardProps> = ({
  title,
  required = false,
  accept,
  file,
  onFileSelect,
  onFileRemove,
  description,
  inputRef: externalInputRef
}) => {
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef || internalInputRef;
  
  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors">
      <CardContent className="p-4 sm:p-6">
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-lg flex items-center justify-center">
            <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
          </div>
          
          <div>
            <h3 className="font-medium mb-1 sm:mb-2 text-sm sm:text-base">
              {title}
              {required && <span className="text-red-500 ml-1">*</span>}
            </h3>
            <p className="text-xs text-muted-foreground mb-3 sm:mb-4">
              {description || "Cliquez ou déplacez un fichier dans cette zone pour le téléverser"}
            </p>
            
            <input
              type="file"
              accept={accept}
              onChange={(e) => onFileSelect(e.target.files)}
              className="hidden"
              id={`file-${title.replace(/\s+/g, '-').toLowerCase()}`}
              ref={inputRef}
            />
            
            <label
              htmlFor={`file-${title.replace(/\s+/g, '-').toLowerCase()}`}
              className="inline-flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm border border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-md cursor-pointer transition-colors"
              onClick={handleClick}
            >
              <Upload className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Choisir un fichier
            </label>
          </div>
          
          {/* Fichier sélectionné */}
          {file && (
            <div className="mt-2 p-2 sm:p-3 bg-green-50 border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex items-center">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-green-600" />
                <div className="text-left">
                  <span className="text-xs sm:text-sm font-medium text-green-700 block truncate max-w-[150px] sm:max-w-xs">
                    {file.name}
                  </span>
                  <span className="text-xs text-green-600">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={onFileRemove}
                className="h-6 w-6 sm:h-7 sm:w-7 p-0"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
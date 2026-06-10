// components/TrackApplication/FileUploadCard.tsx
import React, { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileText, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  inputRef: externalInputRef,
}) => {
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef || internalInputRef;
  const [isDragging, setIsDragging] = useState(false);

  const inputId = `file-${title.replace(/\s+/g, "-").toLowerCase()}`;

  const openPicker = () => inputRef.current?.click();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      onFileSelect(e.dataTransfer.files);
    }
  };

  return (
    <Card
      className={cn(
        "group border-2 border-dashed transition-all duration-200",
        file
          ? "border-green-300 bg-green-50/40"
          : isDragging
            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardContent className="p-4 sm:p-6">
        {!file ? (
          <button
            type="button"
            onClick={openPicker}
            className="w-full text-center space-y-3 sm:space-y-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg"
            aria-label={`Téléverser : ${title}`}
          >
            <div
              className={cn(
                "mx-auto w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center transition-colors",
                isDragging ? "bg-primary/15" : "bg-muted group-hover:bg-primary/10"
              )}
            >
              <UploadCloud
                className={cn(
                  "h-5 w-5 sm:h-7 sm:w-7 transition-colors",
                  isDragging ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                )}
              />
            </div>

            <div>
              <h3 className="font-semibold mb-1 text-sm sm:text-base">
                {title}
                {required && <span className="text-red-500 ml-1">*</span>}
              </h3>
              <p className="text-xs text-muted-foreground">
                {description || "Cliquez ou déposez un fichier dans cette zone"}
              </p>
            </div>

            <span className="inline-flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border border-primary text-primary group-hover:bg-primary group-hover:text-primary-foreground rounded-md transition-colors">
              <UploadCloud className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Choisir un fichier
            </span>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              {title}
              {required && <span className="text-red-500">*</span>}
            </div>
            <div className="p-2.5 sm:p-3 bg-white border border-green-200 rounded-lg flex items-center justify-between gap-2">
              <div className="flex items-center min-w-0">
                <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 mr-2.5">
                  <FileText className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-left min-w-0">
                  <span className="text-xs sm:text-sm font-medium text-gray-800 block truncate max-w-[160px] sm:max-w-xs">
                    {file.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={openPicker}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                >
                  Remplacer
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onFileRemove}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                  aria-label={`Retirer le fichier ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <input
          type="file"
          accept={accept}
          onChange={(e) => onFileSelect(e.target.files)}
          className="hidden"
          id={inputId}
          ref={inputRef}
        />
      </CardContent>
    </Card>
  );
};

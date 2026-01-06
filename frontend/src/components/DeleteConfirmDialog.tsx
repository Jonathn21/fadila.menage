import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeleteConfirmDialogProps {
  title: string;
  description: string;
  onConfirm: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isLoading?: boolean;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
}

const DeleteConfirmDialog = ({
  title,
  description,
  onConfirm,
  trigger,
  open,
  onOpenChange,
  isLoading = false,
  confirmText = "Supprimer",
  cancelText = "Annuler",
  variant = "destructive",
  size = "icon",
}: DeleteConfirmDialogProps) => {
  const isControlled = open !== undefined && onOpenChange !== undefined;

  const dialogContent = (
    <AlertDialogContent className="sm:max-w-md">
      <AlertDialogHeader>
        <div className="flex items-center justify-center w-12 h-12 bg-destructive/10 rounded-full mb-4 mx-auto">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <AlertDialogTitle className="text-center text-xl">
          {title}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-center text-base">
          {description}
        </AlertDialogDescription>
      </AlertDialogHeader>
      
      <div className="bg-muted/50 rounded-lg p-4 mt-2">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible. Les données supprimées ne pourront pas être récupérées.
          </p>
        </div>
      </div>

      <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
        <AlertDialogCancel 
          disabled={isLoading}
          className="mt-0"
        >
          {cancelText}
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          disabled={isLoading}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Suppression...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              {confirmText}
            </>
          )}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );

  if (isControlled) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        {dialogContent}
      </AlertDialog>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button 
            variant={variant} 
            size={size}
            className={cn(
              size === "icon" && "h-9 w-9",
              variant === "destructive" && "text-destructive-foreground"
            )}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </AlertDialogTrigger>
      {dialogContent}
    </AlertDialog>
  );
};

export default DeleteConfirmDialog;
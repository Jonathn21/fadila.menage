import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface PhotoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photoUrl?: string;
  altText?: string;
}

const PhotoDialog: React.FC<PhotoDialogProps> = ({ open, onOpenChange, photoUrl, altText }) => {
  if (!photoUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-transparent border-none">
        <img 
          src={photoUrl} 
          alt={altText || "Photo"} 
          className="w-full h-auto object-contain rounded-lg shadow-lg"
        />
      </DialogContent>
    </Dialog>
  );
};

export default PhotoDialog;

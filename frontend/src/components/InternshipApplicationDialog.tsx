import React from "react";
import InternshipApplicationForm  from "@/components/InternshipApplicationForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InternshipApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InternshipApplicationDialog: React.FC<InternshipApplicationDialogProps> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Soumettre une demande de stage</DialogTitle>
        </DialogHeader>
        <InternshipApplicationForm 
          onSuccess ={() => {
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default InternshipApplicationDialog;
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";

interface StepNavigationProps {
  onPrevious?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  isFirstStep?: boolean;
  isLastStep?: boolean;
  isNextDisabled?: boolean;
  isSubmitDisabled?: boolean;
  nextButtonText?: string;
  submitButtonText?: string;
}

const StepNavigation: React.FC<StepNavigationProps> = ({
  onPrevious,
  onNext,
  onSubmit,
  isFirstStep = false,
  isLastStep = false,
  isNextDisabled = false,
  isSubmitDisabled = false,
  nextButtonText = "Suivant",
  submitButtonText = "Valider le stage",
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between mt-6 gap-2 sm:gap-0">
      {!isFirstStep && onPrevious && (
        <Button type="button" variant="outline" onClick={onPrevious}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Précédent
        </Button>
      )}
      
      {isFirstStep && <div />}
      
      {!isLastStep && onNext && (
        <Button
          type="button"
          onClick={onNext}
          disabled={isNextDisabled}
        >
          {nextButtonText}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
      
      {isLastStep && onSubmit && (
        <Button
          type="submit"
          onClick={onSubmit}
          disabled={isSubmitDisabled}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          {submitButtonText}
        </Button>
      )}
    </div>
  );
};

export default StepNavigation;
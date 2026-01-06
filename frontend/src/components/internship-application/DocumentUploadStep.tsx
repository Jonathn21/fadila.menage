import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Upload, FileText, X } from "lucide-react";
import { ApplicationData } from "@/pages/PublicInternshipApplication";
import { useToast } from "@/hooks/use-toast";

interface DocumentUploadStepProps {
  data: ApplicationData;
  onDataUpdate: (data: Partial<ApplicationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const DocumentUploadStep: React.FC<DocumentUploadStepProps> = ({
  data,
  onDataUpdate,
  onNext,
  onPrevious
}) => {
  const { toast } = useToast();

  const handleFileUpload = (type: 'cv' | 'lettreMotivation' | 'diplomes', files: FileList | null) => {
    if (!files) return;

    if (type === 'diplomes') {
      const fileArray = Array.from(files);
      onDataUpdate({
        documents: {
          ...data.documents,
          [type]: fileArray
        }
      });
    } else {
      const file = files[0];
      if (file) {
        onDataUpdate({
          documents: {
            ...data.documents,
            [type]: file
          }
        });
      }
    }

    toast({
      title: "Document ajouté",
      description: `${files.length} fichier(s) sélectionné(s)`,
    });
  };

  const removeFile = (type: 'cv' | 'lettreMotivation') => {
    onDataUpdate({
      documents: {
        ...data.documents,
        [type]: undefined
      }
    });
  };

  const removeDiplomaFile = (index: number) => {
    const currentDiplomes = data.documents.diplomes || [];
    const updatedDiplomes = currentDiplomes.filter((_, i) => i !== index);
    onDataUpdate({
      documents: {
        ...data.documents,
        diplomes: updatedDiplomes
      }
    });
  };

  const isFormValid = () => {
    return data.documents.cv && data.documents.lettreMotivation;
  };

  const FileUploadCard = ({ 
    title, 
    type, 
    file, 
    multiple = false,
    required = false
  }: { 
    title: string; 
    type: 'cv' | 'lettreMotivation' | 'diplomes'; 
    file?: File | File[]; 
    multiple?: boolean;
    required?: boolean;
  }) => (
    <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium mb-2">
              {title}
              {required && <span className="text-red-500 ml-1">*</span>}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cliquez ou déplacez un fichier dans cette zone pour le téléverser
            </p>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              multiple={multiple}
              onChange={(e) => handleFileUpload(type, e.target.files)}
              className="hidden"
              id={`file-${type}`}
            />
            <label
              htmlFor={`file-${type}`}
              className="inline-flex items-center px-4 py-2 border border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-md cursor-pointer transition-colors"
            >
              <Upload className="mr-2 h-4 w-4" />
              Choisir un fichier
            </label>
          </div>
          
          {/* Show uploaded files */}
          {type !== 'diplomes' && file && (
            <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-primary" />
                <span className="text-sm font-medium">{(file as File).name}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeFile(type)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {type === 'diplomes' && Array.isArray(file) && file.length > 0 && (
            <div className="mt-4 space-y-2">
              {file.map((f, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-primary" />
                    <span className="text-sm font-medium">{f.name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeDiplomaFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FileUploadCard
          title="CV (Curriculum Vitae) *"
          type="cv"
          file={data.documents.cv}
          required={true}
        />
        
        <FileUploadCard
          title="Lettre de motivation *"
          type="lettreMotivation"
          file={data.documents.lettreMotivation}
          required={true}
        />
        
        <FileUploadCard
          title="Diplômes / Attestations"
          type="diplomes"
          file={data.documents.diplomes}
          multiple
        />
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="text-sm text-blue-800">
            <strong>Informations importantes :</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Tous les documents marqués d'un * sont obligatoires</li>
              <li>Formats acceptés : PDF, DOC, DOCX</li>
              <li>Taille maximale par fichier : 5MB</li>
              <li>La photo passeport a déjà été ajoutée à l'étape précédente</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onPrevious}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Précédent
        </Button>
        
        <Button 
          onClick={onNext}
          disabled={!isFormValid()}
          className="bg-primary hover:bg-primary/90"
        >
          Suivant
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default DocumentUploadStep;
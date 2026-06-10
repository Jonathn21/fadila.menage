// components/TrackApplication/TrackApplication.tsx
import React, { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Edit, 
  Save, 
  X, 
  Plus, 
  AlertTriangle,
  Image as ImageIcon,
  XIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SearchBar } from "@/components/TrackApplication/SearchBar";
import { ApplicationHeader } from "@/components/TrackApplication/ApplicationHeader";
import { PersonalInfo } from "@/components/TrackApplication/PersonalInfo";
import { AdditionalInfo } from "@/components/TrackApplication/AdditionalInfo";
import { DocumentCard } from "@/components/TrackApplication/DocumentCard";
import { FileUploadCard } from "@/components/TrackApplication/FileUploadCard";
// import { StageInfo } from "@/components/TrackApplication/StageInfo";
import { AttestationRequest } from "@/components/TrackApplication/AttestationRequest";
import { DocumentViewer } from "@/components/TrackApplication/DocumentViewer";
import { PhotoViewer } from "@/components/TrackApplication/PhotoViewer";
import { 
  ApplicationStatus, 
  DocumentFile, 
  Document 
} from "@/components/TrackApplication/types";
import apiClient from "@/lib/apiClient";

// Import des composants partagés
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

const TrackApplication = () => {
  const [trackingCode, setTrackingCode] = useState("");
  const [application, setApplication] = useState<ApplicationStatus | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [newDocuments, setNewDocuments] = useState<DocumentFile[]>([]);
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [documentsToDelete, setDocumentsToDelete] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const diplomeInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const handleSearch = useCallback(async () => {
    if (!trackingCode.trim()) {
      toast({
        title: "Code requis",
        description: "Veuillez saisir votre code de suivi",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setNotFound(false);
    setApplication(null);
    setIsEditing(false);
    setNewDocuments([]);
    setNewPhoto(null);
    setDocumentsToDelete([]);

    try {
      const cleanTrackingCode = trackingCode.trim().toUpperCase();
      
      const response = await apiClient.get(`suivi-demande/${cleanTrackingCode}/`);
      const data = response.data;

      if (data.success && data.demande) {
        setApplication(data.demande);
        setNotFound(false);
        toast({
          title: "Demande trouvée",
          description: `Demande de ${data.demande.stagiaire.prenom} ${data.demande.stagiaire.nom}`,
        });
      } else {
        setApplication(null);
        setNotFound(true);
        toast({
          title: "Demande non trouvée",
          description: "Aucune demande correspondante n'a été trouvée",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Erreur lors de la recherche:", error);
      
      if (error.response?.status === 404) {
        setApplication(null);
        setNotFound(true);
        toast({
          title: "Demande non trouvée",
          description: "Aucune demande ne correspond à ce code de suivi",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: error.response?.data?.message || "Une erreur est survenue lors de la recherche",
          variant: "destructive",
        });
        setApplication(null);
        setNotFound(true);
      }
    } finally {
      setIsSearching(false);
    }
  }, [trackingCode, toast]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewDocuments([]);
    setNewPhoto(null);
    setDocumentsToDelete([]);
  };

  const handleSave = async () => {
    if (!application?.tracking_id) return;

    if (newDocuments.length === 0 && !newPhoto && documentsToDelete.length === 0) {
      toast({
        title: "Aucune modification",
        description: "Vous n'avez apporté aucune modification aux documents",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      
      newDocuments.forEach((doc, index) => {
        formData.append(`documents`, doc.file);
        formData.append(`document_types`, doc.type);
        if (doc.replacesExisting) {
          formData.append(`replaces_existing`, 'true');
          if (doc.replacesId) {
            formData.append(`replaces_id`, doc.replacesId);
          }
        } else {
          formData.append(`replaces_existing`, 'false');
        }
      });

      if (newPhoto) {
        formData.append('photo_passeport', newPhoto);
      }

      if (documentsToDelete.length > 0) {
        formData.append('documents_to_delete', JSON.stringify(documentsToDelete));
      }

      const response = await apiClient.put(
        `suivi-demande/${application.tracking_id}/modifier/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        setApplication(response.data.demande);
        setIsEditing(false);
        setNewDocuments([]);
        setNewPhoto(null);
        setDocumentsToDelete([]);
        toast({
          title: "Documents mis à jour",
          description: "Vos documents ont été modifiés avec succès",
          variant: "default",
        });
      } else {
        throw new Error(response.data.message || "Erreur lors de la sauvegarde");
      }
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde:", error);
      
      let errorMessage = "Une erreur est survenue lors de la sauvegarde";
      
      if (error.response?.status === 413) {
        errorMessage = "Fichier trop volumineux. Veuillez réduire la taille de vos documents.";
      } else if (error.response?.status === 415) {
        errorMessage = "Format de fichier non supporté. Utilisez PDF, JPG ou PNG.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewDocument = (doc: Document) => {
    setSelectedDocument(doc);
    setIsModalOpen(true);
  };

  const handleViewPhoto = (photoUrl: string) => {
    setSelectedPhoto(photoUrl);
    setIsPhotoModalOpen(true);
  };

  const handleReplaceDocument = (docType: string, docId?: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
    
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      const file = files[0];
      const newDoc: DocumentFile = {
        file,
        type: docType,
        nom: file.name,
        replacesExisting: true,
        replacesId: docId
      };

      setNewDocuments(prev => [...prev, newDoc]);
    };

    input.click();
  };

  const handleAddDiplome = () => {
    if (diplomeInputRef.current) {
      diplomeInputRef.current.click();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, documentType?: string, replacesExisting: boolean = false) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: DocumentFile[] = [];
    
    Array.from(files).forEach(file => {
      const detectedType = documentType || getFileTypeFromName(file.name);
      newFiles.push({
        file,
        type: detectedType,
        nom: file.name,
        replacesExisting: replacesExisting
      });
    });

    setNewDocuments(prev => [...prev, ...newFiles]);
    
    if (event.target) {
      event.target.value = '';
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner une image (JPG, PNG, JPEG)",
        variant: "destructive",
      });
      return;
    }

    setNewPhoto(file);
    
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const removeNewDocument = (index: number) => {
    setNewDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewPhoto = () => {
    setNewPhoto(null);
  };

  const removeExistingDocument = (docId: string) => {
    const doc = application?.documents?.find(d => d.id === docId);
    if (doc?.type === 'diplome') {
      setDocumentsToDelete(prev => [...prev, docId]);
    } else {
      toast({
        title: "Action non autorisée",
        description: "Vous ne pouvez supprimer que les diplômes. Pour les autres documents, utilisez 'Remplacer'.",
        variant: "destructive",
      });
    }
  };

  const getFileTypeFromName = (fileName: string): string => {
    if (fileName.toLowerCase().includes('cv') || fileName.toLowerCase().includes('curriculum')) return 'cv';
    if (fileName.toLowerCase().includes('lettre') || fileName.toLowerCase().includes('motivation')) return 'lettre_motivation';
    if (fileName.toLowerCase().includes('diplome') || fileName.toLowerCase().includes('attestation')) return 'diplome';
    if (fileName.toLowerCase().includes('convention')) return 'convention';
    if (fileName.toLowerCase().includes('rapport')) return 'rapport';
    if (fileName.toLowerCase().includes('attestation')) return 'attestation';
    if (fileName.toLowerCase().includes('demande')) return 'demande_attestation';
    return 'autre';
  };

  const isDocumentBeingReplaced = (docType: string, docId?: string) => {
    return newDocuments.some(doc => 
      doc.type === docType && 
      doc.replacesExisting && 
      (!docId || doc.replacesId === docId)
    );
  };

  const getFilteredDocuments = () => {
    if (!application?.documents) return [];
    return application.documents.filter(doc => 
      doc.type !== 'rapport' && 
      !doc.nom.toLowerCase().includes('rapport') &&
      doc.type !== 'convention' &&
      doc.type !== 'attestation' &&
      !doc.nom.toLowerCase().includes('convention') &&
      !doc.nom.toLowerCase().includes('attestation')
    );
  };

  const getFilteredStageDocuments = () => {
    if (!application?.stage?.documents) return [];
    return application.stage.documents.filter(doc => 
      doc.type !== 'convention' && 
      doc.type !== 'attestation' &&
      !doc.nom.toLowerCase().includes('convention') &&
      !doc.nom.toLowerCase().includes('attestation')
    );
  };

  // Section Photo d'identité
  const PhotoSection = () => {
    if (!application) return null;

    return (
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            Photo d'identité
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-3 sm:space-y-4">
          <input
            type="file"
            ref={photoInputRef}
            onChange={handlePhotoUpload}
            accept="image/*"
            className="hidden"
            id="photo-upload"
          />
          
          {(newPhoto || application.photo_passeport) ? (
            <div className="space-y-3 sm:space-y-4 w-full">
              <div className="text-center">
                <h4 className="font-medium mb-2 sm:mb-4 text-sm sm:text-base">
                  Aperçu de votre photo
                </h4>

                <div
                  className="
                    relative
                    w-48 h-48
                    sm:w-44 sm:h-44
                    md:w-50 md:h-50
                    lg:w-66 lg:h-66
                    border-2 border-primary rounded-lg
                    overflow-hidden bg-muted mx-auto
                    cursor-pointer hover:border-primary/70 transition-colors
                  "
                  onClick={() =>
                    handleViewPhoto(
                      newPhoto
                        ? URL.createObjectURL(newPhoto)
                        : application.photo_passeport!
                    )
                  }
                >
                  <img
                    src={
                      newPhoto
                        ? URL.createObjectURL(newPhoto)
                        : application.photo_passeport!
                    }
                    alt={`Photo de ${application.stagiaire.prenom} ${application.stagiaire.nom}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              
              {isEditing && (
                <div className="flex gap-2 justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Changer
                  </Button>
                  {newPhoto && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={removeNewPhoto}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Annuler
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center w-full">
              <h4 className="font-medium mb-2 sm:mb-4 text-sm sm:text-base">Aperçu de votre photo</h4>
              <div className="w-32 h-32 sm:w-40 sm:h-40 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center mx-auto">
                <p className="text-xs sm:text-sm text-muted-foreground text-center px-3 sm:px-4">
                  Aucune photo disponible
                </p>
              </div>
              
              {isEditing && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Ajouter une photo
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {isEditing && (
            <p className="text-xs text-muted-foreground text-center">
              Formats acceptés: JPG, PNG, JPEG • Taille max: 5MB
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  // Section Documents
  const DocumentsSection = () => {
    const filteredDocuments = getFilteredDocuments();
    const filteredStageDocuments = getFilteredStageDocuments();
    const hasDocuments = filteredDocuments.length > 0 || filteredStageDocuments.length > 0 || newDocuments.length > 0;

    return (
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              Mes Documents
              <Badge variant="outline">
                {filteredDocuments.length + filteredStageDocuments.length + newDocuments.length}
              </Badge>
              {newDocuments.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                  +{newDocuments.length} nouveau(x)
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing && (
            <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
              <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-1 sm:mb-2 text-sm sm:text-base">Instructions pour la modification</h4>
                <ul className="text-xs sm:text-sm text-blue-700 space-y-1">
                  <li>• Cliquez sur "Remplacer" pour modifier un document existant</li>
                  <li>• Utilisez "Ajouter un diplôme" pour ajouter de nouveaux diplômes</li>
                  <li>• Les diplômes peuvent être supprimés individuellement</li>
                  <li>• Seule la photo et les documents peuvent être modifiés</li>
                </ul>
              </div>
              
              <div className="text-center">
                <input
                  type="file"
                  ref={diplomeInputRef}
                  onChange={(e) => handleFileUpload(e, 'diplome', false)}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  id="diplome-add"
                />
                <label
                  htmlFor="diplome-add"
                  className="inline-flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm border border-dashed border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-md cursor-pointer transition-colors"
                >
                  <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Ajouter un diplôme
                </label>
              </div>
            </div>
          )}

          {hasDocuments ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Documents de la demande */}
              {filteredDocuments.map((doc, index) => {
                const isMarkedForDeletion = doc.id && documentsToDelete.includes(doc.id);
                const isBeingReplaced = isDocumentBeingReplaced(doc.type!, doc.id);
                
                return (
                  <DocumentCard
                    key={`demande-${doc.id || index}`}
                    doc={doc}
                    isExisting={true}
                    isMarkedForDeletion={isMarkedForDeletion}
                    isBeingReplaced={isBeingReplaced}
                    onView={() => handleViewDocument(doc)}
                    onDownload={() => window.open(doc.url, '_blank')}
                    onReplace={() => handleReplaceDocument(doc.type!, doc.id)}
                    onDelete={() => removeExistingDocument(doc.id!)}
                    isEditing={isEditing}
                  />
                );
              })}

              {/* Documents du stage */}
              {filteredStageDocuments.map((doc, index) => (
                <DocumentCard
                  key={`stage-doc-${index}`}
                  doc={doc}
                  isExisting={true}
                  onView={() => handleViewDocument(doc)}
                  onDownload={() => window.open(doc.url, '_blank')}
                  isEditing={isEditing}
                />
              ))}

              {/* Nouveaux documents à ajouter */}
              {newDocuments.map((doc, index) => (
                <DocumentCard
                  key={`new-${index}`}
                  doc={{
                    nom: doc.nom,
                    url: URL.createObjectURL(doc.file),
                    type: doc.type
                  }}
                  isExisting={false}
                  onView={() => handleViewDocument({
                    nom: doc.nom,
                    url: URL.createObjectURL(doc.file),
                    type: doc.type
                  })}
                  onDownload={() => {
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(doc.file);
                    link.download = doc.nom;
                    link.click();
                  }}
                  onDelete={() => removeNewDocument(index)}
                  isEditing={isEditing}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8">
              <p className="text-sm sm:text-base text-muted-foreground">Aucun document joint</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Section Prochaines étapes
  const NextStepsSection = () => {
    if (!application?.prochaines_etapes) return null;

    return (
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            Prochaines étapes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm sm:text-base leading-relaxed">{application.prochaines_etapes}</p>
        </CardContent>
      </Card>
    );
  };

  // Section Motif de refus
  const RefusalReasonSection = () => {
    if (!application?.motif_refus) return null;

    return (
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-red-600 text-base sm:text-lg">Motif du refus</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription className="text-sm">{application.motif_refus}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <div 
        className="relative text-white py-12 sm:py-16"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(5, 150, 105, 0.8), rgba(4, 120, 87, 0.8)), url('https://images.unsplash.com/photo-1636955816868-fcb881e57954?q=80&w=2070&auto=format&fit=crop')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-lg sm:text-xl md:text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">SUIVI DE DEMANDE</h1>
          <p className="text-base sm:text-lg opacity-90 max-w-2xl mx-auto">
            Suivez l'état de votre demande de stage en temps réel
          </p>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-6xl">
        <Card className="mb-6 sm:mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              Rechercher ma demande
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SearchBar
              trackingCode={trackingCode}
              setTrackingCode={setTrackingCode}
              onSearch={handleSearch}
              isSearching={isSearching}
            />
          </CardContent>
        </Card>

        {notFound && (
          <Alert className="mb-6 sm:mb-8">
            <AlertDescription className="text-sm sm:text-base">
              Aucune demande trouvée avec ce code de suivi. Vérifiez que vous avez bien saisi le code complet.
            </AlertDescription>
          </Alert>
        )}

        {application && (
          <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
            {isEditing && (
              <Alert className="mb-3 sm:mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Mode édition activé</strong> - Vous pouvez uniquement modifier les documents joints et la photo d'identité.
                  Les informations personnelles ne sont pas modifiables après soumission.
                </AlertDescription>
              </Alert>
            )}

            {/* État de la demande */}
            <ApplicationHeader application={application} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Photo d'identité */}
              <PhotoSection />

              {/* Informations personnelles */}
              <div className="lg:col-span-2">
                <PersonalInfo stagiaire={application.stagiaire} />
              </div>
            </div>

            {/* Informations complémentaires */}
            <AdditionalInfo 
              application={application}
              isEditing={isEditing}
            />

            {/* Documents joints */}
            <DocumentsSection />

            {/* Informations du Stage (si disponible) — masqué temporairement
            {application.stage && (
              <StageInfo stage={application.stage} />
            )}
            */}

            {/* SECTION DEMANDE D'ATTESTATION — désactivée */}
            {false &&
              application.stage?.statut_actuel === "Terminé" &&
              !application.stage.demande_attestation && (
                <AttestationRequest
                  trackingId={application.tracking_id}
                  onSearch={handleSearch}
                />
              )}

            {/* Prochaines étapes */}
            <NextStepsSection />

            {/* Motif du refus */}
            <RefusalReasonSection />

            {/* Boutons d'action */}
            <div className="flex gap-3 justify-end pt-4">
              {!isEditing ? (
                <Button onClick={handleEdit} variant="outline" className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Modifier les documents
                </Button>
              ) : (
                <>
                  <Button onClick={handleCancelEdit} variant="outline" className="flex items-center gap-2">
                    <X className="h-4 w-4" />
                    Annuler
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Visionneuse de documents */}
        <DocumentViewer
          document={selectedDocument}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />

        {/* Visionneuse de photo */}
        <PhotoViewer
          photoUrl={selectedPhoto}
          isOpen={isPhotoModalOpen}
          onClose={() => setIsPhotoModalOpen(false)}
          stagiaire={application?.stagiaire}
        />
      </div>
      
      <PublicFooter className="mt-auto" />
    </div>
  );
};

export default TrackApplication;
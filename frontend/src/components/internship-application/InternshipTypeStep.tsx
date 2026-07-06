import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Upload, Image, X, Check, AlertCircle } from "lucide-react";
import { ApplicationData } from "@/pages/PublicInternshipApplication";
import { cn } from "@/lib/utils";

interface InternshipTypeStepProps {
  data: ApplicationData;
  onDataUpdate: (data: Partial<ApplicationData>) => void;
  onNext: () => void;
}

// Interface pour les pays avec leurs informations
interface CountryData {
  code: string;
  name: string;
  phoneCode: string;
  flag: string;
  format: string;
}

// Données des pays (seulement Bénin et Togo)
const COUNTRIES: CountryData[] = [
  { code: "BJ", name: "Bénin", phoneCode: "+229", flag: "BJ", format: "XX XX XX XX" },
  { code: "TG", name: "Togo", phoneCode: "+228", flag: "TG", format: "XX XX XX XX" },
];

// Options pour le type de stage (comme dans le deuxième composant)
const internshipTypes = [
  { value: "Académique", label: "Stage Académique", description: "Stage dans le cadre d'un cursus universitaire" },
  { value: "Fonctionnel", label: "Stage Fonctionnel", description: "Stage d'application professionnelle" },
  { value: "Libre", label: "Stage Libre", description: "Stage hors cadre académique" },
];

// Composant pour afficher les drapeaux sous forme de codes pays stylisés
const FlagDisplay = ({ countryCode }: { countryCode: string }) => {
  return (
    <div className="w-6 h-4 flex items-center justify-center bg-gray-100 border border-gray-300 rounded text-xs font-semibold">
      {countryCode}
    </div>
  );
};

const InternshipTypeStep: React.FC<InternshipTypeStepProps> = ({
  data,
  onDataUpdate,
  onNext
}) => {
  const [phoneInput, setPhoneInput] = useState(data.telephone || "");
  const [selectedCountry, setSelectedCountry] = useState<CountryData>(
    COUNTRIES.find(country => country.phoneCode === data.telephone?.substring(0, 4)) || COUNTRIES[0]
  );
  const [photoError, setPhotoError] = useState<string>("");

  const handleInputChange = (field: keyof ApplicationData, value: string) => {
    onDataUpdate({ [field]: value });
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validation du fichier
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(file.type)) {
      setPhotoError("Format de fichier invalide. Utilisez JPG, JPEG, PNG ou WEBP.");
      return;
    }
    
    if (file.size > maxSize) {
      setPhotoError("Le fichier est trop volumineux. Taille maximale: 5MB.");
      return;
    }
    
    setPhotoError("");
    onDataUpdate({
      documents: {
        ...data.documents,
        photoPasseport: file
      }
    });
  };

  const removePhoto = () => {
    setPhotoError("");
    onDataUpdate({
      documents: {
        ...data.documents,
        photoPasseport: undefined
      }
    });
  };

  // Fonction pour formater le numéro de téléphone
  const formatPhoneNumber = (phone: string, country: CountryData): string => {
    // Supprimer tous les caractères non numériques
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Si le numéro commence par l'indicatif du pays, le retirer
    let phoneWithoutCode = cleanPhone;
    if (cleanPhone.startsWith(country.phoneCode.replace('+', ''))) {
      phoneWithoutCode = cleanPhone.substring(country.phoneCode.replace('+', '').length);
    }
    
    // Formater selon le format du pays
    let formatted = "";
    let formatIndex = 0;
    let phoneIndex = 0;
    
    while (formatIndex < country.format.length && phoneIndex < phoneWithoutCode.length) {
      if (country.format[formatIndex] === 'X') {
        formatted += phoneWithoutCode[phoneIndex];
        phoneIndex++;
      } else {
        formatted += country.format[formatIndex];
      }
      formatIndex++;
    }
    
    // Ajouter les chiffres restants
    if (phoneIndex < phoneWithoutCode.length) {
      formatted += phoneWithoutCode.substring(phoneIndex);
    }
    
    return formatted;
  };

  // Gérer le changement de pays
  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (!country) return;
    
    setSelectedCountry(country);
    
    // Extraire le numéro actuel (sans l'ancien indicatif)
    const currentNumber = phoneInput.replace(/^\+[\d]+\s?/, '');
    const formattedNumber = formatPhoneNumber(currentNumber, country);
    const fullPhoneNumber = `${country.phoneCode} ${formattedNumber}`;
    
    setPhoneInput(fullPhoneNumber);
    onDataUpdate({ telephone: fullPhoneNumber });
  };

  // Gérer le changement de numéro de téléphone
  const handlePhoneChange = (value: string) => {
    // Supprimer l'indicatif pour traiter uniquement le numéro
    const phoneWithoutCode = value.replace(selectedCountry.phoneCode, '').trim();
    const formattedNumber = formatPhoneNumber(phoneWithoutCode, selectedCountry);
    const fullPhoneNumber = `${selectedCountry.phoneCode} ${formattedNumber}`;
    
    setPhoneInput(fullPhoneNumber);
    onDataUpdate({ telephone: fullPhoneNumber });
  };

  // Initialiser le téléphone si vide
  useEffect(() => {
    if (!phoneInput && selectedCountry) {
      setPhoneInput(selectedCountry.phoneCode + " ");
    }
  }, [selectedCountry]);

  const isFormValid = () => {
    const requiredFields = ['nom', 'prenom', 'genre', 'paysResidence', 'telephone', 'email', 'domaine', 'niveauEtude', 'typeStage'];
    const hasPhoneDigits = (data.telephone || "").replace(/\D/g, "").length >= 10; // indicatif + 8 chiffres
    return requiredFields.every(field => data[field as keyof ApplicationData]) && hasPhoneDigits && data.documents.photoPasseport && !photoError;
  };

  const isAcademicInternship = data.typeStage === "Académique";
  const isSchoolInfoValid = !isAcademicInternship || (data.nomEcole && data.adresseEcole && data.telephoneEcole && data.emailEcole);

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nom">Nom *</Label>
          <Input
            id="nom"
            value={data.nom}
            onChange={(e) => handleInputChange('nom', e.target.value)}
            placeholder="Entrez votre nom"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="prenom">Prénom *</Label>
          <Input
            id="prenom"
            value={data.prenom}
            onChange={(e) => handleInputChange('prenom', e.target.value)}
            placeholder="Entrez votre prénom"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="genre">Genre *</Label>
          <Select value={data.genre} onValueChange={(value) => handleInputChange('genre', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Masculin">Masculin</SelectItem>
              <SelectItem value="Féminin">Féminin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="paysResidence">Pays de résidence *</Label>
          <Select value={data.paysResidence} onValueChange={(value) => handleInputChange('paysResidence', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez un pays" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.name}>
                  <div className="flex items-center gap-2">
                    <FlagDisplay countryCode={country.flag} />
                    <span>{country.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="telephone">Téléphone *</Label>
          <div className="flex gap-2">
            {/* Sélecteur de pays */}
            <Select value={selectedCountry.code} onValueChange={handleCountryChange}>
              <SelectTrigger className="w-[130px]">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <FlagDisplay countryCode={selectedCountry.flag} />
                    <span className="font-medium">{selectedCountry.phoneCode}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    <div className="flex items-center gap-2">
                      <FlagDisplay countryCode={country.flag} />
                      <span className="flex-1">{country.name}</span>
                      <span className="text-muted-foreground font-medium">{country.phoneCode}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Champ de numéro de téléphone */}
            <div className="flex-1">
              <Input
                id="telephone"
                type="tel"
                value={phoneInput}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder={`${selectedCountry.phoneCode} ${selectedCountry.format.replace(/X/g, '0')}`}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format: {selectedCountry.format}
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">E-mail *</Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="exemple@email.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adresse">Adresse</Label>
          <Input
            id="adresse"
            value={data.adresse || ""}
            onChange={(e) => handleInputChange('adresse', e.target.value)}
            placeholder="Votre adresse complète"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="domaine">Domaine *</Label>
          <Select value={data.domaine} onValueChange={(value) => handleInputChange('domaine', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez un domaine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Communication">Communication</SelectItem>
              <SelectItem value="Comptabilité">Comptabilité</SelectItem>
              <SelectItem value="Génie Civil">Génie Civil</SelectItem>
              <SelectItem value="Génie Mécanique">Génie Mécanique</SelectItem>
              <SelectItem value="Électrotechnique">Électrotechnique</SelectItem>
              <SelectItem value="Informatique">Informatique</SelectItem>
              <SelectItem value="Management">Management</SelectItem>
              <SelectItem value="Ressources Humaines">Ressources Humaines</SelectItem>
              <SelectItem value="Secrétariat">Secrétariat</SelectItem>
              <SelectItem value="Télécommunication">Télécommunication</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="niveauEtude">Niveau d'étude *</Label>
          <Select value={data.niveauEtude} onValueChange={(value) => handleInputChange('niveauEtude', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez un niveau" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Licence 1">Licence 1</SelectItem>
              <SelectItem value="Licence 2">Licence 2</SelectItem>
              <SelectItem value="Licence 3">Licence 3</SelectItem>
              <SelectItem value="Master 1">Master 1</SelectItem>
              <SelectItem value="Master 2">Master 2</SelectItem>
              <SelectItem value="CAP">CAP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="typeStage">Type de stage *</Label>
          <Select 
            value={data.typeStage} 
            onValueChange={(value) => handleInputChange('typeStage', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez un type" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {internshipTypes.map((type) => (
                <SelectItem key={type.value} value={type.value} className="py-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{type.label}</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      {type.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Photo Passeport *</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-6 items-start">
            {/* Zone de téléversement - Agrandie */}
            <div className="flex-1">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 sm:p-6 md:p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <div 
                  className="mx-auto w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-6 hover:bg-primary/20 transition-colors"
                  onClick={() => document.getElementById('photo-passeport')?.click()}
                >
                  <Image className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-medium text-lg mb-3">Ajouter votre photo passeport</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-lg mx-auto">
                  Format accepté : JPG, PNG, JPEG, WEBP. Photo récente avec visage bien visible.
                  Taille maximale : 5MB
                </p>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                  id="photo-passeport"
                />
                <label
                  htmlFor="photo-passeport"
                  className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md cursor-pointer transition-colors text-sm font-medium"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Choisir une photo
                </label>
                
                {/* Liste des spécifications */}
                
              </div>
              
              {/* Message d'erreur */}
              {photoError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{photoError}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Aperçu - Agrandi */}
            <div className="flex-1">
              <div className="text-center">
                <h4 className="font-medium text-lg mb-6">Aperçu de votre photo</h4>
                {data.documents.photoPasseport ? (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      {/* Cadre agrandi pour la photo */}
                      <div className="relative w-64 h-80 border-4 border-primary/30 rounded-2xl overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30 shadow-lg">
                        <img 
                          src={URL.createObjectURL(data.documents.photoPasseport)} 
                          alt="Photo passeport" 
                          className="w-full h-full object-cover"
                        />
                        {/* Overlay avec effet passeport */}
                        <div className="absolute inset-0 border-2 border-white/20 rounded-2xl pointer-events-none"></div>
                      </div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Image className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <span className="text-sm font-medium block">{data.documents.photoPasseport.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(data.documents.photoPasseport.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={removePhoto}
                        className="hover:bg-red-50 hover:text-red-600"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                    
                    {/* Indicateur de validation */}
                    <div className="p-3 bg-green-50 border  rounded-lg">
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <Check className="h-4 w-4" />
                        <span className="text-sm font-medium">Photo valide</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-64 h-80 border-4 border-dashed border-muted-foreground/25 rounded-2xl flex flex-col items-center justify-center mx-auto p-3 sm:p-4 md:p-6 bg-gradient-to-br from-muted/30 to-muted/10">
                      <Image className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-sm text-muted-foreground text-center">
                        Aucune photo sélectionnée
                      </p>
                      <p className="text-xs text-muted-foreground/75 mt-2 text-center">
                        Cliquez sur "Choisir une photo" pour ajouter votre photo
                      </p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-xl">
                      <p className="text-sm text-muted-foreground text-center">
                        L'aperçu de votre photo s'affichera ici
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isAcademicInternship && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg">Informations de votre école</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nomEcole">Nom de l'école *</Label>
                <Input
                  id="nomEcole"
                  value={data.nomEcole || ""}
                  onChange={(e) => onDataUpdate({ nomEcole: e.target.value })}
                  placeholder="Nom de votre établissement"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adresseEcole">Adresse *</Label>
                <Input
                  id="adresseEcole"
                  value={data.adresseEcole || ""}
                  onChange={(e) => onDataUpdate({ adresseEcole: e.target.value })}
                  placeholder="Adresse de l'établissement"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telephoneEcole">Téléphone *</Label>
                <div className="flex gap-2">
                  <Select 
                    value={selectedCountry.code} 
                    onValueChange={(countryCode) => {
                      const country = COUNTRIES.find(c => c.code === countryCode);
                      if (country && data.telephoneEcole) {
                        const currentNumber = data.telephoneEcole.replace(/^\+[\d]+\s?/, '');
                        const formattedNumber = formatPhoneNumber(currentNumber, country);
                        onDataUpdate({ telephoneEcole: `${country.phoneCode} ${formattedNumber}` });
                      }
                    }}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <FlagDisplay countryCode={selectedCountry.flag} />
                          <span className="font-medium">{selectedCountry.phoneCode}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <div className="flex items-center gap-2">
                            <FlagDisplay countryCode={country.flag} />
                            <span className="flex-1">{country.name}</span>
                            <span className="text-muted-foreground font-medium">{country.phoneCode}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex-1">
                    <Input
                      id="telephoneEcole"
                      type="tel"
                      value={data.telephoneEcole || ""}
                      onChange={(e) => {
                        const phoneWithoutCode = e.target.value.replace(selectedCountry.phoneCode, '').trim();
                        const formattedNumber = formatPhoneNumber(phoneWithoutCode, selectedCountry);
                        onDataUpdate({ telephoneEcole: `${selectedCountry.phoneCode} ${formattedNumber}` });
                      }}
                      placeholder={`${selectedCountry.phoneCode} ${selectedCountry.format.replace(/X/g, '0')}`}
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="emailEcole">E-mail *</Label>
                <Input
                  id="emailEcole"
                  type="email"
                  value={data.emailEcole || ""}
                  onChange={(e) => onDataUpdate({ emailEcole: e.target.value })}
                  placeholder="contact@ecole.edu"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button 
          onClick={onNext}
          disabled={!isFormValid() || !isSchoolInfoValid}
          className="bg-primary hover:bg-primary/90 px-4 sm:px-6 md:px-8 py-3 h-auto"
        >
          <span className="font-medium">Suivant</span>
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default InternshipTypeStep;
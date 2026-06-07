// components/TrackApplication/PersonalInfo.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, MapPin } from "lucide-react";
import { Stagiaire } from "./types";

interface PersonalInfoProps {
  stagiaire: Stagiaire;
}

export const PersonalInfo: React.FC<PersonalInfoProps> = ({ stagiaire }) => {
  const renderField = (label: string, value: string, placeholder: string = "Non renseigné") => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="text-sm p-2 bg-muted rounded-md min-h-[40px] flex items-center">
        {value || <span className="text-muted-foreground">{placeholder}</span>}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <User className="h-4 w-4 sm:h-5 sm:w-5" />
          Informations personnelles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {renderField("Nom", stagiaire.nom)}
          {renderField("Prénom", stagiaire.prenom)}
          {renderField("Email", stagiaire.email)}
          {renderField("Téléphone", stagiaire.telephone)}
          {renderField("Adresse", stagiaire.adresse || "")}
          {renderField("Genre", stagiaire.genre || "")}
          {renderField("Pays de résidence", stagiaire.pays_residence || "")}
        </div>
      </CardContent>
    </Card>
  );
};
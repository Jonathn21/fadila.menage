
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const AppearanceSettings = () => {
  const [theme, setTheme] = useState("system");
  const [fontSize, setFontSize] = useState("medium");
  
  const { toast } = useToast();
  
  const handleSave = () => {
    // In a real app, you would apply these settings here
    toast({
      title: "Apparence mise à jour",
      description: "Vos préférences d'affichage ont été sauvegardées.",
    });
  };
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-medium mb-4">Thème</h2>
            <RadioGroup 
              value={theme} 
              onValueChange={setTheme}
              className="grid grid-cols-1 gap-4 sm:grid-cols-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="light" />
                <Label htmlFor="light">Clair</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="dark" />
                <Label htmlFor="dark">Sombre</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="system" />
                <Label htmlFor="system">Système</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <h2 className="text-lg font-medium mb-4">Taille du texte</h2>
            <RadioGroup 
              value={fontSize} 
              onValueChange={setFontSize}
              className="grid grid-cols-1 gap-4 sm:grid-cols-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="small" id="small" />
                <Label htmlFor="small">Petit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium">Moyen</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="large" id="large" />
                <Label htmlFor="large">Grand</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave}
              className="bg-red-500 hover:bg-red-600"
            >
              Appliquer les changements
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppearanceSettings;

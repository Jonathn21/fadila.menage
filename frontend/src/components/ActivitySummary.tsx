
import React from "react";
import { Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ActivitySummary = () => {
  // Mock data for activity - in a real app, this would come from your API
  const activities = [
    {
      id: 1,
      type: "success",
      message: "Connexion réussie",
      date: "Aujourd'hui, 14:30",
    },
    {
      id: 2,
      type: "warning",
      message: "Tentative de connexion échouée",
      date: "Hier, 21:15",
    },
    {
      id: 3,
      type: "success",
      message: "Mot de passe modifié",
      date: "15 juin 2025, 09:45",
    },
    {
      id: 4,
      type: "success",
      message: "Email vérifié",
      date: "10 juin 2025, 11:20",
    }
  ];
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Activité récente</CardTitle>
        <CardDescription>Historique des activités de votre compte</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start">
              <div className="mr-3 mt-0.5">
                {activity.type === "success" ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                )}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${
                  activity.type === "success" ? "text-green-700" : "text-amber-700"
                }`}>
                  {activity.message}
                </p>
                <div className="flex items-center mt-1 text-sm text-gray-500">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  {activity.date}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <a href="#" className="text-red-600 hover:text-red-800 text-sm font-medium">
            Voir tout l'historique →
          </a>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivitySummary;

import React from "react";
import { Badge } from "@/components/ui/badge";

export const getStatusBadge = (status: string) => {
  switch (status) {
    case "En attente":
      return <Badge variant="outline" className="bg-yellow-400 text-white border-0">En attente</Badge>;
    case "Refusée":
      return <Badge variant="outline" className="bg-red-500 text-white border-0">Refusée</Badge>;
    case "Acceptée":
      return <Badge variant="outline" className="bg-green-600 text-white border-0">Acceptée</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "Haute":
      return <Badge variant="outline" className="bg-red-500 text-white border-0">Haute</Badge>;
    case "Moyenne":
      return <Badge variant="outline" className="bg-orange-400 text-white border-0">Moyenne</Badge>;
    case "Basse":
      return <Badge variant="outline" className="bg-blue-500 text-white border-0">Basse</Badge>;
    default:
      return <Badge variant="outline">{priority}</Badge>;
  }
};
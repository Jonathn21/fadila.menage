// components/TrackApplication/StatusBadge.tsx
import React from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle 
} from "lucide-react";

interface StatusBadgeProps {
  status: "En attente" | "En cours de traitement" | "Acceptée" | "Refusée" | "Information supplémentaire requise";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case "En attente":
        return {
          icon: <Clock className="h-4 w-4" />,
          className: "bg-yellow-100 text-yellow-800 border-yellow-200",
        };
      case "En cours de traitement":
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          className: "bg-blue-100 text-blue-800 border-blue-200",
        };
      case "Acceptée":
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          className: "bg-green-100 text-green-800 ",
        };
      case "Refusée":
        return {
          icon: <XCircle className="h-4 w-4" />,
          className: "bg-red-100 text-red-800 border-red-200",
        };
      case "Information supplémentaire requise":
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          className: "bg-orange-100 text-orange-800 border-orange-200",
        };
      default:
        return {
          icon: <Clock className="h-4 w-4" />,
          className: "bg-gray-100 text-gray-800 border-gray-200",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge className={`flex items-center gap-1 border ${config.className}`}>
      {config.icon}
      {status}
    </Badge>
  );
};
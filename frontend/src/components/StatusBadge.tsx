
import React from "react";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  type: 'priority' | 'status';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type }) => {
  if (type === 'priority') {
    switch (status) {
      case "Basse":
        return <Badge className="bg-blue-500">{status}</Badge>;
      case "Normal":
        return <Badge className="bg-green-500">{status}</Badge>;
      case "Haute":
        return <Badge className="bg-yellow-500">{status}</Badge>;
      case "Urgente":
        return <Badge className="bg-red-500">{status}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  } else {
    switch (status) {
      case "En cours":
        return <Badge className="bg-green-500">{status}</Badge>;
      case "En attente":
        return <Badge className="bg-yellow-500">{status}</Badge>;
      case "Terminé":
        return <Badge className="bg-gray-500">{status}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }
};

export default StatusBadge;

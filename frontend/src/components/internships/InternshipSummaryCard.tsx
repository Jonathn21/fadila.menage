import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  switch (status) {
    case "En cours":
      return <Badge className="bg-green-500">{status}</Badge>;
    case "Terminé":
      return <Badge className="bg-gray-500">{status}</Badge>;
    case "À faire":
      return <Badge className="bg-blue-500">{status}</Badge>;
    case "En attente":
      return <Badge className="bg-yellow-500">{status}</Badge>;
    case "Accepté":
      return <Badge className="bg-blue-500">{status}</Badge>;
    case "Refusé":
      return <Badge className="bg-red-500">{status}</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

interface InternshipSummaryCardProps {
  //   resume: string;
  status: string;
  skills: string[];
}

const InternshipSummaryCard = ({
  //   resume,
  status,
  skills,
}: InternshipSummaryCardProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
          <div>
            <CardTitle className="text-xl">Resumé du profil</CardTitle>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">
              Lorem ipsum dolor sit, amet consectetur adipisicing elit. Pariatur
              neque aliquid cupiditate consequatur perferendis deserunt optio,
              praesentium asperiores excepturi vitae officia fugiat quae
              repellat nesciunt maxime saepe nemo quas dolores.
              {/* {internshipData.description} */}
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-2">Compétences</h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <Badge key={index} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4"></div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InternshipSummaryCard;

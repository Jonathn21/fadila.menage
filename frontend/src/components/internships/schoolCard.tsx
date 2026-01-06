import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Building, User } from "lucide-react";

interface SchoolCardProps {
  school: {
    name: string;
    location?: string;
    email?: string;
    phone?: string;
    contact: string;
    contactPhone: string;
    contactEmail: string;
  };
}

const SchoolCard = ({ school }: SchoolCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Établissement</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
            {school.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{school.name}</p>
            {school.location && (
              <p className="text-sm text-muted-foreground">{school.location}</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {school.contact && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{school.contact}</span>
            </div>
          )}
          {school.contactEmail && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{school.contactEmail}</span>
            </div>
          )}
          {school.contactPhone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{school.contactPhone}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SchoolCard;

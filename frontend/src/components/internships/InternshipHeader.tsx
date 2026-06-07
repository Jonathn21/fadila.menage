import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface InternshipHeaderProps {
  id: string;
  title: string;
  subtitle: string;
  backUrl?: string;
}

const InternshipHeader = ({ 
  id, 
  title, 
  subtitle,
  backUrl = "/internships/pending" 
}: InternshipHeaderProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold">{title} {id}</h1>
        <p className="text-muted-foreground">
          {subtitle}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => navigate(backUrl)}>
          Retour à la liste
        </Button>
      </div>
    </div>
  );
};

export default InternshipHeader;
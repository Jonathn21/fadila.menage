import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface Action {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary";
}

interface ActionsCardProps {
  actions: Action[];
}

const ActionsCard = ({ actions }: ActionsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {actions.map((action, index) => (
            <Button 
              key={index}
              className="w-full" 
              variant={action.variant || "default"}
              onClick={action.onClick}
            >
              <action.icon className="h-4 w-4 mr-2" />
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActionsCard;
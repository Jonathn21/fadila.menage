import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { LineChart } from "@/components/ui/chart";

interface ActivityTabProps {
  activityData: {
    day: string;
    value: number;
  }[];
}

const ActivityTab: React.FC<ActivityTabProps> = ({ activityData }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activité hebdomadaire</CardTitle>
        <CardDescription>Nombre de demandes traitées par jour</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <LineChart
            data={activityData}
            index="day"
            categories={["value"]}
            colors={["blue"]}
            valueFormatter={(value) => `${value} demandes`}
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between mt-6 gap-2 sm:gap-0">
          <div className="text-center">
            <h4 className="text-sm font-medium text-muted-foreground">Cette semaine</h4>
            <p className="text-lg sm:text-xl md:text-2xl font-bold">70</p>
          </div>
          <div className="text-center">
            <h4 className="text-sm font-medium text-muted-foreground">Moyenne</h4>
            <p className="text-lg sm:text-xl md:text-2xl font-bold">65</p>
          </div>
          <div className="text-center">
            <h4 className="text-sm font-medium text-muted-foreground">Variation</h4>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-500">+7%</p>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-border">
          <Button asChild variant="outline" className="w-full">
            <Link to="/analytics" className="flex items-center justify-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Voir les statistiques détaillées
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityTab;
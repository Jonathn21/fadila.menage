import React from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Activity {
  date: Date;
  action: string;
  actor: string;
  description: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

const ActivityTimeline = ({ activities }: ActivityTimelineProps) => {
  return (
    <div className="relative before:absolute before:left-[15px] before:top-0 before:h-full before:w-[2px] before:bg-muted">
      <div className="space-y-6 relative">
        {activities.map((activity, index) => (
          <div key={index} className="ml-8 relative">
            <div className="absolute left-[-25px] rounded-full bg-primary w-6 h-6 flex items-center justify-center text-white font-bold">
              {index + 1}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <h3 className="font-medium">{activity.action}</h3>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(activity.date, { addSuffix: true, locale: fr })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{activity.actor}</p>
              <p className="text-sm">{activity.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityTimeline;
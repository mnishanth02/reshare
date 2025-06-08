import type { Doc } from "@/convex/_generated/dataModel";
import { Badge } from "@ui/badge";
import { Card, CardContent } from "@ui/card";
import { Calendar, Clock, MapPin } from "lucide-react";

// Copied ActivityItem component - consider moving to its own file later
const ActivityItem = ({
  activity,
  isSelected,
  onClick,
}: {
  activity: Doc<"activities">;
  isSelected?: boolean;
  onClick?: () => void;
}) => {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getActivityTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "running":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
      case "cycling":
        return "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200";
      case "hiking":
        return "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200";
      default:
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
    }
  };

  return (
    <Card
      className={`mb-2 cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 py-2 ${
        isSelected
          ? "border-l-primary shadow-md bg-primary/5"
          : "border-l-transparent hover:border-l-primary/50"
      }`}
      onClick={onClick}
    >
      <CardContent className="py-2 px-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h4 className="font-semibold text-sm leading-tight line-clamp-2 flex-1">
              {activity.name}
            </h4>
            <Badge
              variant="secondary"
              className={`${getActivityTypeColor(activity.activityType)} text-xs font-medium ml-2 shrink-0`}
            >
              {activity.activityType}
            </Badge>
          </div>

          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 mr-1" />
            <span>
              {new Date(activity.activityDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">
                {activity.distance ? `${(activity.distance / 1000).toFixed(1)} km` : "--"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{formatDuration(activity.duration)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityItem;

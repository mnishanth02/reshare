import type { Doc } from "@/convex/_generated/dataModel";
import { Calendar, Clock, MapPin, Mountain } from "lucide-react";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";

interface JourneyHeaderProps {
  journey: Doc<"journeys">;
}

const JourneyHeader = ({ journey }: JourneyHeaderProps) => {
  if (!journey) {
    return (
      <div className="flex flex-col md:flex-row md:items-start w-full md:max-w-7xl mx-auto justify-between gap-2 md:gap-0">
        <Skeleton className="h-12 w-1/3 bg-muted rounded animate-pulse" />
        <Skeleton className="h-12 w-1/3 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleDateString();
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return "0 km";
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0h 0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="flex flex-col md:flex-row  w-full md:max-w-7xl mx-auto md:items-center  justify-between  gap-2 md:gap-0">
      {/* Left: Title, Description, Badges */}
      <div className="flex flex-col gap-2">
        <span className="flex flex-col">
          <h1 className="text-2xl md:text-2xl font-bold tracking-tight truncate leading-tight">
            {journey.title}
          </h1>
          <span>
            {journey.description && (
              <p className="text-muted-foreground text-sm mt-0.5 line-clamp-2 max-w-2xl">
                {journey.description}
              </p>
            )}
          </span>
        </span>
        <div className="flex flex-wrap gap-1 ">
          {journey.defaultActivityType && (
            <Badge
              variant="secondary"
              className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium px-2 py-0.5 rounded-md"
            >
              {journey.defaultActivityType.toUpperCase()}
            </Badge>
          )}
          <Badge
            variant="secondary"
            className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-medium px-2 py-0.5 rounded-md"
          >
            {journey.status.toUpperCase()}
          </Badge>
          <Badge
            variant="secondary"
            className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2 py-0.5 rounded-md"
          >
            {formatDate(journey.createdAt)}
          </Badge>
        </div>
      </div>

      {/* Right: Stats */}
      <div className="mt-1 md:mt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
              <MapPin className="h-4 w-4" />
              <span>DISTANCE</span>
            </div>
            <div className="text-lg font-semibold">{formatDistance(journey.totalDistance)}</div>
          </div>
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
              <Clock className="h-4 w-4" />
              <span>DURATION</span>
            </div>
            <div className="text-lg font-semibold">{formatDuration(journey.totalDuration)}</div>
          </div>
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
              <Mountain className="h-4 w-4" />
              <span>ELEVATION</span>
            </div>
            <div className="text-lg font-semibold">
              {journey.totalElevationGain?.toLocaleString() || "0"} m
            </div>
          </div>
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
              <Calendar className="h-4 w-4" />
              <span>ACTIVITIES</span>
            </div>
            <div className="text-lg font-semibold">{journey.activityCount || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JourneyHeader;

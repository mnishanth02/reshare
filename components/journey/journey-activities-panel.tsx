"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import {
  Activity,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  MapPin,
  Search,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

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
      className={`mb-3 cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 ${
        isSelected
          ? "border-l-primary shadow-md bg-primary/5"
          : "border-l-transparent hover:border-l-primary/50"
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
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

interface JourneyActivitiesPanelProps {
  allActivities: Doc<"activities">[];
  selectedActivityId: string | null;
  onActivitySelect: (id: string | null) => void;
  isPanelVisible: boolean;
  onTogglePanel: () => void;
  layout: "mobile" | "desktop";
}

export const JourneyActivitiesPanel = ({
  allActivities,
  selectedActivityId,
  onActivitySelect,
  isPanelVisible,
  onTogglePanel,
  layout,
}: JourneyActivitiesPanelProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredActivities = allActivities.filter(
    (activity) =>
      activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.activityType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cardClasses =
    layout === "desktop"
      ? `transition-all duration-300 ${isPanelVisible ? "" : "max-w-[60px]"} flex flex-col p-0 h-full`
      : "p-0";

  const headerClasses =
    layout === "desktop"
      ? "cursor-pointer hover:bg-muted/50 transition-colors   px-4 py-2"
      : "cursor-pointer hover:bg-muted/50 transition-colors p-2 px-4";

  const titleClasses =
    layout === "desktop" ? "flex items-center text-base" : "text-lg flex items-center";
  const iconSize = layout === "desktop" ? "h-4 w-4" : "h-5 w-5";

  return (
    <Card className={cn(cardClasses)}>
      <CardHeader className={cn(headerClasses)} onClick={onTogglePanel}>
        {layout === "mobile" && (
          <div className="flex justify-between items-center">
            <CardTitle className={titleClasses}>
              <Activity className={`${iconSize} mr-2 text-primary`} />
              Activities ({filteredActivities.length})
            </CardTitle>
            {isPanelVisible ? (
              <ChevronUp className={`${iconSize} text-muted-foreground`} />
            ) : (
              <ChevronDown className={`${iconSize} text-muted-foreground`} />
            )}
          </div>
        )}
        {layout === "desktop" &&
          (isPanelVisible ? (
            <div className="flex justify-between items-center">
              <CardTitle className={cn(titleClasses, "")}>
                <Activity className={`${iconSize} mr-2 text-primary`} />
                Activities ({filteredActivities.length})
              </CardTitle>
              <ChevronLeft className={`${iconSize} text-muted-foreground`} />
            </div>
          ) : (
            <div className="flex justify-center">
              <ChevronRight className={`${iconSize} text-muted-foreground`} />
            </div>
          ))}
      </CardHeader>

      {isPanelVisible && (
        <CardContent
          className={`
            ${layout === "desktop" ? "flex-1 flex flex-col p-4 space-y-4" : "space-y-4"}
            ${layout === "mobile" ? "p-4" : ""} 
          `}
        >
          {allActivities.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          <div
            className={`
            ${layout === "desktop" ? "flex-1 overflow-y-auto" : "max-h-[400px] overflow-y-auto space-y-2"}
            ${layout === "mobile" ? "pr-2" : "pr-1"} 
            custom-scrollbar
            `}
          >
            {filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery
                  ? "No activities match your search"
                  : "No activities found for this journey"}
              </div>
            ) : (
              filteredActivities.map((activity) => (
                <ActivityItem
                  key={activity._id}
                  activity={activity}
                  isSelected={selectedActivityId === activity._id}
                  onClick={() =>
                    onActivitySelect(selectedActivityId === activity._id ? null : activity._id)
                  }
                />
              ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

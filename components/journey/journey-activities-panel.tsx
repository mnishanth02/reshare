"use client";

import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Activity, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Search } from "lucide-react";
import { useState } from "react";
import { ActivityUploader } from "../common/gpx-uploader";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import ActivityItem from "./activities/activity-item";

interface JourneyActivitiesPanelProps {
  journeyId: Id<"journeys">;
  allActivities: Doc<"activities">[];
  selectedActivityId: string | null;
  onActivitySelect: (id: string | null) => void;
  isPanelVisible: boolean;
  onTogglePanel: () => void;
  layout: "mobile" | "desktop";
}

export const JourneyActivitiesPanel = ({
  journeyId,
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
      ? "cursor-pointer hover:bg-muted/50 transition-colors px-4 py-2"
      : "cursor-pointer hover:bg-muted/50 transition-colors py-2 px-4";

  const titleClasses =
    layout === "desktop" ? "flex items-center text-base" : "text-lg flex items-center";
  const iconSize = layout === "desktop" ? "h-4 w-4" : "h-5 w-5";

  return (
    <Card
      className={cn(cardClasses, {
        "cursor-pointer hover:bg-muted/50 transition-colors": !isPanelVisible,
      })}
      onClick={isPanelVisible ? undefined : onTogglePanel}
    >
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
            ${layout === "desktop" ? "flex-1 flex flex-col px-4 space-y-3" : "space-y-3"}
            ${layout === "mobile" ? "p-2" : ""}
          `}
        >
          {/* Search bar */}
          {allActivities.length > 0 && (
            <div className="relative p-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          {/* Activities List or Empty State with Uploader */}
          <div
            className={cn(
              "flex-1 space-y-2 overflow-y-auto custom-scrollbar",
              layout === "desktop" ? "pr-1" : "max-h-[400px] pr-2"
            )}
          >
            {allActivities.length === 0 ? (
              // Show prominent uploader when there are no activities
              <ActivityUploader journeyId={journeyId} />
            ) : filteredActivities.length === 0 ? (
              // Message for when search yields no results
              <div className="py-8 text-center text-muted-foreground">
                No activities match your search.
              </div>
            ) : (
              // Display the list of filtered activities
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

          {/* Always-visible section to add more activities */}
          {allActivities.length > 0 && (
            <div className="mt-auto pt-2 border-t">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                Add another activity
              </h3>
              <ActivityUploader journeyId={journeyId} variant="minimal" />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

"use client";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  Activity,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Layers,
  MapIcon,
  MapPin,
  Maximize2,
  Minimize2,
  Search,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Skeleton } from "../ui/skeleton";
import JourneyHeader from "./journey-header";

interface JourneyClientProps {
  journeyId: string;
}

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

const MapPlaceholder = ({ isFullscreen = false }: { isFullscreen?: boolean }) => (
  <div className="h-full w-full rounded-lg bg-gradient-to-br from-muted to-muted/50 flex flex-col items-center justify-center text-muted-foreground px-6 relative overflow-hidden">
    <div className="absolute inset-0 bg-grid-pattern opacity-5" />
    <div className="relative z-10 text-center space-y-4">
      <div className="p-4 rounded-full bg-background shadow-lg">
        <MapIcon className="h-12 w-12 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Interactive Map</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {isFullscreen
            ? "Full-screen map view with route visualization and activity markers"
            : "Route visualization and activity tracking coming soon"}
        </p>
      </div>
      <div className="flex items-center justify-center gap-2 pt-2">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        <div
          className="w-2 h-2 bg-primary/60 rounded-full animate-pulse"
          style={{ animationDelay: "0.2s" }}
        />
        <div
          className="w-2 h-2 bg-primary/30 rounded-full animate-pulse"
          style={{ animationDelay: "0.4s" }}
        />
      </div>
    </div>
  </div>
);

const CustomizationPanel = () => (
  <div className="space-y-4 px-4 py-2">
    <h3 className="font-semibold flex items-center gap-2 text-sm">
      <Settings className="h-4 w-4" />
      Map Settings
    </h3>

    <Card className="py-2">
      <CardHeader className="">
        <CardTitle className="text-sm">Map Style</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-3">
        <Button variant="outline" size="sm" className="w-full justify-start h-12">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span>Outdoor</span>
          </div>
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-start h-12">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500" />
            <span>Satellite</span>
          </div>
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-start h-12">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-500" />
            <span>Minimal</span>
          </div>
        </Button>
      </CardContent>
    </Card>

    <Card className="py-2">
      <CardHeader className="">
        <CardTitle className="text-sm">Route Display</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-3">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">LINE WIDTH</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full">
              <div className="w-1/3 h-full bg-primary rounded-full" />
            </div>
            <span className="text-xs">3px</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">OPACITY</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full">
              <div className="w-4/5 h-full bg-primary rounded-full" />
            </div>
            <span className="text-xs">80%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export function JourneyClient({ journeyId }: JourneyClientProps) {
  const [showActivities, setShowActivities] = useState(true);
  const [showCustomization, setShowCustomization] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const journey = useQuery(api.journeys.queries.getJourney, {
    journeyId: journeyId as Id<"journeys">,
  });

  if (journey === undefined) {
    return (
      <div className="px-6 py-4 w-full max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-8 w-1/2 bg-muted rounded animate-pulse" />
            <Skeleton className="h-4 w-3/4 bg-muted rounded animate-pulse" />
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (journey === null) {
    return (
      <div className="px-6 py-4 w-full max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Journey not found</h2>
            <p className="text-muted-foreground">
              The journey you're looking for doesn't exist or may have been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activities = journey.activities || [];
  //  TODO: Need to verify the logic again when to use FIlter for activities
  const filteredActivities = activities.filter(
    (activity) =>
      activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.activityType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="px-6 py-2 w-full mx-auto">
      <JourneyHeader journey={journey} />

      {/* Mobile Layout */}
      <div className="block lg:hidden mt-4 space-y-4">
        {/* Activities Section */}
        <Card className="p-0">
          <CardHeader
            className="cursor-pointer hover:bg-muted/50 transition-colors p-2 px-4"
            onClick={() => setShowActivities(!showActivities)}
          >
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center">
                <Activity className="h-5 w-5 mr-2 text-primary" />
                Activities ({filteredActivities.length})
              </CardTitle>
              {showActivities ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {showActivities && (
            <CardContent className="space-y-4">
              {activities.length > 0 && (
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
              <div className="max-h-[400px] overflow-y-auto space-y-2">
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
                      isSelected={selectedActivity === activity._id}
                      onClick={() =>
                        setSelectedActivity(selectedActivity === activity._id ? null : activity._id)
                      }
                    />
                  ))
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Map Section */}
        <Card className="py-3">
          <CardHeader className="px-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center">
                <MapIcon className="h-5 w-5 mr-2 text-primary" /> Map
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMapFullscreen(!isMapFullscreen)}
              >
                {isMapFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 m-0 py-0">
            <div className={isMapFullscreen ? "h-[70vh]" : "h-[300px]"}>
              <MapPlaceholder isFullscreen={isMapFullscreen} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Layout - Three Column */}
      <div
        className="hidden lg:grid gap-4 mt-4 h-[calc(100vh-250px)] min-h-[600px]"
        style={{
          gridTemplateColumns: `
            ${showActivities ? "350px" : "50px"} 
            1fr 
            ${showCustomization ? "350px" : "50px"}
          `,
          transition: "grid-template-columns 0.3s ease",
        }}
      >
        {/* Column 1: Activities (Collapsible) */}
        <Card
          className={`transition-all duration-300 ${showActivities ? "" : "max-w-[60px]"} flex flex-col p-0`}
        >
          <CardHeader
            className="cursor-pointer hover:bg-muted/50 transition-colors border-b px-4 py-3"
            onClick={() => setShowActivities(!showActivities)}
          >
            {showActivities ? (
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center text-base">
                  <Activity className="h-4 w-4 mr-2 text-primary" />
                  Activities ({filteredActivities.length})
                </CardTitle>
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </div>
            ) : (
              <div className="flex justify-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </CardHeader>

          {showActivities && (
            <CardContent className="flex-1 flex flex-col p-4 space-y-4">
              {activities.length > 0 && (
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
              <div className="flex-1 overflow-y-auto">
                {filteredActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery
                      ? "No activities match your search"
                      : "No activities found for this journey"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredActivities.map((activity) => (
                      <ActivityItem
                        key={activity._id}
                        activity={activity}
                        isSelected={selectedActivity === activity._id}
                        onClick={() =>
                          setSelectedActivity(
                            selectedActivity === activity._id ? null : activity._id
                          )
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Column 2: Map (Always Visible) */}
        <Card className="flex flex-col p-0">
          <CardContent className="flex-1 p-0">
            <MapPlaceholder />
          </CardContent>
        </Card>

        {/* Column 3: Customization (Collapsible) */}
        <Card
          className={`transition-all duration-300 ${showCustomization ? "" : "max-w-[60px]"} flex flex-col p-0`}
        >
          <CardHeader
            className="cursor-pointer hover:bg-muted/50 transition-colors border-b px-4 py-3"
            onClick={() => setShowCustomization(!showCustomization)}
          >
            {showCustomization ? (
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center text-base">
                  <Layers className="h-4 w-4 mr-2 text-primary" />
                  Customize
                </CardTitle>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ) : (
              <div className="flex justify-center">
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </CardHeader>
          {showCustomization && (
            <div className="flex-1 overflow-y-auto">
              <CustomizationPanel />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";

import { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { JourneyActivitiesPanel } from "./journey-activities-panel";
import { JourneyCustomizationPanel } from "./journey-customization-panel";
import JourneyHeader from "./journey-header";
import { JourneyMapDisplay } from "./journey-map-display";

interface JourneyClientProps {
  journeyId: string;
}

export function JourneyClient({ journeyId }: JourneyClientProps) {
  const [showActivities, setShowActivities] = useState(true);
  const [showCustomization, setShowCustomization] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

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

  return (
    <div className="px-6 py-2 w-full mx-auto">
      <JourneyHeader journey={journey} />

      {/* Mobile Layout */}
      <div className="block lg:hidden mt-4 space-y-4">
        {/* Activities Section */}
        <JourneyActivitiesPanel
          allActivities={activities}
          selectedActivityId={selectedActivity}
          onActivitySelect={setSelectedActivity}
          isPanelVisible={showActivities}
          onTogglePanel={() => setShowActivities(!showActivities)}
          layout="mobile"
        />

        {/* Map Section */}
        <JourneyMapDisplay layout="mobile" />
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
        <JourneyActivitiesPanel
          allActivities={activities}
          selectedActivityId={selectedActivity}
          onActivitySelect={setSelectedActivity}
          isPanelVisible={showActivities}
          onTogglePanel={() => setShowActivities(!showActivities)}
          layout="desktop"
        />

        {/* Column 2: Map (Always Visible) */}
        <JourneyMapDisplay layout="desktop" />

        {/* Column 3: Customization (Collapsible) */}
        <JourneyCustomizationPanel
          isPanelVisible={showCustomization}
          onTogglePanel={() => setShowCustomization(!showCustomization)}
        />
      </div>
    </div>
  );
}

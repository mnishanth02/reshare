"use client";

import type { api } from "@/convex/_generated/api";
import { type Preloaded, usePreloadedQuery } from "convex/react";
import { Calendar, Clock, Gauge, MapPin, Mountain } from "lucide-react";

interface JourneyClientProps {
  preloadedJourney: Preloaded<typeof api.journeys.queries.getJourney>;
}

export function JourneyClient({ preloadedJourney }: JourneyClientProps) {
  const journey = usePreloadedQuery(preloadedJourney);

  if (journey === undefined || journey === null) {
    return null;
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
    <div className="px-8 py-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{journey.title}</h1>
          {journey.description && (
            <p className="text-muted-foreground mt-2">{journey.description}</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <MapPin className="h-5 w-5" />
              <span className="text-sm font-medium">Distance</span>
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {formatDistance(journey.totalDistance)}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Mountain className="h-5 w-5" />
              <span className="text-sm font-medium">Elevation</span>
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {journey.totalElevationGain?.toLocaleString() || "0"} m
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <span className="text-sm font-medium">Duration</span>
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {formatDuration(journey.totalDuration)}
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Journey Details</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Created: {formatDate(journey.createdAt)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <span>Status: {journey.status}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Map</h3>
              <div className="mt-2 aspect-video w-full rounded bg-muted">
                {/* Map will be implemented here */}
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Map view coming soon
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

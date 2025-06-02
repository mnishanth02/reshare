"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Calendar, Gauge } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import JourneyHeader from "./journey-header";

interface JourneyClientProps {
  journeyId: string;
}

export function JourneyClient({ journeyId }: JourneyClientProps) {
  const journey = useQuery(api.journeys.queries.getJourney, {
    journeyId: journeyId as Id<"journeys">,
  });

  if (journey === undefined) {
    return (
      <div className="px-6 py-2 w-full">
        <Skeleton className="h-12 w-1/3 bg-muted rounded animate-pulse mb-4" />
        <Skeleton className="h-64 w-full bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (journey === null) {
    return <div>Journey not found</div>;
  }

  return (
    <div className="px-6 py-2 w-full">
      <JourneyHeader journey={journey} />

      <div className="rounded-lg border p-4 mt-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Journey Details</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Created: {new Date(journey._creationTime).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <span>Status: {journey.status || "Active"}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Map</h3>
            <div className="mt-2 aspect-video w-full rounded bg-muted">
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Map view coming soon
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

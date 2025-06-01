"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CalendarDays, MapPin } from "lucide-react";

// Number of skeleton loaders to show
export const SKELETON_COUNT = 6;

// Skeleton loader for individual journey card
export const JourneyCardSkeleton = () => (
  <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-all hover:shadow-md h-full flex flex-col">
    <Skeleton className="h-48 w-full" />
    <div className="p-4 flex-1 flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-4 w-full mb-3" />
      <Skeleton className="h-3 w-5/6 mb-4" />

      <div className="mt-auto pt-4 border-t">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  </div>
);

// Skeleton for the entire dashboard loading state
export const DashboardSkeleton = () => (
  <div className="space-y-8">
    <div className="flex justify-between items-center">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-10 w-32" />
    </div>

    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <Skeleton className="h-10 w-full lg:w-1/2" />
        <Skeleton className="h-10 w-full lg:w-48" />
      </div>
      <Skeleton className="h-16 w-full" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <JourneyCardSkeleton key={`skeleton-${i}-${Date.now()}`} />
      ))}
    </div>
  </div>
);

"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "@/convex/_generated/dataModel";
import { Grid3X3, List, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { JourneyCard } from "./journey-card";

interface Journey {
  _id: Id<"journeys">;
  title: string;
  description?: string;
  coverImageId?: Id<"_storage">;
  totalDistance?: number;
  activityCount?: number;
  lastActivityDate?: number;
  status: "active" | "archived";
  visibility: "private" | "unlisted" | "public";
  createdAt: number;
  updatedAt: number;
}

interface JourneyListProps {
  journeys: Journey[];
  loadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore?: boolean;
}

export function JourneyList({
  journeys,
  loadMore,
  hasMore,
  isLoading,
  isLoadingMore,
}: JourneyListProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const observerRef = useRef<HTMLDivElement>(null);

  // Load view mode preference from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem("journey-view-mode") as "grid" | "list";
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }
  }, []);

  // Save view mode preference to localStorage
  useEffect(() => {
    localStorage.setItem("journey-view-mode", viewMode);
  }, [viewMode]);

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isLoading, isLoadingMore, loadMore]);

  if (isLoading) {
    return <LoadingSkeleton viewMode={viewMode} />;
  }

  if (journeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Plus className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No journeys found</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Start your adventure by creating your first journey. Upload GPX files and track your
          outdoor activities.
        </p>
        <Link href="/journey/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Journey
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {journeys.length} journey{journeys.length !== 1 ? "s" : ""} found
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="px-3"
          >
            <Grid3X3 className="h-4 w-4" />
            <span className="sr-only">Grid view</span>
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="px-3"
          >
            <List className="h-4 w-4" />
            <span className="sr-only">List view</span>
          </Button>
        </div>
      </div>

      {/* Journey Cards */}
      <div
        className={
          viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"
        }
      >
        {journeys.map((journey) => (
          <JourneyCard key={journey._id} journey={journey} />
        ))}
      </div>

      {/* Load More Trigger */}
      {hasMore && (
        <div ref={observerRef} className="flex justify-center py-8">
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more journeys...</span>
            </div>
          ) : (
            <Button variant="outline" onClick={loadMore}>
              Load More
            </Button>
          )}
        </div>
      )}

      {/* End of Results */}
      {!hasMore && journeys.length > 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          You've reached the end of your journeys
        </div>
      )}
    </div>
  );
}

const LoadingSkeleton = ({ viewMode }: { viewMode: "grid" | "list" }) => (
  <div
    className={
      viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"
    }
  >
    {Array.from({ length: 6 }, (_, i) => `skeleton-${i}`).map((key) => (
      <div key={key} className="space-y-3">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    ))}
  </div>
);

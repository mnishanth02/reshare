"use client";

import {
  type FilterState,
  JourneyFilters,
  JourneyList,
  JourneySearch,
  JourneySort,
} from "@/components/dashboard";
import { DashboardSkeleton } from "@/components/dashboard/journey-skeleton";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { usePaginatedQuery } from "convex/react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

export default function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { results, status, loadMore } = usePaginatedQuery(
    api.journeys.queries.getUserJourneys,
    {
      searchTerm: searchTerm || undefined,
      status: filters.status,
      defaultActivityType: filters.defaultActivityType,
      dateFilter: filters.dateFilter,
      sortBy: sortBy as "createdAt" | "updatedAt" | "title" | "totalDistance",
      sortOrder,
    },
    { initialNumItems: 12 }
  );

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const handleSortChange = useCallback((newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  }, []);

  const handleLoadMore = useCallback(() => {
    loadMore(12);
  }, [loadMore]);

  const journeys = results || [];
  const hasMore = status === "CanLoadMore";
  const isLoadingMore = status === "LoadingMore";
  const isLoadingFirstPage = status === "LoadingFirstPage";
  const noJourneys = journeys.length === 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Journeys</h1>
          <p className="text-muted-foreground mt-2">Manage and explore your outdoor adventures</p>
        </div>
        <Link href="/journey/new" hidden={noJourneys}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Journey
          </Button>
        </Link>
      </div>

      {isLoadingFirstPage ? (
        <DashboardSkeleton />
      ) : noJourneys ? (
        <EmptyState />
      ) : (
        <>
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <JourneySearch
                  onSearch={handleSearch}
                  initialSearchTerm={searchTerm}
                  placeholder="Search journeys by title or description..."
                />
              </div>
              <div className="flex-shrink-0">
                <JourneySort
                  onSortChange={handleSortChange}
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                />
              </div>
            </div>

            <JourneyFilters
              onFiltersChange={handleFiltersChange}
              currentFilters={filters}
              activityTypes={ACTIVITY_TYPES}
            />
          </div>

          <JourneyList
            journeys={journeys}
            loadMore={handleLoadMore}
            hasMore={hasMore}
            isLoading={isLoadingFirstPage}
            isLoadingMore={isLoadingMore}
          />
        </>
      )}
    </div>
  );
}

const EmptyState = () => (
  <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
    <h2 className="text-2xl font-semibold mb-3">No Journeys Yet!</h2>
    <p className="text-muted-foreground mb-6">
      It looks like you haven't created any journeys. Start your adventure now!
    </p>
    <Link href="/journey/new">
      <Button size="lg">
        <Plus className="h-5 w-5 mr-2" />
        Create Your First Journey
      </Button>
    </Link>
  </div>
);

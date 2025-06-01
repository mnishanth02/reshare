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
import { parseAsString, parseAsStringEnum, useQueryState } from "nuqs";
import { useCallback } from "react";

// Define URL query parameter parsers
const sortOrderParser = parseAsStringEnum(["asc", "desc"] as const);
const sortByParser = parseAsStringEnum([
  "createdAt",
  "updatedAt",
  "title",
  "totalDistance",
] as const);

// Define a type-safe parser for filters
const filterParser = {
  parse: (value: string): FilterState => {
    try {
      return JSON.parse(value) as FilterState;
    } catch {
      return {};
    }
  },
  serialize: (value: FilterState): string => JSON.stringify(value),
};

export default function DashboardPage() {
  // URL state for search, filters, and sorting
  const [searchTerm, setSearchTerm] = useQueryState("q", parseAsString.withDefault(""));

  const [filters, setFilters] = useQueryState("filters", filterParser);

  const [sortBy, setSortBy] = useQueryState("sort", sortByParser.withDefault("updatedAt"));

  const [sortOrder, setSortOrder] = useQueryState("order", sortOrderParser.withDefault("desc"));

  // Ensure we have a valid FilterState object
  const safeFilters = filters || {};

  // Fetch data using the URL state
  const { results, status, loadMore } = usePaginatedQuery(
    api.journeys.queries.getUserJourneys,
    {
      searchTerm: searchTerm || undefined,
      status: safeFilters.status,
      defaultActivityType: safeFilters.defaultActivityType,
      dateFilter: safeFilters.dateFilter,
      sortBy: sortBy,
      sortOrder,
    },
    { initialNumItems: 12 }
  );

  const handleSearch = useCallback(
    (term: string) => {
      void setSearchTerm(term || null); // Use null to remove the param when empty
    },
    [setSearchTerm]
  );

  const handleFiltersChange = useCallback(
    (newFilters: FilterState) => {
      // Remove empty filters
      const cleanFilters = Object.entries(newFilters).reduce<FilterState>((acc, [key, value]) => {
        if (
          value !== undefined &&
          value !== "" &&
          !(value && typeof value === "object" && Object.keys(value).length === 0)
        ) {
          acc[key as keyof FilterState] = value;
        }
        return acc;
      }, {});

      void setFilters(Object.keys(cleanFilters).length > 0 ? cleanFilters : null);
    },
    [setFilters]
  );

  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: "asc" | "desc") => {
      void setSortBy(newSortBy as "createdAt" | "updatedAt" | "title" | "totalDistance");
      void setSortOrder(newSortOrder);
    },
    [setSortBy, setSortOrder]
  );

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
                  key={searchTerm} // Force re-render when searchTerm changes
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
              currentFilters={safeFilters}
              activityTypes={ACTIVITY_TYPES}
              key={JSON.stringify(safeFilters)} // Force re-render when filters change
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

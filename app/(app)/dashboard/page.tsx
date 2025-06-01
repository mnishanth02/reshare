"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { useMutation, usePaginatedQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseAsString, parseAsStringEnum, useQueryState } from "nuqs";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { JourneyFilters } from "@/components/dashboard/journey-filters";
import type { FilterState } from "@/components/dashboard/journey-filters";
// Import components
import { JourneyList } from "@/components/dashboard/journey-list";
import { JourneySearch } from "@/components/dashboard/journey-search";
import { DashboardSkeleton } from "@/components/dashboard/journey-skeleton";
import { JourneySort } from "@/components/dashboard/journey-sort";

type SortBy = "createdAt" | "updatedAt" | "title" | "totalDistance";
type SortOrder = "asc" | "desc";

// Define URL query parameter parsers
const sortOrderParser = parseAsStringEnum<SortOrder>(["asc", "desc"] as const);
const sortByParser = parseAsStringEnum<SortBy>([
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

  const [sortBy, setSortBy] = useQueryState<SortBy>("sort", sortByParser.withDefault("updatedAt"));
  const [sortOrder, setSortOrder] = useQueryState<SortOrder>(
    "order",
    sortOrderParser.withDefault("desc")
  );

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

  const router = useRouter();
  const createJourney = useMutation(api.journeys.mutations.create);
  const [isCreating, setIsCreating] = useState(false);

  const handleLoadMore = useCallback(() => {
    loadMore(12);
  }, [loadMore]);

  const handleCreateJourney = useCallback(async () => {
    if (isCreating) return;

    setIsCreating(true);
    const toastId = toast.loading("Creating your journey...");

    try {
      const journeyId = await createJourney({
        title: "Untitled Journey",
        description: "",
        visibility: "private",
        defaultMapStyle: "outdoors",
        defaultActivityType: "hike",
        defaultColorPalette: "blue",
      });

      toast.success("Journey created!", { id: toastId });
      router.push(`/journey/${journeyId}`);
      // return journeyId;
    } catch (error) {
      console.error("Error creating journey:", error);
      toast.error("Failed to create journey. Please try again.", { id: toastId });
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [createJourney, router, isCreating]);

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
        <Button
          onClick={handleCreateJourney}
          disabled={isCreating || isLoadingFirstPage}
          className="inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {isCreating ? "Creating..." : "New Journey"}
        </Button>
      </div>

      {isLoadingFirstPage ? (
        <DashboardSkeleton />
      ) : noJourneys ? (
        <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
          <h2 className="text-2xl font-semibold mb-3">No Journeys Yet!</h2>
          <p className="text-muted-foreground mb-6">
            It looks like you haven't created any journeys. Start your adventure now!
          </p>
          <Button onClick={handleCreateJourney} disabled={isCreating} className="gap-2">
            <Plus className="h-4 w-4" />
            {isCreating ? "Creating..." : "Create Your First Journey"}
          </Button>
        </div>
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

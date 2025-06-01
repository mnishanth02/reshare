"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useQueryState } from "nuqs";
import { useCallback } from "react";

interface JourneySortProps {
  onSortChange?: (sortBy: string, sortOrder: "asc" | "desc") => void;
  currentSortBy?: string;
  currentSortOrder?: "asc" | "desc";
}

const SORT_OPTIONS = [
  { value: "updatedAt", label: "Last Updated" },
  { value: "createdAt", label: "Date Created" },
  { value: "title", label: "Title" },
  { value: "totalDistance", label: "Distance" },
];

export function JourneySort({
  onSortChange,
  currentSortBy: propSortBy,
  currentSortOrder: propSortOrder,
}: JourneySortProps) {
  // Use URL state if no props are provided
  const [sortBy, setSortBy] = useQueryState("sort", {
    defaultValue: propSortBy || "updatedAt",
  });

  const [sortOrder, setSortOrder] = useQueryState("order", {
    defaultValue: propSortOrder || "desc",
  });

  // If props are provided, use them instead of URL state
  const currentSortBy = propSortBy !== undefined ? propSortBy : sortBy;
  const currentSortOrder =
    propSortOrder !== undefined ? propSortOrder : (sortOrder as "asc" | "desc");

  const handleSortByChange = useCallback(
    async (newSortBy: string) => {
      if (onSortChange) {
        onSortChange(newSortBy, currentSortOrder);
      } else {
        await setSortBy(newSortBy);
      }
    },
    [onSortChange, currentSortOrder, setSortBy]
  );

  const handleSortOrderToggle = useCallback(async () => {
    const newOrder = currentSortOrder === "asc" ? "desc" : "asc";
    if (onSortChange) {
      onSortChange(currentSortBy, newOrder);
    } else {
      await setSortOrder(newOrder);
    }
  }, [onSortChange, currentSortBy, currentSortOrder, setSortOrder]);

  const getSortIcon = () => {
    if (currentSortOrder === "asc") {
      return <ArrowUp className="h-4 w-4" />;
    }
    if (currentSortOrder === "desc") {
      return <ArrowDown className="h-4 w-4" />;
    }
    return <ArrowUpDown className="h-4 w-4" />;
  };

  const getSortLabel = () => {
    const option = SORT_OPTIONS.find((opt) => opt.value === currentSortBy);
    return option?.label || "Sort by";
  };

  // Don't render anything if we don't have a valid sort value
  if (!currentSortBy || !currentSortOrder) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Sort by:</span>

      <Select value={currentSortBy} onValueChange={handleSortByChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Sort by">{getSortLabel()}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={handleSortOrderToggle}
        className="px-3"
        title={`Sort ${currentSortOrder === "asc" ? "descending" : "ascending"}`}
      >
        {getSortIcon()}
        <span className="sr-only">
          Sort {currentSortOrder === "asc" ? "descending" : "ascending"}
        </span>
      </Button>
    </div>
  );
}

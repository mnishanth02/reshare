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
import { useEffect } from "react";

interface JourneySortProps {
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
  currentSortBy: string;
  currentSortOrder: "asc" | "desc";
}

const SORT_OPTIONS = [
  { value: "updatedAt", label: "Last Updated" },
  { value: "createdAt", label: "Date Created" },
  { value: "title", label: "Title" },
  { value: "totalDistance", label: "Distance" },
];

export function JourneySort({ onSortChange, currentSortBy, currentSortOrder }: JourneySortProps) {
  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedSortBy = localStorage.getItem("journey-sort-by");
    const savedSortOrder = localStorage.getItem("journey-sort-order") as "asc" | "desc";

    if (
      savedSortBy &&
      savedSortOrder &&
      (savedSortBy !== currentSortBy || savedSortOrder !== currentSortOrder)
    ) {
      onSortChange(savedSortBy, savedSortOrder);
    }
  }, [onSortChange, currentSortBy, currentSortOrder]);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem("journey-sort-by", currentSortBy);
    localStorage.setItem("journey-sort-order", currentSortOrder);
  }, [currentSortBy, currentSortOrder]);

  const handleSortByChange = (sortBy: string) => {
    onSortChange(sortBy, currentSortOrder);
  };

  const handleSortOrderToggle = () => {
    const newOrder = currentSortOrder === "asc" ? "desc" : "asc";
    onSortChange(currentSortBy, newOrder);
  };

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

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarIcon, Filter, X } from "lucide-react";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface DateFilter {
  field: "createdAt" | "updatedAt" | "lastActivityDate";
  startDate?: number;
  endDate?: number;
}

export interface FilterState {
  status?: "active" | "archived";
  defaultActivityType?: string;
  dateFilter?: DateFilter;
}

// Helper to safely parse filter state
const parseFilterState = (value: string | null): FilterState => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return {
      status: ["active", "archived"].includes(parsed.status) ? parsed.status : undefined,
      defaultActivityType: parsed.defaultActivityType || undefined,
      dateFilter: parsed.dateFilter
        ? {
            field: ["createdAt", "updatedAt", "lastActivityDate"].includes(parsed.dateFilter.field)
              ? (parsed.dateFilter.field as DateFilter["field"])
              : "updatedAt",
            startDate: parsed.dateFilter.startDate
              ? Number(parsed.dateFilter.startDate)
              : undefined,
            endDate: parsed.dateFilter.endDate ? Number(parsed.dateFilter.endDate) : undefined,
          }
        : undefined,
    };
  } catch {
    return {};
  }
};

// Custom parser for nuqs
const filterParser = {
  parse: parseFilterState,
  serialize: (value: FilterState) => JSON.stringify(value),
};

interface JourneyFiltersProps {
  onFiltersChange?: (filters: FilterState) => void;
  currentFilters?: FilterState;
  activityTypes: Record<string, string>;
}

export function JourneyFilters({
  onFiltersChange,
  currentFilters: propFilters,
  activityTypes,
}: JourneyFiltersProps) {
  // Use URL state if no props are provided
  const [urlFilters, setUrlFilters] = useQueryState("filters", filterParser);

  // If props are provided, use them instead of URL state
  const currentFilters = useMemo<FilterState>(
    () => (propFilters !== undefined ? propFilters : urlFilters || {}),
    [propFilters, urlFilters]
  );

  const handleFiltersChange = useCallback(
    (filters: FilterState) => {
      // Clean up the filters before setting
      const cleanFilters: FilterState = {};

      if (filters.status && ["active", "archived"].includes(filters.status)) {
        cleanFilters.status = filters.status as "active" | "archived";
      }

      if (filters.defaultActivityType) {
        cleanFilters.defaultActivityType = filters.defaultActivityType;
      }

      if (filters.dateFilter) {
        cleanFilters.dateFilter = {
          field: filters.dateFilter.field || "updatedAt",
          startDate: filters.dateFilter.startDate,
          endDate: filters.dateFilter.endDate,
        };
      }

      if (onFiltersChange) {
        onFiltersChange(cleanFilters);
      } else {
        void setUrlFilters(cleanFilters);
      }
    },
    [onFiltersChange, setUrlFilters]
  );

  // Sync local state with URL state
  useEffect(() => {
    if (urlFilters) {
      if (onFiltersChange) {
        onFiltersChange(urlFilters);
      }
    }
  }, [urlFilters, onFiltersChange]);

  // Initialize date-related state from currentFilters
  const [startDate, setStartDate] = useState<Date | undefined>(
    currentFilters?.dateFilter?.startDate
      ? new Date(currentFilters.dateFilter.startDate)
      : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    currentFilters?.dateFilter?.endDate ? new Date(currentFilters.dateFilter.endDate) : undefined
  );
  const [dateField, setDateField] = useState<"createdAt" | "updatedAt" | "lastActivityDate">(
    currentFilters?.dateFilter?.field || "updatedAt"
  );

  // Update date state when filters change
  useEffect(() => {
    if (currentFilters?.dateFilter) {
      setStartDate(
        currentFilters.dateFilter.startDate
          ? new Date(currentFilters.dateFilter.startDate)
          : undefined
      );
      setEndDate(
        currentFilters.dateFilter.endDate ? new Date(currentFilters.dateFilter.endDate) : undefined
      );
      setDateField(currentFilters.dateFilter.field || "updatedAt");
    } else {
      setStartDate(undefined);
      setEndDate(undefined);
      setDateField("updatedAt");
    }
  }, [currentFilters]);

  const updateFilters = useCallback(
    (updates: Partial<FilterState>) => {
      const current = propFilters !== undefined ? propFilters : urlFilters || {};
      const newFilters: FilterState = { ...current };

      // Apply updates using for...of instead of forEach
      for (const [key, value] of Object.entries(updates)) {
        const filterKey = key as keyof FilterState;
        if (value === undefined || value === "") {
          const { [filterKey]: _, ...rest } = newFilters;
          Object.assign(newFilters, rest);
        } else {
          // Type-safe assignment based on the key
          if (filterKey === "status") {
            newFilters[filterKey] = value as "active" | "archived";
          } else if (filterKey === "defaultActivityType") {
            newFilters[filterKey] = value as string;
          } else if (filterKey === "dateFilter") {
            newFilters[filterKey] = value as DateFilter | undefined;
          }
        }
      }

      // Clean up empty date filter
      if (newFilters.dateFilter) {
        const { field, startDate, endDate } = newFilters.dateFilter;
        if (startDate === undefined && endDate === undefined) {
          const { dateFilter: _, ...rest } = newFilters;
          Object.assign(newFilters, rest);
        } else {
          newFilters.dateFilter = { field: field || "updatedAt", startDate, endDate };
        }
      }

      handleFiltersChange(newFilters);
    },
    [propFilters, urlFilters, handleFiltersChange]
  );

  const updateDateFilter = useCallback(
    (field?: "createdAt" | "updatedAt" | "lastActivityDate", start?: Date, end?: Date) => {
      if (!field && !start && !end) {
        // Clear date filter
        const { dateFilter, ...rest } = currentFilters || {};
        handleFiltersChange(rest);
        return;
      }

      updateFilters({
        dateFilter: {
          field: field || dateField,
          startDate: start?.getTime(),
          endDate: end?.getTime(),
        },
      });
    },
    [currentFilters, dateField, handleFiltersChange, updateFilters]
  );

  const clearAllFilters = useCallback(() => {
    setStartDate(undefined);
    setEndDate(undefined);
    setDateField("updatedAt");
    handleFiltersChange({});
  }, [handleFiltersChange]);

  const hasActiveFilters = useMemo(
    () => (currentFilters ? Object.keys(currentFilters).length > 0 : false),
    [currentFilters]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (currentFilters?.status) count++;
    if (currentFilters?.defaultActivityType) count++;
    if (currentFilters?.dateFilter) {
      const { startDate, endDate } = currentFilters.dateFilter;
      if (startDate !== undefined || endDate !== undefined) {
        count++;
      }
    }
    return count;
  }, [currentFilters]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filters:</span>
      </div>

      {/* Status Filter */}
      <Select
        value={currentFilters.status || ""}
        onValueChange={(value) =>
          updateFilters({ status: value === "" ? undefined : (value as "active" | "archived") })
        }
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>

      {/* Activity Type Filter */}
      <Select
        value={currentFilters.defaultActivityType || ""}
        onValueChange={(value) =>
          updateFilters({ defaultActivityType: value === "" ? undefined : value })
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Activity Type" />
        </SelectTrigger>
        <SelectContent>
          {Object.values(activityTypes).map((type) => (
            <SelectItem key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Filter */}
      <div className="flex items-center gap-2">
        <Select
          value={dateField}
          onValueChange={(value) => setDateField(value as typeof dateField)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Created</SelectItem>
            <SelectItem value="updatedAt">Updated</SelectItem>
            <SelectItem value="lastActivityDate">Last Activity</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-40 justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "MMM dd") : "Start date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => {
                setStartDate(date);
                updateDateFilter(dateField, date, endDate);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-40 justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, "MMM dd") : "End date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={(date) => {
                setEndDate(date);
                updateDateFilter(dateField, startDate, date);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Badge and Clear */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 px-2 py-1">
            <Filter className="h-3 w-3" />
            {activeFilterCount}
          </Badge>
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 w-6 p-0">
            <X className="h-3 w-3" />
            <span className="sr-only">Clear all filters</span>
          </Button>
        </div>
      )}
    </div>
  );
}

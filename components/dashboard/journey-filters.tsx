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
import { useState } from "react";

export interface FilterState {
  status?: "active" | "archived";
  defaultActivityType?: string;
  dateFilter?: {
    field: "createdAt" | "updatedAt" | "lastActivityDate";
    startDate?: number;
    endDate?: number;
  };
}

interface JourneyFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  currentFilters: FilterState;
  activityTypes: Record<string, string>;
}

export function JourneyFilters({
  onFiltersChange,
  currentFilters,
  activityTypes,
}: JourneyFiltersProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(
    currentFilters.dateFilter?.startDate ? new Date(currentFilters.dateFilter.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    currentFilters.dateFilter?.endDate ? new Date(currentFilters.dateFilter.endDate) : undefined
  );
  const [dateField, setDateField] = useState<"createdAt" | "updatedAt" | "lastActivityDate">(
    currentFilters.dateFilter?.field || "updatedAt"
  );

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...currentFilters, ...updates });
  };

  const updateDateFilter = (
    field?: "createdAt" | "updatedAt" | "lastActivityDate",
    start?: Date,
    end?: Date
  ) => {
    if (!field && !start && !end) {
      // Clear date filter
      const { dateFilter, ...rest } = currentFilters;
      onFiltersChange(rest);
      return;
    }

    updateFilters({
      dateFilter: {
        field: field || dateField,
        startDate: start?.getTime(),
        endDate: end?.getTime(),
      },
    });
  };

  const clearAllFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setDateField("updatedAt");
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(currentFilters).length > 0;

  const getActiveFilterCount = () => {
    let count = 0;
    if (currentFilters.status) count++;
    if (currentFilters.defaultActivityType) count++;
    if (currentFilters.dateFilter) count++;
    return count;
  };

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
          <Badge variant="secondary" className="text-xs">
            {getActiveFilterCount()} active
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

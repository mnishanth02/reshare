"use client";

import { MapIcon, Maximize2 } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const MapPlaceholder = () => (
  <div className="h-full w-full rounded-lg bg-gradient-to-br from-muted to-muted/50 flex flex-col items-center justify-center text-muted-foreground px-6 relative overflow-hidden">
    <div className="absolute inset-0 bg-grid-pattern opacity-5" />
    <div className="relative z-10 text-center space-y-4">
      <div className="p-4 rounded-full bg-background shadow-lg">
        <MapIcon className="h-12 w-12 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Interactive Map</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Route visualization and activity tracking coming soon
        </p>
      </div>
      <div className="flex items-center justify-center gap-2 pt-2">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        <div
          className="w-2 h-2 bg-primary/60 rounded-full animate-pulse"
          style={{ animationDelay: "0.2s" }}
        />
        <div
          className="w-2 h-2 bg-primary/30 rounded-full animate-pulse"
          style={{ animationDelay: "0.4s" }}
        />
      </div>
    </div>
  </div>
);

interface JourneyMapDisplayProps {
  layout: "mobile" | "desktop";
}

export const JourneyMapDisplay = ({ layout }: JourneyMapDisplayProps) => {
  if (layout === "mobile") {
    return (
      <Card className="py-3">
        <CardHeader className="px-4">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center">
              <MapIcon className="h-5 w-5 mr-2 text-primary" /> Map
            </span>
            <Button variant="outline" size="sm">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 m-0 py-0">
          <div className="h-[300px]">
            <MapPlaceholder />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Desktop layout
  return (
    <Card className="flex flex-col p-0 h-full">
      <CardContent className="flex-1 p-0">
        <MapPlaceholder />
      </CardContent>
    </Card>
  );
};

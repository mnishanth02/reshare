"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { Activity, CalendarDays, Eye, MapPin } from "lucide-react";
import Link from "next/link";

interface JourneyCardProps {
  journey: {
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
  };
}

export function JourneyCard({ journey }: JourneyCardProps) {
  const formatDistance = (distance?: number) => {
    if (!distance) return "0 km";
    return `${(distance / 1000).toFixed(1)} km`;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "No activities";
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const getStatusColor = (status: string) => {
    return status === "active" ? "default" : "secondary";
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Eye className="h-3 w-3" />;
      case "unlisted":
        return <Eye className="h-3 w-3 opacity-50" />;
      case "private":
        return <Eye className="h-3 w-3" style={{ opacity: 0.3 }} />;
      default:
        return <Eye className="h-3 w-3" />;
    }
  };

  return (
    <Link href={`/journey/${journey._id}`}>
      <Card className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight truncate group-hover:text-primary transition-colors">
                {journey.title}
              </h3>
              {journey.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {journey.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-2">
              {getVisibilityIcon(journey.visibility)}
              <Badge variant={getStatusColor(journey.status)} className="text-xs">
                {journey.status}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{formatDistance(journey.totalDistance)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span>{journey.activityCount || 0} activities</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-3 border-t">
          <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              <span>Last activity {formatDate(journey.lastActivityDate)}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-auto p-1 text-xs">
              View →
            </Button>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}

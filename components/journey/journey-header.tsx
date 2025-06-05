import type { Doc } from "@/convex/_generated/dataModel";
import { Badge } from "@ui/badge";
import { Skeleton } from "@ui/skeleton";
import { Calendar, Clock, MapPin, Mountain, TrendingUp } from "lucide-react";

interface JourneyHeaderProps {
  journey: Doc<"journeys">;
}

const JourneyHeader = ({ journey }: JourneyHeaderProps) => {
  if (!journey) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-r from-background to-muted/20 rounded-xl border shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-3 flex-1">
            <Skeleton className="h-8 w-1/2 bg-muted rounded animate-pulse" />
            <Skeleton className="h-4 w-3/4 bg-muted rounded animate-pulse" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 bg-muted rounded animate-pulse" />
              <Skeleton className="h-6 w-20 bg-muted rounded animate-pulse" />
              <Skeleton className="h-6 w-24 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[...Array(4)].map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
              <div key={i} className="text-center space-y-1">
                <Skeleton className="h-4 w-16 bg-muted rounded animate-pulse mx-auto" />
                <Skeleton className="h-6 w-12 bg-muted rounded animate-pulse mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return "0 km";
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0h 0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800";
      case "active":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800";
      case "planned":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800";
      default:
        return "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-800";
    }
  };

  const getActivityTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "running":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800";
      case "cycling":
        return "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800";
      case "hiking":
        return "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800";
      default:
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800";
    }
  };

  const stats = [
    {
      label: "Distance",
      value: formatDistance(journey.totalDistance),
      icon: MapPin,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Duration",
      value: formatDuration(journey.totalDuration),
      icon: Clock,
      color: "text-green-600 dark:text-green-400",
    },
    {
      label: "Elevation",
      value: `${journey.totalElevationGain?.toLocaleString() || "0"} m`,
      icon: Mountain,
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Activities",
      value: journey.activityCount || 0,
      icon: TrendingUp,
      color: "text-orange-600 dark:text-orange-400",
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="p-3 bg-gradient-to-r from-background via-background to-muted/10 rounded-lg border shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Left Section: Title, Description, Badges */}
          <div className="flex-1 space-y-2">
            <div className="space-y-2">
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-foreground leading-tight">
                {journey.title}
              </h1>
              {journey.description && (
                <p className="text-muted-foreground leading-relaxed max-w-2xl">
                  {journey.description}
                </p>
              )}
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2">
              {journey.defaultActivityType && (
                <Badge
                  variant="outline"
                  className={`${getActivityTypeColor(journey.defaultActivityType)} font-medium px-3 py-1 text-sm transition-all  shadow-sm`}
                >
                  {journey.defaultActivityType.toUpperCase()}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`${getStatusColor(journey.status)} font-medium px-3 py-1 text-sm transition-all  shadow-sm`}
              >
                {journey.status.toUpperCase()}
              </Badge>
              <Badge
                variant="outline"
                className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 font-medium px-3 py-1 text-sm transition-all  shadow-sm"
              >
                <Calendar className="h-3 w-3 mr-1" />
                {formatDate(journey.createdAt)}
              </Badge>
            </div>
          </div>

          {/* Right Section: Stats Grid */}
          <div className="lg:ml-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-6">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="group text-center lg:text-left cursor-pointer transition-all duration-200 hover:scale-105 p-2 rounded-lg hover:bg-muted/50"
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animation: "fadeInUp 0.6s ease-out forwards",
                    }}
                  >
                    <div className="flex flex-col items-center lg:items-start space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                        <span>{stat.label}</span>
                      </div>
                      <div className="text-xl lg:text-2xl font-bold text-foreground">
                        {stat.value}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JourneyHeader;

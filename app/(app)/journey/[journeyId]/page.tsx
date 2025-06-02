import { JourneyClient } from "@/components/journey/journey-client";
import { Suspense } from "react";

interface JourneyDetailsPageProps {
  params: Promise<{ journeyId: string }>;
}

export default async function JourneyDetailsPage({ params }: JourneyDetailsPageProps) {
  const { journeyId } = await params;

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <JourneyClient journeyId={journeyId} />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="h-12 w-1/3 bg-muted rounded animate-pulse" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 w-full bg-muted rounded animate-pulse" />
        ))}
      </div>
      <div className="h-64 w-full bg-muted rounded animate-pulse" />
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card";

export function HeroSkeleton() {
  return (
    <section className="w-full bg-primary/10 py-20 md:py-28">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-start gap-6">
          <div className="h-8 w-48 animate-pulse rounded-full bg-secondary/50" />
          <div className="h-14 w-full max-w-[600px] animate-pulse rounded-lg bg-secondary/40 sm:h-16 md:h-20" />
          <div className="h-10 w-full max-w-[600px] animate-pulse rounded-lg bg-secondary/40" />
          <div className="h-24 w-full max-w-[600px] animate-pulse rounded-lg bg-secondary/30" />
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="h-12 w-40 animate-pulse rounded-md bg-primary/30" />
            <div className="h-12 w-40 animate-pulse rounded-md bg-secondary/40" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSkeleton() {
  return (
    <section className="w-full bg-secondary/30 py-20 md:py-28">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-secondary/40" />
          <div className="h-6 w-full max-w-[700px] animate-pulse rounded-lg bg-secondary/30" />

          <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
              <div key={i} className="flex flex-col items-center text-center">
                <div className="mb-5 h-16 w-16 animate-pulse rounded-full bg-primary/20" />
                <div className="mb-3 h-6 w-32 animate-pulse rounded-lg bg-secondary/40" />
                <div className="h-16 w-full animate-pulse rounded-lg bg-secondary/30" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ExpeditionCardSkeleton() {
  return (
    <Card className="flex flex-col overflow-hidden p-0 shadow-md">
      <div className="relative h-48 w-full animate-pulse overflow-hidden bg-secondary/30" />
      <CardContent className="flex flex-col p-5">
        <div className="h-6 w-3/4 animate-pulse rounded-lg bg-secondary/40" />
        <div className="mt-2 mb-3 h-4 w-1/2 animate-pulse rounded-lg bg-secondary/30" />

        <div className="mb-4 grid grid-cols-3 gap-3 rounded-lg bg-secondary/10 p-3">
          {[...Array(3)].map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            <div key={i}>
              <div className="h-3 w-16 animate-pulse rounded-lg bg-secondary/30" />
              <div className="mt-1 h-4 w-12 animate-pulse rounded-lg bg-secondary/40" />
            </div>
          ))}
        </div>

        <div className="mb-4 h-4 w-1/2 animate-pulse rounded-lg bg-secondary/30" />
        <div className="mt-auto h-9 w-full animate-pulse rounded-md bg-primary/30" />
      </CardContent>
    </Card>
  );
}

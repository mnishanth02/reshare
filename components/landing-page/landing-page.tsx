"use client";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { HeroSkeleton, HowItWorksSkeleton } from "./skeletons";

interface LandingPageProps {
  className?: string;
}

export function LandingPage({ className }: LandingPageProps) {
  return (
    <div className={cn("flex min-h-screen flex-col", className)}>
      <main className="flex flex-col ">
        <Suspense fallback={<HeroSkeleton />}>
          <Hero />
        </Suspense>
        <Suspense fallback={<HowItWorksSkeleton />}>
          <HowItWorks />
        </Suspense>
      </main>
    </div>
  );
}

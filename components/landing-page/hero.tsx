import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import { HeroButtons } from "./client-components";

interface HeroProps {
  className?: string;
}

export function Hero({ className }: HeroProps) {
  return (
    <section className={cn("w-full bg-primary/10 py-20 md:py-28", className)}>
      <div className="container px-6 md:px-8">
        <div className="flex flex-col items-start gap-6">
          <Badge
            variant="secondary"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-sm shadow-sm"
          >
            <CheckIcon className="h-3.5 w-3.5" />
            <span>For the outdoor community</span>
          </Badge>

          <h1 className="font-bold text-4xl text-primary tracking-tight sm:text-5xl md:text-6xl">
            Share Your Complete <br />
            Expedition Journey
          </h1>

          <p className="max-w-[600px] text-foreground text-lg md:text-xl">
            Transform your multi-day adventures into beautiful, shareable expeditions. Upload GPX
            tracks from each day and create comprehensive journey summaries.
          </p>

          <HeroButtons />
        </div>
      </div>
    </section>
  );
}

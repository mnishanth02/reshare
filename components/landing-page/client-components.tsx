"use client";

import { Button } from "@/components/ui/button";
import { MapIcon } from "lucide-react";
import Link from "next/link";

export function HeroButtons() {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <Button asChild size="lg" className="font-medium">
        <Link href="/dashboard" className="gap-2">
          <MapIcon className="h-4 w-4" />
          My Dashboard
        </Link>
      </Button>
    </div>
  );
}

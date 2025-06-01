"use client";

import { ConvexReactClient } from "convex/react";

import { env } from "@/env/client-env";
import { useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { type ReactNode, Suspense } from "react";

const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL);

export function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
    </ConvexProviderWithClerk>
  );
}

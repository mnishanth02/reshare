"use client";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider } from "@clerk/nextjs";
import NextTopLoader from "nextjs-toploader";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { ConvexClientProvider } from "./convex-client-provider";
import { ThemeProvider } from "./theme-provider";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <NextTopLoader
        color="#d34936"
        shadow="0 0 10px #d34936,0 0 5px #d34936"
        showSpinner={false}
      />
      <ClerkProvider dynamic>
        <TooltipProvider>
          <NuqsAdapter>
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </NuqsAdapter>
        </TooltipProvider>
      </ClerkProvider>
      <Toaster
        position="bottom-right"
        richColors
        duration={3000}
        toastOptions={{ style: { textAlign: "center" } }}
      />
    </ThemeProvider>
  );
}

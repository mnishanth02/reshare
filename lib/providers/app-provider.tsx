"use client";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NextTopLoader from "nextjs-toploader";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { ThemeProvider } from "./theme-provider";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <NextTopLoader
        color="#d34936"
        shadow="0 0 10px #d34936,0 0 5px #d34936"
        showSpinner={false}
      />
      <TooltipProvider>
        <NuqsAdapter>{children}</NuqsAdapter>
      </TooltipProvider>
      <Toaster
        position="bottom-right"
        richColors
        duration={3000}
        toastOptions={{ style: { textAlign: "center" } }}
      />
      {/* TODO : pls uncomment before production */}
      {/* <Analytics /> */}
      {/* <SpeedInsights /> */}
    </ThemeProvider>
  );
}

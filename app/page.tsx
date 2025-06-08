"use client";
import ThemeToggle from "@/components/common/theme-toggle";
import { LandingPage } from "@/components/landing-page";
import { Skeleton } from "@/components/ui/skeleton";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <div className="flex items-center justify-between p-4 gap-4 h-16">
        <Link href="/" className="flex items-center p-0 m-0 rounded-full">
          <Image
            src={"/images/logo-xl.png"}
            alt="ReShare Logo"
            width={200}
            height={60}
            className="h-16 rounded-full w-auto object-contain"
            priority
            loading="eager"
          />
        </Link>
        <div className="flex items-center gap-4">
          <Unauthenticated>
            <SignInButton />
          </Unauthenticated>
          <ThemeToggle />
          <Authenticated>
            <UserButton />
          </Authenticated>
          <AuthLoading>
            <Skeleton className="h-8 w-8 rounded-full" />
          </AuthLoading>
        </div>
      </div>

      <LandingPage />
    </>
  );
}

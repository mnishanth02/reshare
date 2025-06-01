"use client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
import { useRouter } from "next/navigation";
export default function Home() {
  const router = useRouter();
  return (
    <>
      <div className="flex justify-end items-center p-4 gap-4 h-16">
        <Unauthenticated>
          <SignInButton />
        </Unauthenticated>
        <Authenticated>
          <UserButton />
        </Authenticated>
        <AuthLoading>
          <Skeleton className="h-8 w-8 rounded-full" />
        </AuthLoading>
      </div>

      <Button onClick={() => router.push("/dashboard")}>Dashboard </Button>
    </>
  );
}

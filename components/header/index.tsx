"use client";
import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import { LayoutDashboard } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="top-0 w-full border-b z-30 backdrop-blur ">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
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
          <Authenticated>
            <Link href="/dashboard">
              <Button
                variant="outline"
                className="hidden md:inline-flex items-center gap-2 transition"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="ghost" className="md:hidden w-10 h-10 p-0">
                <LayoutDashboard className="h-4 w-4" />
              </Button>
            </Link>

            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                  userButtonPopoverCard: "shadow-xl",
                  userPreviewMainIdentifier: "font-semibold",
                },
              }}
            />
          </Authenticated>

          <Unauthenticated>
            <SignInButton>
              <Button variant="ghost">Sign In</Button>
            </SignInButton>

            <SignUpButton>
              <Button className=" border-none">Get Started</Button>
            </SignUpButton>
          </Unauthenticated>
        </div>
      </nav>
    </header>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProvider } from "@/lib/providers";

const inter = Inter({
  subsets: ["latin"],
  preload: true,
  adjustFontFallback: false,
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "ReShare",
    template: "%s | ReShare",
  },
  icons: [
    {
      url: "/favicon.ico",
      type: "image/x-icon",
    },
  ],
  description: "ReShare",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "ReShare",
    title: "ReShare",
    description: "ReShare",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "ReShare",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ReShare",
    description: "ReShare",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

interface RootLayoutProps {
  children: ReactNode;
  modal?: ReactNode;
}

export default function RootLayout({ children, modal }: RootLayoutProps) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.className} scroll-smooth`}
      suppressContentEditableWarning
    >
      <body className="flex min-h-screen flex-col antialiased">
        <AppProvider>
          <main className="grow">{children}</main>
        </AppProvider>
        {modal}
      </body>
    </html>
  );
}

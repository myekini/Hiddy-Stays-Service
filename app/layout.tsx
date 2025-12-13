import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Analytics } from "@vercel/analytics/next";
import { FaviconHandler } from "@/components/FaviconHandler";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HiddyStays - Premium Zero-Fee Stays",
  description:
    "Experience luxury accommodations without hidden fees. Connect directly with hosts, save money, and enjoy authentic hospitality with HiddyStays.",
  keywords:
    "premium stays, zero fees, direct booking, luxury accommodations, authentic hospitality, vacation rental",
  authors: [{ name: "HiddyStays Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/light_favicon.ico", sizes: "any" },
      { url: "/icons/light_favicon_16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/light_favicon_32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/light_favicon_48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/light_favicon_64x64.png", sizes: "64x64", type: "image/png" },
      { url: "/icons/light_favicon_96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/light_favicon_128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/icons/light_favicon_256x256.png", sizes: "256x256", type: "image/png" },
    ],
    apple: "/icons/light_favicon_192x192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E3A5F",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <body className={`${inter.className} antialiased tracking-tight selection:bg-blue-500/30 selection:text-blue-600 relative`}>
        {/* Global Ambient Background */}
        <div className="fixed inset-0 z-[-1] bg-background">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/20 via-background to-background dark:from-blue-900/20 dark:via-background dark:to-background pointer-events-none" />
        </div>
        
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange={false}
            storageKey="zerofee-theme"
          >
            <FaviconHandler />
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
            <Analytics />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

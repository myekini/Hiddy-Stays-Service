"use client";

import { ModernAuthForm } from "@/components/auth/ModernAuthForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import LogoImage from "@/components/LogoImage";
import Link from "next/link";

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Simple centered layout */}
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-6 lg:p-8">
          <Link href="/" className="flex items-center group">
            <LogoImage size="md" className="group-hover:opacity-80 transition-opacity duration-200" />
          </Link>

          <ThemeToggle />
        </header>

        {/* Main Content - Centered */}
        <main className="flex-1 flex items-center justify-center px-6 lg:px-8">
          <div className="w-full max-w-md">
            <div className="card-premium-modern p-8">
              <ModernAuthForm mode="signin" />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground py-6">
          © 2025 HiddyStays. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

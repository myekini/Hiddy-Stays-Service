"use client";

import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import LogoImage from "@/components/LogoImage";

interface DashboardLoadingProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export default function DashboardLoading({
  title,
  description,
  icon,
}: DashboardLoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <Card className="w-full max-w-md p-8 bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
        <div className="space-y-6">
          <div className="flex items-center justify-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-400/10 dark:to-purple-400/10 flex items-center justify-center ring-1 ring-blue-500/20 dark:ring-blue-400/20">
              {icon || <LogoImage variant="icon" size="md" />}
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="space-y-3">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full w-1/3 bg-primary/70 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-10 rounded-xl bg-muted/70 animate-pulse" />
              <div className="h-10 rounded-xl bg-muted/70 animate-pulse" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

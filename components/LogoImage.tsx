"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface LogoImageProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  width?: number;
  height?: number;
  variant?: "full" | "icon";
}

function LogoImage({
  size = "md",
  className,
  width,
  height,
  variant = "full",
}: LogoImageProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  
  let logoPath;
  if (variant === "icon") {
    logoPath = isDark ? "/icons/dark_favicon_128x128.png" : "/icons/light_favicon_128x128.png";
  } else {
    logoPath = isDark ? "/icons/logo_dark.png" : "/icons/logo_light.png";
  }

  const sizeClasses = {
    sm: "h-8",
    md: "h-12",
    lg: "h-16",
    xl: "h-20",
  };

  // Prevent hydration mismatch by showing placeholder until mounted
  if (!mounted) {
    return (
      <div className={cn("flex items-center", sizeClasses[size], className)}>
        <div className="w-full h-full bg-transparent animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", sizeClasses[size], className)}>
      <img
        src={logoPath}
        alt="HiddyStays"
        width={width}
        height={height}
        className="h-full w-auto object-contain"
        loading="eager"
        fetchPriority="high"
      />
    </div>
  );
}

export default LogoImage;


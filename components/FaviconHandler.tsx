"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function FaviconHandler() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !resolvedTheme) return;

    const isDark = resolvedTheme === "dark";
    const prefix = isDark ? "dark" : "light";

    try {
      // Update all favicon links (Next.js metadata creates multiple)
      const allIconLinks = document.querySelectorAll('link[rel="icon"]') as NodeListOf<HTMLLinkElement>;
      
      allIconLinks.forEach((link) => {
        const sizes = link.getAttribute("sizes");
        
        if (sizes === "any" || !sizes) {
          // Update favicon.ico
          link.href = `/icons/${prefix}_favicon.ico`;
        } else {
          // Update size-specific icons
          const sizeNum = sizes.split("x")[0];
          link.href = `/icons/${prefix}_favicon_${sizeNum}x${sizeNum}.png`;
        }
      });

      // Update apple-touch-icon
      const appleLink = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      if (appleLink) {
        appleLink.href = `/icons/${prefix}_favicon_192x192.png`;
      }
    } catch (error) {
      // Silently fail if DOM manipulation fails
      console.warn("Failed to update favicon:", error);
    }
  }, [resolvedTheme, mounted]);

  return null;
}

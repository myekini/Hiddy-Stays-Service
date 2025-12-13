"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MapPin,
  Users,
  Wifi,
  Car,
  Dumbbell,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroCarousel } from "@/components/HeroCarousel";
import { cn } from "@/lib/utils";

interface StreamlinedHeroProps {
  className?: string;
}

export function StreamlinedHero({ className }: StreamlinedHeroProps) {
  return (
    <div className={cn("relative w-full bg-background pt-24 pb-10 sm:pt-32 sm:pb-16", className)}>
      {/* 1. Top Centered Typography Header */}
      <div className="container mx-auto px-4 text-center mb-6 sm:mb-10">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tighter mb-4"
        >
          Your Urban <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">Sanctuary</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed tracking-tight"
        >
          Escape to a premium skyline suite with breathtaking views in Surrey, BC.
        </motion.p>
      </div>

      {/* 2. Centered Rounded Image Container */}
      <div className="container mx-auto px-4 relative z-10">
        {/* Ambient Glow Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none opacity-50 dark:opacity-20"></div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-6xl mx-auto aspect-[16/9] sm:aspect-[21/9] rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl ring-1 ring-white/10"
        >
          <HeroCarousel />
          
          {/* Refined Gradient Overlay */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
        </motion.div>

        {/* 3. Floating 'Pill' Bar (Overlapping Bottom) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6, type: "spring", stiffness: 100 }}
          className="absolute left-0 right-0 -bottom-8 sm:-bottom-10 flex justify-center pointer-events-none z-20"
        >
          <div className="pointer-events-auto bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] p-2 pl-6 pr-2 max-w-4xl w-auto mx-auto flex flex-col sm:flex-row items-center gap-4 sm:gap-8 ring-1 ring-black/5 dark:ring-white/10">
            
            {/* Info Group: Location */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start min-w-[140px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Location</div>
                  <div className="font-semibold text-sm text-foreground whitespace-nowrap">Surrey, BC</div>
                </div>
              </div>
            </div>

            {/* Divider (Desktop) */}
            <div className="hidden sm:block w-px h-10 bg-border/50"></div>

            {/* Info Group: Guests */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start min-w-[140px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Guests</div>
                  <div className="font-semibold text-sm text-foreground whitespace-nowrap">1-2 Guests</div>
                </div>
              </div>
            </div>

            {/* Divider (Desktop) */}
            <div className="hidden sm:block w-px h-10 bg-border/50"></div>

            {/* Info Group: Price */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start min-w-[140px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Price</div>
                  <div className="font-semibold text-sm text-foreground whitespace-nowrap">$140 <span className="font-normal text-muted-foreground">/ night</span></div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-full text-lg font-semibold shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
              asChild
            >
              <Link href="/property/ed71c0f6-2204-4d14-b04c-6081b9d22c67">
                Book Now
              </Link>
            </Button>

          </div>
        </motion.div>
      </div>

      {/* 4. Amenities Strip (Optional, below image) */}
      <div className="container mx-auto px-4 mt-20 sm:mt-16">
        <div className="flex flex-wrap justify-center gap-3 sm:gap-6 text-muted-foreground">
           <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-full text-sm font-medium border border-border/50">
             <Wifi className="w-4 h-4 text-blue-500" />
             <span>High-Speed WiFi</span>
           </div>
           <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-full text-sm font-medium border border-border/50">
             <Car className="w-4 h-4 text-green-500" />
             <span>Free Parking</span>
           </div>
           <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-full text-sm font-medium border border-border/50">
             <Dumbbell className="w-4 h-4 text-purple-500" />
             <span>Fitness Center</span>
           </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const CAROUSEL_IMAGES = [
  {
    src: "/assets/bed_lanscape.jpg",
    alt: "Luxury bedroom with panoramic city view",
  },
  {
    src: "/assets/night_city_view_from_upstair.jpg",
    alt: "Breathtaking night city view from apartment",
  },
  {
    src: "/assets/city_view_from_backyard.jpg",
    alt: "City view from the property",
  },
  {
    src: "/assets/sititng_room_washhand_base.jpg",
    alt: "Living room and wash-hand base",
  },
  {
    src: "/assets/dining_area.jpg",
    alt: "Elegant dining space",
  },
  {
    src: "/assets/Full_kitchen.jpg",
    alt: "Modern fully equipped kitchen space",
  },
  {
    src: "/assets/bathoom_and_toilet.jpg",
    alt: "Sparkling clean modern bathroom",
  },
  {
    src: "/assets/apartment_lobby_ss.jpg",
    alt: "Elegant building lobby and waiting area",
  },
  {
    src: "/assets/Gym_area_ss.jpg",
    alt: "Gym area",
  },
  {
    src: "/balcony.jpeg",
    alt: "Balcony",
  },
];

const AUTO_SCROLL_INTERVAL = 5000; // 5 seconds

export function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index % CAROUSEL_IMAGES.length);
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % CAROUSEL_IMAGES.length);
  }, []);

  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => (prev === 0 ? CAROUSEL_IMAGES.length - 1 : prev - 1));
  }, []);

  useEffect(() => {
    if (currentIndex >= CAROUSEL_IMAGES.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex]);

  // Auto-scroll functionality
  useEffect(() => {
    if (isPaused) return;

    const intervalId = setInterval(() => {
      goToNext();
    }, AUTO_SCROLL_INTERVAL);
    
    return () => clearInterval(intervalId);
  }, [currentIndex, isPaused, goToNext]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isZoomed) {
          setIsZoomed(false);
          return;
        }
        if (isFullscreen) {
          document.exitFullscreen().catch(() => {});
          setIsFullscreen(false);
          return;
        }
      }
      
      if (e.key === "ArrowLeft") goToPrev();
      else if (e.key === "ArrowRight") goToNext();
      else if (e.key === " ") setIsPaused(prev => !prev);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isZoomed, goToPrev, goToNext, setIsZoomed, setIsFullscreen, setIsPaused]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await carouselRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // noop
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div
      ref={carouselRef}
      className={cn(
        "relative w-full h-full overflow-hidden bg-black transition-all duration-300",
        isFullscreen ? "fixed inset-0 z-50" : "rounded-xl shadow-2xl"
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="Image carousel"
      aria-live="polite"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Main Image */}
      <div className="relative w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative w-full h-full"
          >
            <div 
              className={cn(
                "relative w-full h-full transition-transform duration-300",
                isZoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
              )}
              onClick={(e) => {
                if (!isZoomed) {
                  e.stopPropagation();
                  setIsZoomed(true);
                }
              }}
            >
              <Image
                src={CAROUSEL_IMAGES[currentIndex].src}
                alt={CAROUSEL_IMAGES[currentIndex].alt}
                fill
                className={cn(
                  "transition-transform duration-300",
                  isFullscreen && !isZoomed ? "object-contain" : "object-cover",
                  isZoomed ? "scale-150" : ""
                )}
                priority
                draggable={isZoomed}
                onDragStart={(e) => isZoomed && e.preventDefault()}
              />
              {isZoomed && (
                <div 
                  className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded-full cursor-pointer z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsZoomed(false);
                  }}
                >
                  <X size={20} />
                </div>
              )}
            </div>
            <div className="absolute bottom-4 md:bottom-4 top-4 md:top-auto left-4 md:left-1/2 md:transform md:-translate-x-1/2 px-4 py-2 bg-black/50 text-white text-sm rounded-full backdrop-blur-sm">
              {currentIndex + 1} / {CAROUSEL_IMAGES.length}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dark Overlay for text readability */}
      <div className="absolute inset-0 bg-black/25 z-20 pointer-events-none" />

      {/* Navigation Controls */}
      <div className="absolute top-4 right-4 flex gap-2 z-30">
        <button
          onClick={toggleFullscreen}
          className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
        {isFullscreen && (
          <button
            onClick={() => {
              document.exitFullscreen().catch(() => {});
              setIsFullscreen(false);
            }}
            className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all"
            aria-label="Close fullscreen"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          goToPrev();
        }}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110 z-30"
        aria-label="Previous image"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          goToNext();
        }}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110 z-30"
        aria-label="Next image"
      >
        <ChevronRight size={24} />
      </button>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-30 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed(prev => !prev);
          }}
          className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all"
          aria-label={isZoomed ? "Zoom out" : "Zoom in"}
        >
          {isZoomed ? <Minimize2 size={20} /> : <ZoomIn size={20} />}
        </button>
      </div>

      {/* Thumbnails - Hidden on mobile */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden md:flex gap-2 z-30 p-2 bg-black/30 backdrop-blur-sm rounded-full">
        {CAROUSEL_IMAGES.map((img, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={cn(
              "w-12 h-12 md:w-16 md:h-16 rounded-md overflow-hidden border-2 transition-all duration-300 hover:scale-105",
              index === currentIndex 
                ? "border-white scale-110" 
                : "border-transparent opacity-70 hover:opacity-100"
            )}
            aria-label={`View image ${index + 1}`}
          >
            <Image
              src={img.src}
              alt=""
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Remove the paused indicator as it's not needed */}
    </div>
  );
}

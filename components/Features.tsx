"use client";

import { useState, useEffect, useRef } from "react";
import {
  Shield,
  DollarSign,
  MessageCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const Features = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const features = [
    {
      icon: DollarSign,
      title: "Best Rate Guaranteed",
      description: "Save up to 15% by booking direct. No hidden service fees.",
      color: "text-brand-600",
      bgColor: "bg-brand-50",
      borderColor: "border-brand-200",
    },
    {
      icon: MessageCircle,
      title: "Personal Host",
      description: "Direct communication for a seamless, personalized stay.",
      color: "text-brand-500",
      bgColor: "bg-brand-50",
      borderColor: "border-brand-200",
    },
    {
      icon: Shield,
      title: "Secure & Instant",
      description: "Verified property with secure payments and instant confirmation.",
      color: "text-neutral-700",
      bgColor: "bg-neutral-50",
      borderColor: "border-neutral-200",
    },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "50px 0px",
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      className="py-16 bg-gradient-to-br from-background via-background to-brand-50/30 dark:to-brand-950/30 relative overflow-hidden w-full"
      ref={sectionRef}
      id="features"
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-gradient-to-r from-brand-500/5 to-transparent rounded-full blur-3xl dark:from-brand-400/10"></div>
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-gradient-to-l from-brand-400/5 to-transparent rounded-full blur-3xl dark:from-brand-300/10"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Enhanced Features Grid */}
        <div
          className={`text-center max-w-4xl mx-auto mb-12 ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
            Why Book
            <span className="block text-gradient-brand">Directly?</span>
          </h2>

          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Experience the best rates and personalized service.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              <Card className="card-premium-modern p-6 h-full hover:shadow-lg transition-all duration-300 border border-border/50 relative overflow-hidden text-center">
                <div className="relative z-10 flex flex-col items-center">
                  {/* Clean icon container */}
                  <div className="mb-4">
                    <div
                      className={`p-3 rounded-2xl ${feature.bgColor} ${feature.color} transition-all duration-300 shadow-sm border ${feature.borderColor}`}
                    >
                      <feature.icon className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-display text-lg font-bold text-neutral-900">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

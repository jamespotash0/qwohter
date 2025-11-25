/**
 * Landing Page
 * High-quality micro-interactions and stunning visual effects
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { rippleEffect } from '@/utils/animations';
import { PlatformStatsSection } from '@/components/features/landing/PlatformStatsSection';
import { TestimonialsSection } from '@/components/features/landing/TestimonialsSection';
import { IndustrySection } from '@/components/features/landing/IndustrySection';
// import { ProblemSolutionSection } from '@/components/features/landing/ProblemSolutionSection';
import { PricingPlanSection } from '@/components/features/landing/PricingPlanSection';
import { HeroSection } from '@/components/features/landing/HeroSection';
import { FeatureSection } from '@/components/features/landing/FeatureSection';
import { Footer } from '@/components/features/landing/Footer';
import { DebugGrid } from '@/components/common/DebugGrid';

const LandingPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('home');

  // Create refs for each section
  const heroRef = React.useRef<HTMLDivElement>(null);
  const featuresRef = React.useRef<HTMLDivElement>(null);
  const usecasesRef = React.useRef<HTMLDivElement>(null);
  const pricingRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute('data-section');
          if (sectionId) {
            setActiveSection(sectionId);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all section refs
    if (heroRef.current) observer.observe(heroRef.current);
    if (featuresRef.current) observer.observe(featuresRef.current);
    if (usecasesRef.current) observer.observe(usecasesRef.current);
    if (pricingRef.current) observer.observe(pricingRef.current);

    return () => observer.disconnect();
  }, []);

  // Handle hash navigation (e.g., /#features, /#usecases, /#pricing)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      // Small delay to ensure DOM is fully rendered
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

  const handleGetDemo = () => {
    navigate('/demo');
  };

  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    rippleEffect(e.currentTarget, e);
  };

  return (
    <div className="min-h-screen bg-[#FFFEFA] overflow-x-hidden">
      <DebugGrid />

      {/* Hero Section */}
      <div ref={heroRef} data-section="home">
        <HeroSection
          activeSection={activeSection}
          onGetDemo={handleGetDemo}
          onRipple={handleRipple}
        />
      </div>

      {/* 2035 Tagline Section */}
      <section className="pt-[120px] pb-[150px] bg-[#FFFEFA] px-[20px]">
        <div className="max-w-[994px] mx-auto flex items-center justify-center text-center">
          <h2
            className="text-[42px] leading-[62px] text-[#171717]"
            style={{
              fontFamily: 'Urbanist, sans-serif',
              fontWeight: 400,
            }}
          >
            See your projects and quotes in one place with full visibility. <span className="text-[#171717]/30">Turn actionable insights into faster, more efficient selling.</span>
          </h2>
        </div>
      </section>

      {/* Features Section */}
      <div ref={featuresRef} data-section="features" id="features">
        <FeatureSection />
      </div>

      {/* Results Section */}
      <PlatformStatsSection />

      {/* Testimonials Section with Gradient */}
      <TestimonialsSection />

      {/* Industries We Support with Image Cards */}
      <div ref={usecasesRef} data-section="usecases" id="usecases">
        <IndustrySection />
      </div>

      {/* Problem/Solution Toggle Section */}
      {/* <ProblemSolutionSection /> */}

      {/* Pricing Section */}
      <div ref={pricingRef} data-section="pricing" id="pricing">
        <PricingPlanSection />
      </div>

      {/* Footer */}
      <Footer />

      {/* CSS Animations */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }

        @keyframes fade-in-delay {
          from {
            opacity: 0;
            transform: translateY(-1rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-delay {
          animation: fade-in-delay 0.8s ease-out forwards;
          animation-delay: var(--animation-delay, 0ms);
        }

        @keyframes layer-swap-1 {
          0% {
            z-index: 10;
            opacity: 0.8;
            transform: translate(-1rem, -1rem) rotate(-2deg) scale(0.95);
          }
          45% {
            z-index: 10;
            opacity: 0.8;
            transform: translate(-1rem, -1rem) rotate(-2deg) scale(0.95);
          }
          50% {
            z-index: 30;
            opacity: 1;
            transform: translate(3rem, 2rem) rotate(1deg) scale(1.02);
          }
          95% {
            z-index: 30;
            opacity: 1;
            transform: translate(3rem, 2rem) rotate(1deg) scale(1.02);
          }
          100% {
            z-index: 10;
            opacity: 0.8;
            transform: translate(-1rem, -1rem) rotate(-2deg) scale(0.95);
          }
        }

        @keyframes layer-swap-2 {
          0% {
            z-index: 30;
            opacity: 1;
            transform: translate(3rem, 2rem) rotate(1deg) scale(1.02);
          }
          45% {
            z-index: 30;
            opacity: 1;
            transform: translate(3rem, 2rem) rotate(1deg) scale(1.02);
          }
          50% {
            z-index: 10;
            opacity: 0.8;
            transform: translate(-1rem, -1rem) rotate(-2deg) scale(0.95);
          }
          95% {
            z-index: 10;
            opacity: 0.8;
            transform: translate(-1rem, -1rem) rotate(-2deg) scale(0.95);
          }
          100% {
            z-index: 30;
            opacity: 1;
            transform: translate(3rem, 2rem) rotate(1deg) scale(1.02);
          }
        }

        .animate-layer-swap-1 {
          animation: layer-swap-1 6s ease-in-out infinite;
        }

        .animate-layer-swap-2 {
          animation: layer-swap-2 6s ease-in-out infinite;
        }

        @keyframes analytics-float-1 {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(1deg);
          }
        }

        @keyframes analytics-float-2 {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-12px) rotate(-1deg);
          }
        }

        .animate-analytics-float-1 {
          animation: analytics-float-1 4s ease-in-out infinite;
        }

        .animate-analytics-float-2 {
          animation: analytics-float-2 5s ease-in-out infinite;
          animation-delay: 0.5s;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;

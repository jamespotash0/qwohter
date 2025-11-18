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
import { ProblemSolutionSection } from '@/components/features/landing/ProblemSolutionSection';
import { PricingPlanSection } from '@/components/features/landing/PricingPlanSection';
import { HeroSection } from '@/components/features/landing/HeroSection';
import { FeatureSection } from '@/components/features/landing/FeatureSection';
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
      <section className="pt-[150px] pb-[75px] bg-[#FFFEFA] px-[20px]">
        <div className="max-w-[994px] h-[160px] mx-auto flex items-center justify-center text-center">
          <h2
            className="text-[42px] leading-[52px] text-[#171717]"
            style={{
              fontFamily: 'Urbanist, sans-serif',
              fontWeight: 400,
            }}
          >
            In 2035, price sheets and email chains will not be impressive. <span className="text-[#171717]/30">Your quote accuracy, speed to respond, and manufacturer alignment will be.</span>
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
      <ProblemSolutionSection />

      {/* Pricing Section */}
      <div ref={pricingRef} data-section="pricing" id="pricing">
        <PricingPlanSection />
      </div>

      {/* Footer - Anima Design */}
      <footer className="w-full bg-[#FFFEFA] px-[20px] pb-[20px]">
        <div className="w-full relative mt-[75px] bg-neutral-900 rounded-[30px] overflow-hidden translate-y-[-1rem] animate-fade-in-delay opacity-0" style={{ '--animation-delay': '200ms' } as React.CSSProperties}>
          {/* Gradient blur effects */}
          {/* First blur group - bottom right */}
          <div className="top-[265px] left-[235px] opacity-80 absolute w-[2093px] h-[1469px] pointer-events-none">
            <div className="top-[267px] left-[97px] w-[1898px] h-[935px] bg-[#ee6c4d] rounded-[949.15px/467.37px] blur-[105px] absolute rotate-[-17.73deg] opacity-50" />
            <div className="top-[418px] left-[235px] w-[1587px] h-[732px] bg-[#ee4dbd] rounded-[793.66px/365.97px] blur-[105px] absolute rotate-[-17.73deg] opacity-50" />
            <div className="top-[410px] left-[215px] w-[1483px] h-[730px] bg-[#f7f2e9] rounded-[741.72px/365.23px] blur-[105px] absolute rotate-[-17.73deg] opacity-50" />
          </div>

          {/* Second blur group - top left */}
          <div className="top-[-906px] left-[-1312px] opacity-80 absolute w-[2093px] h-[1469px] pointer-events-none">
            <div className="top-[267px] left-[97px] w-[1898px] h-[935px] bg-[#ee6c4d] rounded-[949.15px/467.37px] blur-[200px] absolute rotate-[-17.73deg] opacity-50" />
            <div className="top-[418px] left-[235px] w-[1587px] h-[732px] bg-[#ee4dbd] rounded-[793.66px/365.97px] blur-[200px] absolute rotate-[-17.73deg] opacity-50" />
            <div className="top-[434px] left-[161px] w-[1483px] h-[730px] bg-[#f7f2e9] rounded-[741.72px/365.23px] blur-[200px] absolute rotate-[-17.73deg] opacity-50" />
          </div>

          {/* Responsive content wrapper */}
          <div className="relative z-10 w-full mx-auto px-3 sm:px-6 md:px-8 lg:px-[180px] py-8 sm:py-12 md:py-[60px] lg:py-[80px] flex flex-col gap-6 sm:gap-8 md:gap-[30px] lg:gap-[40px]">
            {/* Logo and Description */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-6 sm:gap-8">
              <div className="inline-flex flex-col items-start gap-2 relative flex-[0_0_auto]">
                <img
                  className="relative w-[140px] h-[30px]"
                  alt="Qwohter Logo"
                  src="/logos/New_Landing_Page_Logo_LightonDarkBackground.svg"
                />

                <p
                  className="relative max-w-[500px] text-white text-base tracking-[0] leading-6"
                  style={{
                    fontFamily: 'Urbanist, sans-serif',
                    fontWeight: 300,
                  }}
                >
                  The most intuitive quoting platform for modern businesses. Generate,
                  design, and track your quotes with ease.
                </p>
              </div>

              <Button
                variant="outline"
                className="inline-flex gap-2 bg-neutral-900 border border-solid border-[#f7f2e9] items-center justify-center px-6 py-2 h-auto rounded-3xl hover:bg-neutral-800 transition-colors"
              >
                <span
                  className="text-[#f7f2e9] text-base text-center tracking-[0] leading-6 whitespace-nowrap"
                  style={{
                    fontFamily: 'Urbanist, sans-serif',
                    fontWeight: 600,
                  }}
                >
                  English
                </span>

                <svg className="w-4 h-4 text-[#f7f2e9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Button>
            </div>

            {/* Divider Line 1 */}
            <div className="w-full h-px bg-white/20" />

            {/* Navigation and Social Links */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-8">
              <nav className="inline-flex flex-wrap items-center justify-start gap-4 sm:gap-6">
                {['Home', 'Features', 'Use Cases', 'Pricing', 'Contact Us'].map((link, index) => (
                  <a
                    key={index}
                    href={`#${link.toLowerCase().replace(' ', '')}`}
                    className="relative w-fit text-white text-base tracking-[0] leading-6 whitespace-nowrap hover:text-[#f7f2e9] transition-colors"
                    style={{
                      fontFamily: 'Urbanist, sans-serif',
                      fontWeight: 300,
                    }}
                    onClick={(e) => {
                      if (link === 'Contact Us') {
                        e.preventDefault();
                        navigate('/contact-us');
                      }
                    }}
                  >
                    {link}
                  </a>
                ))}
              </nav>

              <a
                href="https://www.linkedin.com/company/qwohter"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 relative flex-[0_0_auto] hover:opacity-80 transition-opacity"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>

                <span
                  className="relative w-fit text-white text-base tracking-[0] leading-6 whitespace-nowrap"
                  style={{
                    fontFamily: 'Urbanist, sans-serif',
                    fontWeight: 300,
                  }}
                >
                  LinkedIn
                </span>
              </a>
            </div>

            {/* Divider Line 2 */}
            <div className="w-full h-px bg-white/20" />

            {/* Copyright and Legal Links */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
              <p
                className="relative text-white text-base tracking-[0] leading-6"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontWeight: 300,
                }}
              >
                © 2025 Qwohter Inc. All rights reserved.
              </p>

              <nav className="inline-flex items-center justify-start relative flex-[0_0_auto] gap-3 flex-wrap">
                {['FAQ', 'Privacy notice', 'Legal', 'Cookie settings', 'Accessibility Statement', 'Do Not Sell My Personal Information'].map((link, index, array) => (
                  <React.Fragment key={index}>
                    <a
                      href={`/${link.toLowerCase().replace(/ /g, '-')}`}
                      className="relative w-fit text-white text-base tracking-[0] leading-6 whitespace-nowrap hover:text-[#f7f2e9] transition-colors"
                      style={{
                        fontFamily: 'Urbanist, sans-serif',
                        fontWeight: 300,
                      }}
                    >
                      {link}
                    </a>
                    {index < array.length - 1 && (
                      <span
                        className="relative w-fit text-white text-base tracking-[0] leading-6 whitespace-nowrap"
                        style={{
                          fontFamily: 'Urbanist, sans-serif',
                          fontWeight: 300,
                        }}
                      >
                        •
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </footer>

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

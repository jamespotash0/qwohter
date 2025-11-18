/**
 * Enhanced Landing Page with anime.js animations
 * High-quality micro-interactions and stunning visual effects
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { animeOnScroll, fadeInUp, elasticBounce, rippleEffect } from '@/utils/animations';
import { PlatformStatsSection } from '@/components/features/landing/PlatformStatsSection';
import { TestimonialsSection } from '@/components/features/landing/TestimonialsSection';
import { IndustrySection } from '@/components/features/landing/IndustrySection';
import { ProblemSolutionSection } from '@/components/features/landing/ProblemSolutionSection';
import { PricingPlanSection } from '@/components/features/landing/PricingPlanSection';
import { DebugGrid } from '@/components/common/DebugGrid';

const LandingEnhanced = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [navTextColor, setNavTextColor] = useState('text-white');
  const [activeSection, setActiveSection] = useState('home');

  // Animation refs
  const featuresRef = useRef<HTMLElement>(null);
  const useCasesRef = useRef<HTMLElement>(null);
  const pricingRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);

      // Detect which section navbar is over
      const scrollPosition = window.scrollY + 80; // navbar height offset

      // Get all sections
      const features = document.querySelector('section:nth-of-type(3)');
      const pricing = document.querySelector('section:nth-of-type(5)');

      // Check which section we're in
      if (features && pricing) {
        const featuresTop = features.getBoundingClientRect().top + window.scrollY;
        const featuresBottom = featuresTop + features.clientHeight;
        const pricingTop = pricing.getBoundingClientRect().top + window.scrollY;
        const pricingBottom = pricingTop + pricing.clientHeight;

        // Light sections (features, pricing)
        if ((scrollPosition >= featuresTop && scrollPosition < featuresBottom) ||
            (scrollPosition >= pricingTop && scrollPosition < pricingBottom)) {
          setNavTextColor('text-[var(--landing-text-on-light)]');
        } else {
          // Dark sections (hero, stats, industries, footer)
          setNavTextColor('text-white');
        }
      }

      // Detect active section for navigation highlighting
      const sections = [
        { id: 'home', element: document.querySelector('section:first-of-type') },
        { id: 'features', element: document.getElementById('features') },
        { id: 'usecases', element: document.getElementById('usecases') },
        { id: 'pricing', element: document.getElementById('pricing') }
      ];

      // Find which section is currently in view
      const current = sections.find(section => {
        if (!section.element) return false;
        const rect = section.element.getBoundingClientRect();
        // Section is considered active if it's in the top half of the viewport
        return rect.top <= 150 && rect.bottom > 150;
      });

      if (current) {
        setActiveSection(current.id);
      } else if (window.scrollY < 100) {
        // At the top of the page, set to home
        setActiveSection('home');
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Run on mount
    return () => window.removeEventListener('scroll', handleScroll);
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

  // Scroll-triggered animations
  useEffect(() => {
    if (featuresRef.current) {
      const featureCards = featuresRef.current.querySelectorAll('.feature-card');
      animeOnScroll(featureCards, (target) => {
        fadeInUp(target as HTMLElement, 0);
      }, 0.2);
    }

    if (useCasesRef.current) {
      const useCaseCards = useCasesRef.current.querySelectorAll('.usecase-card');
      animeOnScroll(useCaseCards, (target) => {
        elasticBounce(target as HTMLElement);
      }, 0.15);
    }

    if (pricingRef.current) {
      const pricingCards = pricingRef.current.querySelectorAll('.pricing-card');
      animeOnScroll(pricingCards, (target) => {
        fadeInUp(target as HTMLElement, 0);
      }, 0.2);
    }
  }, []);

  const handleGetDemo = () => {
    navigate('/demo');
  };


  const handleSignIn = () => {
    navigate('/sign-in');
  };

  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    rippleEffect(e.currentTarget, e);
  };

  return (
    <div className="min-h-screen bg-[#FFFEFA] overflow-x-hidden">
      <DebugGrid />
      {/* Header Navigation - Modern Design */}
      <header className="w-full py-4 bg-[var(--landing-bg-dark)] sticky top-0 z-50 px-[20px]">
        <div className="w-full px-3 sm:px-6 md:px-8 lg:px-[180px]">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div
              className="flex items-center cursor-pointer group"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                window.history.pushState('', '', '/');
              }}
            >
              <img
                src="/logos/New_Landing_Page_Logo_LightonDarkBackground.svg"
                alt="Qwohter Logo"
                className="h-8 w-auto transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            {/* Center Navigation Pill */}
            <nav className="hidden md:flex items-center bg-white/25 backdrop-blur-sm rounded-full px-2 py-2 h-[48px]">
              {[
                { name: 'Home', href: '#', section: 'home' },
                { name: 'Features', href: '#features', section: 'features' },
                { name: 'Use Cases', href: '#usecases', section: 'usecases' },
                { name: 'Pricing', href: '#pricing', section: 'pricing' },
                { name: 'Contact Us', href: '/contact-us', section: 'contact' }
              ].map((item, index) => {
                const isActive = activeSection === item.section;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={(e) => {
                      if (item.href === '/contact-us') {
                        e.preventDefault();
                        navigate('/contact-us');
                      } else if (item.href === '#') {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center ${
                      isActive ? 'text-[#ee6c4d]' : 'text-white hover:text-white/60'
                    }`}
                    style={{
                      fontFamily: 'Urbanist, sans-serif',
                      fontSize: '16px',
                    }}
                  >
                    {item.name}
                  </a>
                );
              })}
            </nav>

            {/* Sign In and Get a Demo Buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="text-[#ee6c4d] hover:text-[#ee6c4d]/80 font-medium transition-all duration-300"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontSize: '16px',
                }}
              >
                Sign In
              </button>

              <Button
                onClick={(e) => {
                  handleRipple(e);
                  handleGetDemo();
                }}
                className="bg-[#f7f2e9] hover:bg-[#ebe5d9] text-gray-900 px-6 py-2 rounded-full font-semibold transition-all duration-300 h-[48px]"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontSize: '16px',
                }}
              >
                Get a Demo
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Anima Design */}
      <section className="w-full flex flex-col gap-[120px] bg-[var(--landing-bg-dark)] px-[20px] pt-[75px] pb-5 relative overflow-hidden">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[var(--landing-primary-light)] rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[var(--landing-primary-light)] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="w-full max-w-[1520px] mx-auto flex flex-col items-center gap-[30px] translate-y-[-1rem] animate-fade-in-delay opacity-0 relative z-10 pt-[95px]" style={{ '--animation-delay': '200ms' } as React.CSSProperties}>
          <div className="flex flex-col w-full items-center gap-5">
            {/* Hero Title with Gradient */}
            <h1
              className="bg-[linear-gradient(180deg,#FFFFFF_0%,#EBC3BF_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] text-[60px] text-center tracking-[1.2px] leading-[70px] whitespace-nowrap translate-y-[-1rem] animate-fade-in-delay opacity-0"
              style={{
                fontFamily: 'Urbanist, sans-serif',
                fontWeight: 500,
                '--animation-delay': '400ms'
              } as React.CSSProperties}
            >
              The platform that simplifies quoting
            </h1>

            {/* Hero Description */}
            <p
              className="w-full max-w-[800px] text-white text-[20px] text-center tracking-[0] leading-[30px] translate-y-[-1rem] animate-fade-in-delay opacity-0"
              style={{
                fontFamily: 'Urbanist, sans-serif',
                fontWeight: 400,
                '--animation-delay': '600ms'
              } as React.CSSProperties}
            >
              Move away from scattered docs and spreadsheets—automatically design,
              generate, track, and manage quotes with ease, all from a single
              platform.
            </p>
          </div>

          {/* CTA Button */}
          <Button
            onClick={(e) => {
              handleRipple(e);
              handleGetDemo();
            }}
            className="h-auto inline-flex gap-[5px] bg-[#ee6c4d] items-center justify-center px-[30px] py-2.5 rounded-3xl hover:bg-[#ee6c4d]/90 transition-colors translate-y-[-1rem] animate-fade-in-delay opacity-0"
            style={{ '--animation-delay': '800ms' } as React.CSSProperties}
          >
            <span
              className="text-white text-base tracking-[0] leading-6 whitespace-nowrap"
              style={{
                fontFamily: 'Urbanist, sans-serif',
                fontWeight: 600,
              }}
            >
              Get a Demo
            </span>
          </Button>
        </div>

        {/* Hero Image */}
        <img
          className="w-full max-w-[1520px] mx-auto h-auto translate-y-[-1rem] animate-fade-in-delay opacity-0 relative z-10"
          alt="Dashboard Preview"
          src="/images/landing/hero-main-dashboard.svg"
          style={{ '--animation-delay': '1000ms' } as React.CSSProperties}
        />
      </section>

      {/* 2035 Tagline Section */}
      <section className="py-[75px] bg-[#FFFEFA] px-[20px]">
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

      {/* Features Section - Anima Design */}
      <section id="features" ref={featuresRef} className="w-full flex justify-center mt-[75px] bg-[#FFFEFA] px-[20px]">
        <div className="flex flex-col items-start gap-[60px] max-w-[1520px] w-full px-4 sm:px-6 lg:px-8">
          {/* Feature 1: Design (Image Left) */}
          <div className="feature-card flex flex-row items-center gap-[100px] w-full opacity-0 translate-y-[-1rem] animate-fade-in-delay" style={{ '--animation-delay': '0ms' } as React.CSSProperties}>
            <div className="relative flex-shrink-0">
              <img
                className="w-[650px] h-[550px] object-contain"
                alt="Design beautiful quotes"
                src="/images/landing/design_image.png"
              />
            </div>

            <div className="flex flex-col items-start gap-[30px] flex-1 min-w-0">
              <div className="flex flex-col items-start gap-5 w-full">
                <h2
                  className="bg-[linear-gradient(180deg,rgba(23,23,23,1)_0%,rgba(119,119,119,1)_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] text-[42px] tracking-[0.84px] leading-[50px]"
                  style={{
                    fontFamily: 'Urbanist, sans-serif',
                    fontWeight: 600,
                  }}
                >
                  Design beautiful quotes that win deals
                </h2>

                <p
                  className="text-[#343432] text-base tracking-[0] leading-6"
                  style={{
                    fontFamily: 'Urbanist, sans-serif',
                    fontWeight: 400,
                  }}
                >
                  Build smart forms to capture the right information, then turn that data into stunning, branded quote templates. Drag, drop, and customize both the form and the final quote layout with instant live preview.
                </p>
              </div>

              <div className="flex flex-col items-start gap-[15px] w-full">
                {["Form builder to define fields and structure", "Drag-and-drop quote template designer", "Instant live preview and branding"].map((point, index) => (
                  <div key={index} className="flex items-center gap-2.5 w-full">
                    <svg className="w-6 h-6 text-[#ee6c4d] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <p
                      className="flex-1 text-[#343432] text-xl tracking-[0] leading-[30px]"
                      style={{
                        fontFamily: 'Urbanist, sans-serif',
                        fontWeight: 400,
                      }}
                    >
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature 2: Generate (Image Right) */}
          <div className="feature-card flex flex-row-reverse items-center gap-[100px] w-full opacity-0 translate-y-[-1rem] animate-fade-in-delay" style={{ '--animation-delay': '200ms' } as React.CSSProperties}>
            <div className="relative flex-shrink-0">
              <img
                className="w-[650px] h-[550px] object-contain"
                alt="Generate quotes in seconds"
                src="/images/landing/generate_quotes_image.png"
              />
            </div>

            <div className="flex flex-col items-start gap-[30px] flex-1 min-w-0">
              <div className="flex flex-col items-start gap-5 w-full">
                <h2
                  className="bg-[linear-gradient(180deg,rgba(23,23,23,1)_0%,rgba(119,119,119,1)_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] text-[42px] tracking-[0.84px] leading-[50px]"
                  style={{
                    fontFamily: 'Urbanist, sans-serif',
                    fontWeight: 600,
                  }}
                >
                  Generate quotes in seconds, not hours
                </h2>

                <p
                  className="text-[#343432] text-base tracking-[0] leading-6"
                  style={{
                    fontFamily: 'Urbanist, sans-serif',
                    fontWeight: 400,
                  }}
                >
                  Our intelligent quote engine automatically calculates pricing, applies discounts, and formats everything perfectly. Just fill in the details and go.
                </p>
              </div>

              <div className="flex flex-col items-start gap-[15px] w-full">
                {["Automatic pricing calculations", "Dynamic discount application", "Professional PDF output"].map((point, index) => (
                  <div key={index} className="flex items-center gap-2.5 w-full">
                    <svg className="w-6 h-6 text-[#ee6c4d] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <p
                      className="flex-1 text-[#343432] text-xl tracking-[0] leading-[30px]"
                      style={{
                        fontFamily: 'Urbanist, sans-serif',
                        fontWeight: 400,
                      }}
                    >
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature 3: Track (Image Left with Overlay) */}
          <div className="feature-card flex flex-row items-center gap-[100px] w-full opacity-0 translate-y-[-1rem] animate-fade-in-delay" style={{ '--animation-delay': '400ms' } as React.CSSProperties}>
            <div className="relative flex-shrink-0">
              <img
                className="w-[650px] h-[550px] object-contain"
                alt="Track performance"
                src="/images/landing/project_tracking_image.svg"
              />
              {/* Analytics overlay image if available */}
              {/* <img
                className="absolute top-[-20px] left-[-20px] w-[452px] h-[228px]"
                alt="Analytics overlay"
                src="/images/landing/analytics-overlay.png"
              /> */}
            </div>

            <div className="flex flex-col items-start gap-[30px] flex-1 min-w-0">
              <div className="flex flex-col items-start gap-5 w-full">
                <h2
                  className="bg-[linear-gradient(180deg,rgba(23,23,23,1)_0%,rgba(119,119,119,1)_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] text-[42px] tracking-[0.84px] leading-[50px]"
                  style={{
                    fontFamily: 'Urbanist, sans-serif',
                    fontWeight: 600,
                  }}
                >
                  Track performance and optimize your sales
                </h2>

                <p
                  className="text-[#343432] text-base tracking-[0] leading-6"
                  style={{
                    fontFamily: 'Urbanist, sans-serif',
                    fontWeight: 400,
                  }}
                >
                  Get deep insights into your quoting and project process with comprehensive analytics. Track conversion rates, identify bottlenecks, and optimize your sales strategy with real-time data.
                </p>
              </div>

              <div className="flex flex-col items-start gap-[15px] w-full">
                {["Real-time conversion tracking", "Performance analytics dashboard", "Sales pipeline insights"].map((point, index) => (
                  <div key={index} className="flex items-center gap-2.5 w-full">
                    <svg className="w-6 h-6 text-[#ee6c4d] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <p
                      className="flex-1 text-[#343432] text-xl tracking-[0] leading-[30px]"
                      style={{
                        fontFamily: 'Urbanist, sans-serif',
                        fontWeight: 400,
                      }}
                    >
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <PlatformStatsSection />

      {/* Testimonials Section with Gradient */}
      <TestimonialsSection />

      {/* Industries We Support with Image Cards */}
      <IndustrySection />

      {/* Problem/Solution Toggle Section */}
      <ProblemSolutionSection />

      {/* Pricing Section */}
      <div id="pricing" ref={pricingRef}>
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

export default LandingEnhanced;

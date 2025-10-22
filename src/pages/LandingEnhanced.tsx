/**
 * Enhanced Landing Page with anime.js animations
 * High-quality micro-interactions and stunning visual effects
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import {
  useStaggerFadeIn,
  useMagneticHover,
  useRevealText,
  useFloat,
} from '@/hooks/useAnimations';
import { animeOnScroll, fadeInUp, elasticBounce, rippleEffect } from '@/utils/animations';

const LandingEnhanced = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [navTextColor, setNavTextColor] = useState('text-white');

  // Animation refs
  const heroTextRef = useRevealText(200);
  const heroCTARef = useMagneticHover(0.4);
  const heroPreviewRef = useFloat();
  const statsContainerRef = useStaggerFadeIn('.stat-card', 150);
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
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Run on mount
    return () => window.removeEventListener('scroll', handleScroll);
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
    navigate('/demo-contact');
  };

  const handleSignIn = () => {
    navigate('/sign-in');
  };

  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    rippleEffect(e.currentTarget, e);
  };

  return (
    <div className="min-h-screen bg-[var(--landing-bg-light)] overflow-x-hidden">
      {/* Header Navigation with Animation */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-[var(--landing-bg-dark)]/75 backdrop-blur-md border-b border-[var(--landing-primary)]/20 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo with subtle animation */}
            <div
              className="flex items-center cursor-pointer group"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                window.history.pushState('', '', '/');
              }}
            >
              <img
                src={navTextColor === 'text-white' ? '/logos/New_Landing_Page_Logo_LightonDarkBackground.svg' : '/logos/New_Landing_Page_Logo_DarkonLightBackground.svg'}
                alt="Qwohter Logo"
                className="h-8 w-auto transition-transform duration-300 group-hover:scale-110"
              />
            </div>

            {/* Center Navigation with hover animations */}
            <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center space-x-12">
              {['Features', 'Use Cases', 'Pricing'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(' ', '')}`}
                  className={`${navTextColor} hover:text-[var(--landing-primary)] font-medium cursor-pointer transition-all duration-300 relative group`}
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--landing-primary)] transition-all duration-300 group-hover:w-full" />
                </a>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-8">
              <span
                onClick={handleSignIn}
                className={`${navTextColor} hover:text-[var(--landing-primary)] font-medium cursor-pointer transition-all duration-300 relative group`}
              >
                Sign In
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--landing-primary)] transition-all duration-300 group-hover:w-full" />
              </span>
              <Button
                onClick={(e) => {
                  handleRipple(e);
                  handleGetDemo();
                }}
                className="bg-[var(--landing-primary)] hover:bg-[var(--landing-primary-hover)] text-white px-6 py-2.5 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300 font-medium relative overflow-hidden"
              >
                Get a Demo
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Advanced Animations */}
      <section className="relative bg-[var(--landing-bg-dark)] px-8 pt-40 pb-44 flex items-center overflow-hidden">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[var(--landing-primary-light)] rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[var(--landing-primary-light)] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10 mt-16">
          <div className="grid lg:grid-cols-[1fr_1.5fr] gap-12 items-center">
            {/* Hero Text with Word Reveal Animation */}
            <div className="max-w-xl">
              {/* Removed AI-Powered tag per user request */}

              <h1 ref={heroTextRef} className="text-6xl font-bold text-[var(--landing-text-on-dark)] leading-[1.15] mb-6">
                The platform that <span className="text-[var(--landing-primary)]">simplifies quoting</span>
              </h1>

              <p className="text-lg text-[var(--landing-text-muted-dark)] mb-8 leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                Move away from scattered docs and spreadsheets—automatically design, generate, track, and manage quotes with ease, all from a single platform.
              </p>

              <div className="flex gap-4 items-center opacity-0 animate-fade-in mb-8" style={{ animationDelay: '0.8s' }}>
                <Button
                  ref={heroCTARef}
                  onClick={(e) => {
                    handleRipple(e);
                    handleGetDemo();
                  }}
                  className="bg-[var(--landing-primary)] hover:bg-[var(--landing-primary-hover)] text-white px-12 py-6 rounded-full hover:shadow-2xl hover:scale-105 transition-all duration-300 font-semibold text-lg relative overflow-hidden group"
                  style={{ boxShadow: 'var(--landing-primary-light) 0px 10px 40px' }}
                >
                  <span className="relative z-10">Get a Demo</span>
                  <div className="absolute inset-0 bg-[var(--landing-primary-hover)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
                <Button
                  variant="outline"
                  className="bg-[#F7F2E9] hover:bg-[#F7F2E9]/90 text-[var(--landing-text-on-light)] px-10 py-6 rounded-full hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold text-lg border-0"
                >
                  Contact Sales
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-col gap-4 opacity-0 animate-fade-in" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-[var(--landing-primary)] border-2 border-[var(--landing-bg-dark)]" style={{ opacity: 1 - (i * 0.15) }} />
                    ))}
                  </div>
                  <span className="text-sm text-[var(--landing-text-muted-dark)] ml-2">Trusted by wall and office furniture dealers</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="text-[var(--landing-primary)] text-base">★</span>
                  ))}
                  <span className="text-sm text-[var(--landing-text-muted-dark)] ml-2">4.9/5 rating</span>
                </div>
              </div>
            </div>

            {/* Hero Preview with Float Animation */}
            <div ref={heroPreviewRef} className="relative opacity-0 animate-fade-in ml-auto perspective-1000 px-10" style={{ animationDelay: '0.3s', width: '105%' }}>
              <div
                className="relative rounded-3xl shadow-2xl border border-gray-200 bg-white preserve-3d transition-transform duration-700 hover:scale-105 pl-1 pr-0 py-1"
                style={{ transform: 'rotateY(-8deg) rotateX(3deg)' }}
              >
                <img
                  src="/images/landing/hero-main-dashboard.svg"
                  alt="Main Dashboard Preview"
                  className="w-full h-auto block rounded-3xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Banner with Scrolling Animation */}
      <section className="py-8 bg-[var(--landing-bg-dark)] relative overflow-hidden">
        <div className="relative flex overflow-hidden">
          {/* First set of stats - scrolling */}
          <div className="flex animate-marquee whitespace-nowrap">
            {[
              { value: '40%', label: 'Faster Quote Turnaround' },
              { value: '90%', label: 'Fewer Errors in Quotes' },
              { value: '35%', label: 'More Deals Won' },
              { value: '60%', label: 'Time Saved with Custom Forms' },
              { value: '100%', label: 'Brand Consistency' },
              { value: '50%', label: 'Faster Form Creation' },
              { value: '40%', label: 'Faster Quote Turnaround' },
              { value: '90%', label: 'Fewer Errors in Quotes' },
              { value: '35%', label: 'More Deals Won' },
              { value: '60%', label: 'Time Saved with Custom Forms' },
              { value: '100%', label: 'Brand Consistency' },
              { value: '50%', label: 'Faster Form Creation' },
            ].map((stat, index) => (
              <div
                key={index}
                className="mx-12 inline-flex items-center gap-4"
              >
                <span className="text-4xl font-bold text-[var(--landing-primary)]">{stat.value}</span>
                <span className="text-base text-[var(--landing-text-muted-dark)] font-medium">{stat.label}</span>
                <span className="text-[var(--landing-primary)] text-2xl">•</span>
              </div>
            ))}
          </div>
          {/* Duplicate set for seamless loop */}
          <div className="flex animate-marquee2 whitespace-nowrap absolute top-0">
            {[
              { value: '40%', label: 'Faster Quote Turnaround' },
              { value: '90%', label: 'Fewer Errors in Quotes' },
              { value: '35%', label: 'More Deals Won' },
              { value: '60%', label: 'Time Saved with Custom Forms' },
              { value: '100%', label: 'Brand Consistency' },
              { value: '50%', label: 'Faster Form Creation' },
              { value: '40%', label: 'Faster Quote Turnaround' },
              { value: '90%', label: 'Fewer Errors in Quotes' },
              { value: '35%', label: 'More Deals Won' },
              { value: '60%', label: 'Time Saved with Custom Forms' },
              { value: '100%', label: 'Brand Consistency' },
              { value: '50%', label: 'Faster Form Creation' },
            ].map((stat, index) => (
              <div
                key={index}
                className="mx-12 inline-flex items-center gap-4"
              >
                <span className="text-4xl font-bold text-[var(--landing-primary)]">{stat.value}</span>
                <span className="text-base text-[var(--landing-text-muted-dark)] font-medium">{stat.label}</span>
                <span className="text-[var(--landing-primary)] text-2xl">•</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresRef} className="px-8 py-16 bg-[var(--landing-bg-light)]">
        <div className="max-w-7xl mx-auto space-y-20">
          {/* Design Feature */}
          <div className="feature-card grid lg:grid-cols-2 gap-20 items-center opacity-0">
            <div>
              <h3 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Design beautiful quotes that <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">win deals</span>
              </h3>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Build smart forms to capture the right information, then turn that data into stunning, branded quote templates. Drag, drop, and customize both the form and the final quote layout with instant live preview.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700 group-hover:text-purple-600 transition-colors duration-300">Form builder to define fields and structure</span>
                </div>
                <div className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700 group-hover:text-purple-600 transition-colors duration-300">Drag-and-drop quote template designer</span>
                </div>
                <div className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700 group-hover:text-purple-600 transition-colors duration-300">Instant live preview and branding</span>
                </div>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500" />

              {/* Stacked images showing both design views */}
              <div className="relative">
                {/* First image - alternates between back and front */}
                <div className="absolute left-0 top-0 w-[85%] bg-white/80 backdrop-blur-xl rounded-3xl p-1 shadow-2xl border border-gray-100 animate-layer-swap-1">
                  <img
                    src="/images/landing/design_image1.png"
                    alt="Template Design Editor - View 1"
                    className="w-full h-auto rounded-2xl"
                  />
                </div>

                {/* Second image - alternates between front and back */}
                <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-1 shadow-2xl border border-gray-100 hover:shadow-3xl w-[85%] animate-layer-swap-2">
                  <img
                    src="/images/landing/design_image.png"
                    alt="Template Design Editor - View 2"
                    className="w-full h-auto rounded-2xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Generate Feature */}
          <div className="feature-card grid lg:grid-cols-2 gap-20 items-center opacity-0">
            <div className="order-2 lg:order-1 overflow-hidden rounded-3xl">
              <img
                src="/images/landing/feature-quote-generation.svg"
                alt="Quote Generation Interface"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="order-1 lg:order-2">
              <h3 className="text-5xl font-bold text-[var(--landing-text-on-light)] mb-6 leading-tight">
                Generate quotes in <span className="text-[var(--landing-primary)]">seconds, not hours</span>
              </h3>
              <p className="text-xl text-[var(--landing-text-muted-light)] mb-8 leading-relaxed">
                Our intelligent quote engine automatically calculates pricing, applies discounts, and formats everything perfectly. Just fill in the details and go.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 bg-[var(--landing-primary)] rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-[var(--landing-text-on-light)] group-hover:text-[var(--landing-primary)] transition-colors duration-300">Automatic pricing calculations</span>
                </div>
                <div className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 bg-[var(--landing-primary)] rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-[var(--landing-text-on-light)] group-hover:text-[var(--landing-primary)] transition-colors duration-300">Dynamic discount application</span>
                </div>
                <div className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 bg-[var(--landing-primary)] rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-[var(--landing-text-on-light)] group-hover:text-[var(--landing-primary)] transition-colors duration-300">Professional PDF output</span>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Feature */}
          <div className="feature-card grid lg:grid-cols-2 gap-20 items-center opacity-0">
            <div>
              <h3 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Track performance and <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">optimize your sales</span>
              </h3>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Get deep insights into your quoting and project process with comprehensive analytics. Track conversion rates, identify bottlenecks, and optimize your sales strategy with real-time data.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700 group-hover:text-green-600 transition-colors duration-300">Real-time conversion tracking</span>
                </div>
                <div className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700 group-hover:text-green-600 transition-colors duration-300">Performance analytics dashboard</span>
                </div>
                <div className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700 group-hover:text-green-600 transition-colors duration-300">Sales pipeline insights</span>
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-3xl">
              <img
                src="/images/landing/feature-analytics.svg"
                alt="Analytics Dashboard"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Industries We Support - Animated Carousel */}
      <section className="py-20 bg-[var(--landing-bg-dark)] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-8 mb-12">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-[var(--landing-text-on-dark)] mb-4">
              Trusted Across <span className="text-[var(--landing-primary)]">Industries</span>
            </h2>
            <p className="text-lg text-[var(--landing-text-muted-dark)] max-w-2xl mx-auto">
              From furniture dealers to construction firms, businesses trust Qwohter for professional quoting
            </p>
          </div>
        </div>

        {/* Infinite scrolling industry badges */}
        <div className="relative">
          <div className="flex overflow-hidden">
            <div className="flex animate-marquee-slow whitespace-nowrap">
              {[
                'Office Furniture',
                'Wall Systems',
                'Construction',
                'Manufacturing',
                'Interior Design',
                'Commercial Flooring',
                'Electrical Services',
                'HVAC Systems',
                'Office Furniture',
                'Wall Systems',
                'Construction',
                'Manufacturing',
                'Interior Design',
                'Commercial Flooring',
                'Electrical Services',
                'HVAC Systems',
              ].map((industry, index) => (
                <div
                  key={index}
                  className="mx-6 px-8 py-4 bg-[var(--landing-bg-light)]/10 backdrop-blur-sm rounded-full border border-[var(--landing-primary)]/30 hover:border-[var(--landing-primary)] hover:bg-[var(--landing-primary)]/10 transition-all duration-300"
                >
                  <span className="text-lg font-medium text-[var(--landing-text-on-dark)]">{industry}</span>
                </div>
              ))}
            </div>
            <div className="flex animate-marquee-slow2 whitespace-nowrap absolute top-0">
              {[
                'Office Furniture',
                'Wall Systems',
                'Construction',
                'Manufacturing',
                'Interior Design',
                'Commercial Flooring',
                'Electrical Services',
                'HVAC Systems',
                'Office Furniture',
                'Wall Systems',
                'Construction',
                'Manufacturing',
                'Interior Design',
                'Commercial Flooring',
                'Electrical Services',
                'HVAC Systems',
              ].map((industry, index) => (
                <div
                  key={index}
                  className="mx-6 px-8 py-4 bg-[var(--landing-bg-light)]/10 backdrop-blur-sm rounded-full border border-[var(--landing-primary)]/30 hover:border-[var(--landing-primary)] hover:bg-[var(--landing-primary)]/10 transition-all duration-300"
                >
                  <span className="text-lg font-medium text-[var(--landing-text-on-dark)]">{industry}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" ref={pricingRef} className="px-8 py-16 bg-[var(--landing-bg-light)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold text-[var(--landing-text-on-light)] mb-6">
              Simple, <span className="text-[var(--landing-primary)]">transparent pricing</span>
            </h2>
            <p className="text-xl text-[var(--landing-text-muted-light)] max-w-3xl mx-auto mb-8">
              Choose the plan that fits your business. No hidden fees, no surprises. Cancel anytime.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <span className={`text-lg font-medium transition-colors duration-300 ${!isAnnual ? 'text-[var(--landing-primary)]' : 'text-[var(--landing-text-muted-light)]'}`}>
                Monthly
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className="relative w-16 h-8 bg-[var(--landing-text-muted-light)]/30 rounded-full transition-colors duration-300 hover:bg-[var(--landing-text-muted-light)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--landing-primary)] focus:ring-offset-2"
                style={{ backgroundColor: isAnnual ? 'var(--landing-primary)' : 'rgba(107, 106, 105, 0.3)' }}
              >
                <span
                  className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300"
                  style={{ transform: isAnnual ? 'translateX(32px)' : 'translateX(0)' }}
                />
              </button>
              <span className={`text-lg font-medium transition-colors duration-300 ${isAnnual ? 'text-[var(--landing-primary)]' : 'text-[var(--landing-text-muted-light)]'}`}>
                Annual
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-fade-in">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
                <p className="text-gray-600 mb-6">Perfect for small teams (up to 2 users)</p>
                <div className="mb-2">
                  <span className="text-5xl font-bold text-gray-900">
                    ${isAnnual ? '288' : '29'}
                  </span>
                  <span className="text-gray-600">{isAnnual ? '/year' : '/month'}</span>
                </div>
                <div className="h-[52px] mb-6 flex items-center justify-center">
                  {isAnnual && (
                    <p className="text-sm text-green-600 font-medium">
                      Save 17% annually ($24/month)
                    </p>
                  )}
                </div>
                <Button className="w-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 hover:from-gray-200 hover:to-gray-300 hover:scale-105 transition-all duration-300 mb-8 shadow-md">
                  Start Free Trial
                </Button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">Up to 2 users</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">Unlimited quotes</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">Unlimited templates</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">Unlimited forms</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">Basic analytics</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">Standard support</span>
                </div>
              </div>
            </div>

            {/* Professional Plan */}
            <div className="bg-white rounded-2xl p-8 shadow-2xl border-2 border-[var(--landing-primary)] hover:shadow-3xl transition-all duration-500 relative hover:-translate-y-2 scale-105 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-[var(--landing-primary)] text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">Most Popular</span>
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-[var(--landing-text-on-light)] mb-2">Professional</h3>
                <p className="text-[var(--landing-text-muted-light)] mb-6">For growing teams (up to 10 users)</p>
                <div className="mb-2">
                  <span className="text-5xl font-bold text-[var(--landing-primary)]">
                    ${isAnnual ? '948' : '99'}
                  </span>
                  <span className="text-[var(--landing-text-muted-light)]">{isAnnual ? '/year' : '/month'}</span>
                </div>
                <div className="h-[52px] mb-6 flex items-center justify-center">
                  {isAnnual && (
                    <p className="text-sm text-green-600 font-medium">
                      Save 20% annually ($79/month)
                    </p>
                  )}
                </div>
                <Button className="w-full bg-[var(--landing-primary)] hover:bg-[var(--landing-primary-hover)] text-white hover:scale-105 hover:shadow-xl transition-all duration-300 mb-8">
                  Start Free Trial
                </Button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">Up to 10 users</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">Unlimited quotes</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">Unlimited templates</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">Unlimited forms</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">Advanced analytics</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">Team collaboration</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">Priority support</span>
                </div>
              </div>
            </div>

            {/* Business Plan */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Business</h3>
                <p className="text-gray-600 mb-6">For larger teams (10+ users)</p>
                <div className="mb-2">
                  <span className="text-5xl font-bold text-gray-900">Custom</span>
                </div>
                <div className="h-[52px] mb-6 flex items-center justify-center">
                  <p className="text-sm text-gray-500">Tailored to your needs</p>
                </div>
                <Button className="w-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 hover:from-gray-200 hover:to-gray-300 hover:scale-105 transition-all duration-300 mb-8 shadow-md">
                  Contact Sales
                </Button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">10+ users</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">Unlimited quotes</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">Unlimited templates</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">Unlimited forms</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">Advanced analytics</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">Custom integrations</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-gray-700">Dedicated support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--landing-bg-dark)] text-[var(--landing-text-on-dark)] py-16 px-6 opacity-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-6 group">
                <img
                  src="/logos/New_Landing_Page_Logo_LightonDarkBackground.svg"
                  alt="Qwohter Logo"
                  className="h-8 w-auto"
                />
              </div>
              <p className="text-[var(--landing-text-muted-dark)] mb-8 max-w-md leading-relaxed">
                The most intuitive quoting platform for modern businesses.
                Generate, design, and track your quotes with ease.
              </p>
              <div className="flex space-x-4">
                <Button variant="outline" size="sm" className="border-[var(--landing-text-muted-dark)] text-[var(--landing-text-on-dark)] hover:bg-[var(--landing-primary)] hover:border-[var(--landing-primary)] hover:text-white transition-all duration-300">
                  Twitter
                </Button>
                <Button variant="outline" size="sm" className="border-[var(--landing-text-muted-dark)] text-[var(--landing-text-on-dark)] hover:bg-[var(--landing-primary)] hover:border-[var(--landing-primary)] hover:text-white transition-all duration-300">
                  LinkedIn
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-6 text-lg text-[var(--landing-text-on-dark)]">Product</h3>
              <ul className="space-y-3 text-[var(--landing-text-muted-dark)]">
                <li><a href="#features" className="hover:text-[var(--landing-primary)] transition-colors duration-300 hover:translate-x-1 inline-block">Features</a></li>
                <li><a href="#pricing" className="hover:text-[var(--landing-primary)] transition-colors duration-300 hover:translate-x-1 inline-block">Pricing</a></li>
                <li><a href="#" className="hover:text-[var(--landing-primary)] transition-colors duration-300 hover:translate-x-1 inline-block">Integrations</a></li>
                <li><a href="#" className="hover:text-[var(--landing-primary)] transition-colors duration-300 hover:translate-x-1 inline-block">API</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-6 text-lg text-[var(--landing-text-on-dark)]">Company</h3>
              <ul className="space-y-3 text-[var(--landing-text-muted-dark)]">
                <li><a href="#" className="hover:text-[var(--landing-primary)] transition-colors duration-300 hover:translate-x-1 inline-block">About</a></li>
                <li><a href="#" className="hover:text-[var(--landing-primary)] transition-colors duration-300 hover:translate-x-1 inline-block">Blog</a></li>
                <li><a href="#" className="hover:text-[var(--landing-primary)] transition-colors duration-300 hover:translate-x-1 inline-block">Careers</a></li>
                <li><a href="#" className="hover:text-[var(--landing-primary)] transition-colors duration-300 hover:translate-x-1 inline-block">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[var(--landing-text-muted-dark)]/30 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[var(--landing-text-muted-dark)] text-xs">
              © 2025 Qwohter Inc. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--landing-text-muted-dark)]">
              <a href="/privacy-policy" className="hover:text-[var(--landing-primary)] transition-colors duration-300">
                Privacy notice
              </a>
              <a href="/legal" className="hover:text-[var(--landing-primary)] transition-colors duration-300">
                Legal
              </a>
              <a href="/cookie-settings" className="hover:text-[var(--landing-primary)] transition-colors duration-300">
                Cookie settings
              </a>
              <a href="/accessibility" className="hover:text-[var(--landing-primary)] transition-colors duration-300">
                Accessibility Statement
              </a>
              <a href="/do-not-sell" className="hover:text-[var(--landing-primary)] transition-colors duration-300">
                Do Not Sell My Personal Information
              </a>
              <select className="text-[var(--landing-text-muted-dark)] bg-transparent border border-[var(--landing-text-muted-dark)]/50 rounded px-2 py-1 text-xs hover:border-[var(--landing-primary)] transition-colors cursor-pointer">
                <option className="bg-[var(--landing-bg-dark)]">English</option>
                <option className="bg-[var(--landing-bg-dark)]">Español</option>
                <option className="bg-[var(--landing-bg-dark)]">Français</option>
              </select>
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
      `}</style>
    </div>
  );
};

export default LandingEnhanced;

/**
 * Enhanced Landing Page with anime.js animations
 * High-quality micro-interactions and stunning visual effects
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, Palette, TrendingUp, Building2, Hammer, Sparkles } from 'lucide-react';
import { AnimatedCounter } from '@/components/landing/AnimatedCounter';
import {
  useFadeInUp,
  useSlideInRight,
  useStaggerFadeIn,
  useMagneticHover,
  useCardTilt,
  useRevealText,
  useFloat,
  usePulse,
} from '@/hooks/useAnimations';
import { animeOnScroll, fadeInUp, elasticBounce, rippleEffect } from '@/utils/animations';

const LandingEnhanced = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);

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
    };
    window.addEventListener('scroll', handleScroll);
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
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white overflow-x-hidden">
      {/* Header Navigation with Animation */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm'
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
                src="/logos/Landing_Page_Logo_Light.svg"
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
                  className="text-gray-600 hover:text-blue-600 font-medium cursor-pointer transition-all duration-300 relative group"
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full" />
                </a>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-8">
              <span
                onClick={handleSignIn}
                className="text-gray-600 hover:text-gray-900 font-medium cursor-pointer transition-colors duration-300"
              >
                Sign In
              </span>
              <Button
                onClick={(e) => {
                  handleRipple(e);
                  handleGetDemo();
                }}
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2.5 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300 font-medium relative overflow-hidden"
              >
                Get a Demo
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Advanced Animations */}
      <section className="relative bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20 px-8 pt-32 pb-24 min-h-screen flex items-center overflow-hidden">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Hero Text with Word Reveal Animation */}
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full text-blue-700 font-medium text-sm mb-6 opacity-0 animate-fade-in">
                <Sparkles className="w-4 h-4 mr-2" />
                AI-Powered Quoting Platform
              </div>

              <h1 ref={heroTextRef} className="text-7xl font-bold text-gray-900 leading-tight mb-8">
                The platform that <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">simplifies quoting</span>
              </h1>

              <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl opacity-0 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                Move away from scattered docs and spreadsheets—automatically design, generate, track, and manage quotes with ease, all from a single platform.
              </p>

              <div className="flex gap-4 items-center opacity-0 animate-fade-in" style={{ animationDelay: '0.8s' }}>
                <Button
                  ref={heroCTARef}
                  onClick={(e) => {
                    handleRipple(e);
                    handleGetDemo();
                  }}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-10 py-6 rounded-full hover:shadow-2xl hover:shadow-orange-500/50 hover:scale-105 transition-all duration-300 font-semibold text-lg relative overflow-hidden group"
                >
                  <span className="relative z-10">Get a Demo</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="mt-12 flex items-center gap-8 opacity-0 animate-fade-in" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 border-2 border-white" />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 ml-2">Trusted by 500+ teams</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="text-yellow-400 text-lg">★</span>
                  ))}
                  <span className="text-sm text-gray-600 ml-2">4.9/5 rating</span>
                </div>
              </div>
            </div>

            {/* Hero Preview with Float Animation */}
            <div ref={heroPreviewRef} className="relative opacity-0 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="relative">
                {/* Glowing background effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur-3xl opacity-20 scale-95" />

                {/* Main preview card */}
                <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-100">
                  {/* Placeholder for hero image */}
                  <div className="w-full aspect-video bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="text-center z-10">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl">
                        <Zap className="w-12 h-12 text-white" />
                      </div>
                      <p className="text-gray-500 font-medium">
                        Add hero-app-preview.png here
                      </p>
                      <p className="text-sm text-gray-400 mt-2">See LANDING_PAGE_ASSETS_GUIDE.md</p>
                    </div>
                  </div>

                  {/* Floating badges */}
                  <div className="absolute -top-4 -right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-full shadow-xl font-semibold animate-pulse">
                    ✓ Real-time Sync
                  </div>
                  <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-full shadow-xl font-semibold animate-bounce" style={{ animationDuration: '3s' }}>
                    🚀 AI-Powered
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Banner with Stagger Animation */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-8">
          <div ref={statsContainerRef} className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { value: 40, suffix: '%', label: 'Faster Quote Turnaround', color: 'from-blue-600 to-blue-700' },
              { value: 25, suffix: '%', label: 'Increase in Deal Win Rate', color: 'from-purple-600 to-purple-700' },
              { value: 100, suffix: '%', label: 'Brand Consistency', color: 'from-orange-600 to-orange-700' },
            ].map((stat, index) => {
              const ref = useCardTilt(8);
              return (
                <div
                  key={index}
                  ref={ref}
                  className="stat-card text-center p-8 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 hover:shadow-2xl transition-all duration-500 cursor-pointer opacity-0"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className={`text-6xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-4`}>
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-lg text-gray-600 font-medium">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresRef} className="px-8 py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto space-y-32">
          {/* Generate Feature */}
          <div className="feature-card grid lg:grid-cols-2 gap-20 items-center opacity-0">
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600/10 to-blue-600/20 rounded-full text-blue-600 font-medium text-sm mb-6 shadow-sm">
                <Zap className="w-4 h-4 mr-2" />
                Quote Generation
              </div>
              <h3 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Generate quotes in <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">seconds, not hours</span>
              </h3>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Our intelligent quote engine automatically calculates pricing, applies discounts, and formats everything perfectly. Just fill in the details and go.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700 group-hover:text-blue-600 transition-colors duration-300">Automatic pricing calculations</span>
                </div>
                <div className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700 group-hover:text-blue-600 transition-colors duration-300">Dynamic discount application</span>
                </div>
                <div className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700 group-hover:text-blue-600 transition-colors duration-300">Professional PDF output</span>
                </div>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
              <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-100 hover:shadow-3xl transition-all duration-500">
                <img
                  src="/images/landing/feature-quote-generation.svg"
                  alt="Quote Generation Interface"
                  className="w-full h-auto rounded-2xl"
                />
              </div>
            </div>
          </div>

          {/* Design Feature */}
          <div className="feature-card grid lg:grid-cols-2 gap-20 items-center opacity-0">
            <div className="relative order-2 lg:order-1 group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
              <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-100 hover:shadow-3xl transition-all duration-500">
                <img
                  src="/images/landing/feature-template-editor.svg"
                  alt="Template Design Editor"
                  className="w-full h-auto rounded-2xl"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600/10 to-purple-600/20 rounded-full text-purple-600 font-medium text-sm mb-6 shadow-sm">
                <Palette className="w-4 h-4 mr-2" />
                Design & Templates
              </div>
              <h3 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Design beautiful quotes that <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">win deals</span>
              </h3>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Create stunning, branded quote templates with our intuitive drag-and-drop editor. See changes instantly with live preview and ensure every quote reflects your brand perfectly.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700 group-hover:text-purple-600 transition-colors duration-300">Drag-and-drop template builder</span>
                </div>
                <div className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700 group-hover:text-purple-600 transition-colors duration-300">Live preview and editing</span>
                </div>
                <div className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700 group-hover:text-purple-600 transition-colors duration-300">Brand customization</span>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Feature */}
          <div className="feature-card grid lg:grid-cols-2 gap-20 items-center opacity-0">
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600/10 to-green-600/20 rounded-full text-green-600 font-medium text-sm mb-6 shadow-sm">
                <TrendingUp className="w-4 h-4 mr-2" />
                Analytics & Tracking
              </div>
              <h3 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Track performance and <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">optimize your sales</span>
              </h3>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Get deep insights into your quoting process with comprehensive analytics. Track conversion rates, identify bottlenecks, and optimize your sales strategy with real-time data.
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
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
              <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-100 hover:shadow-3xl transition-all duration-500">
                <img
                  src="/images/landing/feature-analytics.svg"
                  alt="Analytics Dashboard"
                  className="w-full h-auto rounded-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="usecases" ref={useCasesRef} className="px-8 py-24 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">every type of business</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Whether you're a small agency or enterprise company, Qwohter adapts to your unique quoting needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="usecase-card bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 group cursor-pointer opacity-0 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Building2 className="text-white text-2xl w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">Professional Services</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">Create detailed project proposals with time estimates, resource allocation, and milestone-based pricing.</p>
              <div className="text-blue-600 font-medium">Consulting • Legal • Marketing</div>
            </div>

            <div className="usecase-card bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 group cursor-pointer opacity-0 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Hammer className="text-white text-2xl w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors duration-300">Construction & Trades</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">Perfect for contractors, builders, and trades professionals managing multiple projects and material costs.</p>
              <div className="text-purple-600 font-medium">Construction • Plumbing • Electrical</div>
            </div>

            <div className="usecase-card bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 group cursor-pointer opacity-0 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <TrendingUp className="text-white text-2xl w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-orange-600 transition-colors duration-300">Sales & Manufacturing</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">Streamline complex pricing for manufacturers, distributors, and enterprise sales teams with volume discounts.</p>
              <div className="text-orange-600 font-medium">Manufacturing • Distribution • Enterprise</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" ref={pricingRef} className="px-8 py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Simple, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">transparent pricing</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Choose the plan that fits your business. No hidden fees, no surprises. Cancel anytime.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <span className={`text-lg font-medium transition-colors duration-300 ${!isAnnual ? 'text-blue-600' : 'text-gray-500'}`}>
                Monthly
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className="relative w-16 h-8 bg-gray-200 rounded-full transition-colors duration-300 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                style={{ backgroundColor: isAnnual ? '#3B82F6' : '#E5E7EB' }}
              >
                <span
                  className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300"
                  style={{ transform: isAnnual ? 'translateX(32px)' : 'translateX(0)' }}
                />
              </button>
              <span className={`text-lg font-medium transition-colors duration-300 ${isAnnual ? 'text-blue-600' : 'text-gray-500'}`}>
                Annual
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <div className="pricing-card bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-2xl transition-all duration-500 opacity-0 hover:-translate-y-2">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
                <p className="text-gray-600 mb-6">Perfect for small teams (up to 2 users)</p>
                <div className="mb-2">
                  <span className="text-5xl font-bold text-gray-900">
                    ${isAnnual ? '288' : '29'}
                  </span>
                  <span className="text-gray-600">{isAnnual ? '/year' : '/month'}</span>
                </div>
                {isAnnual ? (
                  <p className="text-sm text-green-600 font-medium mb-6">
                    Save 17% annually ($24/month)
                  </p>
                ) : (
                  <div className="h-6 mb-6"></div>
                )}
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
            <div className="pricing-card bg-white rounded-2xl p-8 shadow-2xl border-2 border-blue-600 hover:shadow-3xl transition-all duration-500 relative opacity-0 hover:-translate-y-2 scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">Most Popular</span>
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Professional</h3>
                <p className="text-gray-600 mb-6">For growing teams (up to 10 users)</p>
                <div className="mb-2">
                  <span className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    ${isAnnual ? '948' : '99'}
                  </span>
                  <span className="text-gray-600">{isAnnual ? '/year' : '/month'}</span>
                </div>
                {isAnnual ? (
                  <p className="text-sm text-green-600 font-medium mb-6">
                    Save 20% annually ($79/month)
                  </p>
                ) : (
                  <div className="h-6 mb-6"></div>
                )}
                <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 hover:scale-105 hover:shadow-xl transition-all duration-300 mb-8">
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
            <div className="pricing-card bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-2xl transition-all duration-500 opacity-0 hover:-translate-y-2">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Business</h3>
                <p className="text-gray-600 mb-6">For larger teams (10+ users)</p>
                <div className="mb-2">
                  <span className="text-5xl font-bold text-gray-900">Custom</span>
                </div>
                <p className="text-sm text-gray-500 mb-6">Tailored to your needs</p>
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
      <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16 px-6 opacity-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-6 group">
                <img
                  src="/logos/Landing_Page_Logo_Light.svg"
                  alt="Qwohter Logo"
                  className="h-8 w-auto group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <p className="text-gray-400 mb-8 max-w-md leading-relaxed">
                The most intuitive quoting platform for modern businesses.
                Generate, design, and track your quotes with ease.
              </p>
              <div className="flex space-x-4">
                <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500 hover:text-white transition-all duration-300">
                  Twitter
                </Button>
                <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500 hover:text-white transition-all duration-300">
                  LinkedIn
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-6 text-lg">Product</h3>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block">API</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-6 text-lg">Company</h3>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-xs">
              © 2025 Qwohter Inc. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400">
              <a href="/privacy-policy" className="hover:text-white transition-colors duration-300">
                Privacy notice
              </a>
              <a href="/legal" className="hover:text-white transition-colors duration-300">
                Legal
              </a>
              <a href="/cookie-settings" className="hover:text-white transition-colors duration-300">
                Cookie settings
              </a>
              <a href="/accessibility" className="hover:text-white transition-colors duration-300">
                Accessibility Statement
              </a>
              <a href="/do-not-sell" className="hover:text-white transition-colors duration-300">
                Do Not Sell My Personal Information
              </a>
              <select className="text-gray-400 bg-transparent border border-gray-600 rounded px-2 py-1 text-xs hover:border-gray-400 transition-colors cursor-pointer">
                <option className="bg-gray-800">English</option>
                <option className="bg-gray-800">Español</option>
                <option className="bg-gray-800">Français</option>
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
      `}</style>
    </div>
  );
};

export default LandingEnhanced;

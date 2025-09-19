import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, Palette, TrendingUp, Building2, Hammer } from 'lucide-react';
import { AnimatedCounter } from '@/components/landing/AnimatedCounter';
import { AppPreview } from '@/components/landing/AppPreview';

const Landing = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetDemo = () => {
    navigate('/create-account?mode=demo');
  };

  const handleSignIn = () => {
    navigate('/sign-in');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header Navigation */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-sm border-b border-gray-100' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              className="flex items-center cursor-pointer"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                window.history.pushState('', '', '/');
              }}
            >
              <img
                src="/logos/Landing-page-logo.svg"
                alt="Qwohter Logo"
                className="h-8 w-auto"
              />
            </div>

            {/* Center Navigation */}
            <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center space-x-12">
              <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium cursor-pointer transition-colors duration-200">
                Features
              </a>
              <a href="#usecases" className="text-gray-600 hover:text-gray-900 font-medium cursor-pointer transition-colors duration-200">
                Use Cases
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 font-medium cursor-pointer transition-colors duration-200">
                Pricing
              </a>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-8">
              <span
                onClick={handleSignIn}
                className="text-gray-600 hover:text-gray-900 font-medium cursor-pointer transition-colors duration-200"
              >
                Sign In
              </span>
              <Button
                onClick={handleGetDemo}
                className="bg-orange-500 text-white px-6 py-2.5 rounded-full hover:bg-orange-600 transition-colors duration-200 font-medium"
              >
                Get a Demo
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-white px-8 pt-32 pb-16 min-h-[800px] flex items-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="animate-fade-in-up">
              <h1 className="text-6xl font-bold text-gray-900 leading-tight mb-8">
                The platform that <span className="text-blue-600">simplifies quoting</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl">
                Move away from scattered docs and spreadsheets—automatically design, generate, track, and manage quotes with ease, all from a single platform.
              </p>
              <div className="flex justify-center lg:justify-start">
                <Button
                  onClick={handleGetDemo}
                  className="bg-orange-500 text-white px-8 py-4 rounded-full hover:bg-orange-600 transition-colors duration-200 font-semibold text-lg min-h-[56px]"
                >
                  Get a Demo
                </Button>
              </div>
            </div>

            <div className="relative animate-slide-in-right">
              <div className="bg-gray-50 rounded-3xl p-8 shadow-2xl">
                <AppPreview />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="py-16 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-5xl font-bold text-blue-600">
                <AnimatedCounter end={40} suffix="%" />
              </p>
              <p className="text-lg text-gray-600 mt-2">Faster Quote Turnaround</p>
            </div>
            <div>
              <p className="text-5xl font-bold text-blue-600">
                <AnimatedCounter end={25} suffix="%" />
              </p>
              <p className="text-lg text-gray-600 mt-2">Increase in Deal Win Rate</p>
            </div>
            <div>
              <p className="text-5xl font-bold text-blue-600">
                <AnimatedCounter end={100} suffix="%" />
              </p>
              <p className="text-lg text-gray-600 mt-2">Brand Consistency</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-8 py-24 bg-white">
        <div className="max-w-7xl mx-auto space-y-24">

          {/* Generate Feature */}
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-blue-600/10 rounded-full text-blue-600 font-medium text-sm mb-6">
                <Zap className="w-4 h-4 mr-2" />
                Quote Generation
              </div>
              <h3 className="text-5xl font-bold text-gray-900 mb-6">Generate quotes in seconds, not hours</h3>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Our intelligent quote engine automatically calculates pricing, applies discounts, and formats everything perfectly. Just fill in the details and go.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700">Automatic pricing calculations</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700">Dynamic discount application</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700">Professional PDF output</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gray-50 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <div className="w-full h-80 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <Zap className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Quote Generation Interface</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Design Feature */}
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="bg-gray-50 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <div className="w-full h-80 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <Palette className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-600">Template Design Editor</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center px-4 py-2 bg-purple-600/10 rounded-full text-purple-600 font-medium text-sm mb-6">
                <Palette className="w-4 h-4 mr-2" />
                Design & Templates
              </div>
              <h3 className="text-5xl font-bold text-gray-900 mb-6">Design beautiful quotes that win deals</h3>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Create stunning, branded quote templates with our intuitive drag-and-drop editor. See changes instantly with live preview and ensure every quote reflects your brand perfectly.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700">Drag-and-drop template builder</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700">Live preview and editing</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700">Brand customization</span>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Feature */}
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-blue-600/10 rounded-full text-blue-600 font-medium text-sm mb-6">
                <TrendingUp className="w-4 h-4 mr-2" />
                Analytics & Tracking
              </div>
              <h3 className="text-5xl font-bold text-gray-900 mb-6">Track performance and optimize your sales</h3>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Get deep insights into your quoting process with comprehensive analytics. Track conversion rates, identify bottlenecks, and optimize your sales strategy with real-time data.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700">Real-time conversion tracking</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700">Performance analytics dashboard</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700">Sales pipeline insights</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gray-50 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <div className="w-full h-80 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <p className="text-gray-600">Analytics Dashboard</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="usecases" className="px-8 py-24 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">Built for every type of business</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Whether you're a small agency or enterprise company, Qwohter adapts to your unique quoting needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
              <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6">
                <Building2 className="text-blue-600 text-2xl w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Professional Services</h3>
              <p className="text-gray-600 mb-6">Create detailed project proposals with time estimates, resource allocation, and milestone-based pricing.</p>
              <div className="text-blue-600 font-medium">Consulting • Legal • Marketing</div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
              <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6">
                <Hammer className="text-blue-600 text-2xl w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Construction & Trades</h3>
              <p className="text-gray-600 mb-6">Perfect for contractors, builders, and trades professionals managing multiple projects and material costs.</p>
              <div className="text-blue-600 font-medium">Construction • Plumbing • Electrical</div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
              <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6">
                <TrendingUp className="text-blue-600 text-2xl w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Sales & Manufacturing</h3>
              <p className="text-gray-600 mb-6">Streamline complex pricing for manufacturers, distributors, and enterprise sales teams with volume discounts.</p>
              <div className="text-blue-600 font-medium">Manufacturing • Distribution • Enterprise</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-8 py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">Simple, transparent pricing</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose the plan that fits your business. No hidden fees, no surprises. Cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
                <p className="text-gray-600 mb-6">Perfect for small businesses and freelancers</p>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-gray-900">$29</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <Button className="w-full bg-gray-100 text-gray-900 hover:bg-gray-200 mb-8">
                  Start Free Trial
                </Button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-sm">✓</span>
                  <span className="text-gray-700">Up to 50 quotes/month</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-sm">✓</span>
                  <span className="text-gray-700">5 custom templates</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-sm">✓</span>
                  <span className="text-gray-700">Basic analytics</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-sm">✓</span>
                  <span className="text-gray-700">Email support</span>
                </div>
              </div>
            </div>

            {/* Professional Plan */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-blue-600 hover:shadow-2xl transition-shadow duration-300 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium">Most Popular</span>
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Professional</h3>
                <p className="text-gray-600 mb-6">Best for growing businesses and teams</p>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-gray-900">$79</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <Button className="w-full bg-orange-500 text-white hover:bg-orange-600 mb-8">
                  Start Free Trial
                </Button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-sm">✓</span>
                  <span className="text-gray-700">Unlimited quotes</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-sm">✓</span>
                  <span className="text-gray-700">Unlimited templates</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-sm">✓</span>
                  <span className="text-gray-700">Advanced analytics</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-sm">✓</span>
                  <span className="text-gray-700">Team collaboration</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-sm">✓</span>
                  <span className="text-gray-700">Priority support</span>
                </div>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
                <p className="text-gray-600 mb-6">For large organizations with custom needs</p>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-gray-900">$199</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <Button className="w-full bg-gray-100 text-gray-900 hover:bg-gray-200 mb-8">
                  Contact Sales
                </Button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-sm">✓</span>
                  <span className="text-gray-700">Everything in Professional</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-sm">✓</span>
                  <span className="text-gray-700">Custom integrations</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-sm">✓</span>
                  <span className="text-gray-700">Dedicated account manager</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 text-sm">✓</span>
                  <span className="text-gray-700">SLA & phone support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <img
                  src="/logos/Landing-page-logo.svg"
                  alt="Qwohter Logo"
                  className="h-6 w-auto"
                />
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                The most intuitive quoting platform for modern businesses.
                Generate, design, and track your quotes with ease.
              </p>
              <div className="flex space-x-4">
                <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                  Twitter
                </Button>
                <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                  LinkedIn
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 Qwohter. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
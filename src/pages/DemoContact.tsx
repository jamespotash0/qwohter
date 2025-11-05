import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, Eye, Zap, Users, X } from 'lucide-react';
import { useStaggerFadeIn, useMagneticHover } from '@/hooks/useAnimations';
import { fadeInUp, animeOnScroll } from '@/utils/animations';
import { sendDemoRequestEmail } from '@/services/emailService';
import { toast } from 'sonner';

const DemoContact = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [navTextColor, setNavTextColor] = useState('text-[var(--landing-text-on-light)]');

  // Animation refs
  const formCardRef = useRef<HTMLDivElement>(null);
  const featuresRef = useStaggerFadeIn('.feature-item', 150);
  const submitButtonRef = useMagneticHover(0.3);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    hearAboutUs: '',
    message: ''
  });
  const [agreeToUpdates, setAgreeToUpdates] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    hearAboutUs: '',
    message: ''
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
      // Keep nav text dark on light background
      setNavTextColor('text-[var(--landing-text-on-light)]');
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Run on mount
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll-triggered animations for feature cards
  useEffect(() => {
    if (featuresRef.current) {
      const featureItems = featuresRef.current.querySelectorAll('.feature-item');
      animeOnScroll(featureItems, (target) => {
        fadeInUp(target as HTMLElement, 0);
      }, 0.2);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {
      firstName: '',
      lastName: '',
      email: '',
      company: '',
      hearAboutUs: '',
      message: ''
    };

    let isValid = true;

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Please enter your first name';
      isValid = false;
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Please enter your last name';
      isValid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Please enter your email address';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!formData.company.trim()) {
      newErrors.company = 'Please enter your company name';
      isValid = false;
    }

    if (!formData.hearAboutUs.trim()) {
      newErrors.hearAboutUs = 'Please tell us how you heard about us';
      isValid = false;
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Please enter a message';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Send email via backend service
      const result = await sendDemoRequestEmail({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        company: formData.company,
        hearAboutUs: formData.hearAboutUs,
        message: formData.message,
        agreeToUpdates: agreeToUpdates,
      });

      if (result.success) {
        // Show success state
        setIsSubmitted(true);
        toast.success('Demo request sent successfully!');
      } else {
        // Show error toast
        toast.error(result.error || 'Failed to send demo request. Please try again.');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error submitting demo request:', error);
      toast.error('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setIsSubmitted(false);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      company: '',
      hearAboutUs: '',
      message: ''
    });
  };

  return (
    <>
      {/* Success Modal Overlay */}
      {isSubmitted && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="max-w-md w-full mx-4 p-8 text-center relative animate-in zoom-in-95 duration-300">
            {/* Close Button */}
            <button
              onClick={handleCloseSuccessModal}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Thank You!
            </h2>
            <p className="text-gray-600 mb-6">
              Your demo request has been sent successfully. We'll get back to you within 24 hours to schedule your personalized demonstration.
            </p>
          </Card>
        </div>
      )}

      <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation Bar - Matching Landing Page */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-[var(--landing-bg-dark)]/75 backdrop-blur-md border-b border-[var(--landing-primary)]/20 shadow-sm'
            : 'bg-transparent'
        }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Dark on light background */}
            <div
              className="flex items-center cursor-pointer group"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                navigate('/');
              }}
            >
              <img
                src="/logos/New_Landing_Page_Logo_DarkonLightBackground.svg"
                alt="Qwohter Logo"
                className="h-8 w-auto transition-transform duration-300 group-hover:scale-110"
              />
            </div>

            {/* Center Navigation - Matching Landing Page */}
            <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center space-x-12">
              {['Features', 'Use Cases', 'Pricing'].map((item) => (
                <a
                  key={item}
                  href={`/#${item.toLowerCase().replace(' ', '')}`}
                  className={`${navTextColor} hover:text-[var(--landing-primary)] font-medium cursor-pointer transition-all duration-300 relative group`}
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--landing-primary)] transition-all duration-300 group-hover:w-full" />
                </a>
              ))}
            </div>

            {/* Right Actions - Matching Landing Page */}
            <div className="flex items-center space-x-8">
              <span
                onClick={() => navigate('/sign-in')}
                className={`${navTextColor} hover:text-[var(--landing-primary)] font-medium cursor-pointer transition-all duration-300 relative group`}
              >
                Sign In
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--landing-primary)] transition-all duration-300 group-hover:w-full" />
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-16 pt-32">
        {/* Heading */}
        <div className="text-center mb-16">
          <h1 className="text-5xl text-gray-900 leading-tight">
            Turn quote <span className="font-bold text-orange-500">chaos</span> into <span className="font-bold text-blue-600">clarity</span><br />
            and <span className="font-bold">close more deals</span>
          </h1>
        </div>

        {/* Form and Features Grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Side - Form (Cream Card) */}
          <Card className="bg-[var(--landing-bg-light)] p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300 border-none">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Note: Last two items have tighter spacing */}
              {/* Row 1: First Name and Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-900 mb-2">
                    First Name
                  </label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="First Name"
                    className={`w-full placeholder:text-gray-400 bg-white text-gray-900 ${errors.firstName ? 'border-red-500' : ''}`}
                  />
                  {errors.firstName && (
                    <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-900 mb-2">
                    Last Name
                  </label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Last Name"
                    className={`w-full placeholder:text-gray-400 bg-white text-gray-900 ${errors.lastName ? 'border-red-500' : ''}`}
                  />
                  {errors.lastName && (
                    <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Work Email and Company */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                    Work Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    className={`w-full placeholder:text-gray-400 bg-white text-gray-900 ${errors.email ? 'border-red-500' : ''}`}
                  />
                  {errors.email && (
                    <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-900 mb-2">
                    Company
                  </label>
                  <Input
                    id="company"
                    name="company"
                    type="text"
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="Enter your company name"
                    className={`w-full placeholder:text-gray-400 bg-white text-gray-900 ${errors.company ? 'border-red-500' : ''}`}
                  />
                  {errors.company && (
                    <p className="text-red-400 text-xs mt-1">{errors.company}</p>
                  )}
                </div>
              </div>

              {/* How did you hear about us */}
              <div>
                <label htmlFor="hearAboutUs" className="block text-sm font-medium text-gray-900 mb-2">
                  How did you hear about us?
                </label>
                <Input
                  id="hearAboutUs"
                  name="hearAboutUs"
                  type="text"
                  value={formData.hearAboutUs}
                  onChange={handleInputChange}
                  placeholder="How did you hear about us"
                  className={`w-full placeholder:text-gray-400 bg-white text-gray-900 ${errors.hearAboutUs ? 'border-red-500' : ''}`}
                />
                {errors.hearAboutUs && (
                  <p className="text-red-400 text-xs mt-1">{errors.hearAboutUs}</p>
                )}
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-900 mb-2">
                  Message
                </label>
                <Textarea
                  id="message"
                  name="message"
                  rows={4}
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Tell us about your quoting needs and challenges..."
                  className={`w-full placeholder:text-gray-400 bg-white text-gray-900 ${errors.message ? 'border-red-500' : ''}`}
                />
                {errors.message && (
                  <p className="text-red-400 text-xs mt-1">{errors.message}</p>
                )}
              </div>

              {/* Tighter spacing section */}
              <div className="space-y-1.5">
                {/* Checkbox Row */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="agreeToUpdates"
                    checked={agreeToUpdates}
                    onChange={(e) => setAgreeToUpdates(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-500 text-orange-500 focus:ring-orange-500 flex-shrink-0 bg-white"
                  />
                  <label htmlFor="agreeToUpdates" className="text-[11px] text-gray-600 cursor-pointer leading-tight">
                    Yes, I'd like to receive news and updates by email
                  </label>
                </div>

                {/* Privacy Policy Text and Button Row */}
                <div className="flex items-center gap-4">
                  <p className="text-[11px] text-gray-600 leading-tight flex-1 pr-2">
                    By submitting this form<br />
                    you agree with our{' '}
                    <a href="/privacy-policy" className="text-blue-600 hover:text-blue-500 hover:underline">
                      Privacy Policy
                    </a>
                  </p>

                  <Button
                    ref={submitButtonRef}
                    type="submit"
                    className="bg-[var(--landing-primary)] hover:bg-[var(--landing-primary-hover)] text-white py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap rounded-full w-1/2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </div>
                    ) : (
                      'Schedule Your Demo'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Card>

          {/* Right Side - Features with animations */}
          <div ref={featuresRef} className="space-y-8">
            <div className="feature-item flex items-start gap-4 opacity-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Generate Quotes in Seconds</h3>
                <p className="text-gray-600 leading-relaxed">
                  Our intelligent quote engine automatically calculates pricing, applies discounts, and formats everything perfectly.
                </p>
              </div>
            </div>

            <div className="feature-item flex items-start gap-4 opacity-0">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Design Beautiful Quotes</h3>
                <p className="text-gray-600 leading-relaxed">
                  Create stunning, branded quote templates with our intuitive drag-and-drop editor and live preview.
                </p>
              </div>
            </div>

            <div className="feature-item flex items-start gap-4 opacity-0">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Performance & Optimize</h3>
                <p className="text-gray-600 leading-relaxed">
                  Get deep insights into your quoting process with comprehensive analytics and real-time conversion tracking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 mt-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-xs text-gray-600">
              © 2025 Qwohter Inc. All rights reserved.
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-600">
              <a href="/privacy-policy" className="hover:text-gray-900 transition-colors">
                Privacy notice
              </a>
              <a href="/legal" className="hover:text-gray-900 transition-colors">
                Legal
              </a>
              <a href="/cookie-settings" className="hover:text-gray-900 transition-colors">
                Cookie settings
              </a>
              <a href="/accessibility" className="hover:text-gray-900 transition-colors">
                Accessibility Statement
              </a>
              <a href="/do-not-sell" className="hover:text-gray-900 transition-colors">
                Do Not Sell My Personal Information
              </a>
              <select className="text-gray-600 bg-transparent border border-gray-300 rounded px-2 py-1 text-xs hover:border-gray-400 transition-colors cursor-pointer">
                <option>English</option>
                <option>Español</option>
                <option>Français</option>
              </select>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </>
  );
};

export default DemoContact;
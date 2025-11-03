import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, Eye, Zap, Users } from 'lucide-react';

const DemoContact = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
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
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

    // Create email content
    const subject = encodeURIComponent('Demo Request - Qwohter Quote Management Platform');
    const body = encodeURIComponent(`
Hello,

I would like to request a demo of the Qwohter platform.

Contact Details:
- Name: ${formData.firstName} ${formData.lastName}
- Email: ${formData.email}
- Company: ${formData.company}
- How I heard about you: ${formData.hearAboutUs}

Message:
${formData.message}

Please contact me to schedule a demonstration.

Best regards,
${formData.firstName} ${formData.lastName}
    `);

    // Open default email client with pre-filled content
    const mailtoLink = `mailto:demo@qwohter.com?subject=${subject}&body=${body}`;
    window.open(mailtoLink, '_blank');

    // Show success state
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1000);
  };


  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Thank You!
          </h1>
          <p className="text-gray-600 mb-6">
            Your demo request has been sent. We'll get back to you within 24 hours to schedule your personalized demonstration.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => navigate('/')}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              Back to Home
            </Button>
            <Button
              onClick={() => {
                setIsSubmitted(false);
                setFormData({
                  firstName: '',
                  lastName: '',
                  email: '',
                  company: '',
                  hearAboutUs: '',
                  message: ''
                });
              }}
              variant="outline"
              className="w-full"
            >
              Send Another Request
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
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
                navigate('/');
              }}
            >
              <img
                src="/logos/New_Landing_Page_Logo_DarkonLightBackground.svg"
                alt="Qwohter Logo"
                className="h-8 w-auto"
              />
            </div>

            {/* Center Navigation */}
            <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center space-x-12">
              <a href="/#features" className="text-gray-600 hover:text-gray-900 font-medium cursor-pointer transition-colors duration-200">
                Features
              </a>
              <a href="/#usecases" className="text-gray-600 hover:text-gray-900 font-medium cursor-pointer transition-colors duration-200">
                Use Cases
              </a>
              <a href="/#pricing" className="text-gray-600 hover:text-gray-900 font-medium cursor-pointer transition-colors duration-200">
                Pricing
              </a>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-8">
              <span
                onClick={() => navigate('/sign-in')}
                className="text-gray-600 hover:text-gray-900 font-medium cursor-pointer transition-colors duration-200"
              >
                Sign In
              </span>
              <Button
                onClick={() => navigate('/demo-contact')}
                className="bg-orange-500 text-white px-6 py-2.5 rounded-full hover:bg-orange-600 transition-colors duration-200 font-medium"
              >
                Get a Demo
              </Button>
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
          {/* Left Side - Form (Hovering Card) */}
          <Card className="bg-gray-50 p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Note: Last two items have tighter spacing */}
              {/* Row 1: First Name and Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Angel"
                    className={`w-full placeholder:text-gray-400 ${errors.firstName ? 'border-red-500' : ''}`}
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Phillips"
                    className={`w-full placeholder:text-gray-400 ${errors.lastName ? 'border-red-500' : ''}`}
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Work Email and Company */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Work Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="name@company.com"
                    className={`w-full placeholder:text-gray-400 ${errors.email ? 'border-red-500' : ''}`}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <Input
                    id="company"
                    name="company"
                    type="text"
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="Acme Corp."
                    className={`w-full placeholder:text-gray-400 ${errors.company ? 'border-red-500' : ''}`}
                  />
                  {errors.company && (
                    <p className="text-red-500 text-xs mt-1">{errors.company}</p>
                  )}
                </div>
              </div>

              {/* How did you hear about us */}
              <div>
                <label htmlFor="hearAboutUs" className="block text-sm font-medium text-gray-700 mb-2">
                  How did you hear about us?
                </label>
                <Input
                  id="hearAboutUs"
                  name="hearAboutUs"
                  type="text"
                  value={formData.hearAboutUs}
                  onChange={handleInputChange}
                  placeholder="Enter your message"
                  className={`w-full placeholder:text-gray-400 ${errors.hearAboutUs ? 'border-red-500' : ''}`}
                />
                {errors.hearAboutUs && (
                  <p className="text-red-500 text-xs mt-1">{errors.hearAboutUs}</p>
                )}
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <Textarea
                  id="message"
                  name="message"
                  rows={4}
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Tell us about your quoting needs and challenges..."
                  className={`w-full placeholder:text-gray-400 bg-white ${errors.message ? 'border-red-500' : ''}`}
                />
                {errors.message && (
                  <p className="text-red-500 text-xs mt-1">{errors.message}</p>
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
                    className="w-3.5 h-3.5 rounded border-gray-300 text-gray-900 focus:ring-orange-500 flex-shrink-0"
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
                    <a href="/privacy-policy" className="text-blue-600 hover:underline">
                      Privacy Policy
                    </a>
                  </p>

                  <Button
                    type="submit"
                    className="bg-gray-900 hover:bg-gray-800 text-white py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap rounded-full w-1/2"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

          {/* Right Side - Features */}
          <div className="space-y-8">
            <div className="flex items-start gap-4">
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

            <div className="flex items-start gap-4">
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

            <div className="flex items-start gap-4">
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
  );
};

export default DemoContact;
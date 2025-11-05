import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { CheckCircle, ChevronDown, Mail, HelpCircle, X } from 'lucide-react';
import { useMagneticHover } from '@/hooks/useAnimations';
import { sendContactUsEmail } from '@/services/emailService';
import { toast } from 'sonner';

const ContactUs = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [navTextColor, setNavTextColor] = useState('text-[var(--landing-text-on-light)]');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const submitButtonRef = useMagneticHover(0.3);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    message: ''
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
      setNavTextColor('text-[var(--landing-text-on-light)]');
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle hash navigation (e.g., /contact-us#faq)
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

    if (!formData.message.trim()) {
      newErrors.message = 'Please enter a message';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Sending contact form...');

      const result = await sendContactUsEmail({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        message: formData.message,
      });

      console.log('Email result:', result);

      if (result.success) {
        setIsSubmitted(true);
        toast.success('Message sent successfully!');
        setIsSubmitting(false);
      } else {
        console.error('Email failed:', result.error);
        toast.error(result.error || 'Failed to send message. Please try again.');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
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
      message: ''
    });
  };

  const faqs = [
    {
      question: 'What makes Qwohter different from using spreadsheets or Word documents?',
      answer: 'Unlike spreadsheets and documents, Qwohter automates calculations, prevents pricing errors, maintains consistent branding, and tracks quote status in real-time. You can generate professional quotes in minutes instead of hours, with built-in version control and approval workflows.'
    },
    {
      question: 'Can I add my company logo and branding to quotes?',
      answer: 'Yes! Upload your logo, customize colors, and set your brand fonts to create professional, on-brand quotes every time. All quotes automatically include your company information and branding preferences.'
    },
    {
      question: 'How does the pricing calculator work?',
      answer: 'Our intelligent pricing engine lets you input material costs, labor hours, overhead percentages, and profit margins. It automatically calculates totals, applies discounts, and can save pricing rules for reuse. You can also set different pricing tiers for various client types.'
    },
    {
      question: 'Can multiple team members collaborate on quotes?',
      answer: 'Absolutely. Invite team members, assign roles (Admin, Member, Viewer), and work together on quotes. Track who made changes, get approvals before sending, and maintain a complete audit trail of all modifications.'
    },
    {
      question: 'What happens after I send a quote to a client?',
      answer: 'Qwohter tracks quote status from "Draft" through "Sent," "Viewed," "Accepted," or "Rejected." You can see when clients open quotes, send follow-up reminders, and convert accepted quotes into projects on your board.'
    },
    {
      question: 'Do I need to install any software?',
      answer: 'No installation needed! Qwohter is 100% cloud-based and works in any modern web browser. Access your quotes from anywhere, on any device. Your data syncs automatically across all devices.'
    },
    {
      question: 'Can I export quotes as PDFs?',
      answer: 'Yes! Every quote can be downloaded as a professional PDF with your branding. You can also email quotes directly to clients from within Qwohter, with automatic tracking of opens and views.'
    },
    {
      question: 'Is there a limit to how many quotes I can create?',
      answer: 'No limits! Create unlimited quotes, save unlimited templates, and manage as many projects as you need. All plans include unlimited quote generation and storage.'
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation Bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-[var(--landing-bg-dark)]/75 backdrop-blur-md border-b border-[var(--landing-primary)]/20 shadow-sm'
            : 'bg-transparent'
        }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div
              className="flex items-center cursor-pointer group"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                navigate('/');
              }}
            >
              <img
                src={navTextColor === 'text-white' ? '/logos/New_Landing_Page_Logo_LightonDarkBackground.svg' : '/logos/New_Landing_Page_Logo_DarkonLightBackground.svg'}
                alt="Qwohter Logo"
                className="h-8 w-auto transition-transform duration-300 group-hover:scale-110"
              />
            </div>

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
              <span
                onClick={() => navigate('/contact-us')}
                className={`${navTextColor} hover:text-[var(--landing-primary)] font-medium cursor-pointer transition-all duration-300 relative group`}
              >
                Contact Us
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--landing-primary)] transition-all duration-300 group-hover:w-full" />
              </span>
            </div>

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

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-[var(--landing-bg-light)] to-white pt-32 pb-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="text-center">
            <h1 className="text-5xl text-gray-900 leading-tight mb-4">
              Get in <span className="font-bold text-[var(--landing-primary)]">Touch</span> with Us
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Have questions or need help? We're here to assist you. Reach out and let's start a conversation.
            </p>
          </div>
        </div>
      </div>

      {/* Contact Form Section */}
      <div className="max-w-3xl mx-auto px-6">
        <Card className="bg-[var(--landing-bg-light)] p-8 shadow-xl border-none">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  placeholder="Enter your first name"
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
                  placeholder="Enter your last name"
                  className={`w-full placeholder:text-gray-400 bg-white text-gray-900 ${errors.lastName ? 'border-red-500' : ''}`}
                />
                {errors.lastName && (
                  <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                Email
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
              <label htmlFor="message" className="block text-sm font-medium text-gray-900 mb-2">
                Message
              </label>
              <Textarea
                id="message"
                name="message"
                rows={5}
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Tell us how we can help you..."
                className={`w-full placeholder:text-gray-400 bg-white text-gray-900 ${errors.message ? 'border-red-500' : ''}`}
              />
              {errors.message && (
                <p className="text-red-400 text-xs mt-1">{errors.message}</p>
              )}
            </div>

            <Button
              ref={submitButtonRef}
              type="submit"
              className="w-full bg-[var(--landing-primary)] hover:bg-[var(--landing-primary-hover)] text-white py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 rounded-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </div>
              ) : (
                'Send Message'
              )}
            </Button>
          </form>

          {isSubmitted && (
            <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-800 font-medium">Message sent successfully!</p>
                <p className="text-green-700 text-sm mt-1">We'll get back to you within 24 hours.</p>
              </div>
              <button
                onClick={handleCloseSuccessModal}
                className="text-green-600 hover:text-green-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* FAQ Section */}
      <div id="faq" className="max-w-5xl mx-auto px-6 py-18">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          <p className="text-gray-600">Find answers to common questions about Qwohter</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card
              key={index}
              className="border border-gray-200 hover:border-[var(--landing-primary)]/30 transition-all duration-300"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left transition-all duration-200"
              >
                <span className="font-semibold text-gray-900 pr-8">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-[var(--landing-primary)] flex-shrink-0 transition-transform duration-300 ${
                    openFaqIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openFaqIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <p className="px-6 pb-5 text-gray-600 leading-relaxed">{faq.answer}</p>
              </div>
            </Card>
          ))}
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

export default ContactUs;

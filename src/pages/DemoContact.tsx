import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Mail, Send, CheckCircle } from 'lucide-react';

const DemoContact = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;

    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'phone') {
      const formattedPhone = formatPhoneNumber(value);
      setFormData(prev => ({
        ...prev,
        [name]: formattedPhone
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Create email content
    const subject = encodeURIComponent('Demo Request - Qwohter Quote Management Platform');
    const body = encodeURIComponent(`
Hello,

I would like to request a demo of the Qwohter platform.

Contact Details:
- Name: ${formData.name}
- Email: ${formData.email}
- Company: ${formData.company}
- Phone: ${formData.phone}

Message:
${formData.message}

Please contact me to schedule a demonstration.

Best regards,
${formData.name}
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

  const isFormValid = formData.name && formData.email && formData.company;

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
                  name: '',
                  email: '',
                  company: '',
                  phone: '',
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
            <img
              src="/logos/Landing_Page_Logo_Light.svg"
              alt="Qwohter Logo"
              className="h-8 w-auto"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Request a Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            See how Qwohter can transform your quoting process. Fill out the form below and we'll send you a personalized demo invitation.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Contact Form */}
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-semibold text-gray-900">
                Get Your Demo
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john@company.com"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <Input
                    id="company"
                    name="company"
                    type="text"
                    required
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="Your Company"
                    className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Tell us about your needs
                </label>
                <Textarea
                  id="message"
                  name="message"
                  rows={3}
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="What type of quotes do you create? How many per month? Any specific requirements?"
                  className="w-full"
                />
              </div>

              <Button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed py-3"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Opening Email...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Send Demo Request
                  </div>
                )}
              </Button>
            </form>
          </Card>

          {/* What to Expect Panel - Right Side */}
          <div className="space-y-4">
            <div className="p-4 relative">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                What to expect from your demo
              </h3>

              {/* Background dotted line */}
              <div className="absolute left-8 top-16 bottom-4 w-0.5 border-l-2 border-dotted border-gray-200"></div>

              <div className="space-y-4 relative">
                {/* Step 1 */}
                <div className="flex items-start gap-3 relative">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 shadow-sm">
                    <span className="text-white text-xs font-bold">1</span>
                  </div>
                  <div className="pt-0.5">
                    <h4 className="font-medium text-gray-900 mb-0.5 text-sm">Personalized Walkthrough</h4>
                    <p className="text-gray-600 text-xs leading-relaxed">
                      See Qwohter in action with examples relevant to your industry
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 relative">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 shadow-sm">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                  <div className="pt-0.5">
                    <h4 className="font-medium text-gray-900 mb-0.5 text-sm">Q&A Session</h4>
                    <p className="text-gray-600 text-xs leading-relaxed">
                      Ask questions and learn how Qwohter fits your workflow
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 relative">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 shadow-sm">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                  <div className="pt-0.5">
                    <h4 className="font-medium text-gray-900 mb-0.5 text-sm">Custom Setup</h4>
                    <p className="text-gray-600 text-xs leading-relaxed">
                      Learn about implementation and getting your team started
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-gray-500">
              <p>Need immediate assistance?</p>
              <p>
                Call us at{' '}
                <a href="tel:+1-555-0123" className="text-orange-600 hover:underline">
                  +1 (555) 0123
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Quick Response Guarantee - Full Width Below */}
        <div className="mt-8">
          <Card className="p-4 bg-blue-50 border-blue-200 max-w-6xl mx-auto">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Quick Response Guarantee
              </h3>
              <p className="text-blue-800 text-sm">
                We respond to all demo requests within 24 hours. Most demos are scheduled within 2-3 business days at a time that works for you.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DemoContact;
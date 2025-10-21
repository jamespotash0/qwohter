import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, Eye, Zap, Users } from 'lucide-react';

const DemoContact = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: '',
    employees: '1-5',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Create email content
    const subject = encodeURIComponent('Demo Request - WallQu Quote Management Platform');
    const body = encodeURIComponent(`
Hello,

I would like to request a demo of the WallQu platform.

Contact Details:
- Name: ${formData.name}
- Email: ${formData.email}
- Phone: ${formData.phone}
- Company: ${formData.company}
- Role: ${formData.role}
- Number of Employees: ${formData.employees}

Message:
${formData.message}

Please contact me to schedule a demonstration.

Best regards,
${formData.name}
    `);

    // Open default email client with pre-filled content
    const mailtoLink = `mailto:demo@wallqu.com?subject=${subject}&body=${body}`;
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
                  phone: '',
                  company: '',
                  role: '',
                  employees: '1-5',
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 grid lg:grid-cols-[1fr_1.5fr]">
      {/* Left Side - Info Section */}
      <div className="flex flex-col justify-between px-12 lg:px-16 py-8 lg:py-10">
        <div>
          {/* Logo */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="-ml-3"
            >
              <img
                src="/logos/Landing_Page_Logo_Light.svg"
                alt="Qwohter Logo"
                className="h-8 w-auto"
              />
            </Button>
          </div>

          {/* Hero Text */}
          <div className="mb-12">
            <h1 className="text-5xl text-gray-900 mb-4">
              <span className="font-light">See Qwohter in </span><span className="font-bold">action</span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Fill out your company details below to book a personalized demo, kickoff a free trial, or explore a sandbox containing pre-populated data.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Generate Quotes in Seconds</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Our intelligent quote engine automatically calculates pricing, applies discounts, and formats everything perfectly.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Design Beautiful Quotes</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Create stunning, branded quote templates with our intuitive drag-and-drop editor and live preview.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Track Performance & Optimize</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Get deep insights into your quoting process with comprehensive analytics and real-time conversion tracking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="bg-[#F3F4F6] px-12 lg:px-16 py-8 lg:py-10 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          <Card className="bg-slate-800 backdrop-blur-xl border-slate-700 p-10 shadow-2xl">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Please fill out the form
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Name and Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className="w-full bg-white/95 border-gray-300 text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Company Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john@company.com"
                    className="w-full bg-white/95 border-gray-300 text-gray-900 placeholder:text-gray-500"
                  />
                </div>
              </div>

              {/* Row 2: Phone and Company */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                    className="w-full bg-white/95 border-gray-300 text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
                    Company
                  </label>
                  <Input
                    id="company"
                    name="company"
                    type="text"
                    required
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="Your Company Inc."
                    className="w-full bg-white/95 border-gray-300 text-gray-900 placeholder:text-gray-500"
                  />
                </div>
              </div>

              {/* Row 3: Role and Number of Employees */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-2">
                    Role
                  </label>
                  <Input
                    id="role"
                    name="role"
                    type="text"
                    value={formData.role}
                    onChange={handleInputChange}
                    placeholder="Sales Manager"
                    className="w-full bg-white/95 border-gray-300 text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label htmlFor="employees" className="block text-sm font-medium text-gray-300 mb-2">
                    Number of employees
                  </label>
                  <select
                    id="employees"
                    name="employees"
                    value={formData.employees}
                    onChange={handleInputChange}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white/95 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="1-5">1-5</option>
                    <option value="5-10">5-10</option>
                    <option value="10-20">10-20</option>
                    <option value="20+">20+</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  Message
                </label>
                <Textarea
                  id="message"
                  name="message"
                  rows={4}
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Tell us about your needs..."
                  className="w-full bg-white/95 border-gray-300 text-gray-900 placeholder:text-gray-500"
                />
              </div>

              <Button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 mt-6"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </div>
                ) : (
                  'Request a demo'
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DemoContact;
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { CheckCircle, Plus, Minus, Mail, HelpCircle, X } from 'lucide-react';
import { useMagneticHover } from '@/hooks/useAnimations';
import { sendContactUsEmail } from '@/services/emailService';
import { toast } from '@/components/ui/sonner';
import { ContactNavigation } from '@/components/features/landing/ContactNavigation';
import { Footer } from '@/components/features/landing/Footer';
import { DebugGrid } from '@/components/common/DebugGrid';

const ContactUs = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [navTextColor, setNavTextColor] = useState('text-[var(--landing-text-on-light)]');
  const [openFaqQuestions, setOpenFaqQuestions] = useState<Set<string>>(new Set());

  const submitButtonRef = useMagneticHover(0.3);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
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
      phone: '',
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

    if (!formData.phone.trim()) {
      newErrors.phone = 'Please enter your phone number';
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
        phone: formData.phone,
        message: formData.message,
      });

      console.log('Email result:', result);

      if (result.success) {
        setIsSubmitted(true);
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
      phone: '',
      message: ''
    });
  };

  const faqs = [
  {
    question: 'How do I sign up and get started?',
    answer: 'Click "Sign In" in the header and select "Create Account." Enter your email, create a password, and set up your organization profile. You’ll be guided through a short onboarding to add company details, upload your logo, and create your first quote—most users complete setup in under 5 minutes.'
  },
  {
    question: 'What does Qwohter cost?',
    answer: 'We offer a single, simple plan: $20 per user per month. No tiers, no usage limits—just one predictable rate. Billing updates automatically as you add or remove active users.'
  },
  {
    question: 'How do I add new users to my account?',
    answer: 'Organization owners and admins can invite team members from Settings → Team. Click "Invite Member," enter their email, and assign a role (Admin, Member, Viewer). Invited users receive an email to join and billing adjusts automatically for active users.'
  },
  {
    question: 'How do I create and export quotes?',
    answer: 'Create quotes using our editor or start from a template. When ready, download a branded PDF with one click, email the quote to clients directly from Qwohter, or share a secure link for online viewing and approval.'
  },
  {
    question: 'Can multiple team members work on quotes?',
    answer: 'Yes. Invite unlimited team members, assign roles, collaborate in real-time, and track changes. Use approval workflows to require sign-off before a quote is sent. An audit trail shows who made which edits.'
  },
  {
    question: 'How does quote tracking work?',
    answer: 'Qwohter tracks each quote’s lifecycle (Draft → Submitted → Rejected → Accepted). You can send automated follow-up reminders and convert accepted quotes directly into projects on your board.'
  },
  {
    question: 'Can I analyze quote performance?',
    answer: 'Yes. Qwohter includes built-in analytics that help you understand how your team performs over time. Track total quotes sent, win rate, revenue, and other key metrics. Use insights to identify what’s working and improve your quoting process.'
  },
  {
    question: 'Can I export quotes as PDFs or share them online?',
    answer: 'Yes — download professional, branded PDFs of any quote, email quotes to clients from within Qwohter, or share a secure view-only link so clients can review and approve online.'
  },
  {
    question: 'Can I customize my quote forms?',
    answer: 'Absolutely. Create your own quote forms by adding custom fields, dropdowns, and sections that match your business workflow. You can tailor forms to capture the right data for your team and clients, and even use different layouts for different project types.'
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. Data is encrypted in transit and at rest using industry-standard protections. We run on secure cloud infrastructure with backups, support multi-factor authentication, and follow common compliance practices to keep your quotes and client data safe.'
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes — we offer a 14-day free trial with full access to all features. No credit card required to start. You can create unlimited quotes, invite team members, and explore all features. Cancel anytime during the trial with no charges.'
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes. Cancel anytime from Account Settings — there are no long-term contracts or cancellation fees. You’ll retain access until the end of your current billing period and can export all your data before losing access.'
  },
  {
    question: 'What kind of support do you offer?',
    answer: 'We provide email support for all users with typical response times under 24 hours. Our Help Center includes guides, tutorials, and best practices to help you get the most from Qwohter.'
  },
  {
    question: 'What makes Qwohter different from other platforms?',
    answer: 'Qwohter combines the flexibility of spreadsheets with the structure of a purpose-built quoting tool. It supports complex cascading form data — so fields and pricing automatically adapt based on previous selections — making even the most detailed quotes fast and error-free. You can customize your own quote forms, apply your branding, collaborate with your team, and track real performance metrics — all in one place without the clutter of traditional CRMs or estimating software.'
  }
];


  const toggleFaq = (question: string) => {
    setOpenFaqQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(question)) {
        newSet.delete(question);
      } else {
        newSet.add(question);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-[#FFFEFA] overflow-x-hidden">
      <DebugGrid />

      {/* Navigation Bar */}
      <ContactNavigation activeSection="contact" />

      {/* Hero Section with Background */}
      <section className="relative w-full min-h-[640px] lg:min-h-[900px] overflow-hidden">
        <img
          src="/images/landing/contact-hero-bg.svg"
          alt="Contact Hero Background"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Content Container with max-width constraint */}
        <div className="relative h-full max-w-[1920px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-[10.4vw] flex flex-col xl:flex-row items-start justify-between pt-32 sm:pt-40 xl:pt-[245px] pb-16 xl:pb-0 gap-12 xl:gap-[100px]">
          {/* Left Content Container */}
          <div className="z-10 w-full min-w-0 max-w-[645px] xl:w-[645px] flex-shrink-0">
        <svg width="105" height="32" viewBox="0 0 105 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-5">
          <path d="M0 16C0 7.16344 7.16344 0 16 0H89C97.8366 0 105 7.16344 105 16C105 24.8366 97.8366 32 89 32H16C7.16344 32 0 24.8366 0 16Z" fill="white" fill-opacity="0.5"/>
          <path d="M16 0.5H89C97.5604 0.5 104.5 7.43959 104.5 16C104.5 24.5604 97.5604 31.5 89 31.5H16C7.43959 31.5 0.5 24.5604 0.5 16C0.5 7.43959 7.43959 0.5 16 0.5Z" stroke="white" stroke-opacity="0.1"/>
          <path d="M16.912 22.234C16.06 22.234 15.259 22.066 14.509 21.73C13.759 21.388 13.099 20.92 12.529 20.326C11.965 19.726 11.521 19.03 11.197 18.238C10.879 17.446 10.72 16.6 10.72 15.7C10.72 14.8 10.879 13.954 11.197 13.162C11.521 12.37 11.965 11.677 12.529 11.083C13.099 10.483 13.759 10.015 14.509 9.679C15.259 9.337 16.06 9.166 16.912 9.166C17.932 9.166 18.871 9.403 19.729 9.877C20.587 10.351 21.298 10.981 21.862 11.767L20.746 12.37C20.302 11.776 19.738 11.305 19.054 10.957C18.376 10.603 17.662 10.426 16.912 10.426C16.222 10.426 15.577 10.567 14.977 10.849C14.383 11.125 13.861 11.506 13.411 11.992C12.961 12.478 12.61 13.039 12.358 13.675C12.106 14.311 11.98 14.986 11.98 15.7C11.98 16.426 12.106 17.107 12.358 17.743C12.616 18.379 12.97 18.94 13.42 19.426C13.876 19.912 14.401 20.293 14.995 20.569C15.595 20.839 16.234 20.974 16.912 20.974C17.692 20.974 18.415 20.797 19.081 20.443C19.753 20.083 20.308 19.615 20.746 19.039L21.862 19.642C21.298 20.428 20.587 21.058 19.729 21.532C18.871 22 17.932 22.234 16.912 22.234ZM27.1689 22.234C26.3409 22.234 25.5849 22.021 24.9009 21.595C24.2229 21.169 23.6799 20.599 23.2719 19.885C22.8699 19.165 22.6689 18.37 22.6689 17.5C22.6689 16.84 22.7859 16.225 23.0199 15.655C23.2539 15.079 23.5749 14.575 23.9829 14.143C24.3969 13.705 24.8769 13.363 25.4229 13.117C25.9689 12.871 26.5509 12.748 27.1689 12.748C27.9969 12.748 28.7499 12.961 29.4279 13.387C30.1119 13.813 30.6549 14.386 31.0569 15.106C31.4649 15.826 31.6689 16.624 31.6689 17.5C31.6689 18.154 31.5519 18.766 31.3179 19.336C31.0839 19.906 30.7599 20.41 30.3459 20.848C29.9379 21.28 29.4609 21.619 28.9149 21.865C28.3749 22.111 27.7929 22.234 27.1689 22.234ZM27.1689 20.974C27.7809 20.974 28.3299 20.815 28.8159 20.497C29.3079 20.173 29.6949 19.747 29.9769 19.219C30.2649 18.691 30.4089 18.118 30.4089 17.5C30.4089 16.87 30.2649 16.291 29.9769 15.763C29.6889 15.229 29.2989 14.803 28.8069 14.485C28.3209 14.167 27.7749 14.008 27.1689 14.008C26.5569 14.008 26.0049 14.17 25.5129 14.494C25.0269 14.812 24.6399 15.235 24.3519 15.763C24.0699 16.291 23.9289 16.87 23.9289 17.5C23.9289 18.148 24.0759 18.736 24.3699 19.264C24.6639 19.786 25.0569 20.203 25.5489 20.515C26.0409 20.821 26.5809 20.974 27.1689 20.974ZM41.0413 16.429V22H39.7813V16.681C39.7813 16.189 39.6613 15.742 39.4213 15.34C39.1813 14.938 38.8603 14.617 38.4583 14.377C38.0563 14.137 37.6093 14.017 37.1173 14.017C36.6313 14.017 36.1843 14.137 35.7763 14.377C35.3743 14.617 35.0533 14.938 34.8133 15.34C34.5733 15.742 34.4533 16.189 34.4533 16.681V22H33.1933V13H34.4533V14.242C34.7713 13.786 35.1853 13.423 35.6953 13.153C36.2053 12.883 36.7603 12.748 37.3603 12.748C38.0383 12.748 38.6563 12.913 39.2143 13.243C39.7723 13.573 40.2163 14.017 40.5463 14.575C40.8763 15.133 41.0413 15.751 41.0413 16.429ZM47.4427 14.26H45.2917L45.2827 22H44.0227L44.0317 14.26H42.4027V13H44.0317L44.0227 10.174H45.2827L45.2917 13H47.4427V14.26ZM56.2007 13H57.4607V22H56.2007L56.1557 20.326C55.8617 20.896 55.4507 21.358 54.9227 21.712C54.3947 22.06 53.7647 22.234 53.0327 22.234C52.3727 22.234 51.7547 22.111 51.1787 21.865C50.6027 21.613 50.0957 21.268 49.6577 20.83C49.2197 20.392 48.8777 19.885 48.6317 19.309C48.3857 18.733 48.2627 18.115 48.2627 17.455C48.2627 16.807 48.3827 16.198 48.6227 15.628C48.8687 15.058 49.2047 14.557 49.6307 14.125C50.0627 13.693 50.5607 13.357 51.1247 13.117C51.6947 12.871 52.3037 12.748 52.9517 12.748C53.7017 12.748 54.3557 12.928 54.9137 13.288C55.4717 13.642 55.9157 14.107 56.2457 14.683L56.2007 13ZM53.0057 21.01C53.6477 21.01 54.1997 20.854 54.6617 20.542C55.1237 20.224 55.4777 19.798 55.7237 19.264C55.9757 18.73 56.1017 18.142 56.1017 17.5C56.1017 16.84 55.9757 16.246 55.7237 15.718C55.4717 15.184 55.1147 14.761 54.6527 14.449C54.1907 14.137 53.6417 13.981 53.0057 13.981C52.3697 13.981 51.7877 14.14 51.2597 14.458C50.7377 14.77 50.3207 15.193 50.0087 15.727C49.7027 16.261 49.5497 16.852 49.5497 17.5C49.5497 18.154 49.7087 18.748 50.0267 19.282C50.3447 19.81 50.7647 20.23 51.2867 20.542C51.8147 20.854 52.3877 21.01 53.0057 21.01ZM65.5119 19.741L66.6369 20.353C66.2289 20.923 65.7099 21.379 65.0799 21.721C64.4559 22.063 63.7779 22.234 63.0459 22.234C62.2179 22.234 61.4619 22.021 60.7779 21.595C60.0999 21.169 59.5569 20.599 59.1489 19.885C58.7469 19.165 58.5459 18.37 58.5459 17.5C58.5459 16.84 58.6629 16.225 58.8969 15.655C59.1309 15.079 59.4519 14.575 59.8599 14.143C60.2739 13.705 60.7539 13.363 61.2999 13.117C61.8459 12.871 62.4279 12.748 63.0459 12.748C63.7779 12.748 64.4559 12.919 65.0799 13.261C65.7099 13.603 66.2289 14.062 66.6369 14.638L65.5119 15.241C65.1999 14.845 64.8249 14.542 64.3869 14.332C63.9489 14.116 63.5019 14.008 63.0459 14.008C62.4399 14.008 61.8909 14.17 61.3989 14.494C60.9069 14.812 60.5169 15.235 60.2289 15.763C59.9469 16.291 59.8059 16.87 59.8059 17.5C59.8059 18.13 59.9499 18.709 60.2379 19.237C60.5319 19.765 60.9249 20.188 61.4169 20.506C61.9089 20.818 62.4519 20.974 63.0459 20.974C63.5379 20.974 63.9999 20.86 64.4319 20.632C64.8639 20.404 65.2239 20.107 65.5119 19.741ZM72.8606 14.26H70.7096L70.7006 22H69.4406L69.4496 14.26H67.8206V13H69.4496L69.4406 10.174H70.7006L70.7096 13H72.8606V14.26ZM78.4309 18.553V13H79.6909V18.301C79.6909 18.793 79.8109 19.24 80.0509 19.642C80.2909 20.044 80.6119 20.365 81.0139 20.605C81.4219 20.845 81.8689 20.965 82.3549 20.965C82.8469 20.965 83.2909 20.845 83.6869 20.605C84.0889 20.365 84.4099 20.044 84.6499 19.642C84.8899 19.24 85.0099 18.793 85.0099 18.301V13H86.2699L86.2789 22H85.0189L85.0099 20.74C84.6919 21.196 84.2779 21.559 83.7679 21.829C83.2639 22.099 82.7119 22.234 82.1119 22.234C81.4339 22.234 80.8159 22.069 80.2579 21.739C79.6999 21.409 79.2559 20.965 78.9259 20.407C78.5959 19.849 78.4309 19.231 78.4309 18.553ZM90.8532 22.171C90.3612 22.159 89.8812 22.069 89.4132 21.901C88.9452 21.733 88.5372 21.505 88.1892 21.217C87.8412 20.929 87.5922 20.602 87.4422 20.236L88.5312 19.768C88.6272 20.002 88.8042 20.218 89.0622 20.416C89.3262 20.608 89.6262 20.764 89.9622 20.884C90.2982 20.998 90.6312 21.055 90.9612 21.055C91.3272 21.055 91.6692 20.995 91.9872 20.875C92.3052 20.755 92.5632 20.584 92.7612 20.362C92.9652 20.134 93.0672 19.867 93.0672 19.561C93.0672 19.231 92.9592 18.973 92.7432 18.787C92.5272 18.595 92.2542 18.445 91.9242 18.337C91.5942 18.223 91.2552 18.115 90.9072 18.013C90.2712 17.839 89.7102 17.647 89.2242 17.437C88.7382 17.227 88.3572 16.96 88.0812 16.636C87.8112 16.306 87.6762 15.883 87.6762 15.367C87.6762 14.821 87.8292 14.35 88.1352 13.954C88.4472 13.552 88.8522 13.243 89.3502 13.027C89.8542 12.805 90.3912 12.694 90.9612 12.694C91.6932 12.694 92.3592 12.853 92.9592 13.171C93.5652 13.489 94.0032 13.912 94.2732 14.44L93.2562 15.043C93.1482 14.797 92.9772 14.584 92.7432 14.404C92.5092 14.224 92.2422 14.083 91.9422 13.981C91.6482 13.879 91.3482 13.825 91.0422 13.819C90.6582 13.813 90.3012 13.87 89.9712 13.99C89.6412 14.104 89.3742 14.275 89.1702 14.503C88.9722 14.731 88.8732 15.01 88.8732 15.34C88.8732 15.67 88.9722 15.922 89.1702 16.096C89.3682 16.264 89.6352 16.402 89.9712 16.51C90.3132 16.612 90.6972 16.732 91.1232 16.87C91.6692 17.044 92.1822 17.242 92.6622 17.464C93.1422 17.686 93.5292 17.962 93.8232 18.292C94.1172 18.622 94.2612 19.039 94.2552 19.543C94.2552 20.083 94.0932 20.554 93.7692 20.956C93.4452 21.358 93.0252 21.667 92.5092 21.883C91.9932 22.093 91.4412 22.189 90.8532 22.171Z" fill="#171717"/>
        </svg>
        <h2 className="text-fluid-3xl text-balance bg-[linear-gradient(180deg,#171717_0%,#777777_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] mb-[20px]" style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600, letterSpacing: '0.02em' }}>
          Connect With Our Team<br />Request a Demo
        </h2>
        <p className="text-fluid-base text-pretty text-[#343432] max-w-[500px] mb-[30px]" style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 400 }}>
          Have questions or need help? We're here to assist you. Reach out and let's start a conversation.
        </p>

        {/* Feature Boxes */}
        <div className="flex flex-col gap-4">
          {/* Box 1 */}
          <div className="w-full max-w-[484px] min-h-[54px] rounded-[15px] bg-white/60 border border-white flex items-center px-4 sm:px-6 py-2 gap-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <path d="M24 12C24 13.024 22.742 13.868 22.49 14.812C22.23 15.788 22.888 17.148 22.394 18.002C21.892 18.87 20.382 18.974 19.678 19.678C18.974 20.382 18.87 21.892 18.002 22.394C17.148 22.888 15.788 22.23 14.812 22.49C13.868 22.742 13.024 24 12 24C10.976 24 10.132 22.742 9.188 22.49C8.212 22.23 6.852 22.888 5.998 22.394C5.13 21.892 5.026 20.382 4.322 19.678C3.618 18.974 2.108 18.87 1.606 18.002C1.112 17.148 1.77 15.788 1.51 14.812C1.258 13.868 0 13.024 0 12C0 10.976 1.258 10.132 1.51 9.188C1.77 8.212 1.112 6.852 1.606 5.998C2.108 5.13 3.618 5.026 4.322 4.322C5.026 3.618 5.13 2.108 5.998 1.606C6.852 1.112 8.212 1.77 9.188 1.51C10.132 1.258 10.976 0 12 0C13.024 0 13.868 1.258 14.812 1.51C15.788 1.77 17.148 1.112 18.002 1.606C18.87 2.108 18.974 3.618 19.678 4.322C20.382 5.026 21.892 5.13 22.394 5.998C22.888 6.852 22.23 8.212 22.49 9.188C22.742 10.132 24 10.976 24 12Z" fill="#EE6C4D"/>
              <path d="M15.4679 8.42393L10.8999 12.9919L8.5319 10.6259C8.28494 10.3791 7.95007 10.2404 7.6009 10.2404C7.25174 10.2404 6.91687 10.3791 6.6699 10.6259C6.42308 10.8729 6.28442 11.2078 6.28442 11.5569C6.28442 11.9061 6.42308 12.241 6.6699 12.4879L9.9919 15.8099C10.2323 16.05 10.5581 16.1849 10.8979 16.1849C11.2377 16.1849 11.5635 16.05 11.8039 15.8099L17.3279 10.2859C17.5747 10.039 17.7134 9.70409 17.7134 9.35493C17.7134 9.00576 17.5747 8.67089 17.3279 8.42393C17.2058 8.30172 17.0608 8.20478 16.9013 8.13864C16.7417 8.0725 16.5706 8.03845 16.3979 8.03845C16.2252 8.03845 16.0541 8.0725 15.8945 8.13864C15.735 8.20478 15.59 8.30172 15.4679 8.42393Z" fill="#FFFCEE"/>
            </svg>
            <div>
              <p className="text-base text-[#343432]" style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 400 }}>
                Design <span className="font-semibold text-[#EE6C4D]">beautiful quotes</span> that win deals
              </p>
            </div>
          </div>

          {/* Box 2 */}
          <div className="w-full max-w-[484px] min-h-[54px] rounded-[15px] bg-white/60 border border-white flex items-center px-4 sm:px-6 py-2 gap-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <path d="M24 12C24 13.024 22.742 13.868 22.49 14.812C22.23 15.788 22.888 17.148 22.394 18.002C21.892 18.87 20.382 18.974 19.678 19.678C18.974 20.382 18.87 21.892 18.002 22.394C17.148 22.888 15.788 22.23 14.812 22.49C13.868 22.742 13.024 24 12 24C10.976 24 10.132 22.742 9.188 22.49C8.212 22.23 6.852 22.888 5.998 22.394C5.13 21.892 5.026 20.382 4.322 19.678C3.618 18.974 2.108 18.87 1.606 18.002C1.112 17.148 1.77 15.788 1.51 14.812C1.258 13.868 0 13.024 0 12C0 10.976 1.258 10.132 1.51 9.188C1.77 8.212 1.112 6.852 1.606 5.998C2.108 5.13 3.618 5.026 4.322 4.322C5.026 3.618 5.13 2.108 5.998 1.606C6.852 1.112 8.212 1.77 9.188 1.51C10.132 1.258 10.976 0 12 0C13.024 0 13.868 1.258 14.812 1.51C15.788 1.77 17.148 1.112 18.002 1.606C18.87 2.108 18.974 3.618 19.678 4.322C20.382 5.026 21.892 5.13 22.394 5.998C22.888 6.852 22.23 8.212 22.49 9.188C22.742 10.132 24 10.976 24 12Z" fill="#EE6C4D"/>
              <path d="M15.4679 8.42393L10.8999 12.9919L8.5319 10.6259C8.28494 10.3791 7.95007 10.2404 7.6009 10.2404C7.25174 10.2404 6.91687 10.3791 6.6699 10.6259C6.42308 10.8729 6.28442 11.2078 6.28442 11.5569C6.28442 11.9061 6.42308 12.241 6.6699 12.4879L9.9919 15.8099C10.2323 16.05 10.5581 16.1849 10.8979 16.1849C11.2377 16.1849 11.5635 16.05 11.8039 15.8099L17.3279 10.2859C17.5747 10.039 17.7134 9.70409 17.7134 9.35493C17.7134 9.00576 17.5747 8.67089 17.3279 8.42393C17.2058 8.30172 17.0608 8.20478 16.9013 8.13864C16.7417 8.0725 16.5706 8.03845 16.3979 8.03845C16.2252 8.03845 16.0541 8.0725 15.8945 8.13864C15.735 8.20478 15.59 8.30172 15.4679 8.42393Z" fill="#FFFCEE"/>
            </svg>
            <div>
              <p className="text-base text-[#343432]" style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 400 }}>
                Generate <span className="font-semibold text-[#EE6C4D]">quotes in minutes</span> not hours
              </p>
            </div>
          </div>

          {/* Box 3 */}
          <div className="w-full max-w-[484px] min-h-[54px] rounded-[15px] bg-white/60 border border-white flex items-center px-4 sm:px-6 py-2 gap-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <path d="M24 12C24 13.024 22.742 13.868 22.49 14.812C22.23 15.788 22.888 17.148 22.394 18.002C21.892 18.87 20.382 18.974 19.678 19.678C18.974 20.382 18.87 21.892 18.002 22.394C17.148 22.888 15.788 22.23 14.812 22.49C13.868 22.742 13.024 24 12 24C10.976 24 10.132 22.742 9.188 22.49C8.212 22.23 6.852 22.888 5.998 22.394C5.13 21.892 5.026 20.382 4.322 19.678C3.618 18.974 2.108 18.87 1.606 18.002C1.112 17.148 1.77 15.788 1.51 14.812C1.258 13.868 0 13.024 0 12C0 10.976 1.258 10.132 1.51 9.188C1.77 8.212 1.112 6.852 1.606 5.998C2.108 5.13 3.618 5.026 4.322 4.322C5.026 3.618 5.13 2.108 5.998 1.606C6.852 1.112 8.212 1.77 9.188 1.51C10.132 1.258 10.976 0 12 0C13.024 0 13.868 1.258 14.812 1.51C15.788 1.77 17.148 1.112 18.002 1.606C18.87 2.108 18.974 3.618 19.678 4.322C20.382 5.026 21.892 5.13 22.394 5.998C22.888 6.852 22.23 8.212 22.49 9.188C22.742 10.132 24 10.976 24 12Z" fill="#EE6C4D"/>
              <path d="M15.4679 8.42393L10.8999 12.9919L8.5319 10.6259C8.28494 10.3791 7.95007 10.2404 7.6009 10.2404C7.25174 10.2404 6.91687 10.3791 6.6699 10.6259C6.42308 10.8729 6.28442 11.2078 6.28442 11.5569C6.28442 11.9061 6.42308 12.241 6.6699 12.4879L9.9919 15.8099C10.2323 16.05 10.5581 16.1849 10.8979 16.1849C11.2377 16.1849 11.5635 16.05 11.8039 15.8099L17.3279 10.2859C17.5747 10.039 17.7134 9.70409 17.7134 9.35493C17.7134 9.00576 17.5747 8.67089 17.3279 8.42393C17.2058 8.30172 17.0608 8.20478 16.9013 8.13864C16.7417 8.0725 16.5706 8.03845 16.3979 8.03845C16.2252 8.03845 16.0541 8.0725 15.8945 8.13864C15.735 8.20478 15.59 8.30172 15.4679 8.42393Z" fill="#FFFCEE"/>
            </svg>
            <div>
              <p className="text-base text-[#343432]" style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 400 }}>
                Track performance & <span className="font-semibold text-[#EE6C4D]">optimize your sales</span>
              </p>
            </div>
          </div>
        </div>

        {/* Get a Demo Button */}
        <Button
          onClick={() => navigate('/demo')}
          className="mt-[40px] w-[198px] h-[48px] bg-[#ee6c4d] hover:bg-[#d95b3e] text-white rounded-full transition-colors"
          style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600, fontSize: '18px', lineHeight: '28px' }}
        >
          Get a demo now
        </Button>
      </div>

      {/* Contact Form Section */}
      <div className="z-10 w-full min-w-0 max-w-[710px]">
        <Card className="w-full h-auto xl:h-[560px] bg-white/65 backdrop-blur-[25px] pt-8 sm:pt-[50px] px-5 sm:px-10 pb-8 sm:pb-10 border border-white rounded-[20px] sm:rounded-[30px]">
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
                  className={`w-full placeholder:text-gray-400 bg-white/75 text-gray-900 border-[#C9C9C9] rounded-[10px] ${errors.firstName ? 'border-red-500' : ''}`}
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
                  className={`w-full placeholder:text-gray-400 bg-white/75 text-gray-900 border-[#C9C9C9] rounded-[10px] ${errors.lastName ? 'border-red-500' : ''}`}
                />
                {errors.lastName && (
                  <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  className={`w-full h-[40px] placeholder:text-gray-400 bg-white/75 text-gray-900 border-[#C9C9C9] rounded-[10px] ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-2">
                  Phone Number
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                  className={`w-full h-[40px] placeholder:text-gray-400 bg-white/75 text-gray-900 border-[#C9C9C9] rounded-[10px] ${errors.phone ? 'border-red-500' : ''}`}
                />
                {errors.phone && (
                  <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
                )}
              </div>
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
                className={`w-full h-[185px] placeholder:text-gray-400 bg-white/75 text-gray-900 border-[#C9C9C9] rounded-[10px] resize-none ${errors.message ? 'border-red-500' : ''}`}
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
    </div>
  </section>

      {/* FAQ Section */}
      <div id="faq" className="pt-[120px] pb-18">
        <div className="text-center mb-12">
          <h2 className="text-fluid-3xl text-balance bg-[linear-gradient(180deg,#171717_0%,#777777_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] mb-4" style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600, letterSpacing: '0.02em' }}>
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600">Find answers to common questions about Qwohter</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-[50px] gap-y-5 px-5 sm:px-8 lg:px-16 xl:px-24 [@media(min-width:1700px)]:px-[200px] items-start">
          {faqs.map((faq) => {
            const isOpen = openFaqQuestions.has(faq.question);
            return (
              <Card
                key={faq.question}
                className="border border-[#C9C9C9] hover:border-[var(--landing-primary)]/30 transition-all duration-300 rounded-[20px] bg-white"
              >
                <button
                  onClick={() => toggleFaq(faq.question)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left transition-all duration-200"
                >
                  <span className="text-gray-900 pr-8" style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600, fontSize: '20px', lineHeight: '32px' }}>{faq.question}</span>
                  {isOpen ? (
                    <Minus className="w-5 h-5 text-[var(--landing-primary)] flex-shrink-0 transition-all duration-300" />
                  ) : (
                    <Plus className="w-5 h-5 text-[var(--landing-primary)] flex-shrink-0 transition-all duration-300" />
                  )}
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? 'max-h-96' : 'max-h-0'
                  }`}
                >
                  {isOpen && (
                    <>
                      <div className="border-t border-black/25 mx-6"></div>
                      <p className="px-6 pt-5 pb-5 text-[#171717]" style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 400, fontSize: '16px', lineHeight: '30px' }}>{faq.answer}</p>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <Footer />

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
      `}</style>
    </div>
  );
};

export default ContactUs;

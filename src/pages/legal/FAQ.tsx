import React from 'react';
import { LegalPageLayout } from '@/components/common/layout/LegalPageLayout';

const FAQ: React.FC = () => {
  return (
    <LegalPageLayout
      title="Frequently Asked Questions"
      lastUpdated="January 12, 2025"
    >
      <h2>Getting Started</h2>

      <h3>What is Qwohter?</h3>
      <p>Qwohter is a professional quote management platform designed for businesses in the movable wall and partition industry. It helps you create, manage, and track quotes and proposals efficiently.</p>

      <h3>How do I create an account?</h3>
      <p>Click "Get Started" on our homepage and follow the registration process. You'll need to provide your email address, create a password, and verify your email. After verification, you can set up your organization profile.</p>

      <h3>Is there a free trial?</h3>
      <p>Yes. We offer a 14-day free trial with full access to all features. No credit card is required to start your trial.</p>

      <h2>Account & Billing</h2>

      <h3>How do I upgrade my subscription?</h3>
      <p>Navigate to Settings → Subscription to view available plans and upgrade options. Changes take effect immediately with prorated billing.</p>

      <h3>Can I cancel my subscription?</h3>
      <p>Yes. You can cancel anytime from your account settings. Your access continues until the end of your current billing period.</p>

      <h3>What payment methods do you accept?</h3>
      <p>We accept all major credit cards (Visa, MasterCard, American Express) through Stripe, our secure payment processor.</p>

      <h3>How do I update my billing information?</h3>
      <p>Go to Settings → Subscription → Billing to update your payment method and billing details.</p>

      <h2>Using the Platform</h2>

      <h3>How do I create a new quote?</h3>
      <p>From your dashboard, click "New Quote" to start the quote creation wizard. You'll be guided through entering project details, wall specifications, and pricing information.</p>

      <h3>Can I customize quote templates?</h3>
      <p>Yes. Qwohter allows you to customize quote templates with your company branding, including logos, colors, and custom terminology.</p>

      <h3>How do I share quotes with clients?</h3>
      <p>You can export quotes as PDF documents or share them directly via email from within the platform. Each quote has a unique proposal number for easy reference.</p>

      <h3>Can I collaborate with my team?</h3>
      <p>Yes. You can invite team members to your organization and assign different roles and permissions. Go to Settings → Team to manage your team.</p>

      <h2>Security & Data</h2>

      <h3>Is my data secure?</h3>
      <p>Yes. We take security seriously. All data is encrypted in transit using TLS and at rest using AES-256 encryption. We use industry-standard security practices and regularly audit our systems.</p>

      <h3>Can I export my data?</h3>
      <p>Yes. You can export your quotes and client data at any time. We believe in data portability and make it easy to access your information.</p>

      <h3>Where is my data stored?</h3>
      <p>Our infrastructure is hosted on secure cloud servers in the United States, compliant with SOC 2 and other industry security standards.</p>

      <h2>Support</h2>

      <h3>How do I contact support?</h3>
      <p>You can reach our support team at <a href="mailto:support@qwohter.com">support@qwohter.com</a> or through the help widget in the application. We typically respond within 24 hours on business days.</p>

      <h3>Do you offer training?</h3>
      <p>Yes. We provide onboarding support and training resources to help you get the most out of Qwohter. Contact us to schedule a personalized demo or training session.</p>

      <h3>Where can I find documentation?</h3>
      <p>Product documentation and guides are available in our Help Center, accessible from within the application.</p>
    </LegalPageLayout>
  );
};

export default FAQ;

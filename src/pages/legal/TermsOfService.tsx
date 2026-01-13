import React from 'react';
import { LegalPageLayout } from '@/components/common/layout/LegalPageLayout';

const TermsOfService: React.FC = () => {
  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated="January 12, 2025"
      effectiveDate="January 12, 2025"
    >
      <p>
        These Terms of Service ("<strong>Terms</strong>") govern your access to and use of the services, websites, and applications offered by Qwohter Inc. ("<strong>Qwohter</strong>," "<strong>we</strong>," "<strong>us</strong>," or "<strong>our</strong>"). By accessing or using our Services, you agree to be bound by these Terms.
      </p>

      <h2>1. Using Our Services</h2>

      <h3>Eligibility</h3>
      <p>You must be at least 18 years old to use our Services. By using our Services, you represent and warrant that you meet this requirement and have the legal authority to enter into these Terms.</p>

      <h3>Account Registration</h3>
      <p>To access certain features of our Services, you must register for an account. When you register, you agree to:</p>
      <ul>
        <li>Provide accurate, current, and complete information</li>
        <li>Maintain and promptly update your account information</li>
        <li>Keep your password secure and confidential</li>
        <li>Accept responsibility for all activities under your account</li>
        <li>Notify us immediately of any unauthorized use of your account</li>
      </ul>

      <h2>2. Subscriptions and Payments</h2>

      <h3>Subscription Plans</h3>
      <p>We offer various subscription plans with different features and pricing. The specific features and pricing for each plan are described on our website. We reserve the right to modify our plans and pricing at any time, with notice to existing subscribers.</p>

      <h3>Billing</h3>
      <p>By subscribing to a paid plan, you authorize us to charge your payment method for the applicable subscription fees. Subscription fees are billed in advance on a monthly or annual basis, depending on your selected plan.</p>

      <h3>Cancellation and Refunds</h3>
      <p>You may cancel your subscription at any time through your account settings. Cancellation will take effect at the end of your current billing period. We do not provide refunds for partial billing periods, except as required by applicable law.</p>

      <h2>3. Your Content</h2>

      <h3>Ownership</h3>
      <p>You retain ownership of all content you submit, post, or display through our Services ("<strong>Your Content</strong>"). By submitting Your Content, you grant us a worldwide, non-exclusive, royalty-free license to use, host, store, reproduce, modify, and display Your Content solely for the purpose of providing the Services to you.</p>

      <h3>Responsibility</h3>
      <p>You are solely responsible for Your Content and the consequences of posting or publishing it. You represent and warrant that you have all necessary rights to Your Content and that Your Content does not violate these Terms or any applicable laws.</p>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to use our Services to:</p>
      <ul>
        <li>Violate any applicable law, regulation, or third-party rights</li>
        <li>Upload or transmit viruses, malware, or other malicious code</li>
        <li>Interfere with or disrupt the Services or servers</li>
        <li>Attempt to gain unauthorized access to any portion of the Services</li>
        <li>Use the Services for any fraudulent or illegal purpose</li>
        <li>Collect or harvest user information without consent</li>
        <li>Impersonate any person or entity</li>
      </ul>

      <h2>5. Intellectual Property</h2>
      <p>The Services and all content, features, and functionality thereof are owned by Qwohter and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of our Services without our prior written consent.</p>

      <h2>6. Third-Party Services</h2>
      <p>Our Services may contain links to or integrate with third-party websites, services, or applications. We are not responsible for the content, privacy practices, or terms of any third-party services. Your use of third-party services is at your own risk.</p>

      <h2>7. Disclaimers</h2>
      <p>THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.</p>

      <h2>8. Limitation of Liability</h2>
      <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, QWOHTER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING OUT OF OR IN CONNECTION WITH THESE TERMS OR YOUR USE OF THE SERVICES.</p>

      <h2>9. Indemnification</h2>
      <p>You agree to indemnify, defend, and hold harmless Qwohter and its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising out of your use of the Services, your violation of these Terms, or your violation of any rights of a third party.</p>

      <h2>10. Modifications to Terms</h2>
      <p>We may modify these Terms at any time. If we make material changes, we will notify you by email or through the Services. Your continued use of the Services after the effective date of the revised Terms constitutes your acceptance of the changes.</p>

      <h2>11. Termination</h2>
      <p>We may suspend or terminate your access to the Services at any time, with or without cause, and with or without notice. Upon termination, your right to use the Services will immediately cease, and we may delete Your Content.</p>

      <h2>12. Governing Law</h2>
      <p>These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved exclusively in the state or federal courts located in Delaware.</p>

      <h2>13. Contact Us</h2>
      <p>If you have any questions about these Terms, please contact us at:</p>
      <p>
        Qwohter Inc.<br />
        Email: <a href="mailto:legal@qwohter.com">legal@qwohter.com</a>
      </p>
    </LegalPageLayout>
  );
};

export default TermsOfService;

import React from 'react';
import { LegalPageLayout } from '@/components/common/layout/LegalPageLayout';

const PrivacyPolicy: React.FC = () => {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="January 12, 2025"
      effectiveDate="January 12, 2025"
    >
      <p>
        This Privacy Policy describes how Qwohter Inc. ("<strong>Qwohter</strong>," "<strong>we</strong>," "<strong>us</strong>," or "<strong>our</strong>") collects, uses, and shares information about you when you use our websites, applications, and other online products and services (collectively, the "<strong>Services</strong>") or when you otherwise interact with us.
      </p>
      <p>
        We may change this Privacy Policy from time to time. If we make changes, we will notify you by revising the date at the top of the policy and, in some cases, we may provide you with additional notice.
      </p>

      <h2>Information We Collect</h2>

      <h3>Information You Provide to Us</h3>
      <p>We collect information you provide directly to us, such as when you create an account, fill in a form, make a purchase, communicate with us via third-party social media sites, request customer support, or otherwise communicate with us.</p>
      <p>The types of information we may collect include:</p>
      <ul>
        <li>Account information (name, email address, password, company name)</li>
        <li>Billing information (payment card details, billing address)</li>
        <li>Business data you input into the Services (quotes, proposals, client information)</li>
        <li>Communications you send to us</li>
      </ul>

      <h3>Information We Collect Automatically</h3>
      <p>When you access or use our Services, we automatically collect certain information, including:</p>
      <ul>
        <li><strong>Log Information:</strong> We collect log information about your use of the Services, including the type of browser you use, access times, pages viewed, your IP address, and the page you visited before navigating to our Services.</li>
        <li><strong>Device Information:</strong> We collect information about the computer or mobile device you use to access our Services, including the hardware model, operating system and version, unique device identifiers, and mobile network information.</li>
        <li><strong>Usage Information:</strong> We collect information about your use of the Services, such as the features you use, the actions you take, and the time, frequency, and duration of your activities.</li>
      </ul>

      <h3>Information We Collect from Other Sources</h3>
      <p>We may also obtain information about you from other sources and combine that with information we collect about you. For example, if you create or log into your account through a third-party platform, we will have access to certain information from that platform in accordance with the authorization procedures determined by that platform.</p>

      <h2>How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide, maintain, and improve our Services</li>
        <li>Process transactions and send you related information</li>
        <li>Send you technical notices, updates, security alerts, and support messages</li>
        <li>Respond to your comments, questions, and requests</li>
        <li>Communicate with you about products, services, offers, and events</li>
        <li>Monitor and analyze trends, usage, and activities in connection with our Services</li>
        <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
        <li>Personalize and improve the Services</li>
      </ul>

      <h2>How We Share Your Information</h2>
      <p>We do not sell your personal information. We may share information about you as follows:</p>
      <ul>
        <li><strong>With vendors and service providers</strong> who need access to such information to carry out work on our behalf</li>
        <li><strong>In response to legal process</strong> or a request for information if we believe disclosure is in accordance with any applicable law, rule, or regulation</li>
        <li><strong>To protect</strong> the rights, property, and safety of Qwohter or others</li>
        <li><strong>In connection with</strong> any merger, sale of company assets, financing, or acquisition of all or a portion of our business</li>
        <li><strong>With your consent</strong> or at your direction</li>
      </ul>

      <h2>Data Retention</h2>
      <p>We retain personal information for as long as necessary to fulfill the purposes for which it was collected, including to satisfy legal, accounting, or reporting requirements. To determine the appropriate retention period, we consider the amount, nature, and sensitivity of the personal information, the potential risk of harm from unauthorized use or disclosure, and applicable legal requirements.</p>

      <h2>Security</h2>
      <p>We take reasonable measures to help protect information about you from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction. All data is encrypted in transit using TLS and at rest using AES-256 encryption.</p>

      <h2>Your Rights and Choices</h2>

      <h3>Account Information</h3>
      <p>You may update, correct, or delete your account information at any time by logging into your account settings. If you wish to delete your account, please contact us, but note that we may retain certain information as required by law or for legitimate business purposes.</p>

      <h3>Cookies</h3>
      <p>Most web browsers are set to accept cookies by default. If you prefer, you can usually set your browser to remove or reject browser cookies. Please note that removing or rejecting cookies could affect the availability and functionality of our Services.</p>

      <h3>Communications Preferences</h3>
      <p>You may opt out of receiving promotional communications from us by following the instructions in those messages. If you opt out, we may still send you non-promotional communications, such as those about your account or our ongoing business relations.</p>

      <h2>International Data Transfers</h2>
      <p>Qwohter is based in the United States and processes information in the U.S. If you are located outside the United States, information collected through the Services may be transferred to and processed in the United States or other countries where we or our service providers operate.</p>

      <h2>Contact Us</h2>
      <p>If you have any questions about this Privacy Policy, please contact us at:</p>
      <p>
        Qwohter Inc.<br />
        Email: <a href="mailto:privacy@qwohter.com">privacy@qwohter.com</a>
      </p>
    </LegalPageLayout>
  );
};

export default PrivacyPolicy;

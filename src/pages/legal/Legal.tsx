import React from 'react';
import { LegalPageLayout } from '@/components/common/layout/LegalPageLayout';
import { Link } from 'react-router-dom';

const Legal: React.FC = () => {
  return (
    <LegalPageLayout
      title="Legal"
      lastUpdated="January 12, 2025"
    >
      <p>
        This page provides an overview of Qwohter's legal documents and policies. We are committed to transparency and protecting your rights.
      </p>

      <h2>Legal Documents</h2>

      <h3>Terms of Service</h3>
      <p>Our Terms of Service outline the rules and guidelines for using Qwohter's platform. By using our services, you agree to these terms.</p>
      <p><Link to="/terms-of-service">Read Terms of Service →</Link></p>

      <h3>Privacy Policy</h3>
      <p>Our Privacy Policy explains how we collect, use, and protect your personal information. We are committed to safeguarding your privacy.</p>
      <p><Link to="/privacy-policy">Read Privacy Policy →</Link></p>

      <h3>Cookie Policy</h3>
      <p>Learn about how we use cookies and similar technologies, and how you can manage your preferences.</p>
      <p><Link to="/cookie-settings">Read Cookie Policy →</Link></p>

      <h3>Accessibility Statement</h3>
      <p>Our commitment to making Qwohter accessible to all users, including those with disabilities.</p>
      <p><Link to="/accessibility-statement">Read Accessibility Statement →</Link></p>

      <h2>Company Information</h2>
      <p>
        <strong>Legal Name:</strong> Qwohter Inc.<br />
        <strong>Entity Type:</strong> Delaware Corporation<br />
        <strong>Contact:</strong> <a href="mailto:legal@qwohter.com">legal@qwohter.com</a>
      </p>

      <h2>Intellectual Property</h2>
      <p>Qwohter, the Qwohter logo, and related names, logos, and designs are trademarks of Qwohter Inc. All rights reserved. Unauthorized use is prohibited.</p>

      <h2>Compliance</h2>
      <p>Qwohter is committed to compliance with applicable laws and regulations, including:</p>
      <ul>
        <li>General Data Protection Regulation (GDPR)</li>
        <li>California Consumer Privacy Act (CCPA/CPRA)</li>
        <li>Payment Card Industry Data Security Standard (PCI DSS)</li>
        <li>SOC 2 Type II</li>
      </ul>

      <h2>Contact</h2>
      <p>For legal inquiries, please contact:</p>
      <p>
        Qwohter Inc.<br />
        Email: <a href="mailto:legal@qwohter.com">legal@qwohter.com</a>
      </p>
    </LegalPageLayout>
  );
};

export default Legal;

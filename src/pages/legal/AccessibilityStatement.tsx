import React from 'react';
import { LegalPageLayout } from '@/components/common/layout/LegalPageLayout';

const AccessibilityStatement: React.FC = () => {
  return (
    <LegalPageLayout
      title="Accessibility Statement"
      lastUpdated="January 12, 2025"
    >
      <p>
        Qwohter Inc. is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.
      </p>

      <h2>Our Commitment</h2>
      <p>We strive to ensure that our Services are accessible to people with disabilities. We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards.</p>

      <h2>Accessibility Features</h2>
      <p>Our platform includes the following accessibility features:</p>

      <h3>Navigation</h3>
      <ul>
        <li>Full keyboard navigation support throughout the application</li>
        <li>Skip navigation links for main content areas</li>
        <li>Consistent page structure and heading hierarchy</li>
        <li>Clear and descriptive link text</li>
        <li>Logical focus order for interactive elements</li>
      </ul>

      <h3>Visual</h3>
      <ul>
        <li>Sufficient color contrast ratios (minimum 4.5:1 for normal text)</li>
        <li>Text is resizable up to 200% without loss of functionality</li>
        <li>Alternative text for meaningful images</li>
        <li>No content that flashes more than three times per second</li>
        <li>Information is not conveyed by color alone</li>
      </ul>

      <h3>Forms and Inputs</h3>
      <ul>
        <li>Clear form labels and instructions</li>
        <li>Error messages that identify the problem and suggest corrections</li>
        <li>Visible focus indicators for all interactive elements</li>
        <li>Sufficient time to complete forms</li>
      </ul>

      <h2>Assistive Technology Compatibility</h2>
      <p>Our website is designed to be compatible with:</p>
      <ul>
        <li>Screen readers (NVDA, JAWS, VoiceOver, TalkBack)</li>
        <li>Screen magnification software</li>
        <li>Speech recognition software</li>
        <li>Keyboard-only navigation</li>
      </ul>

      <h2>Known Limitations</h2>
      <p>While we strive for comprehensive accessibility, some areas may have limitations:</p>
      <ul>
        <li>Some older PDF documents may not be fully accessible</li>
        <li>Third-party integrations may not meet all accessibility standards</li>
        <li>Some complex data visualizations may have limited screen reader support</li>
      </ul>
      <p>We are actively working to address these limitations.</p>

      <h2>Feedback</h2>
      <p>We welcome feedback on the accessibility of Qwohter. If you encounter any accessibility barriers or have suggestions for improvement, please contact us:</p>
      <ul>
        <li><strong>Email:</strong> <a href="mailto:accessibility@qwohter.com">accessibility@qwohter.com</a></li>
        <li><strong>Response time:</strong> We aim to respond within 5 business days</li>
      </ul>

      <h2>Enforcement</h2>
      <p>If you are not satisfied with our response to your accessibility concern, you may file a complaint with the relevant authority in your jurisdiction.</p>
    </LegalPageLayout>
  );
};

export default AccessibilityStatement;

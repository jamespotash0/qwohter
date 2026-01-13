import React from 'react';
import { LegalPageLayout } from '@/components/common/layout/LegalPageLayout';

const DoNotSell: React.FC = () => {
  return (
    <LegalPageLayout
      title="Do Not Sell or Share My Personal Information"
      lastUpdated="January 12, 2025"
      effectiveDate="January 12, 2025"
    >
      <p>
        This page describes your rights under the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA) regarding the sale or sharing of your personal information.
      </p>

      <h2>Our Position</h2>
      <p>
        <strong>Qwohter does not sell your personal information.</strong> We do not exchange your personal information with third parties for monetary or other valuable consideration.
      </p>
      <p>
        We also do not "share" your personal information for cross-context behavioral advertising purposes as defined under California law.
      </p>

      <h2>What We Do Share</h2>
      <p>We may share your information with:</p>
      <ul>
        <li><strong>Service providers:</strong> Companies that help us operate our business under written contracts that restrict how they can use your data</li>
        <li><strong>Business partners:</strong> Only with your explicit consent</li>
        <li><strong>Legal authorities:</strong> When required by law</li>
      </ul>
      <p>These disclosures are not considered "sales" or "sharing" under California law.</p>

      <h2>Your California Privacy Rights</h2>
      <p>As a California resident, you have the right to:</p>
      <ul>
        <li><strong>Know</strong> what personal information we collect, use, and disclose</li>
        <li><strong>Delete</strong> your personal information</li>
        <li><strong>Correct</strong> inaccurate personal information</li>
        <li><strong>Opt-out</strong> of the sale or sharing of your personal information</li>
        <li><strong>Limit use</strong> of sensitive personal information</li>
        <li><strong>Non-discrimination</strong> for exercising your privacy rights</li>
      </ul>

      <h2>How to Exercise Your Rights</h2>
      <p>To submit a request, you can:</p>
      <ul>
        <li>Email us at <a href="mailto:privacy@qwohter.com">privacy@qwohter.com</a> with "CCPA Request" in the subject line</li>
        <li>Submit a request through your account settings</li>
      </ul>
      <p>We will verify your identity before processing your request. For certain requests, we may need additional information to verify that you are the person whose information is the subject of the request.</p>

      <h2>Verification Process</h2>
      <p>To protect your privacy, we verify your identity before responding to requests. We may ask you to:</p>
      <ul>
        <li>Confirm your email address associated with your account</li>
        <li>Provide identifying information that matches our records</li>
        <li>Submit the request through your authenticated account</li>
      </ul>

      <h2>Authorized Agents</h2>
      <p>You may designate an authorized agent to make requests on your behalf. The agent must provide proof of authorization, and we may still verify your identity directly.</p>

      <h2>Response Timing</h2>
      <p>We will respond to verified requests within 45 days. If we need more time, we will notify you and may take up to an additional 45 days.</p>

      <h2>Non-Discrimination</h2>
      <p>We will not discriminate against you for exercising your privacy rights. We will not:</p>
      <ul>
        <li>Deny you goods or services</li>
        <li>Charge you different prices or rates</li>
        <li>Provide you a different level or quality of service</li>
      </ul>

      <h2>Contact Us</h2>
      <p>For questions about this notice or to exercise your rights:</p>
      <p>
        Qwohter Inc.<br />
        Email: <a href="mailto:privacy@qwohter.com">privacy@qwohter.com</a>
      </p>
    </LegalPageLayout>
  );
};

export default DoNotSell;

import React from 'react';
import { LegalPageLayout } from '@/components/common/layout/LegalPageLayout';

const CookieSettings: React.FC = () => {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      lastUpdated="January 12, 2025"
      effectiveDate="January 12, 2025"
    >
      <p>
        This Cookie Policy explains how Qwohter Inc. ("<strong>Qwohter</strong>," "<strong>we</strong>," "<strong>us</strong>," or "<strong>our</strong>") uses cookies and similar technologies when you visit our websites or use our services.
      </p>

      <h2>What Are Cookies?</h2>
      <p>Cookies are small text files that are stored on your device when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners. Cookies can be "persistent" or "session" cookies.</p>

      <h2>How We Use Cookies</h2>
      <p>We use cookies for the following purposes:</p>

      <h3>Essential Cookies</h3>
      <p>These cookies are necessary for the website to function and cannot be switched off in our systems. They are usually only set in response to actions made by you, such as setting your privacy preferences, logging in, or filling in forms.</p>
      <table>
        <thead>
          <tr>
            <th>Cookie Name</th>
            <th>Purpose</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>sb-*-auth-token</td>
            <td>Authentication and session management</td>
            <td>Session</td>
          </tr>
          <tr>
            <td>sb-*-auth-token-code-verifier</td>
            <td>Security verification</td>
            <td>Session</td>
          </tr>
        </tbody>
      </table>

      <h3>Analytics Cookies</h3>
      <p>These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us know which pages are the most and least popular and see how visitors move around the site.</p>

      <h3>Functional Cookies</h3>
      <p>These cookies enable enhanced functionality and personalization, such as remembering your preferences and settings.</p>

      <h2>Third-Party Cookies</h2>
      <p>Some cookies are placed by third-party services that appear on our pages:</p>
      <ul>
        <li><strong>Stripe:</strong> For secure payment processing</li>
        <li><strong>Sentry:</strong> For error monitoring and performance tracking</li>
      </ul>

      <h2>Managing Cookies</h2>
      <p>You can control and manage cookies in several ways:</p>

      <h3>Browser Settings</h3>
      <p>Most browsers allow you to refuse or delete cookies through their settings:</p>
      <ul>
        <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
        <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
        <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
        <li><strong>Edge:</strong> Settings → Cookies and site permissions → Manage and delete cookies</li>
      </ul>

      <h3>Opting Out of Analytics</h3>
      <p>You can opt out of analytics tracking by using browser extensions or privacy tools that block tracking scripts.</p>

      <h2>Impact of Disabling Cookies</h2>
      <p>If you choose to disable cookies, some features of our Services may not function properly. Essential cookies are required for authentication and core functionality.</p>

      <h2>Updates to This Policy</h2>
      <p>We may update this Cookie Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.</p>

      <h2>Contact Us</h2>
      <p>If you have questions about our use of cookies, please contact us at:</p>
      <p>
        Qwohter Inc.<br />
        Email: <a href="mailto:privacy@qwohter.com">privacy@qwohter.com</a>
      </p>
    </LegalPageLayout>
  );
};

export default CookieSettings;

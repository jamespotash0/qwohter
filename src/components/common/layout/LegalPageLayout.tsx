import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LegalPageLayoutProps {
  title: string;
  lastUpdated?: string;
  effectiveDate?: string;
  children: React.ReactNode;
}

const legalNavItems = [
  { path: '/terms-of-service', label: 'Terms of Service' },
  { path: '/privacy-policy', label: 'Privacy Policy' },
  { path: '/cookie-settings', label: 'Cookie Policy' },
  { path: '/accessibility-statement', label: 'Accessibility' },
  { path: '/do-not-sell-my-personal-information', label: 'Do Not Sell My Info' },
];

export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({
  title,
  lastUpdated,
  effectiveDate,
  children
}) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#FFFEFA]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FFFEFA]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center h-20">
            <Link to="/" className="flex items-center group">
              <img
                src="/logos/New_Landing_Page_Logo_DarkonLightBackground.svg"
                alt="Qwohter"
                className="h-8 transition-transform duration-200 group-hover:scale-105"
              />
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 lg:py-12">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block lg:col-span-3">
            <nav className="sticky top-28 space-y-1">
              <p
                className="text-xs font-semibold text-[#171717]/40 uppercase tracking-wider mb-4 px-3"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                Legal
              </p>
              {legalNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block px-3 py-2.5 text-base rounded-lg transition-all duration-200 hover:scale-105 ${
                    location.pathname === item.path
                      ? 'bg-[#171717]/5 text-[#171717] font-medium'
                      : 'text-[#171717]/60 hover:bg-[#171717]/5 hover:text-[#171717]'
                  }`}
                  style={{ fontFamily: 'Urbanist, sans-serif' }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-9">
            {/* Mobile Navigation */}
            <div className="lg:hidden mb-8 overflow-x-auto">
              <div className="flex gap-2 pb-2">
                {legalNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`whitespace-nowrap px-4 py-2 text-sm rounded-full transition-all duration-200 hover:scale-105 ${
                      location.pathname === item.path
                        ? 'bg-[#171717] text-white'
                        : 'bg-[#171717]/5 text-[#171717]/70 hover:bg-[#171717]/10'
                    }`}
                    style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 500 }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Title Section */}
            <div className="mb-10 pb-8 border-b border-[#171717]/10">
              <h1
                className="text-[32px] sm:text-[42px] leading-tight text-[#171717] mb-3"
                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
              >
                {title}
              </h1>
              <div
                className="flex flex-wrap gap-x-6 gap-y-1 text-base text-[#171717]/50"
                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 400 }}
              >
                {effectiveDate && (
                  <span>Effective: {effectiveDate}</span>
                )}
                {lastUpdated && (
                  <span>Last updated: {lastUpdated}</span>
                )}
              </div>
            </div>

            {/* Content */}
            <article className="legal-content">
              <style>{`
                .legal-content {
                  font-family: 'Urbanist', sans-serif;
                  color: #343432;
                  font-size: 1rem;
                  line-height: 1.75;
                }
                .legal-content h2 {
                  color: #171717;
                  font-family: 'Urbanist', sans-serif;
                  font-weight: 600;
                  font-size: 1.375rem;
                  margin-top: 2.5rem;
                  margin-bottom: 1rem;
                }
                .legal-content h2:first-child {
                  margin-top: 0;
                }
                .legal-content h3 {
                  color: #171717;
                  font-family: 'Urbanist', sans-serif;
                  font-weight: 600;
                  font-size: 1.125rem;
                  margin-top: 1.75rem;
                  margin-bottom: 0.75rem;
                }
                .legal-content p {
                  margin-bottom: 1rem;
                }
                .legal-content ul, .legal-content ol {
                  margin-bottom: 1rem;
                  padding-left: 1.5rem;
                }
                .legal-content ul {
                  list-style-type: disc;
                }
                .legal-content ol {
                  list-style-type: decimal;
                }
                .legal-content li {
                  margin-bottom: 0.5rem;
                  padding-left: 0.25rem;
                }
                .legal-content a {
                  color: #EE6C4D;
                  text-decoration: none;
                  font-weight: 500;
                }
                .legal-content a:hover {
                  text-decoration: underline;
                }
                .legal-content strong {
                  color: #171717;
                  font-weight: 600;
                }
                .legal-content em {
                  font-style: italic;
                }
                .legal-content blockquote {
                  border-left: 3px solid #171717/20;
                  padding-left: 1rem;
                  margin: 1.5rem 0;
                  color: #171717/60;
                }
                .legal-content table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 1.5rem 0;
                  font-size: 0.9375rem;
                }
                .legal-content th, .legal-content td {
                  border: 1px solid rgba(23, 23, 23, 0.1);
                  padding: 0.75rem 1rem;
                  text-align: left;
                }
                .legal-content th {
                  background: rgba(23, 23, 23, 0.03);
                  font-weight: 600;
                  color: #171717;
                }
              `}</style>
              {children}
            </article>

            {/* Contact Section */}
            <div className="mt-12 pt-8 border-t border-[#171717]/10">
              <p
                className="text-base text-[#171717]/50"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                Questions about this policy? Contact us at{' '}
                <a
                  href="mailto:legal@qwohter.com"
                  className="text-[#EE6C4D] hover:underline font-medium"
                >
                  legal@qwohter.com
                </a>
              </p>
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 bg-[#FFFEFA] border-t border-[#171717]/10">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p
              className="text-base text-[#171717]/40"
              style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 400 }}
            >
              © {new Date().getFullYear()} Qwohter Inc. All rights reserved.
            </p>
            <div
              className="flex flex-wrap gap-x-6 gap-y-2 text-base"
              style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 400 }}
            >
              <Link to="/privacy-policy" className="text-[#171717]/50 hover:text-[#EE6C4D] transition-all duration-200 hover:scale-105">Privacy</Link>
              <Link to="/terms-of-service" className="text-[#171717]/50 hover:text-[#EE6C4D] transition-all duration-200 hover:scale-105">Terms</Link>
              <Link to="/cookie-settings" className="text-[#171717]/50 hover:text-[#EE6C4D] transition-all duration-200 hover:scale-105">Cookies</Link>
              <Link to="/" className="text-[#171717]/50 hover:text-[#EE6C4D] transition-all duration-200 hover:scale-105">Home</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

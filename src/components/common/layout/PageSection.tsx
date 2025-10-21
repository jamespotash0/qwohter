import React from 'react';

/**
 * Page Section Component - for organizing content within pages
 */
interface PageSectionProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const PageSection: React.FC<PageSectionProps> = ({
  children,
  title,
  subtitle,
  className = ''
}) => {
  return (
    <section className={`space-y-4 ${className}`}>
      {(title || subtitle) && (
        <div className="space-y-1">
          {title && (
            <h2 className="text-xl font-semibold text-primary">{title}</h2>
          )}
          {subtitle && (
            <p className="text-secondary">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
};
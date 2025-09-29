import React from 'react';

interface PageContentProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showPageHeader?: boolean;
  className?: string;
  contentClassName?: string;
}

/**
 * Simple Page Content Component
 *
 * Since MainLayout handles the sidebar and authentication,
 * this component just provides page-level content structure
 */
export const PageContent: React.FC<PageContentProps> = ({
  children,
  title,
  subtitle,
  showPageHeader = false,
  className = '',
  contentClassName = ''
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {showPageHeader && (title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h1 className="text-2xl font-bold text-primary mb-1">{title}</h1>
          )}
          {subtitle && (
            <p className="text-secondary">{subtitle}</p>
          )}
        </div>
      )}
      <div className={`space-y-6 ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};
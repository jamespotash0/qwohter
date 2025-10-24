import React from 'react';

interface PageContentProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showPageHeader?: boolean;
  className?: string;
  contentClassName?: string;
  headerActions?: React.ReactNode;
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
  contentClassName = '',
  headerActions
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {showPageHeader && (title || subtitle) && (
        <div className="mb-8 flex items-center justify-between gap-6">
          <div className="flex-1">
            {title && (
              <h1 className="text-3xl font-bold tracking-tight text-[var(--content-header-text)]">{title}</h1>
            )}
            {subtitle && (
              <p className="text-sm text-[var(--content-muted-text)] mt-1">{subtitle}</p>
            )}
          </div>
          {headerActions && (
            <div className="flex-shrink-0">
              {headerActions}
            </div>
          )}
        </div>
      )}
      <div className={`space-y-6 ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};
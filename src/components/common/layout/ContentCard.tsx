import React from 'react';

/**
 * Content Card Component - consistent card styling
 */
interface ContentCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  children,
  title,
  subtitle,
  className = '',
  headerClassName = '',
  contentClassName = ''
}) => {
  return (
    <div className={`card ${className}`}>
      {(title || subtitle) && (
        <div className={`p-6 border-b border-primary ${headerClassName}`}>
          {title && (
            <h2 className="text-lg font-semibold text-primary mb-1">{title}</h2>
          )}
          {subtitle && (
            <p className="text-secondary text-sm">{subtitle}</p>
          )}
        </div>
      )}
      <div className={`p-6 ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};
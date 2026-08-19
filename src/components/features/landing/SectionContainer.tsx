import React from 'react';
import { cn } from '@/lib/utils';

interface SectionContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Caps the inner content width. Defaults to the 1520px hero/content width. */
  width?: 'content' | 'wide' | 'narrow' | 'full';
  as?: 'div' | 'section' | 'footer' | 'header' | 'nav';
}

const WIDTHS = {
  narrow: 'max-w-[994px]',
  content: 'max-w-[1520px]',
  wide: 'max-w-[1920px]',
  full: '',
} as const;

/**
 * Shared responsive container for the marketing site.
 *
 * Replaces the fixed `px-[180px]` / `px-[10.4vw]` paddings that were scattered
 * across the landing sections — those needed ~1350px of viewport to fit and
 * clipped everything below that. The gutter now steps up with the viewport and
 * the content width is capped rather than fixed.
 */
export const SectionContainer: React.FC<SectionContainerProps> = ({
  children,
  className,
  width = 'content',
  as: Tag = 'div',
}) => (
  <Tag
    className={cn(
      'w-full mx-auto',
      'px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-24',
      '[@media(min-width:1700px)]:px-32 [@media(min-width:1850px)]:px-[200px]',
      WIDTHS[width],
      className
    )}
  >
    {children}
  </Tag>
);

export default SectionContainer;

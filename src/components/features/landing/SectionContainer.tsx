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
 * clipped everything below that. The gutter now scales smoothly with the
 * viewport and the content width is capped rather than fixed, so widening the
 * window never narrows the content.
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
      // Fluid gutter. It must stop growing at roughly the widest cap above:
      // box-sizing is border-box, so once a section hits its max-width every
      // further pixel of padding is taken *out* of the content, and a stepped
      // ladder that keeps climbing past the cap makes the layout narrower as
      // the viewport gets wider. 5vw reaches the 4.5rem ceiling at ~1440px;
      // past that mx-auto turns the extra viewport into margin instead.
      'px-[clamp(1.25rem,5vw,4.5rem)]',
      WIDTHS[width],
      className
    )}
  >
    {children}
  </Tag>
);

export default SectionContainer;

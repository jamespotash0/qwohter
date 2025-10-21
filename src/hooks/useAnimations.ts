/**
 * React hooks for anime.js animations
 * Easy-to-use hooks for common animation patterns
 */

import { useEffect, useRef, RefObject } from 'react';
import {
  fadeInUp,
  fadeInScale,
  staggerFadeIn,
  slideInRight,
  slideInLeft,
  elasticBounce,
  pulse,
  breathe,
  rotateIn,
  magneticHover,
  scaleOnHover,
  cardTilt,
  animeOnScroll,
  revealText,
  float,
} from '@/utils/animations';

/**
 * Hook for fade in up animation on mount
 */
export const useFadeInUp = (delay = 0) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      fadeInUp(ref.current, delay);
    }
  }, [delay]);

  return ref;
};

/**
 * Hook for fade in scale animation on mount
 */
export const useFadeInScale = (delay = 0) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      fadeInScale(ref.current, delay);
    }
  }, [delay]);

  return ref;
};

/**
 * Hook for stagger fade in animation
 */
export const useStaggerFadeIn = (selector: string, staggerDelay = 100) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const elements = containerRef.current.querySelectorAll(selector);
      if (elements.length > 0) {
        staggerFadeIn(elements, staggerDelay);
      }
    }
  }, [selector, staggerDelay]);

  return containerRef;
};

/**
 * Hook for slide in from right animation
 */
export const useSlideInRight = (delay = 0) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      slideInRight(ref.current, delay);
    }
  }, [delay]);

  return ref;
};

/**
 * Hook for slide in from left animation
 */
export const useSlideInLeft = (delay = 0) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      slideInLeft(ref.current, delay);
    }
  }, [delay]);

  return ref;
};

/**
 * Hook for elastic bounce animation
 */
export const useElasticBounce = (delay = 0) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      setTimeout(() => {
        if (ref.current) {
          elasticBounce(ref.current);
        }
      }, delay);
    }
  }, [delay]);

  return ref;
};

/**
 * Hook for pulse animation
 */
export const usePulse = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const animation = pulse(ref.current);
      return () => animation.pause();
    }
  }, []);

  return ref;
};

/**
 * Hook for breathing animation
 */
export const useBreathe = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const animation = breathe(ref.current);
      return () => animation.pause();
    }
  }, []);

  return ref;
};

/**
 * Hook for rotate in animation
 */
export const useRotateIn = (delay = 0) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      rotateIn(ref.current, delay);
    }
  }, [delay]);

  return ref;
};

/**
 * Hook for magnetic hover effect
 */
export const useMagneticHover = (strength = 0.3) => {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (ref.current) {
      const cleanup = magneticHover(ref.current, strength);
      return cleanup;
    }
  }, [strength]);

  return ref;
};

/**
 * Hook for scale on hover effect
 */
export const useScaleOnHover = (scale = 1.05) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      scaleOnHover(ref.current, scale);
    }
  }, [scale]);

  return ref;
};

/**
 * Hook for 3D card tilt effect
 */
export const useCardTilt = (maxTilt = 10) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      cardTilt(ref.current, maxTilt);
    }
  }, [maxTilt]);

  return ref;
};

/**
 * Hook for scroll-triggered animation
 */
export const useScrollAnimation = (
  animationFn: (target: Element) => void,
  threshold = 0.1
) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      animeOnScroll(ref.current, animationFn, threshold);
    }
  }, [animationFn, threshold]);

  return ref;
};

/**
 * Hook for text reveal animation
 */
export const useRevealText = (delay = 0) => {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (ref.current) {
      revealText(ref.current, delay);
    }
  }, [delay]);

  return ref;
};

/**
 * Hook for floating animation
 */
export const useFloat = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const animation = float(ref.current);
      return () => animation.pause();
    }
  }, []);

  return ref;
};

/**
 * Generic hook for custom ref-based animations
 */
export const useAnimationRef = <T extends HTMLElement = HTMLDivElement>(): RefObject<T> => {
  return useRef<T>(null);
};

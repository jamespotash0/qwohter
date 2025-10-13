/**
 * Animation Utilities using anime.js
 * Reusable animation functions for micro-interactions
 */
import { animate, stagger } from 'animejs';

/**
 * Fade in with upward motion
 */
export const fadeInUp = (targets: string | HTMLElement | NodeListOf<Element>, delay = 0) => {
  return animate(targets, {
    opacity: [0, 1],
    translateY: [40, 0],
    duration: 800,
    delay,
    easing: 'easeOutExpo',
  });
};

/**
 * Fade in with scale
 */
export const fadeInScale = (targets: string | HTMLElement | NodeListOf<Element>, delay = 0) => {
  return animate(targets, {
    opacity: [0, 1],
    scale: [0.8, 1],
    duration: 600,
    delay,
    easing: 'easeOutBack',
  });
};

/**
 * Stagger animation for multiple elements
 */
export const staggerFadeIn = (targets: string | HTMLElement | NodeListOf<Element>, staggerDelay = 100) => {
  return animate(targets, {
    opacity: [0, 1],
    translateY: [30, 0],
    duration: 600,
    delay: stagger(staggerDelay),
    easing: 'easeOutQuad',
  });
};

/**
 * Slide in from right
 */
export const slideInRight = (targets: string | HTMLElement | NodeListOf<Element>, delay = 0) => {
  return animate(targets, {
    opacity: [0, 1],
    translateX: [100, 0],
    duration: 800,
    delay,
    easing: 'easeOutExpo',
  });
};

/**
 * Slide in from left
 */
export const slideInLeft = (targets: string | HTMLElement | NodeListOf<Element>, delay = 0) => {
  return animate(targets, {
    opacity: [0, 1],
    translateX: [-100, 0],
    duration: 800,
    delay,
    easing: 'easeOutExpo',
  });
};

/**
 * Elastic bounce animation
 */
export const elasticBounce = (targets: string | HTMLElement | NodeListOf<Element>) => {
  return animate(targets, {
    scale: [0, 1],
    duration: 800,
    easing: 'easeOutElastic(1, .6)',
  });
};

/**
 * Pulse animation (infinite loop)
 */
export const pulse = (targets: string | HTMLElement | NodeListOf<Element>) => {
  return animate(targets, {
    scale: [1, 1.05, 1],
    duration: 2000,
    easing: 'easeInOutQuad',
    loop: true,
  });
};

/**
 * Breathing animation (subtle)
 */
export const breathe = (targets: string | HTMLElement | NodeListOf<Element>) => {
  return animate(targets, {
    scale: [1, 1.02, 1],
    duration: 4000,
    easing: 'easeInOutSine',
    loop: true,
  });
};

/**
 * Rotate in animation
 */
export const rotateIn = (targets: string | HTMLElement | NodeListOf<Element>, delay = 0) => {
  return animate(targets, {
    opacity: [0, 1],
    rotate: [180, 0],
    scale: [0, 1],
    duration: 800,
    delay,
    easing: 'easeOutExpo',
  });
};

/**
 * Number counter animation
 */
export const animeCounter = (
  element: HTMLElement,
  endValue: number,
  duration = 2000,
  suffix = ''
) => {
  const obj = { value: 0 };

  return animate(obj, {
    value: endValue,
    duration,
    easing: 'easeOutExpo',
    update: () => {
      element.textContent = Math.round(obj.value) + suffix;
    },
  });
};

/**
 * Magnetic button hover effect
 */
export const magneticHover = (buttonElement: HTMLElement, strength = 0.3) => {
  const handleMouseMove = (e: MouseEvent) => {
    const rect = buttonElement.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    animate(buttonElement, {
      translateX: x * strength,
      translateY: y * strength,
      duration: 300,
      easing: 'easeOutQuad',
    });
  };

  const handleMouseLeave = () => {
    animate(buttonElement, {
      translateX: 0,
      translateY: 0,
      duration: 500,
      easing: 'easeOutElastic(1, .6)',
    });
  };

  buttonElement.addEventListener('mousemove', handleMouseMove);
  buttonElement.addEventListener('mouseleave', handleMouseLeave);

  // Return cleanup function
  return () => {
    buttonElement.removeEventListener('mousemove', handleMouseMove);
    buttonElement.removeEventListener('mouseleave', handleMouseLeave);
  };
};

/**
 * Scale on hover
 */
export const scaleOnHover = (element: HTMLElement, scale = 1.05) => {
  const handleMouseEnter = () => {
    animate(element, {
      scale,
      duration: 300,
      easing: 'easeOutQuad',
    });
  };

  const handleMouseLeave = () => {
    animate(element, {
      scale: 1,
      duration: 300,
      easing: 'easeOutQuad',
    });
  };

  element.addEventListener('mouseenter', handleMouseEnter);
  element.addEventListener('mouseleave', handleMouseLeave);

  return () => {
    element.removeEventListener('mouseenter', handleMouseEnter);
    element.removeEventListener('mouseleave', handleMouseLeave);
  };
};

/**
 * Ripple effect on click
 */
export const rippleEffect = (element: HTMLElement, e: React.MouseEvent) => {
  const rect = element.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const ripple = document.createElement('span');
  ripple.style.position = 'absolute';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.style.width = '0px';
  ripple.style.height = '0px';
  ripple.style.borderRadius = '50%';
  ripple.style.background = 'rgba(255, 255, 255, 0.5)';
  ripple.style.transform = 'translate(-50%, -50%)';
  ripple.style.pointerEvents = 'none';

  element.style.position = 'relative';
  element.style.overflow = 'hidden';
  element.appendChild(ripple);

  animate(ripple, {
    width: '300px',
    height: '300px',
    opacity: [0.5, 0],
    duration: 600,
    easing: 'easeOutQuad',
    complete: () => {
      ripple.remove();
    },
  });
};

/**
 * Shake animation (for errors)
 */
export const shake = (targets: string | HTMLElement | NodeListOf<Element>) => {
  return animate(targets, {
    translateX: [
      { value: -10, duration: 100 },
      { value: 10, duration: 100 },
      { value: -10, duration: 100 },
      { value: 10, duration: 100 },
      { value: 0, duration: 100 },
    ],
    easing: 'easeInOutSine',
  });
};

/**
 * Success checkmark animation
 */
export const successCheck = (targets: string | HTMLElement | NodeListOf<Element>) => {
  return animate(targets, {
    scale: [0, 1.2, 1],
    rotate: [0, 360],
    duration: 600,
    easing: 'easeOutElastic(1, .8)',
  });
};

/**
 * 3D Card tilt effect
 */
export const cardTilt = (cardElement: HTMLElement, maxTilt = 10) => {
  const handleMouseMove = (e: MouseEvent) => {
    const rect = cardElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    animate(cardElement, {
      rotateX,
      rotateY,
      duration: 300,
      easing: 'easeOutQuad',
    });
  };

  const handleMouseLeave = () => {
    animate(cardElement, {
      rotateX: 0,
      rotateY: 0,
      duration: 500,
      easing: 'easeOutElastic(1, .8)',
    });
  };

  cardElement.style.transformStyle = 'preserve-3d';
  cardElement.addEventListener('mousemove', handleMouseMove);
  cardElement.addEventListener('mouseleave', handleMouseLeave);

  return () => {
    cardElement.removeEventListener('mousemove', handleMouseMove);
    cardElement.removeEventListener('mouseleave', handleMouseLeave);
  };
};

/**
 * Scroll-triggered animation
 */
export const animeOnScroll = (
  targets: string | HTMLElement | NodeListOf<Element>,
  animationFn: (target: Element) => void,
  threshold = 0.1
) => {
  const elements = typeof targets === 'string'
    ? document.querySelectorAll(targets)
    : targets instanceof NodeList
    ? targets
    : [targets];

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animationFn(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold }
  );

  elements.forEach((el) => observer.observe(el as Element));

  return () => observer.disconnect();
};

/**
 * Text reveal animation (word by word)
 */
export const revealText = (element: HTMLElement, delay = 0) => {
  const text = element.textContent || '';
  const words = text.split(' ');

  element.innerHTML = words
    .map((word) => `<span class="word" style="display: inline-block; opacity: 0;">${word}&nbsp;</span>`)
    .join('');

  return animate(element.querySelectorAll('.word'), {
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 600,
    delay: stagger(50, { start: delay }),
    easing: 'easeOutQuad',
  });
};

/**
 * Floating animation
 */
export const float = (targets: string | HTMLElement | NodeListOf<Element>) => {
  return animate(targets, {
    translateY: [-10, 10],
    duration: 3000,
    easing: 'easeInOutSine',
    direction: 'alternate',
    loop: true,
  });
};

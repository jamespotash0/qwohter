# Landing Page Design Guide

> **Location:** `src/pages/Landing.tsx`, `src/pages/LandingEnhanced.tsx`

## Design System

### Brand Colors

```css
/* Primary */
Blue:    #3B82F6 → #2563EB  (gradients)
Orange:  #F97316 → #EA580C  (CTAs, accents)

/* Secondary */
Purple:  #8B5CF6 → #7C3AED
Green:   #10B981 → #059669
Pink:    #EC4899  (accents only)

/* Neutrals */
Background:  #FFFFFF, #F9FAFB
Surface:     #F3F4F6, #E5E7EB
Text:        #111827 (primary), #6B7280 (secondary)
```

### Typography

```css
/* Headings */
Hero:        text-5xl md:text-6xl lg:text-7xl font-bold
Section:     text-3xl md:text-4xl font-bold
Subsection:  text-xl md:text-2xl font-semibold

/* Body */
Large:       text-lg md:text-xl
Regular:     text-base
Small:       text-sm

/* Font Stack */
font-family: 'Inter', system-ui, sans-serif;
```

### Spacing System

```css
/* Section padding */
Section:   py-16 md:py-24 lg:py-32
Container: px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto

/* Element spacing */
Between sections: space-y-16 md:space-y-24
Within sections:  space-y-8 md:space-y-12
Card padding:     p-6 md:p-8
```

## Page Structure

```
┌─────────────────────────────────────────────────────┐
│  Navigation                                         │
│  [Logo]  Features  Pricing  [Sign In] [Get Started] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Hero Section                                       │
│  - Main headline (word-by-word reveal)              │
│  - Subheadline                                      │
│  - CTAs (magnetic hover)                            │
│  - Social proof                                     │
│  - Dashboard preview (floating animation)           │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Stats Section (3D tilt cards)                      │
│  [ 40% Faster ] [ 25% Win Rate ] [ 100% Brand ]     │
├─────────────────────────────────────────────────────┤
│  Features Section (alternating layout)              │
│  - Feature 1: Text left, Image right               │
│  - Feature 2: Image left, Text right               │
│  - Feature 3: Text left, Image right               │
├─────────────────────────────────────────────────────┤
│  Pricing Section                                    │
│  - Pricing cards with hover effects                 │
├─────────────────────────────────────────────────────┤
│  CTA Section                                        │
│  - Final call to action                             │
├─────────────────────────────────────────────────────┤
│  Footer                                             │
└─────────────────────────────────────────────────────┘
```

## Component Patterns

### Hero Section

```tsx
<section className="relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
  {/* Background gradient */}
  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50" />

  <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="grid lg:grid-cols-2 gap-12 items-center">
      {/* Text content */}
      <div>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
          {/* Animated headline */}
        </h1>
        <p className="mt-6 text-xl text-gray-600">
          {/* Subheadline */}
        </p>
        <div className="mt-8 flex gap-4">
          {/* CTAs with magnetic hover */}
        </div>
      </div>

      {/* Dashboard preview */}
      <div className="relative">
        <img src="/images/landing/hero-dashboard.svg" alt="Dashboard" />
      </div>
    </div>
  </div>
</section>
```

### Feature Card (Alternating)

```tsx
<section className="py-16 md:py-24">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Odd: text left, image right */}
    <div className="grid lg:grid-cols-2 gap-12 items-center">
      <div className="order-2 lg:order-1">
        <span className="text-orange-500 font-semibold">Feature Label</span>
        <h3 className="mt-2 text-3xl font-bold">Feature Headline</h3>
        <p className="mt-4 text-gray-600">Feature description...</p>
      </div>
      <div className="order-1 lg:order-2">
        <img src="/images/landing/feature-X.svg" alt="Feature" />
      </div>
    </div>

    {/* Even: image left, text right (reverse order classes) */}
  </div>
</section>
```

### Stat Card (3D Tilt)

```tsx
const StatCard = ({ value, label, suffix = '' }) => {
  const tiltRef = useCardTilt(10);

  return (
    <div
      ref={tiltRef}
      className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
    >
      <div className="text-4xl md:text-5xl font-bold text-gray-900">
        {value}{suffix}
      </div>
      <div className="mt-2 text-gray-600">{label}</div>
    </div>
  );
};
```

### CTA Button (Magnetic)

```tsx
const MagneticCTA = ({ children, primary = true }) => {
  const ref = useMagneticHover(0.4);

  return (
    <button
      ref={ref}
      onClick={(e) => rippleEffect(e.currentTarget, e)}
      className={cn(
        "px-8 py-4 rounded-full font-semibold transition-all",
        primary
          ? "bg-orange-500 text-white hover:bg-orange-600 shadow-lg"
          : "bg-white text-gray-900 border border-gray-200 hover:border-gray-300"
      )}
    >
      {children}
    </button>
  );
};
```

## Animation Library

**Location:** `src/utils/animations.ts`, `src/hooks/useAnimations.ts`

### Available Hooks

| Hook | Purpose | Parameters |
|------|---------|------------|
| `useFadeInUp(delay)` | Fade in with upward motion | delay (ms) |
| `useFadeInScale(delay)` | Fade in with scale | delay (ms) |
| `useMagneticHover(strength)` | Cursor-following effect | 0-1 |
| `useCardTilt(maxTilt)` | 3D tilt on hover | degrees |
| `useFloat()` | Continuous levitation | - |
| `usePulse()` | Attention pulse | - |
| `useRevealText(delay)` | Word-by-word reveal | delay (ms) |

### Available Functions

```typescript
// Entrance
fadeInUp(element, delay)
fadeInScale(element, delay)
slideInRight(element, delay)
slideInLeft(element, delay)

// Continuous
pulse(element)
breathe(element)
float(element)

// Interactive
magneticHover(element, strength)
scaleOnHover(element, scale)
cardTilt(element, maxTilt)
rippleEffect(element, event)

// Utility
animateCounter(element, endValue, duration, suffix)
animateOnScroll(element, animFn, threshold)
```

### Usage Examples

```tsx
// Fade in on mount
const FadeInComponent = () => {
  const ref = useFadeInUp(200);
  return <div ref={ref}>Content</div>;
};

// 3D tilt card
const TiltCard = () => {
  const ref = useCardTilt(12);
  return <div ref={ref}>Card content</div>;
};

// Scroll-triggered animation
useEffect(() => {
  const cleanup = animateOnScroll(
    '.feature-card',
    (el) => fadeInUp(el, 0),
    0.2
  );
  return cleanup;
}, []);
```

## SVG Assets

**Location:** `public/images/landing/`

| Asset | Size | Purpose |
|-------|------|---------|
| `hero-dashboard.svg` | 1920×1080 | Main hero illustration |
| `feature-quote-generation.svg` | 1600×900 | Quote builder feature |
| `feature-template-editor.svg` | 1600×900 | Template editor feature |
| `feature-analytics.svg` | 1600×900 | Analytics feature |
| `icons/lightning-3d.svg` | 64×64 | 3D icon with glow |

### SVG Best Practices

```tsx
// Responsive SVGs
<img
  src="/images/landing/hero-dashboard.svg"
  alt="Dashboard Preview"
  className="w-full h-auto"
  loading="lazy"
/>

// Inline for animations (if needed)
<svg className="w-6 h-6" viewBox="0 0 24 24">
  {/* paths */}
</svg>
```

## Responsive Design

### Breakpoints

```css
sm:  640px   /* Mobile landscape */
md:  768px   /* Tablet */
lg:  1024px  /* Desktop */
xl:  1280px  /* Large desktop */
2xl: 1536px  /* Extra large */
```

### Mobile Considerations

- Hero: Stack to single column (`grid-cols-1`)
- Features: Stack with reversed order for even sections
- Stats: 1 column on mobile, 3 on desktop
- Navigation: Hamburger menu on mobile
- CTAs: Full-width buttons on mobile

## Performance

### Image Optimization

```tsx
// Lazy load below-fold images
<img loading="lazy" src="..." />

// Preload critical hero image
<link rel="preload" href="/images/landing/hero-dashboard.svg" as="image" />
```

### Animation Performance

```typescript
// Respect reduced motion preference
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (!prefersReducedMotion) {
  // Run animations
}
```

### Lighthouse Targets

- Performance: > 90
- Accessibility: > 95
- Best Practices: > 90
- SEO: > 95

## Key Files

- `src/pages/Landing.tsx` - Original landing page
- `src/pages/LandingEnhanced.tsx` - Animated version
- `src/utils/animations.ts` - Animation functions (anime.js)
- `src/hooks/useAnimations.ts` - React animation hooks
- `public/images/landing/` - SVG illustrations

## Animation Timing Guide

| Speed | Duration | Use For |
|-------|----------|---------|
| Fast | 200-300ms | Button hovers, micro-interactions |
| Medium | 400-600ms | Card entrances, fade transitions |
| Slow | 800-1200ms | Text reveals, section entrances |

## Accessibility

- All images have descriptive `alt` text
- Color contrast meets WCAG AA standards
- Focus states on all interactive elements
- Keyboard navigable
- Respects `prefers-reduced-motion`

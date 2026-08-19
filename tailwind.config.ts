import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				// Main brand colors from landing page
				coral: '#EE6C4D',        // Primary accent
				'coral-dark': '#D85B3E', // Hover/darker coral
				offwhite: '#F7F2E9',     // Light background/beige
				white: '#FFFFFF',        // Pure white
				'near-white': '#FFFFFE', // Almost white
				black: '#000000',        // Pure black
				charcoal: '#171717',     // Near black
				'dark-gray': '#343432',  // Dark text on light bg
				'light-gray': '#B8B7B6', // Muted/secondary text

				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'var(--sidebar-bg)',
					foreground: 'var(--sidebar-nav-text)',
					primary: 'var(--sidebar-nav-bg-active)',
					'primary-foreground': 'var(--sidebar-nav-text)',
					accent: 'var(--sidebar-nav-bg-active)',
					'accent-foreground': 'var(--sidebar-nav-text)',
					border: 'var(--sidebar-border)',
					ring: 'var(--sidebar-border)'
				},
				'quote-bg': 'hsl(var(--quote-bg))'
			},
			fontFamily: {
				serif: ['var(--font-serif)'],
				sans: ['Urbanist', 'var(--font-sans)', 'sans-serif'],
				urbanist: ['Urbanist', 'sans-serif'],
				inter: ['Inter', 'sans-serif']
			},
			boxShadow: {
				'soft': 'var(--shadow-soft)',
				'medium': 'var(--shadow-medium)',
				'large': 'var(--shadow-large)'
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-accent': 'var(--gradient-accent)',
				'gradient-subtle': 'var(--gradient-subtle)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				xl: 'calc(var(--radius) + 0.25rem)',
				'2xl': 'var(--radius-card)',
				card: 'var(--radius-card)'
			},
			spacing: {
				'18': '4.5rem',
				'22': '5.5rem'
			},
			screens: {
				'xs': '480px'
			},
			// Fluid type scale — sizes interpolate with the viewport instead of
			// snapping at breakpoints. Each clamp() reaches its max around 1280px
			// so the 1440px desktop design renders at its original sizes.
			fontSize: {
				'fluid-sm': ['clamp(0.875rem, 0.83rem + 0.22vw, 1rem)', { lineHeight: '1.5' }],
				'fluid-base': ['clamp(1rem, 0.95rem + 0.24vw, 1.125rem)', { lineHeight: '1.65' }],
				'fluid-lg': ['clamp(1.125rem, 1.05rem + 0.35vw, 1.375rem)', { lineHeight: '1.45' }],
				'fluid-xl': ['clamp(1.25rem, 1.1rem + 0.7vw, 1.75rem)', { lineHeight: '1.4' }],
				'fluid-2xl': ['clamp(1.5rem, 1.05rem + 2.1vw, 2.625rem)', { lineHeight: '1.3' }],
				'fluid-3xl': ['clamp(1.75rem, 1.25rem + 2.6vw, 3.25rem)', { lineHeight: '1.2' }],
				'fluid-hero': ['clamp(2rem, 1.3rem + 3.4vw, 3.75rem)', { lineHeight: '1.12', letterSpacing: '0.02em' }]
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in-up': {
					'0%': {
						opacity: '0',
						transform: 'translateY(20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-in': {
					'0%': {
						opacity: '0',
						transform: 'translateX(-20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateX(0)'
					}
				},
				'gentle-float': {
					'0%, 100%': {
						transform: 'translateY(0px)'
					},
					'50%': {
						transform: 'translateY(-4px)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in-up': 'fade-in-up 0.6s ease-out',
				'slide-in': 'slide-in 0.4s ease-out',
				'gentle-float': 'gentle-float 3s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

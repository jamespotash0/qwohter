import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';

interface NavItem {
  name: string;
  href: string;
  section: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Home', href: '#', section: 'home' },
  { name: 'Features', href: '#features', section: 'features' },
  { name: 'Use Cases', href: '#usecases', section: 'usecases' },
  { name: 'Pricing', href: '#pricing', section: 'pricing' },
  { name: 'Contact Us', href: '/contact-us', section: 'contact' },
];

interface LandingNavProps {
  activeSection: string;
  onGetDemo: () => void;
  onRipple: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Marketing site navigation.
 *
 * Three layouts:
 *  - <md   : logo + hamburger, full menu in a slide-over sheet
 *  - md–xl : logo + condensed inline pill, demo CTA
 *  - xl+   : the original desktop design (logo / center pill / Sign In + CTA)
 *
 * Replaces the previous `grid-cols-[auto_500px_auto]` + `px-[180px]` header,
 * which required ~1350px of viewport and pushed the CTAs off-screen below that.
 */
export const LandingNav = ({ activeSection, onGetDemo, onRipple }: LandingNavProps): JSX.Element => {
  const navigate = useNavigate();
  const [indicatorStyle, setIndicatorStyle] = React.useState({ left: 0, width: 0 });
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const navRefs = React.useRef<{ [key: string]: HTMLAnchorElement | null }>({});

  // Move the underline indicator to the active nav item.
  React.useEffect(() => {
    const activeRef = navRefs.current[activeSection];
    if (!activeRef) return;
    const navContainer = activeRef.parentElement;
    if (!navContainer) return;
    const containerRect = navContainer.getBoundingClientRect();
    const activeRect = activeRef.getBoundingClientRect();
    setIndicatorStyle({
      left: activeRect.left - containerRect.left,
      width: activeRect.width,
    });
  }, [activeSection]);

  // Recompute the indicator on resize — the pill reflows at each breakpoint.
  React.useEffect(() => {
    const onResize = () => {
      const activeRef = navRefs.current[activeSection];
      const navContainer = activeRef?.parentElement;
      if (!activeRef || !navContainer) return;
      const containerRect = navContainer.getBoundingClientRect();
      const activeRect = activeRef.getBoundingClientRect();
      setIndicatorStyle({
        left: activeRect.left - containerRect.left,
        width: activeRect.width,
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeSection]);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = React.useCallback(
    (e: React.MouseEvent, item: NavItem) => {
      e.preventDefault();
      setMobileOpen(false);
      if (item.href === '/contact-us') {
        navigate('/contact-us');
        return;
      }
      if (item.href === '#') {
        window.history.pushState(null, '', '/');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      window.history.pushState(null, '', item.href);
      document
        .getElementById(item.href.substring(1))
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [navigate]
  );

  const navLinkClass = (isActive: boolean) =>
    `font-normal [font-family:'Urbanist',Helvetica] text-fluid-sm tracking-[0] leading-6 whitespace-nowrap transition-all hover:text-[#ee6c4d] ${
      isActive ? 'text-[#ee6c4d]' : 'text-white'
    }`;

  const signInButton = (className = '') => (
    <button
      onClick={() => {
        setMobileOpen(false);
        navigate('/sign-in');
      }}
      className={`[font-family:'Urbanist',Helvetica] font-semibold text-[#ee6c4d] text-fluid-sm tracking-[0] leading-6 whitespace-nowrap relative group transition-all ${className}`}
    >
      Sign In
      <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#ee6c4d] transition-all duration-300 group-hover:w-full" />
    </button>
  );

  const demoButton = (className = '') => (
    <Button
      onClick={(e) => {
        onRipple(e);
        setMobileOpen(false);
        onGetDemo();
      }}
      className={`py-0 inline-flex gap-[5px] bg-[#f7f2e9] border border-solid border-neutral-900 items-center justify-center rounded-3xl hover:bg-[#ebe5d9] hover:border-[#ee6c4d] transition-all duration-200 ${className}`}
    >
      <span className="[font-family:'Urbanist',Helvetica] font-semibold text-neutral-900 text-fluid-sm tracking-[0] leading-6 whitespace-nowrap">
        Get a Demo
      </span>
    </Button>
  );

  /* Inline pill of nav links, shared by the scrolled and unscrolled desktop states. */
  const inlineNav = (withIndicator: boolean) => (
    <nav
      className={`hidden md:flex items-center relative rounded-full px-[15px] py-2.5 justify-evenly gap-3 lg:gap-4 transition-all duration-500 ${
        withIndicator ? 'bg-[#FFFFFF]/25 backdrop-blur-sm' : ''
      }`}
    >
      {withIndicator && (
        <div
          className="absolute bottom-0 h-[2px] bg-[#ee6c4d] transition-all duration-300 ease-out"
          style={{ left: `${indicatorStyle.left}px`, width: `${indicatorStyle.width}px` }}
        />
      )}
      {NAV_ITEMS.map((item) => (
        <a
          key={item.name}
          ref={(el) => {
            navRefs.current[item.section] = el;
          }}
          href={item.href}
          onClick={(e) => handleNavClick(e, item)}
          className={navLinkClass(activeSection === item.section)}
        >
          {item.name}
        </a>
      ))}
    </nav>
  );

  /* Hamburger + slide-over menu. Rendered in both header states; hidden from md up. */
  const mobileTrigger = (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Open menu"
          className="md:hidden flex items-center justify-center w-11 h-11 rounded-full bg-[#FFFFFF]/15 backdrop-blur-sm text-white hover:bg-[#FFFFFF]/25 transition-colors shrink-0"
        >
          <Menu size={22} />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[min(88vw,340px)] bg-gradient-to-b from-[#171717] to-[#272727] border-l border-white/10 p-0 [&>button]:hidden"
      >
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 pt-6 pb-8">
            <img
              src="/logos/New_Landing_Page_Logo_LightonDarkBackground.svg"
              alt="Qwohter"
              className="h-[26px] w-auto"
            />
            <button
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center w-11 h-11 -mr-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={22} />
            </button>
          </div>

          <nav className="flex flex-col px-4 gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.section;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item)}
                  className={`[font-family:'Urbanist',Helvetica] text-fluid-lg font-medium px-4 py-3 rounded-xl min-h-[48px] flex items-center transition-colors ${
                    isActive
                      ? 'text-[#ee6c4d] bg-white/5'
                      : 'text-white hover:text-[#ee6c4d] hover:bg-white/5'
                  }`}
                >
                  {item.name}
                </a>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-3 px-6 pb-8 pt-6">
            <button
              onClick={() => {
                setMobileOpen(false);
                navigate('/sign-in');
              }}
              className="[font-family:'Urbanist',Helvetica] font-semibold text-[#ee6c4d] text-fluid-base min-h-[48px] rounded-3xl border border-[#ee6c4d]/40 hover:bg-[#ee6c4d]/10 transition-colors"
            >
              Sign In
            </button>
            {demoButton('w-full min-h-[48px] px-[30px]')}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-5 md:pt-[50px] animate-fade-in opacity-0 [--animation-delay:0ms] transition-all duration-300">
      {isScrolled ? (
        /* ---------- Scrolled: merged pill ---------- */
        <div className="px-5 sm:px-8">
          <nav className="mx-auto w-full max-w-[720px] min-h-[48px] rounded-full flex items-center justify-between gap-3 pl-4 pr-2 py-1 shadow-lg bg-gradient-to-r from-[#272727] to-[#393939] transition-all duration-500">
            <img
              src="/logos/New_Landing_Page_Logo_LightonDarkBackground.svg"
              alt="Qwohter"
              className="md:hidden h-6 w-auto shrink-0"
            />
            <img
              src="/logos/Qwohter_Mark.svg"
              alt="Qwohter"
              className="hidden md:block h-[26px] w-auto shrink-0"
            />

            {inlineNav(false)}

            <div className="flex items-center gap-3 shrink-0">
              {signInButton('hidden md:inline-block')}
              {demoButton('hidden md:inline-flex h-10 px-[15px]')}
              {mobileTrigger}
            </div>
          </nav>
        </div>
      ) : (
        /* ---------- Top of page ---------- */
        <div className="w-full mx-auto max-w-[1920px] flex items-center justify-between gap-4 px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 [@media(min-width:1700px)]:px-32 [@media(min-width:1850px)]:px-[180px] min-h-[50px] transition-all duration-500">
          {/* Logo — the full wordmark fits at every width (138px at h-26). */}
          <div className="flex items-center justify-start shrink-0">
            <img
              src="/logos/New_Landing_Page_Logo_LightonDarkBackground.svg"
              alt="Qwohter"
              className="h-[26px] sm:h-[30px] w-auto lg:w-[232px]"
            />
          </div>

          {inlineNav(true)}

          {/* Desktop actions */}
          <div className="hidden xl:flex items-center gap-5 justify-end shrink-0">
            {signInButton()}
            {demoButton('h-[48px] px-[30px]')}
          </div>

          {/* Tablet: Sign In stays beside the CTA. It cannot fall back to the
              sheet here — mobileTrigger is md:hidden, so between md and xl it
              would be unreachable. */}
          <div className="hidden md:flex xl:hidden items-center gap-4 shrink-0">
            {signInButton()}
            {demoButton('h-[44px] px-5')}
          </div>

          {mobileTrigger}
        </div>
      )}
    </header>
  );
};

export default LandingNav;

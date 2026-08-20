import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  activeSection: string;
  onGetDemo: () => void;
  onRipple: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const HeroSection = ({ activeSection, onGetDemo, onRipple }: HeroSectionProps): JSX.Element => {
  const navigate = useNavigate();
  const [indicatorStyle, setIndicatorStyle] = React.useState({ left: 0, width: 0 });
  const [isScrolled, setIsScrolled] = React.useState(false);
  const navRefs = React.useRef<{ [key: string]: HTMLAnchorElement | null }>({});

  const navItems = [
    { name: 'Home', href: '#', section: 'home' },
    { name: 'Features', href: '#features', section: 'features' },
    { name: 'Use Cases', href: '#usecases', section: 'usecases' },
    { name: 'Pricing', href: '#pricing', section: 'pricing' },
    { name: 'Contact Us', href: '/contact-us', section: 'contact' }
  ];

  // Update indicator position when active section changes
  React.useEffect(() => {
    const activeRef = navRefs.current[activeSection];
    if (activeRef) {
      const navContainer = activeRef.parentElement;
      if (navContainer) {
        const containerRect = navContainer.getBoundingClientRect();
        const activeRect = activeRef.getBoundingClientRect();
        setIndicatorStyle({
          left: activeRect.left - containerRect.left,
          width: activeRect.width
        });
      }
    }
  }, [activeSection]);

  // Detect scroll to merge navigation
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="w-full bg-[#FFFEFA] px-[20px] pt-[20px] pb-[20px]">
      {/* Sticky Header Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 pt-[50px] animate-fade-in opacity-0 [--animation-delay:0ms] transition-all duration-300">
        {isScrolled ? (
          /* Scrolled State: Everything merged into one pill */
          <nav className="mx-auto w-fit max-w-[calc(100%-2rem)] h-[48px] rounded-full flex items-center pl-4 pr-2 shadow-lg bg-gradient-to-r from-[#272727] to-[#393939] transition-all duration-500">
            {/* Logo */}
            <div className="flex items-center transition-all duration-300 mr-8">
              <img
                src="/logos/Main_Sidebar_Logo_Dark.svg"
                alt="Qwohter Logo"
                className="w-[30px] h-[30px]"
              />
            </div>

            {/* Navigation Items - Centered */}
            <div className="hidden sm:flex items-center gap-4">
              {navItems.map((item) => {
                const isActive = activeSection === item.section;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      if (item.href === '/contact-us') {
                        navigate('/contact-us');
                      } else if (item.href === '#') {
                        window.history.pushState(null, '', '/');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        window.history.pushState(null, '', item.href);
                        const targetId = item.href.substring(1);
                        const targetElement = document.getElementById(targetId);
                        if (targetElement) {
                          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }
                    }}
                    className={`font-normal [font-family:'Urbanist',Helvetica] text-base tracking-[0] leading-6 whitespace-nowrap transition-all hover:text-[#ee6c4d] ${
                      isActive ? 'text-[#ee6c4d]' : 'text-white'
                    }`}
                  >
                    {item.name}
                  </a>
                );
              })}
            </div>

            {/* Sign In + Get a Demo */}
            <div className="flex items-center gap-3 ml-6">
              <button
                onClick={() => navigate('/sign-in')}
                className="[font-family:'Urbanist',Helvetica] font-semibold text-[#ee6c4d] text-base tracking-[0] leading-6 whitespace-nowrap relative group transition-all"
              >
                Sign In
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#ee6c4d] transition-all duration-300 group-hover:w-full"></span>
              </button>
              <Button
                onClick={(e) => {
                  onRipple(e);
                  onGetDemo();
                }}
                className="py-0 h-[40px] px-[15px] inline-flex gap-[5px] bg-[#f7f2e9] border border-solid border-neutral-900 items-center justify-center rounded-3xl hover:bg-[#ebe5d9] hover:border-[#ee6c4d] transition-all duration-200"
              >
                <span className="[font-family:'Urbanist',Helvetica] font-semibold text-neutral-900 text-base tracking-[0] leading-6 whitespace-nowrap">
                  Get a Demo
                </span>
              </Button>
            </div>
          </nav>
        ) : (
          /* Not Scrolled State: Grid layout with separate pill */
          <div className="mx-auto h-[50px] flex items-center justify-between gap-4 bg-transparent px-6 md:px-10 lg:px-16 xl:px-[180px] transition-all duration-500">
            {/* Logo */}
            <div className="flex items-center justify-start transition-all duration-300 flex-shrink">
              <img
                src="/logos/New_Landing_Page_Logo_LightonDarkBackground.svg"
                alt="Qwohter Logo"
                className="w-[160px] lg:w-[232px] h-auto"
              />
            </div>

            {/* Center Navigation Pill */}
            <nav className="hidden lg:flex items-center relative rounded-full px-[15px] py-2.5 gap-6 bg-[#FFFFFF]/25 backdrop-blur-sm justify-evenly transition-all duration-500">
              {/* Animated indicator bar */}
              <div
                className="absolute bottom-0 h-[2px] bg-[#ee6c4d] transition-all duration-300 ease-out"
                style={{
                  left: `${indicatorStyle.left}px`,
                  width: `${indicatorStyle.width}px`
                }}
              />
              {navItems.map((item) => {
                const isActive = activeSection === item.section;
                return (
                  <a
                    key={item.name}
                    ref={(el) => navRefs.current[item.section] = el}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      if (item.href === '/contact-us') {
                        navigate('/contact-us');
                      } else if (item.href === '#') {
                        window.history.pushState(null, '', '/');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        window.history.pushState(null, '', item.href);
                        const targetId = item.href.substring(1);
                        const targetElement = document.getElementById(targetId);
                        if (targetElement) {
                          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }
                    }}
                    className={`font-normal [font-family:'Urbanist',Helvetica] text-base tracking-[0] leading-6 whitespace-nowrap transition-all hover:text-[#ee6c4d] ${
                      isActive ? 'text-[#ee6c4d]' : 'text-white'
                    }`}
                  >
                    {item.name}
                  </a>
                );
              })}
            </nav>

            {/* Sign In and Get a Demo Buttons - always visible, never pushed off */}
            <div className="flex items-center gap-3 sm:gap-5 justify-end flex-shrink-0 transition-all duration-300">
              <button
                onClick={() => navigate('/sign-in')}
                className="[font-family:'Urbanist',Helvetica] font-semibold text-[#ee6c4d] text-base tracking-[0] leading-6 whitespace-nowrap relative group transition-all"
              >
                Sign In
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#ee6c4d] transition-all duration-300 group-hover:w-full"></span>
              </button>

              <Button
                onClick={(e) => {
                  onRipple(e);
                  onGetDemo();
                }}
                className="py-0 h-[40px] sm:h-[48px] px-[18px] sm:px-[30px] inline-flex gap-[5px] bg-[#f7f2e9] border border-solid border-neutral-900 items-center justify-center rounded-3xl hover:bg-[#ebe5d9] hover:border-[#ee6c4d] transition-all duration-200"
              >
                <span className="[font-family:'Urbanist',Helvetica] font-semibold text-neutral-900 text-base tracking-[0] leading-6 whitespace-nowrap">
                  Get a Demo
                </span>
              </Button>
            </div>
          </div>
        )}
      </header>

      <div className="w-full flex flex-col bg-[linear-gradient(180deg,#171717_0%,#272727_16.647%,#393939_33.767%,#484847_48.235%,#5D5D5B_62.943%,#7A7A78_74.759%,#FFFEFA_100%)] rounded-[30px] px-5 pt-5 pb-0 relative overflow-hidden">
        {/* Gradient blur effects - bottom only */}
        <div className="absolute bottom-[-200px] left-1/2 -translate-x-1/2 w-[2093px] h-[1000px] opacity-60 pointer-events-none">
          <div className="absolute top-[267px] left-[97px] w-[1898px] h-[935px] bg-[#EE6C4D] rounded-[949.15px/467.37px] blur-[105px] opacity-50 rotate-[-17.73deg]" />
          <div className="absolute top-[417px] left-[235px] w-[1587px] h-[732px] bg-[#EE4DBE] rounded-[793.66px/365.97px] blur-[105px] opacity-50 rotate-[-17.73deg]" />
          <div className="absolute top-[407px] left-[215px] w-[1483px] h-[730px] bg-[#F7F2E9] rounded-[741.72px/365.23px] blur-[105px] opacity-50 rotate-[-17.73deg]" />
        </div>

        {/* Spacer for fixed header */}
        <div className="h-[60px]"></div>

        {/* Hero Content - 150px spacing from navbar bottom */}
        <div className="w-full max-w-[1520px] mx-auto flex flex-col items-center gap-[30px] translate-y-[-1rem] animate-fade-in-delay opacity-0 relative z-10 pt-[150px]" style={{ '--animation-delay': '200ms' } as React.CSSProperties}>
          <div className="flex flex-col w-full items-center gap-5">
            {/* Welcome Badge */}
            <div className="bg-[#f7f2e9] border-[#1717171a] inline-flex items-center justify-center gap-[30px] px-2.5 py-0.5 rounded-3xl border border-solid">
              <span className="[font-family:'Urbanist',Helvetica] font-normal text-neutral-900 text-lg tracking-[0] leading-7 whitespace-nowrap">
                Welcome to Qwohter
              </span>
            </div>

            {/* Hero Title with Gradient */}
            <h1
              className="bg-[linear-gradient(180deg,#FFFFFF_0%,#EBC3BF_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] text-[60px] text-center tracking-[1.2px] leading-[70px] whitespace-nowrap translate-y-[-1rem] animate-fade-in-delay opacity-0"
              style={{
                fontFamily: 'Urbanist, sans-serif',
                fontWeight: 500,
                '--animation-delay': '400ms'
              } as React.CSSProperties}
            >
              The platform that simplifies quoting
            </h1>

            {/* Hero Description */}
            <p
              className="w-full max-w-[800px] text-white text-[18px] text-center tracking-[0] leading-[30px] translate-y-[-1rem] animate-fade-in-delay opacity-0"
              style={{
                fontFamily: 'Urbanist, sans-serif',
                fontWeight: 400,
                '--animation-delay': '600ms'
              } as React.CSSProperties}
            >
              Move away from scattered docs and spreadsheets—automatically design,
              generate, track, and manage proposals with ease, all from a single
              platform.
            </p>
          </div>

          {/* CTA Button */}
          <Button
            onClick={(e) => {
              onRipple(e);
              onGetDemo();
            }}
            className="h-auto inline-flex gap-[5px] bg-[#ee6c4d] items-center justify-center px-[30px] py-2.5 rounded-3xl hover:bg-[#ee6c4d]/90 transition-colors translate-y-[-1rem] animate-fade-in-delay opacity-0"
            style={{ '--animation-delay': '800ms' } as React.CSSProperties}
          >
            <span
              className="text-white text-base tracking-[0] leading-6 whitespace-nowrap"
              style={{
                fontFamily: 'Urbanist, sans-serif',
                fontWeight: 600,
              }}
            >
              Get a Demo
            </span>
          </Button>
        </div>

        {/* Hero Image */}
        <img
          className="w-[1286px] h-[655px] mx-auto translate-y-[-1rem] animate-fade-in-delay opacity-0 relative z-10 mt-[120px]"
          alt="Dashboard Preview"
          src="/images/landing/landing-main-dashboard.svg"
          style={{
            '--animation-delay': '1000ms'
          } as React.CSSProperties}
        />
      </div>
    </section>
  );
};

import React from "react";
import { useNavigate } from "react-router-dom";

interface ContactNavigationProps {
  activeSection?: string;
  onGetDemo?: () => void;
  onRipple?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const ContactNavigation = ({ activeSection = 'contact', onGetDemo, onRipple }: ContactNavigationProps): React.JSX.Element => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = React.useState(false);

  const navItems = [
    { name: 'Home', href: '/', section: 'home' },
    { name: 'Features', href: '/#features', section: 'features' },
    { name: 'Use Cases', href: '/#usecases', section: 'usecases' },
    { name: 'Pricing', href: '/#pricing', section: 'pricing' },
    { name: 'Contact Us', href: '/contact-us', section: 'contact' }
  ];

  // Detect scroll
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-5 md:pt-[50px] animate-fade-in opacity-0 [--animation-delay:0ms] transition-all duration-300">
      <div className="mx-auto min-h-[50px] flex items-center justify-center bg-transparent px-5 sm:px-8 lg:px-12 xl:px-24 [@media(min-width:1700px)]:px-[180px] transition-all duration-500">
        {/* Center Navigation Pill */}
        <nav className="flex items-center relative rounded-full px-4 py-2 gap-4 bg-[#FFFFFF]/50 border border-[#D5D5D5] backdrop-blur-sm transition-all duration-500 w-full max-w-[500px] justify-between">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            aria-label="Go to homepage"
            className="flex items-center shrink-0"
          >
            <img
              src="/logos/Qwohter_Mark.svg"
              alt="Qwohter Logo"
              className="h-[26px] w-auto"
            />
          </button>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            {navItems.filter(item => item.section !== 'contact').map((item) => {
              const isActive = activeSection === item.section;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.href === '/contact-us') {
                      navigate('/contact-us');
                    } else if (item.href === '/') {
                      navigate('/');
                    } else {
                      window.location.href = item.href;
                    }
                  }}
                  className={`font-normal [font-family:'Urbanist',Helvetica] text-fluid-sm tracking-[0] leading-6 whitespace-nowrap transition-all hover:text-[#ee6c4d] ${
                    isActive ? 'text-[#ee6c4d]' : 'text-[#171717]'
                  }`}
                >
                  {item.name}
                </a>
              );
            })}
          </div>

          {/* Sign In Button */}
          <button
            onClick={() => navigate('/sign-in')}
            className="[font-family:'Urbanist',Helvetica] font-semibold text-[#ee6c4d] text-fluid-sm tracking-[0] leading-6 whitespace-nowrap relative group transition-all inline-flex items-center min-h-[44px] md:min-h-0"
          >
            Sign In
            <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#ee6c4d] transition-all duration-300 group-hover:w-full"></span>
          </button>
        </nav>
      </div>
    </header>
  );
};

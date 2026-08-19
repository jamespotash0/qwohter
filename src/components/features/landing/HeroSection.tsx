import React from "react";
import { Button } from "@/components/ui/button";
import { LandingNav } from "./LandingNav";

interface HeroSectionProps {
  activeSection: string;
  onGetDemo: () => void;
  onRipple: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const HeroSection = ({ activeSection, onGetDemo, onRipple }: HeroSectionProps): JSX.Element => {
  return (
    <section className="w-full bg-[#FFFEFA] px-3 sm:px-[20px] pt-3 sm:pt-[20px] pb-3 sm:pb-[20px]">
      <LandingNav activeSection={activeSection} onGetDemo={onGetDemo} onRipple={onRipple} />

      <div className="w-full flex flex-col bg-[linear-gradient(180deg,#171717_0%,#272727_16.647%,#393939_33.767%,#484847_48.235%,#5D5D5B_62.943%,#7A7A78_74.759%,#FFFEFA_100%)] rounded-[20px] sm:rounded-[30px] px-4 sm:px-5 pt-5 pb-0 relative overflow-hidden">
        {/* Decorative gradient blurs — sized in vw so they scale with the
            viewport instead of being cropped out of a fixed 2093px box. */}
        <div className="absolute bottom-[-15vw] left-1/2 -translate-x-1/2 w-[145vw] h-[70vw] opacity-60 pointer-events-none">
          <div className="absolute top-[26%] left-[5%] w-[91%] h-[93%] bg-[#EE6C4D] rounded-[50%] blur-[105px] opacity-50 rotate-[-17.73deg]" />
          <div className="absolute top-[41%] left-[11%] w-[76%] h-[73%] bg-[#EE4DBE] rounded-[50%] blur-[105px] opacity-50 rotate-[-17.73deg]" />
          <div className="absolute top-[40%] left-[10%] w-[71%] h-[73%] bg-[#F7F2E9] rounded-[50%] blur-[105px] opacity-50 rotate-[-17.73deg]" />
        </div>

        {/* Spacer clearing the fixed header */}
        <div className="h-[40px] md:h-[60px]" />

        <div
          className="w-full max-w-[1520px] mx-auto flex flex-col items-center gap-6 sm:gap-[30px] translate-y-[-1rem] animate-fade-in-delay opacity-0 relative z-10 pt-16 sm:pt-24 lg:pt-[150px]"
          style={{ '--animation-delay': '200ms' } as React.CSSProperties}
        >
          <div className="flex flex-col w-full items-center gap-4 sm:gap-5">
            {/* Welcome Badge */}
            <div className="bg-[#f7f2e9] border-[#1717171a] inline-flex items-center justify-center px-3 py-1 rounded-3xl border border-solid">
              <span className="[font-family:'Urbanist',Helvetica] font-normal text-neutral-900 text-fluid-base tracking-[0] whitespace-nowrap">
                Welcome to Qwohter
              </span>
            </div>

            {/* Hero Title — fluid size, wraps freely */}
            <h1
              className="bg-[linear-gradient(180deg,#FFFFFF_0%,#EBC3BF_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] text-fluid-hero text-center text-balance max-w-[16ch] sm:max-w-none translate-y-[-1rem] animate-fade-in-delay opacity-0"
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
              className="w-full max-w-[800px] text-white text-fluid-base text-center text-pretty px-2 translate-y-[-1rem] animate-fade-in-delay opacity-0"
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
            className="h-auto min-h-[48px] inline-flex gap-[5px] bg-[#ee6c4d] items-center justify-center px-[30px] py-2.5 rounded-3xl hover:bg-[#ee6c4d]/90 transition-colors translate-y-[-1rem] animate-fade-in-delay opacity-0"
            style={{ '--animation-delay': '800ms' } as React.CSSProperties}
          >
            <span
              className="text-white text-fluid-sm tracking-[0] leading-6 whitespace-nowrap"
              style={{
                fontFamily: 'Urbanist, sans-serif',
                fontWeight: 600,
              }}
            >
              Get a Demo
            </span>
          </Button>
        </div>

        {/* Hero Image — scales down instead of being cropped */}
        <img
          className="w-full max-w-[1286px] h-auto mx-auto translate-y-[-1rem] animate-fade-in-delay opacity-0 relative z-10 mt-12 sm:mt-20 lg:mt-[120px]"
          alt="Dashboard Preview"
          src="/images/landing/landing-main-dashboard.svg"
          width={1286}
          height={655}
          style={{
            '--animation-delay': '1000ms'
          } as React.CSSProperties}
        />
      </div>
    </section>
  );
};

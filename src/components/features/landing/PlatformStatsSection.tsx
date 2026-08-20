import React, { JSX, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
// import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const metricsData = [
  {
    label: "More Deals Won",
    value: "35%",
    description: "Close opportunities with confidence and predictably.",
  },
  {
    label: "Faster Proposal Turnaround",
    value: "40%",
    description: "Turn proposals around faster and predictably.",
  },
  {
    label: "Faster Form Creation",
    value: "50%",
    description: "Generate forms with speed and precision.",
  },
  {
    label: "Time Saved with Custom Forms",
    value: "60%",
    description: "Gain hours back with streamlined custom forms.",
  },
  {
    label: "Fewer Errors in Proposals",
    value: "90%",
    description: "Minimize mistakes with consistent, precise proposals.",
  },
  {
    label: "Brand Consistency",
    value: "100%",
    description: "Ensure brand alignment across all your documents.",
  },
];

export const PlatformStatsSection = (): JSX.Element => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const scrollSpeed = 0.5; // pixels per frame
    let animationFrameId: number;
    let isScrolling = true;

    // Prevent manual scrolling
    const preventScroll = (e: Event) => {
      e.preventDefault();
    };

    const autoScroll = () => {
      if (!scrollContainer || !isScrolling) return;

      // Get current scroll position
      const currentScroll = scrollContainer.scrollLeft;

      // Calculate the width of one set of cards (original cards, not duplicates)
      const singleSetWidth = scrollContainer.scrollWidth / 2;

      // Scroll forward
      const newPosition = currentScroll + scrollSpeed;

      // If we've scrolled past the first set, seamlessly reset to the beginning
      if (newPosition >= singleSetWidth) {
        scrollContainer.scrollLeft = newPosition - singleSetWidth;
      } else {
        scrollContainer.scrollLeft = newPosition;
      }

      animationFrameId = requestAnimationFrame(autoScroll);
    };

    // Prevent manual scroll interactions
    scrollContainer.addEventListener('wheel', preventScroll, { passive: false });
    scrollContainer.addEventListener('touchmove', preventScroll, { passive: false });

    // Start auto-scroll after a delay
    const timeoutId = setTimeout(() => {
      isScrolling = true;
      animationFrameId = requestAnimationFrame(autoScroll);
    }, 2000);

    return () => {
      isScrolling = false;
      clearTimeout(timeoutId);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      scrollContainer.removeEventListener('wheel', preventScroll);
      scrollContainer.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  return (
    <section className="w-full flex flex-col items-center gap-10 sm:gap-[50px] pt-20 sm:pt-28 lg:pt-[125px] pb-12 sm:pb-[75px] px-5 bg-[#FFFEFA] translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
      <header className="flex flex-col items-center gap-2.5 max-w-4xl">
        <h2 className="bg-[linear-gradient(180deg,rgba(23,23,23,1)_0%,rgba(119,119,119,1)_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] [font-family:'Urbanist',Helvetica] font-semibold text-transparent text-fluid-3xl text-center text-balance tracking-[0]">
          Results you&apos;ll feel — and your business will measure
        </h2>

        <p className="[font-family:'Urbanist',Helvetica] font-normal text-[#343432] text-fluid-lg text-center text-pretty tracking-[0]">
          Turn every workflow into impact you can see, track, and scale.
        </p>
      </header>

      <div className="w-full overflow-hidden">
        <div ref={scrollRef} className="flex items-start gap-5 sm:gap-[30px] pb-4 overflow-x-scroll snap-x scrollbar-hide select-none [overscroll-behavior-x:contain] [overscroll-behavior-y:none]" style={{ userSelect: 'none' }}>
          {metricsData.map((metric, index) => (
            <Card
              key={index}
              className="flex-shrink-0 snap-start w-[80vw] max-w-[360px] bg-white rounded-[20px] sm:rounded-[30px] border border-solid border-[#f7f2e9] translate-y-[-1rem] animate-fade-in opacity-0 select-none pointer-events-none"
              style={
                {
                  "--animation-delay": `${400 + index * 100}ms`,
                } as React.CSSProperties
              }
            >
              <CardContent className="flex flex-col items-start gap-5 p-5 sm:p-[30px]">
                <Badge className="bg-[#ee6c4d1a] inline-flex items-center justify-center gap-[30px] px-2.5 py-0.5 rounded-3xl border border-solid border-[#ee6c4d1a] hover:bg-[#ee6c4d1a]">
                  <span className="[font-family:'Urbanist',Helvetica] font-semibold text-[#ee6c4d] text-base tracking-[0] leading-6 whitespace-nowrap">
                    {metric.label}
                  </span>
                </Badge>

                <div className="[font-family:'Urbanist',Helvetica] font-normal text-neutral-900 text-fluid-3xl tracking-[0] whitespace-nowrap">
                  {metric.value}
                </div>

                <p className="w-full [font-family:'Urbanist',Helvetica] font-normal text-[#343432] text-fluid-base tracking-[0]">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          ))}
          {/* Duplicate cards for infinite scroll effect */}
          {metricsData.map((metric, index) => (
            <Card
              key={`duplicate-${index}`}
              className="flex-shrink-0 snap-start w-[80vw] max-w-[360px] bg-white rounded-[20px] sm:rounded-[30px] border border-solid border-[#f7f2e9] translate-y-[-1rem] animate-fade-in opacity-0 select-none pointer-events-none"
              style={
                {
                  "--animation-delay": `${400 + index * 100}ms`,
                } as React.CSSProperties
              }
            >
              <CardContent className="flex flex-col items-start gap-5 p-5 sm:p-[30px]">
                <Badge className="bg-[#ee6c4d1a] inline-flex items-center justify-center gap-[30px] px-2.5 py-0.5 rounded-3xl border border-solid border-[#ee6c4d1a] hover:bg-[#ee6c4d1a]">
                  <span className="[font-family:'Urbanist',Helvetica] font-semibold text-[#ee6c4d] text-base tracking-[0] leading-6 whitespace-nowrap">
                    {metric.label}
                  </span>
                </Badge>

                <div className="[font-family:'Urbanist',Helvetica] font-normal text-neutral-900 text-fluid-3xl tracking-[0] whitespace-nowrap">
                  {metric.value}
                </div>

                <p className="w-full [font-family:'Urbanist',Helvetica] font-normal text-[#343432] text-fluid-base tracking-[0]">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

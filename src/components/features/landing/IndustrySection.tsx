import React, { useRef, useState, useEffect } from "react";
import { ArrowInsideCircleLeft, ArrowInsideCircleRight } from "@/components/common/icons";

const industriesData = [
  { title: 'Office Furniture', image: 'https://c.animaapp.com/mi3nizw3ab7ONs/img/image.png' },
  { title: 'Wall Systems', image: 'https://c.animaapp.com/mi3nizw3ab7ONs/img/image-1.png' },
  { title: 'Construction', image: 'https://c.animaapp.com/mi3nizw3ab7ONs/img/image-2.png' },
  { title: 'Interior Design', image: 'https://c.animaapp.com/mi3nizw3ab7ONs/img/image-3.png' },
  { title: 'Commercial Flooring', image: 'https://c.animaapp.com/mi3nizw3ab7ONs/img/image-4.png' },
  { title: 'Electrical Services', image: 'https://c.animaapp.com/mi3nizw3ab7ONs/img/image-5.png' },
  { title: 'HVAC Systems', image: 'https://c.animaapp.com/mi3nizw3ab7ONs/img/image-6.png' }
];

export const IndustrySection = (): JSX.Element => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeButton, setActiveButton] = useState<'left' | 'right'>('right');

  /**
   * Card width is responsive now, so the infinite-scroll wrap point and the
   * arrow step are measured from the DOM rather than assuming 350px + 30px.
   */
  const getStep = () => {
    const container = scrollRef.current;
    const card = container?.firstElementChild as HTMLElement | null;
    if (!container || !card) return 0;
    const gap = parseFloat(getComputedStyle(container).columnGap || '0') || 0;
    return card.getBoundingClientRect().width + gap;
  };

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    // Start just inside the first set so both directions are scrollable.
    scrollContainer.scrollLeft = 1;

    const handleScroll = () => {
      const singleSetWidth = getStep() * industriesData.length;
      if (!singleSetWidth) return;
      const scrollLeft = scrollContainer.scrollLeft;

      // We render the set twice, so wrapping by one set length is seamless.
      if (scrollLeft >= singleSetWidth) {
        scrollContainer.scrollLeft = scrollLeft - singleSetWidth;
      } else if (scrollLeft <= 0) {
        scrollContainer.scrollLeft = singleSetWidth;
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -getStep(), behavior: 'smooth' });
    setActiveButton('left');
  };

  const handleScrollRight = () => {
    scrollRef.current?.scrollBy({ left: getStep(), behavior: 'smooth' });
    setActiveButton('right');
  };

  return (
    <section id="usecases" className="pt-14 sm:pt-[70px] pb-12 sm:pb-[75px] bg-[#FFFEFA] px-5 sm:px-[20px]">
      {/* Header - centered in 560px container */}
      <div className="max-w-[560px] mx-auto">
        <div className="text-center mb-10 sm:mb-[50px]">
          <h2
            className="text-fluid-3xl text-balance text-gray-900 mb-[10px]"
            style={{
              fontFamily: 'Urbanist, sans-serif',
              fontWeight: 700,
            }}
          >
            Trusted Across Industries
          </h2>
          <p
            className="text-fluid-base text-pretty text-gray-600 max-w-2xl mx-auto"
            style={{
              fontFamily: 'Urbanist, sans-serif',
              fontWeight: 400,
            }}
          >
            From furniture dealers to construction firms, businesses trust Qwohter for professional quoting
          </p>
        </div>
      </div>

      {/* Industry Cards Carousel - horizontal scroll */}
      <div className="w-full overflow-hidden mb-10 sm:mb-[50px]">
        <div
          ref={scrollRef}
          className="flex gap-5 sm:gap-[30px] overflow-x-scroll scrollbar-hide snap-x snap-mandatory"
        >
          {industriesData.map((industry, index) => (
            <div key={index} className="bg-[#f7f2e9] rounded-[20px] sm:rounded-[30px] w-[78vw] max-w-[350px] flex-shrink-0 snap-start p-5 sm:p-[30px] flex flex-col gap-5 sm:gap-[30px]">
              <h3
                className="text-fluid-xl text-neutral-900 tracking-[0]"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontWeight: 700,
                }}
              >
                {industry.title}
              </h3>
              <img
                className="w-full aspect-[290/378] h-auto object-cover rounded-lg"
                alt={industry.title}
                src={industry.image}
              />
            </div>
          ))}
          {/* Duplicate cards for continuous scroll */}
          {industriesData.map((industry, index) => (
            <div key={`duplicate-${index}`} className="bg-[#f7f2e9] rounded-[20px] sm:rounded-[30px] w-[78vw] max-w-[350px] flex-shrink-0 snap-start p-5 sm:p-[30px] flex flex-col gap-5 sm:gap-[30px]">
              <h3
                className="text-fluid-xl text-neutral-900 tracking-[0]"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontWeight: 700,
                }}
              >
                {industry.title}
              </h3>
              <img
                className="w-full aspect-[290/378] h-auto object-cover rounded-lg"
                alt={industry.title}
                src={industry.image}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Carousel Navigation - centered */}
      <div className="flex justify-center gap-3">
        <button onClick={handleScrollLeft} aria-label="Previous industries" className="flex items-center justify-center min-w-[48px] min-h-[48px] cursor-pointer transition-opacity hover:opacity-80">
          <ArrowInsideCircleLeft filled={activeButton === 'left'} />
        </button>
        <button onClick={handleScrollRight} aria-label="Next industries" className="flex items-center justify-center min-w-[48px] min-h-[48px] cursor-pointer transition-opacity hover:opacity-80">
          <ArrowInsideCircleRight filled={activeButton === 'right'} />
        </button>
      </div>
    </section>
  );
};

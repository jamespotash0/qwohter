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

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    // Calculate width of one set of cards (7 cards × 380px per card)
    const cardWidth = 350;
    const gap = 30;
    const cardWithGap = cardWidth + gap;
    const singleSetWidth = industriesData.length * cardWithGap;

    // Set initial scroll position to allow scrolling in both directions
    // Start at the beginning of the first set
    scrollContainer.scrollLeft = 1;

    const handleScroll = () => {
      const scrollLeft = scrollContainer.scrollLeft;

      // Reset when we've scrolled past one complete set
      // This creates seamless infinite scroll since we have duplicate cards
      if (scrollLeft >= singleSetWidth) {
        scrollContainer.scrollLeft = scrollLeft - singleSetWidth;
      } else if (scrollLeft <= 0) {
        scrollContainer.scrollLeft = singleSetWidth;
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -380, behavior: 'smooth' }); // 350px card + 30px gap
      setActiveButton('left');
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 380, behavior: 'smooth' }); // 350px card + 30px gap
      setActiveButton('right');
    }
  };

  return (
    <section id="usecases" className="pt-[70px] pb-[75px] bg-[#FFFEFA] px-[20px]">
      {/* Header - centered in 560px container */}
      <div className="max-w-[560px] mx-auto">
        <div className="text-center mb-[50px]">
          <h2
            className="text-4xl text-gray-900 mb-[10px]"
            style={{
              fontFamily: 'Urbanist, sans-serif',
              fontWeight: 700,
            }}
          >
            Trusted Across Industries
          </h2>
          <p
            className="text-base text-gray-600 max-w-2xl mx-auto"
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
      <div className="w-full overflow-hidden mb-[50px]">
        <div
          ref={scrollRef}
          className="flex gap-[30px] overflow-x-scroll scrollbar-hide"
        >
          {industriesData.map((industry, index) => (
            <div key={index} className="bg-[#f7f2e9] rounded-[30px] w-[350px] flex-shrink-0 p-[30px] flex flex-col gap-[30px]">
              <h3
                className="text-[22px] text-neutral-900 tracking-[0] leading-8"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontWeight: 700,
                }}
              >
                {industry.title}
              </h3>
              <img
                className="w-[290px] h-[378px] object-cover rounded-lg"
                alt={industry.title}
                src={industry.image}
              />
            </div>
          ))}
          {/* Duplicate cards for continuous scroll */}
          {industriesData.map((industry, index) => (
            <div key={`duplicate-${index}`} className="bg-[#f7f2e9] rounded-[30px] w-[350px] flex-shrink-0 p-[30px] flex flex-col gap-[30px]">
              <h3
                className="text-[22px] text-neutral-900 tracking-[0] leading-8"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontWeight: 700,
                }}
              >
                {industry.title}
              </h3>
              <img
                className="w-[290px] h-[378px] object-cover rounded-lg"
                alt={industry.title}
                src={industry.image}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Carousel Navigation - centered */}
      <div className="flex justify-center gap-3">
        <button onClick={handleScrollLeft} className="cursor-pointer transition-opacity hover:opacity-80">
          <ArrowInsideCircleLeft filled={activeButton === 'left'} />
        </button>
        <button onClick={handleScrollRight} className="cursor-pointer transition-opacity hover:opacity-80">
          <ArrowInsideCircleRight filled={activeButton === 'right'} />
        </button>
      </div>
    </section>
  );
};

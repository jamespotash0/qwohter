import React, { useRef, useState, useEffect } from "react";
import { ArrowInsideCircleLeft, ArrowInsideCircleRight } from "@/components/common/icons";

const industriesData = [
  { title: 'Wall Systems', image: '/images/industries/wall-systems.jpg' },
  { title: 'Construction', image: '/images/industries/construction.jpg' },
  { title: 'Interior Design', image: '/images/industries/interior-design.jpg' },
  { title: 'Commercial Flooring', image: '/images/industries/commercial-flooring.jpg' },
  { title: 'Electrical Services', image: '/images/industries/electrical-services.jpg' }
];

export const IndustrySection = (): JSX.Element => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeButton, setActiveButton] = useState<'left' | 'right'>('right');

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const maxScroll = scrollContainer.scrollWidth / 2;

      // If scrolled to the end, reset to beginning
      if (scrollContainer.scrollLeft >= maxScroll) {
        scrollContainer.scrollLeft = 0;
      }

      // If scrolled before the beginning (shouldn't happen but just in case), reset to end
      if (scrollContainer.scrollLeft <= 0) {
        scrollContainer.scrollLeft = maxScroll - scrollContainer.clientWidth;
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -380, behavior: 'smooth' }); // 350px card + 30px gap
      setActiveButton('left');
    }
  };

  const scrollRight = () => {
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
            <div key={index} className="bg-gray-100 rounded-3xl overflow-hidden w-[350px] h-[500px] flex-shrink-0 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="text-white font-semibold text-base">{industry.title}</h3>
              </div>
            </div>
          ))}
          {/* Duplicate cards for continuous scroll */}
          {industriesData.map((industry, index) => (
            <div key={`duplicate-${index}`} className="bg-gray-100 rounded-3xl overflow-hidden w-[350px] h-[500px] flex-shrink-0 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="text-white font-semibold text-base">{industry.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Carousel Navigation - centered */}
      <div className="flex justify-center gap-3">
        <button onClick={scrollLeft} className="cursor-pointer transition-opacity hover:opacity-80">
          <ArrowInsideCircleLeft filled={activeButton === 'left'} />
        </button>
        <button onClick={scrollRight} className="cursor-pointer transition-opacity hover:opacity-80">
          <ArrowInsideCircleRight filled={activeButton === 'right'} />
        </button>
      </div>
    </section>
  );
};

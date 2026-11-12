import React, { useEffect, useRef } from "react";
import { SectionContainer } from "./SectionContainer";

export const FeatureSection = (): React.JSX.Element => {
  const feature1Ref = useRef<HTMLDivElement>(null);
  const feature2Ref = useRef<HTMLDivElement>(null);
  const feature3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.2
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    if (feature1Ref.current) observer.observe(feature1Ref.current);
    if (feature2Ref.current) observer.observe(feature2Ref.current);
    if (feature3Ref.current) observer.observe(feature3Ref.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="w-full bg-[#FFFEFA]">
      <SectionContainer
        width="full"
        className="flex flex-col items-start gap-12 md:gap-16 lg:gap-[60px] max-w-[1480px]"
      >
        {/* Feature 1: Design (Image Left on desktop, top on mobile) */}
        <div
          ref={feature1Ref}
          className="feature-card flex flex-col lg:flex-row items-center gap-8 md:gap-12 lg:gap-[100px] w-full opacity-0 translate-y-8 transition-all duration-700"
        >
          <div className="relative w-full lg:flex-shrink-0 lg:w-[600px] flex justify-center items-start">
            {/* Background gradient card */}
            <div className="relative w-full max-w-[600px] aspect-[6/5]">
              {/* Gradient background with rounded corners and overflow hidden */}
              <div className="absolute inset-0 rounded-[30px] overflow-hidden bg-white shadow-lg">
                {/* Gradient blobs */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
                  <g opacity="0.8">
                    <g filter="url(#filter0_f_feature1)">
                      <ellipse cx="-319.795" cy="452.772" rx="949.148" ry="467.374" transform="rotate(-14.918 -319.795 452.772)" fill="#EE6C4D"/>
                    </g>
                    <g filter="url(#filter1_f_feature1)">
                      <ellipse cx="-339.479" cy="501.457" rx="793.663" ry="365.97" transform="rotate(-14.918 -339.479 501.457)" fill="#EE4DBE"/>
                    </g>
                    <g filter="url(#filter2_f_feature1)">
                      <ellipse cx="-411.254" cy="488.87" rx="741.721" ry="365.234" transform="rotate(-14.918 -411.254 488.87)" fill="#FFFDFA"/>
                    </g>
                  </g>
                  <defs>
                    <filter id="filter0_f_feature1" x="-1454.91" y="-270.812" width="2270.24" height="1447.17" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                      <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                      <feGaussianBlur stdDeviation="105" result="effect1_foregroundBlur_feature1"/>
                    </filter>
                    <filter id="filter1_f_feature1" x="-1322.24" y="-117.028" width="1965.51" height="1236.97" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                      <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                      <feGaussianBlur stdDeviation="105" result="effect1_foregroundBlur_feature1"/>
                    </filter>
                    <filter id="filter2_f_feature1" x="-1344.2" y="-122.475" width="1865.89" height="1222.69" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                      <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                      <feGaussianBlur stdDeviation="105" result="effect1_foregroundBlur_feature1"/>
                    </filter>
                  </defs>
                </svg>

                {/* Feature image positioned with offset - diagonal rounded corners (top-left, bottom-right) */}
                <div className="absolute top-[16%] left-[13.3333%] right-0 bottom-0">
                  <img
                    className="w-full h-[105%] object-cover rounded-tl-[30px] rounded-br-[30px]"
                    alt="Design beautiful proposals"
                    src="/images/landing/design_image.svg"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-6 md:gap-[30px] flex-1 min-w-0">
            <div className="flex flex-col items-start gap-4 md:gap-5 w-full">
              <h2
                className="bg-[linear-gradient(180deg,rgba(23,23,23,1)_0%,rgba(119,119,119,1)_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] text-3xl md:text-4xl lg:text-[42px] tracking-[0.84px] leading-tight md:leading-[50px]"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontWeight: 600,
                }}
              >
                Design beautiful proposals that win deals
              </h2>

              <p
                className="text-[#343432] text-sm md:text-base tracking-[0] leading-relaxed md:leading-6"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontWeight: 400,
                }}
              >
                Build smart forms to capture the right information, then turn that data into stunning, branded proposal templates. Drag, drop, and customize both the form and the final proposal layout with instant live preview.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 md:gap-[15px] w-full">
              {["Form builder to define fields and structure", "Drag-and-drop proposal template designer", "Instant live preview and branding"].map((point, index) => (
                <div key={index} className="flex items-center gap-2.5 w-full">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-[#ee6c4d] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <p
                    className="flex-1 text-[#343432] text-base md:text-lg lg:text-xl tracking-[0] leading-relaxed md:leading-[30px]"
                    style={{
                      fontFamily: 'Urbanist, sans-serif',
                      fontWeight: 400,
                    }}
                  >
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature 2: Generate (Image Right on desktop, top on mobile) */}
        <div
          ref={feature2Ref}
          className="feature-card flex flex-col lg:flex-row-reverse items-center gap-8 md:gap-12 lg:gap-[100px] w-full opacity-0 translate-y-8 transition-all duration-700"
        >
          <div className="relative w-full lg:flex-shrink-0 lg:w-[600px] flex justify-center items-start">
            {/* Background gradient card */}
            <div className="relative w-full max-w-[600px] aspect-[6/5] rounded-[30px] overflow-hidden bg-white shadow-lg">
              {/* Gradient blobs */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
                <g opacity="0.8">
                  <g filter="url(#filter0_f_feature2)">
                    <ellipse cx="-319.795" cy="452.772" rx="949.148" ry="467.374" transform="rotate(-14.918 -319.795 452.772)" fill="#EE6C4D"/>
                  </g>
                  <g filter="url(#filter1_f_feature2)">
                    <ellipse cx="-339.479" cy="501.457" rx="793.663" ry="365.97" transform="rotate(-14.918 -339.479 501.457)" fill="#EE4DBE"/>
                  </g>
                  <g filter="url(#filter2_f_feature2)">
                    <ellipse cx="-411.254" cy="488.87" rx="741.721" ry="365.234" transform="rotate(-14.918 -411.254 488.87)" fill="#FFFDFA"/>
                  </g>
                </g>
                <defs>
                  <filter id="filter0_f_feature2" x="-1454.91" y="-270.812" width="2270.24" height="1447.17" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="105" result="effect1_foregroundBlur_feature2"/>
                  </filter>
                  <filter id="filter1_f_feature2" x="-1322.24" y="-117.028" width="1965.51" height="1236.97" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="105" result="effect1_foregroundBlur_feature2"/>
                  </filter>
                  <filter id="filter2_f_feature2" x="-1344.2" y="-122.475" width="1865.89" height="1222.69" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="105" result="effect1_foregroundBlur_feature2"/>
                  </filter>
                </defs>
              </svg>

              {/* Feature image positioned with offset - diagonal rounded corners (top-right, bottom-left) */}
              <div className="absolute top-[16%] left-0 right-[13.3333%] bottom-0">
                <img
                  className="w-full h-[105%] object-cover rounded-tr-[30px] rounded-bl-[30px]"
                  alt="Generate proposals in seconds"
                  src="/images/landing/generate_proposals_image.png"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-6 md:gap-[30px] flex-1 min-w-0">
            <div className="flex flex-col items-start gap-4 md:gap-5 w-full">
              <h2
                className="bg-[linear-gradient(180deg,rgba(23,23,23,1)_0%,rgba(119,119,119,1)_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] text-3xl md:text-4xl lg:text-[42px] tracking-[0.84px] leading-tight md:leading-[50px]"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontWeight: 600,
                }}
              >
                Generate proposals in seconds, not hours
              </h2>

              <p
                className="text-[#343432] text-sm md:text-base tracking-[0] leading-relaxed md:leading-6"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontWeight: 400,
                }}
              >
                Our intelligent proposal engine automatically calculates pricing, applies discounts, and formats everything perfectly. Just fill in the details and go.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 md:gap-[15px] w-full">
              {["Automatic pricing calculations", "Dynamic discount application", "Professional PDF output"].map((point, index) => (
                <div key={index} className="flex items-center gap-2.5 w-full">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-[#ee6c4d] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <p
                    className="flex-1 text-[#343432] text-base md:text-lg lg:text-xl tracking-[0] leading-relaxed md:leading-[30px]"
                    style={{
                      fontFamily: 'Urbanist, sans-serif',
                      fontWeight: 400,
                    }}
                  >
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature 3: Track (Image Left on desktop, top on mobile) */}
        <div
          ref={feature3Ref}
          className="feature-card flex flex-col lg:flex-row items-center gap-8 md:gap-12 lg:gap-[100px] w-full opacity-0 translate-y-8 transition-all duration-700"
        >
          <div className="relative w-full lg:flex-shrink-0 lg:w-[600px] flex justify-center items-start">
            {/* Background gradient card */}
            <div className="relative w-full max-w-[600px] aspect-[6/5]">
              {/* Gradient background with rounded corners and overflow hidden */}
              <div className="absolute inset-0 rounded-[30px] overflow-hidden bg-white shadow-lg">
                {/* Gradient blobs */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
                  <g opacity="0.8">
                    <g filter="url(#filter0_f_feature3)">
                      <ellipse cx="-319.795" cy="452.772" rx="949.148" ry="467.374" transform="rotate(-14.918 -319.795 452.772)" fill="#EE6C4D"/>
                    </g>
                    <g filter="url(#filter1_f_feature3)">
                      <ellipse cx="-339.479" cy="501.457" rx="793.663" ry="365.97" transform="rotate(-14.918 -339.479 501.457)" fill="#EE4DBE"/>
                    </g>
                    <g filter="url(#filter2_f_feature3)">
                      <ellipse cx="-411.254" cy="488.87" rx="741.721" ry="365.234" transform="rotate(-14.918 -411.254 488.87)" fill="#FFFDFA"/>
                    </g>
                  </g>
                  <defs>
                    <filter id="filter0_f_feature3" x="-1454.91" y="-270.812" width="2270.24" height="1447.17" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                      <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                      <feGaussianBlur stdDeviation="105" result="effect1_foregroundBlur_feature3"/>
                    </filter>
                    <filter id="filter1_f_feature3" x="-1322.24" y="-117.028" width="1965.51" height="1236.97" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                      <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                      <feGaussianBlur stdDeviation="105" result="effect1_foregroundBlur_feature3"/>
                    </filter>
                    <filter id="filter2_f_feature3" x="-1344.2" y="-122.475" width="1865.89" height="1222.69" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                      <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                      <feGaussianBlur stdDeviation="105" result="effect1_foregroundBlur_feature3"/>
                    </filter>
                  </defs>
                </svg>

                {/* Feature image positioned with offset - diagonal rounded corners (top-left, bottom-right) */}
                <div className="absolute top-[8%] left-[6.6667%] right-0 bottom-0">
                  <img
                    className="w-full h-auto rounded-tl-[30px] rounded-br-[30px]"
                    alt="Track performance"
                    src="/images/landing/tracking_image.svg"
                  />
                </div>
              </div>

              {/* Analytics card overlay - positioned outside top-left corner */}
              <div className="absolute top-[-6%] left-[-5%] w-[75.3333%] z-10">
                <img
                  className="w-full h-auto rounded-[20px]"
                  alt="Analytics card"
                  src="/images/landing/analytics_image1.svg"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-6 md:gap-[30px] flex-1 min-w-0">
            <div className="flex flex-col items-start gap-4 md:gap-5 w-full">
              <h2
                className="bg-[linear-gradient(180deg,rgba(23,23,23,1)_0%,rgba(119,119,119,1)_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] text-3xl md:text-4xl lg:text-[42px] tracking-[0.84px] leading-tight md:leading-[50px]"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontWeight: 600,
                }}
              >
                Track performance and optimize your sales
              </h2>

              <p
                className="text-[#343432] text-sm md:text-base tracking-[0] leading-relaxed md:leading-6"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontWeight: 400,
                }}
              >
                Get deep insights into your quoting and project process with comprehensive analytics. Track conversion rates, identify bottlenecks, and optimize your sales strategy with real-time data.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 md:gap-[15px] w-full">
              {["Real-time conversion tracking", "Performance analytics dashboard", "Sales pipeline insights"].map((point, index) => (
                <div key={index} className="flex items-center gap-2.5 w-full">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-[#ee6c4d] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <p
                    className="flex-1 text-[#343432] text-base md:text-lg lg:text-xl tracking-[0] leading-relaxed md:leading-[30px]"
                    style={{
                      fontFamily: 'Urbanist, sans-serif',
                      fontWeight: 400,
                    }}
                  >
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionContainer>

      {/* Animation styles */}
      <style>{`
        .feature-card.animate-in {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
      `}</style>
    </section>
  );
};

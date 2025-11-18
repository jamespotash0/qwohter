import React from "react";

export const FeatureSection = (): JSX.Element => {
  return (
    <section id="features" className="w-full flex justify-center mt-[75px] bg-[#FFFEFA] px-[20px]">
      <div className="flex flex-col items-start gap-[60px] max-w-[1520px] w-full px-4 sm:px-6 lg:px-8">
        {/* Feature 1: Design (Image Left) */}
        <div className="feature-card flex flex-row items-center gap-[100px] w-full opacity-0 translate-y-[-1rem] animate-fade-in-delay" style={{ '--animation-delay': '0ms' } as React.CSSProperties}>
          <div className="relative flex-shrink-0">
            <img
              className="w-[650px] h-[550px] object-contain"
              alt="Design beautiful quotes"
              src="/images/landing/design_image.png"
            />
          </div>

          <div className="flex flex-col items-start gap-[30px] flex-1 min-w-0">
            <div className="flex flex-col items-start gap-5 w-full">
              <h2
                className="bg-[linear-gradient(180deg,rgba(23,23,23,1)_0%,rgba(119,119,119,1)_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] text-[42px] tracking-[0.84px] leading-[50px]"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontWeight: 600,
                }}
              >
                Design beautiful quotes that win deals
              </h2>

              <p
                className="text-[#343432] text-base tracking-[0] leading-6"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontWeight: 400,
                }}
              >
                Build smart forms to capture the right information, then turn that data into stunning, branded quote templates. Drag, drop, and customize both the form and the final quote layout with instant live preview.
              </p>
            </div>

            <div className="flex flex-col items-start gap-[15px] w-full">
              {["Form builder to define fields and structure", "Drag-and-drop quote template designer", "Instant live preview and branding"].map((point, index) => (
                <div key={index} className="flex items-center gap-2.5 w-full">
                  <svg className="w-6 h-6 text-[#ee6c4d] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <p
                    className="flex-1 text-[#343432] text-xl tracking-[0] leading-[30px]"
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

        {/* Feature 2: Generate (Image Right) */}
        <div className="feature-card flex flex-row-reverse items-center gap-[100px] w-full opacity-0 translate-y-[-1rem] animate-fade-in-delay" style={{ '--animation-delay': '200ms' } as React.CSSProperties}>
          <div className="relative flex-shrink-0">
            <img
              className="w-[650px] h-[550px] object-contain"
              alt="Generate quotes in seconds"
              src="/images/landing/generate_quotes_image.png"
            />
          </div>

          <div className="flex flex-col items-start gap-[30px] flex-1 min-w-0">
            <div className="flex flex-col items-start gap-5 w-full">
              <h2
                className="bg-[linear-gradient(180deg,rgba(23,23,23,1)_0%,rgba(119,119,119,1)_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] text-[42px] tracking-[0.84px] leading-[50px]"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontWeight: 600,
                }}
              >
                Generate quotes in seconds, not hours
              </h2>

              <p
                className="text-[#343432] text-base tracking-[0] leading-6"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontWeight: 400,
                }}
              >
                Our intelligent quote engine automatically calculates pricing, applies discounts, and formats everything perfectly. Just fill in the details and go.
              </p>
            </div>

            <div className="flex flex-col items-start gap-[15px] w-full">
              {["Automatic pricing calculations", "Dynamic discount application", "Professional PDF output"].map((point, index) => (
                <div key={index} className="flex items-center gap-2.5 w-full">
                  <svg className="w-6 h-6 text-[#ee6c4d] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <p
                    className="flex-1 text-[#343432] text-xl tracking-[0] leading-[30px]"
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

        {/* Feature 3: Track (Image Left with Overlay) */}
        <div className="feature-card flex flex-row items-center gap-[100px] w-full opacity-0 translate-y-[-1rem] animate-fade-in-delay" style={{ '--animation-delay': '400ms' } as React.CSSProperties}>
          <div className="relative flex-shrink-0">
            <img
              className="w-[650px] h-[550px] object-contain"
              alt="Track performance"
              src="/images/landing/project_tracking_image.svg"
            />
            {/* Analytics overlay image if available */}
            {/* <img
              className="absolute top-[-20px] left-[-20px] w-[452px] h-[228px]"
              alt="Analytics overlay"
              src="/images/landing/analytics-overlay.png"
            /> */}
          </div>

          <div className="flex flex-col items-start gap-[30px] flex-1 min-w-0">
            <div className="flex flex-col items-start gap-5 w-full">
              <h2
                className="bg-[linear-gradient(180deg,rgba(23,23,23,1)_0%,rgba(119,119,119,1)_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] text-[42px] tracking-[0.84px] leading-[50px]"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontWeight: 600,
                }}
              >
                Track performance and optimize your sales
              </h2>

              <p
                className="text-[#343432] text-base tracking-[0] leading-6"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontWeight: 400,
                }}
              >
                Get deep insights into your quoting and project process with comprehensive analytics. Track conversion rates, identify bottlenecks, and optimize your sales strategy with real-time data.
              </p>
            </div>

            <div className="flex flex-col items-start gap-[15px] w-full">
              {["Real-time conversion tracking", "Performance analytics dashboard", "Sales pipeline insights"].map((point, index) => (
                <div key={index} className="flex items-center gap-2.5 w-full">
                  <svg className="w-6 h-6 text-[#ee6c4d] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <p
                    className="flex-1 text-[#343432] text-xl tracking-[0] leading-[30px]"
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
      </div>
    </section>
  );
};

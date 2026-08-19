import { CalComEmbed } from '@/components/features/booking/Cal.comEmbed';
import { DemoNavigation } from '@/components/features/landing/DemoNavigation';
import { Footer } from '@/components/features/landing/Footer';
import { DebugGrid } from '@/components/common/DebugGrid';

const Demo = () => {
  return (
    <div className="min-h-screen bg-[#FFFEFA] overflow-x-hidden">
      <DebugGrid />

      {/* Navigation Bar */}
      <DemoNavigation activeSection="demo" />

      {/* Hero Section with Background */}
      <section className="relative w-full overflow-hidden">
        <img
          src="/images/landing/contact-hero-bg.svg"
          alt="Demo Hero Background"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Book a Demo Badge Container */}
        <div className="relative max-w-[1920px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-24 2xl:px-[10.4vw] pt-28 sm:pt-36 lg:pt-[170px] z-10">
          <div className="text-center mb-6 sm:mb-[30px]">
            <div className="inline-block px-6 py-1 bg-[#ee6c4d]/10 rounded-full">
              <span className="text-[#ee6c4d] font-semibold text-sm uppercase tracking-wider" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                Book a Demo
              </span>
            </div>
          </div>
        </div>

        {/* Calendar Container */}
        <div className="relative max-w-[1920px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-24 2xl:px-[10.4vw] pb-10 sm:pb-[40px]">
          <div className="max-w-[1200px] mx-auto">
            <div className="bg-[#fbf8f1] rounded-[20px] sm:rounded-[30px] p-[8px]">
              <div className="bg-[#f7f2e9] rounded-[20px] sm:rounded-[30px] p-[8px]">
                <CalComEmbed />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* CSS Animations - matching ContactUs */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(1rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-delay {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
          animation-delay: var(--animation-delay, 0ms);
        }

        .animate-fade-in-delay {
          animation: fade-in-delay 0.8s ease-out forwards;
          animation-delay: var(--animation-delay, 0ms);
        }
      `}</style>
    </div>
  );
};

export default Demo;

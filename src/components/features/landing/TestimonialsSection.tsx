import { CheckCircleIcon } from "lucide-react";
import React from "react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const testimonials = [
  {
    quote:
      "Qwohter cut our quoting time in half. Our reps no longer chase spreadsheets or wait for pricing updates. We respond to customers faster and look far more professional.",
    avatar: "https://c.animaapp.com/mi3nizw3ab7ONs/img/image-7.png",
    name: "Alex Turner",
    title: "Commercial Interiors Distributor",
  },
  {
    quote:
      "The approval workflow alone has changed everything. We used to spend hours emailing manufacturers for updates. Now it's all tracked, documented, and incredibly efficient.",
    avatar: "https://c.animaapp.com/mi3nizw3ab7ONs/img/image-9.png",
    name: "David Smith",
    title: "Architectural Wall Systems Dealer",
  },
  {
    quote:
      "Complex configurations used to slow us down. With Qwohter, our team builds accurate quotes in minutes — even for custom projects with multiple options and detailed pricing rules.",
    avatar: "https://c.animaapp.com/mi3nizw3ab7ONs/img/image-11.png",
    name: "Jack Sloaw",
    title: "Modular Furniture Distributor",
  },
  {
    quote:
      "Qwohter unified our entire sales and estimating workflow. Everyone sees the same data, the same pricing, and the same version of the quote. It eliminated so much internal back-and-forth.",
    avatar: "https://c.animaapp.com/mi3nizw3ab7ONs/img/image-8.png",
    name: "Armin Chen",
    title: "Commercial Furniture Dealer",
  },
  {
    quote:
      "We handle multiple brands and product lines. Qwohter keeps all the configurations, rules, and pricing organised. Our quotes are more accurate than ever, and customers feel that immediately.",
    avatar: "https://c.animaapp.com/mi3nizw3ab7ONs/img/image-10.png",
    name: "Ashley James",
    title: "Building Systems Distributor",
  },
  {
    quote:
      "The speed is incredible. We can turn around complex quotes in the same day—even when the project has multiple custom components. That alone has helped us win more deals.",
    avatar: "https://c.animaapp.com/mi3nizw3ab7ONs/img/image-12.png",
    name: "Emily Jones",
    title: "Mechanical & HVAC Solutions Provider",
  },
];

export const TestimonialsSection = (): JSX.Element => {
  const navigate = useNavigate();

  return (
    <section className="w-full pt-[60px] pb-[75px] px-[20px]">
      <div className="w-full bg-[url(https://c.animaapp.com/mi3nizw3ab7ONs/img/bg.png)] bg-cover bg-center bg-no-repeat rounded-[30px]">
        <div className="w-full max-w-[1520px] mx-auto px-4 sm:px-8 lg:px-[180px] py-[75px] sm:py-[100px] lg:py-[150px] flex flex-col items-center gap-[30px] sm:gap-[40px] lg:gap-[50px]">
          <header className="flex flex-col items-center gap-2.5 max-w-[700px] translate-y-[-1rem] animate-fade-in opacity-0">
            <h2 className="w-full bg-[linear-gradient(180deg,rgba(23,23,23,1)_0%,rgba(119,119,119,1)_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] [font-family:'Urbanist',Helvetica] font-semibold text-transparent text-[42px] text-center tracking-[0] leading-[50px]">
              Built for Complexity. Loved by the Teams Who Sell It.
            </h2>

            <p className="[font-family:'Urbanist',Helvetica] font-normal text-[#343432] text-xl text-center tracking-[0] leading-[30px]">
              Hear from distributors who handle configurable products and depend
              on Qwohter to keep everything accurate and moving.
            </p>
          </header>

          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 bg-[#ffffffd9] rounded-[30px] backdrop-blur-[25px] backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(25px)_brightness(100%)] overflow-hidden px-5 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
            {testimonials.map((testimonial, index) => {
              const isNotLastInRow = {
                mobile: true, // No borders on mobile (1 col)
                tablet: index % 2 !== 1, // Not last in row of 2
                desktop: index % 3 !== 2, // Not last in row of 3
              };
              const isFirstRow = index < 3;

              return (
                <div
                  key={index}
                  className={`flex flex-col justify-between p-[30px] bg-[#f7f2e90d]
                    md:border-r md:border-solid md:border-[#1717171a]
                    lg:border-r lg:border-solid lg:border-[#1717171a]
                    ${!isNotLastInRow.tablet ? 'md:border-r-0' : ''}
                    ${!isNotLastInRow.desktop ? 'lg:border-r-0' : ''}
                    ${isFirstRow ? 'lg:border-b lg:border-solid lg:border-[#1717171a]' : ''}
                    ${index < 2 ? 'md:border-b md:border-solid md:border-[#1717171a]' : ''}
                  `}
                >
                  <blockquote className="[font-family:'Urbanist',Helvetica] font-normal text-neutral-900 text-base tracking-[0] leading-6 mb-[30px]">
                    &quot;{testimonial.quote}&quot;
                  </blockquote>

                  <div className="flex items-center gap-[15px]">
                    <Avatar className="w-[60px] h-[60px] flex-shrink-0">
                      <AvatarImage
                        src={testimonial.avatar}
                        alt={testimonial.name}
                      />
                    </Avatar>

                    <div className="flex flex-col gap-0.5 flex-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="[font-family:'Urbanist',Helvetica] font-bold text-neutral-900 text-base tracking-[0] leading-6 whitespace-nowrap">
                          {testimonial.name}
                        </h3>

                        <CheckCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      </div>

                      <p className="[font-family:'Urbanist',Helvetica] font-normal text-neutral-900 text-base tracking-[0] leading-6">
                        {testimonial.title}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            onClick={() => navigate('/contact-us')}
            className="h-auto bg-[#ee6c4d] hover:bg-[#ee6c4d]/90 px-[30px] py-2.5 rounded-3xl translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:400ms]"
          >
            <span className="[font-family:'Urbanist',Helvetica] font-semibold text-white text-base tracking-[0] leading-6 whitespace-nowrap">
              See customer stories
            </span>
          </Button>
        </div>
      </div>
    </section>
  );
};

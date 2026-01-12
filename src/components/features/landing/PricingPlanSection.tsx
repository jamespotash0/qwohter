import { CheckCircle2Icon, XCircleIcon } from "lucide-react";
import React, { JSX } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const mainFeatures = [
  "Unlimited proposals",
  "Custom form creation",
  "Template designer",
  "Advanced analytics",
];

const includedFeatures = [
  "Real-time collaboration & sync",
  "Secure encrypted data storage",
  "Role-based access control",
  "PDF export & CSV downloads",
  "Auto-save & version control",
];

const bottomFeatures = [
  { icon: "check", text: "No credit card required" },
  { icon: "close", text: "Cancel anytime" },
];

export const PricingPlanSection = (): JSX.Element => {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="w-full py-[75px]">
      <div className="w-full bg-[#f7f2e9]">
        <div className="w-full px-[20px]">
          <div className="w-full px-[180px] py-[150px] flex flex-col items-start gap-[50px]">
          <header className="flex flex-col items-center gap-2.5 relative w-full translate-y-[-1rem] animate-fade-in opacity-0">
        <h2 className="relative w-full max-w-[560px] bg-[linear-gradient(180deg,rgba(23,23,23,1)_0%,rgba(119,119,119,1)_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] [font-family:'Urbanist',Helvetica] font-semibold text-transparent text-[36px] text-center tracking-[0] leading-[44px]">
          Simple, transparent pricing
        </h2>

        <p className="relative max-w-[560px] [font-family:'Urbanist',Helvetica] font-normal text-[#343432] text-base text-center tracking-[0] leading-6">
          One straightforward price. No hidden fees, no surprises. Pay only for
          what you use.
        </p>
      </header>

      <div className="inline-flex flex-col lg:flex-row items-start gap-[30px] p-[30px] relative flex-[0_0_auto] bg-[#fbf8f1] rounded-[30px] translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
        <Card className="inline-flex flex-col items-start gap-[30px] p-[30px] relative flex-1 bg-[#f7f2e9] rounded-[30px] border-0 shadow-none">
          <CardContent className="p-0 flex flex-col gap-[30px] w-full">
            <div className="inline-flex flex-col items-start gap-5 relative flex-[0_0_auto]">
              <div className="inline-flex items-end gap-2.5 relative flex-[0_0_auto]">
                <div className="relative w-fit [font-family:'Urbanist',Helvetica] font-semibold text-neutral-900 text-[36px] tracking-[0] leading-[44px] whitespace-nowrap">
                  $20
                </div>

                <div className="relative w-fit [font-family:'Urbanist',Helvetica] font-normal text-neutral-900 text-base tracking-[0] leading-[30px] whitespace-nowrap">
                  /user/month
                </div>
              </div>

              <p className="relative w-full max-w-[640px] [font-family:'Urbanist',Helvetica] font-normal text-[#343432] text-base tracking-[0] leading-6">
                Simple per-user pricing that scales with your team. No
                commitment, no credit card required for your 14-day free trial.
              </p>
            </div>

            <ul className="flex flex-col items-start gap-[15px] relative w-full flex-[0_0_auto]">
              {mainFeatures.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-center gap-2.5 relative w-full flex-[0_0_auto]"
                >
                  <CheckCircle2Icon className="relative w-5 h-5 text-[#343432] flex-shrink-0" />
                  <span className="relative flex-1 [font-family:'Urbanist',Helvetica] font-normal text-[#343432] text-base tracking-[0] leading-6">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => navigate('/create-account')}
              className="flex gap-[5px] w-full bg-[#ee6c4d] hover:bg-[#d95b3e] items-center justify-center px-[30px] py-2.5 relative flex-[0_0_auto] rounded-3xl h-auto transition-colors"
            >
              <span className="relative flex-1 [font-family:'Urbanist',Helvetica] font-semibold text-white text-base text-center tracking-[0] leading-6">
                Start your 14-day free trial
              </span>
            </Button>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-center gap-2.5 relative w-full flex-[0_0_auto]">
              {bottomFeatures.map((item, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-2.5 relative flex-[0_0_auto]"
                >
                  {item.icon === "check" ? (
                    <CheckCircle2Icon
                      className="relative w-5 h-5 text-[#343432] flex-shrink-0"
                      strokeWidth={1.5}
                    />
                  ) : (
                    <XCircleIcon
                      className="relative w-5 h-5 text-[#343432] flex-shrink-0"
                      strokeWidth={1.5}
                    />
                  )}
                  <span className="relative w-fit [font-family:'Urbanist',Helvetica] font-normal text-[#343432] text-base tracking-[0] leading-6 whitespace-nowrap">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="inline-flex flex-col items-start justify-between p-[30px] relative self-stretch flex-1 bg-white rounded-[30px] border-0 shadow-none">
          <CardContent className="p-0 flex flex-col gap-[30px] w-full h-full">
            <div className="flex flex-col items-start gap-[30px] relative w-full flex-[0_0_auto]">
              <h3 className="relative w-full [font-family:'Urbanist',Helvetica] font-bold text-neutral-900 text-[22px] tracking-[0] leading-8">
                Included in every account
              </h3>

              <ul className="flex flex-col items-start gap-[15px] relative w-full flex-[0_0_auto]">
                {includedFeatures.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2.5 relative w-full flex-[0_0_auto]"
                  >
                    <CheckCircle2Icon className="relative w-5 h-5 text-[#343432] flex-shrink-0" />
                    <span className="relative flex-1 [font-family:'Urbanist',Helvetica] font-normal text-[#343432] text-base tracking-[0] leading-6">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="relative w-full max-w-[670px] [font-family:'Urbanist',Helvetica] font-normal text-[#343432] text-base tracking-[0] leading-6 mt-auto">
              Pricing is in USD and renews automatically unless cancelled. You
              can add or remove users at any time. Scale up or down as your team
              grows.
            </p>
          </CardContent>
        </Card>
      </div>
          </div>
        </div>
      </div>
    </section>
  );
};
